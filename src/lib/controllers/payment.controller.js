const ProcessSate = require('../process-state/');
const Validator = require('../utils/precondition-validator');
const StandardErrorWrapper = require('../utils/standard-error-wrapper');
const StandardResponseWrapper = require('../utils/standard-response-wrapper');
const constants = require('../constants/');
const stripeApi = require('stripe');
//const jwt = require('jsonwebtoken');
const Promise = require('bluebird');


const stripe = stripeApi(constants.CREDENTIAL.STRIPE.PRIVATE_KEY);
//const jwtSecret = constants.CREDENTIAL.JWT.SECRET;
//const jwtAudience = constants.CREDENTIAL.JWT.AUDIENCE;
//const jwtIssuer = constants.CREDENTIAL.JWT.ISSUER;
//const jwtExpiresIn = constants.CREDENTIAL.JWT.EXPIRES_IN;
//const jwtNotBefore = constants.CREDENTIAL.JWT.NOT_BEFORE;
const containerId = process.env.HOSTNAME;
let requestCount = 0;

class PaymentController {

  static proceed(req, res) {
    let state;
    let stripeCustomer;
    let stripeCharge;
    let stripeTransfer;

    return Promise
      .try(() => {
        requestCount += 1;

        const email = req.body.email;
        const tokenId = req.body.tokenId;
        const chargeAmount = req.body.chargeAmount;
        const dealId = req.body.dealId;
        const dealName = req.body.dealName;
        const influencerStripeUserId = req.body.influencerStripeUserId;
        const merchantStripeUserId = req.body.merchantStripeUserId;

        const options = { email, tokenId, chargeAmount, dealId, dealName, influencerStripeUserId, merchantStripeUserId };
        const context = { containerId, requestCount };

        state = ProcessSate.create(options, context);

        Validator.shouldNotBeEmpty(email);
        Validator.shouldNotBeEmpty(tokenId);
        Validator.shouldNotBeEmpty(chargeAmount);
        Validator.shouldNotBeEmpty(dealId);
        Validator.shouldNotBeEmpty(dealName);
        Validator.shouldNotBeEmpty(influencerStripeUserId);
        Validator.shouldNotBeEmpty(merchantStripeUserId);

        return stripe.customers.create({
          description: `Customer for ${state.email} - ${state.tokenId}`,
          account_balance: 0,
          email: state.email,
          source: state.tokenId,
        });
      })
      .then((customer) => {
        stripeCustomer = customer;

        const merchantAmount = state.chargeAmount * 0.8;

        return stripe.charges.create({
          description: `Charge for deal ${state.dealName}`,
          metadata: { dealId: state.dealId },
          statement_descriptor: 'Payment to Circlus',
          customer: stripeCustomer.id,
          amount: parseInt(state.chargeAmount * 100, 10),
          currency: 'usd',
          transfer_group: state.dealId,
          destination: {
            amount: parseInt(merchantAmount * 100, 10),
            account: state.merchantStripeUserId,
          },
        });
      })
      .then((charge) => {
        stripeCharge = charge;

        const influencerAmount = state.chargeAmount * 0.08;

        return Promise.all([
          stripe.transfers.create({
            amount: parseInt(influencerAmount * 100, 10),
            currency: 'usd',
            destination: state.influencerStripeUserId,
            transfer_group: state.dealId,
          }),
        ]);
      })
      .then((transfer) => {
        stripeTransfer = transfer;

        //const newJwtPayload = Object.assign({}, req.user, partialNewUserInfo, {
        //  sub: `${partialNewUserInfo.type}:${req.user.email}:${req.user._id}`,
        //});
        //const jwtToken = jwt.sign(newJwtPayload, jwtSecret, {
        //  expiresIn: jwtExpiresIn,
        //  notBefore: jwtNotBefore,
        //  issuer: jwtIssuer,
        //  audience: jwtAudience,
        //});
        //
        //res.cookie(constants.CREDENTIAL.JWT.COOKIE_NAME, jwtToken, {
        //  httpOnly: constants.CREDENTIAL.JWT.COOKIE_HTTP_ONLY,
        //  secure: constants.CREDENTIAL.JWT.COOKIE_SECURE,
        //  path: constants.CREDENTIAL.JWT.COOKIE_PATH,
        //  signed: constants.CREDENTIAL.JWT.COOKIE_SIGNED,
        //});

        const response = new StandardResponseWrapper([
          {
            success: true,
            detail: {
              stripeCustomer,
              stripeCharge,
              stripeTransfer,
              customerId: stripeCustomer.id,
            },
          },
        ], constants.SYSTEM.RESPONSE_NAMES.PROCESS_PAYMENT);

        return res.status(constants.SYSTEM.HTTP_STATUS_CODES.OK)
          .json(response.format);
      })
      .catch((_err) => {
        const err = new StandardErrorWrapper(_err);

        err.append({
          code: constants.SYSTEM.ERROR_CODES.INTERNAL_SERVER_ERROR,
          name: constants.SYSTEM.ERROR_NAMES.CAUGHT_ERROR_IN_PAYMENT_CONTROLLER,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: constants.SYSTEM.ERROR_MSG.CAUGHT_ERROR_IN_PAYMENT_CONTROLLER,
        });

        const response = new StandardResponseWrapper([
          {
            success: false,
            status: err.getNthError(0).name,
            message: err.getNthError(0).message,
            detail: err.format({
              containerId: state.context.containerId,
              requestCount: state.context.requestCount,
            }),
          },
        ], constants.SYSTEM.RESPONSE_NAMES.PROCESS_PAYMENT);

        return res.status(constants.SYSTEM.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR)
          .json(response.format);
      });
  }

  static _handleRequest(state, res, Svc, strategy) {
    return Promise.try(() => Svc.execute(state, strategy));
  }

}

module.exports = exports = PaymentController;
