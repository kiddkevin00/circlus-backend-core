const ProcessSate = require('../process-state/');
const Validator = require('../utils/precondition-validator');
const StandardErrorWrapper = require('../utils/standard-error-wrapper');
const StandardResponseWrapper = require('../utils/standard-response-wrapper');
const constants = require('../constants/');
const stripeApi = require('stripe');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');


const stripe = stripeApi(constants.CREDENTIAL.STRIPE.PRIVATE_KEY);
const jwtSecret = constants.CREDENTIAL.JWT.SECRET;
const jwtAudience = constants.CREDENTIAL.JWT.AUDIENCE;
const jwtIssuer = constants.CREDENTIAL.JWT.ISSUER;
const jwtExpiresIn = constants.CREDENTIAL.JWT.EXPIRES_IN;
const jwtNotBefore = constants.CREDENTIAL.JWT.NOT_BEFORE;
const containerId = process.env.HOSTNAME;
let requestCount = 0;

class PaymentController {

  static proceed(req, res) {
    requestCount += 1;

    const _id = req.user._id;
    const email = req.user.email;
    const fullName = req.user.fullName;
    const referralCode = req.user.referralCode;
    const referralCodeToUse = req.body.referralCode;
    const source = req.body.tokenId;
    const ccLast4 = req.body.ccLast4;

    Validator.shouldNotBeEmpty(source);
    Validator.shouldNotBeEmpty(ccLast4);

    const options = { _id, email, fullName, referralCode, referralCodeToUse, source };
    const context = { containerId, requestCount };
    const state = ProcessSate.create(options, context);
    const withoutReferralCode = !state.referralCodeToUse ||
      (typeof state.referralCodeToUse === 'string' && state.referralCodeToUse.trim().length === 0);
    const validatedReferralCode = !withoutReferralCode &&
      couponCode.validate(state.referralCodeToUse, { parts: 1, partLen: 6 });
    let account_balance; // eslint-disable-line camelcase
    let stripeCustomerId;
    let stripeSubscriptionId;
    let partialNewUserInfo;
    let referralUserId;

    return Promise
      .try(() => {
        if (req.user.type === constants.SYSTEM.USER_TYPES.PAID) {
          const err = new StandardErrorWrapper([
            {
              code: constants.SYSTEM.ERROR_CODES.PAYMENT_CHECK_FAILURE,
              name: constants.AUTH.ERROR_NAMES.ALREADY_PAID,
              source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
              message: constants.AUTH.ERROR_MSG.ALREADY_PAID,
            },
          ]);

          throw err;
        } else if (
          !withoutReferralCode &&
          req.user.type === constants.SYSTEM.USER_TYPES.CANCELLED
        ) {
          const err = new StandardErrorWrapper([
            {
              code: constants.SYSTEM.ERROR_CODES.PAYMENT_CHECK_FAILURE,
              name: constants.AUTH.ERROR_NAMES.NOT_ELIGIBLE_FOR_REFERRAL_DISCOUNT,
              source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
              message: constants.AUTH.ERROR_MSG.NOT_ELIGIBLE_FOR_REFERRAL_DISCOUNT,
            },
          ]);

          throw err;
        }

        if (validatedReferralCode) {
          const referralCodeStrategy = {
            storeType: constants.STORE.TYPES.MONGO_DB,
            operation: {
              type: constants.STORE.OPERATIONS.SELECT,
              data: [
                {
                  _id: { $ne: mongojs.ObjectId(state._id) },
                  referralCode: validatedReferralCode,
                },
              ],
            },
            tableName: constants.STORE.TABLE_NAMES.USER,
          };

          return PaymentController._handleRequest(state, res, DatabaseService,
            referralCodeStrategy);
        }
        return { withoutReferralCode };
      })
      .then((result) => {
        if (Array.isArray(result) && result.length === 1) {
          account_balance = -stripeReferralCredit; // eslint-disable-line camelcase
          referralUserId = result[0]._id;
        } else if (result && result.withoutReferralCode) {
          account_balance = 0; // eslint-disable-line camelcase
        } else {
          const err = new StandardErrorWrapper([
            {
              code: constants.SYSTEM.ERROR_CODES.BAD_REQUEST,
              name: constants.AUTH.ERROR_NAMES.REFERRAL_CODE_NOT_FOUND,
              source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
              message: constants.AUTH.ERROR_MSG.REFERRAL_CODE_NOT_FOUND,
            },
          ]);

          throw err;
        }

        const description = `Customer for ${state.fullName} - ${state._id}`;

        // eslint-disable-next-line camelcase
        return stripe.customers
          .create({ description, account_balance, email: state.email, source: state.source });
      })
      .then((customer) => {
        stripeCustomerId = customer.id;

        const items = [
          { plan: stripePlan, quantity: stripeQuantity },
        ];
        const prorate = false;

        return stripe.subscriptions
          .create({ items, prorate, customer: stripeCustomerId });
      })
      .then((subscription) => {
        stripeSubscriptionId = subscription.id;

        const date = new Date(subscription.current_period_start * 1000);
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const prorate = false;
        let trial_end; // eslint-disable-line camelcase

        if (day <= stripeRecurringBillingDate) {
          // eslint-disable-next-line camelcase
          trial_end = new Date(year, month + 1, stripeRecurringBillingDate).getTime() / 1000;
        } else {
          // eslint-disable-next-line camelcase
          trial_end = new Date(year, month + 2, stripeRecurringBillingDate).getTime() / 1000;
        }

        // eslint-disable-next-line camelcase
        return stripe.subscriptions.update(stripeSubscriptionId, { trial_end, prorate });
      })
      .then(() => mailchimp.post({
        path: '/lists/{mailChimpSubscribedListId}/members/',
        path_params: { mailChimpSubscribedListId },
        body: {
          email_address: state.email,
          status: 'subscribed',
          merge_fields: {
            FNAME: state.fullName,
          },
        },
      }))
      .then(() => {
        if (req.user.type === constants.SYSTEM.USER_TYPES.UNPAID) {
          return mailchimp.delete({
            path: '/lists/{mailChimpSignupListId}/members/{hashedEmail}',
            path_params: {
              mailChimpSignupListId,
              hashedEmail: md5(state.email),
            },
          });
        } else if (req.user.type === constants.SYSTEM.USER_TYPES.CANCELLED) {

          return mailchimp.delete({
            path: '/lists/{mailChimpCancelledListId}/members/{hashedEmail}',
            path_params: {
              mailChimpCancelledListId,
              hashedEmail: md5(state.email),
            },
          });
        }
        return Promise.resolve();
      })
      .then(() => {
        if (!withoutReferralCode) {
          const updateRefererStrategy = {
            storeType: constants.STORE.TYPES.MONGO_DB,
            operation: {
              type: constants.STORE.OPERATIONS.UPDATE,
              data: [
                { _id: mongojs.ObjectId(referralUserId) },
                { $inc: { referralAmount: 1 } },
                true,
              ],
            },
            tableName: constants.STORE.TABLE_NAMES.USER,
          };

          return PaymentController._handleRequest(state, res, DatabaseService,
            updateRefererStrategy);
        }
        return Promise.resolve();
      })
      .then(() => {
        partialNewUserInfo = {
          stripeCustomerId,
          stripeSubscriptionId,
          type: constants.SYSTEM.USER_TYPES.PAID,
          referralCode: state.referralCode || couponCode.generate({
            parts: 1,
            partLen: 6,
          }),
          creditCardLast4: ccLast4,
        };
        if (validatedReferralCode) {
          Object.assign(partialNewUserInfo, { usedReferralCode: validatedReferralCode });
        }

        const linkAccountStrategy = {
          storeType: constants.STORE.TYPES.MONGO_DB,
          operation: {
            type: constants.STORE.OPERATIONS.UPDATE,
            data: [
              { _id: mongojs.ObjectId(state._id) },
              partialNewUserInfo,
            ],
          },
          tableName: constants.STORE.TABLE_NAMES.USER,
        };

        return PaymentController._handleRequest(state, res, DatabaseService, linkAccountStrategy);
      })
      .then(() => {
        const newJwtPayload = Object.assign({}, req.user, partialNewUserInfo, {
          sub: `${partialNewUserInfo.type}:${req.user.email}:${req.user._id}`,
        });
        const jwtToken = jwt.sign(newJwtPayload, jwtSecret, {
          expiresIn: jwtExpiresIn,
          notBefore: jwtNotBefore,
          issuer: jwtIssuer,
          audience: jwtAudience,
        });

        res.cookie(constants.CREDENTIAL.JWT.COOKIE_NAME, jwtToken, {
          httpOnly: constants.CREDENTIAL.JWT.COOKIE_HTTP_ONLY,
          secure: constants.CREDENTIAL.JWT.COOKIE_SECURE,
          path: constants.CREDENTIAL.JWT.COOKIE_PATH,
          signed: constants.CREDENTIAL.JWT.COOKIE_SIGNED,
        });

        const response = new StandardResponseWrapper([
          {
            success: true,
            detail: partialNewUserInfo,
          },
        ], constants.SYSTEM.RESPONSE_NAMES.PAYMENT);

        return res.status(constants.SYSTEM.HTTP_STATUS_CODES.OK)
          .json(response.format);
      })
      .catch((_err) => {
        const err = new StandardErrorWrapper(_err);

        if (
          err.getNthError(0).name === constants.AUTH.ERROR_NAMES.ALREADY_PAID ||
          err.getNthError(0).name === constants.AUTH.ERROR_NAMES.NOT_ELIGIBLE_FOR_REFERRAL_DISCOUNT || // eslint-disable-line max-len
          err.getNthError(0).name === constants.AUTH.ERROR_NAMES.REFERRAL_CODE_NOT_FOUND
        ) {
          const response = new StandardResponseWrapper([
            {
              success: false,
              status: err.getNthError(0).name,
              detail: err.format({
                containerId: state.context.containerId,
                requestCount: state.context.requestCount,
              }),
            },
          ], constants.SYSTEM.RESPONSE_NAMES.PAYMENT);

          return res.status(constants.SYSTEM.HTTP_STATUS_CODES.OK)
            .json(response.format);
        }

        err.append({
          code: constants.SYSTEM.ERROR_CODES.INTERNAL_SERVER_ERROR,
          name: constants.SYSTEM.ERROR_NAMES.CAUGHT_ERROR_IN_PAYMENT_CONTROLLER,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: constants.SYSTEM.ERROR_MSG.CAUGHT_ERROR_IN_PAYMENT_CONTROLLER,
        });

        return res.status(constants.SYSTEM.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR)
          .json(err.format({
            containerId: state.context.containerId,
            requestCount: state.context.requestCount,
          }));
      });

  }

  static _handleRequest(state, res, Svc, strategy) {
    return Promise.try(() => Svc.execute(state, strategy));
  }

}

module.exports = exports = PaymentController;
