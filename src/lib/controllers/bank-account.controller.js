const ProcessSate = require('../process-state/');
const Validator = require('../utils/precondition-validator');
const StandardErrorWrapper = require('../utils/standard-error-wrapper');
const StandardResponseWrapper = require('../utils/standard-response-wrapper');
const constants = require('../constants/');
const stripeApi = require('stripe');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const rp = require('request-promise');


const stripe = stripeApi(constants.CREDENTIAL.STRIPE.PRIVATE_KEY);
const jwtSecret = constants.CREDENTIAL.JWT.SECRET;
const jwtAudience = constants.CREDENTIAL.JWT.AUDIENCE;
const jwtIssuer = constants.CREDENTIAL.JWT.ISSUER;
const jwtExpiresIn = constants.CREDENTIAL.JWT.EXPIRES_IN;
const jwtNotBefore = constants.CREDENTIAL.JWT.NOT_BEFORE;
const containerId = process.env.HOSTNAME;
let requestCount = 0;

class BankAccountController {

  static setup(req, res) {
    requestCount += 1;

    const authorizationCode = req.body.authorizationCode;

    Validator.shouldNotBeEmpty(authorizationCode);

    const options = { authorizationCode };
    const context = { containerId, requestCount };
    const state = ProcessSate.create(options, context);

    return Promise
      .try(() => {
        const body = {
          code: state.authorizationCode,
          client_secret: 'sk_test_QgxbESIIxtkIfbprJvWPCOch',
          grant_type: 'authorization_code',
        };
        const rpOptions = {
          body,
          uri: 'https://connect.stripe.com/oauth/token',
          method: 'POST',
          json: true,
        };

        return rp(rpOptions);
      })
      .then((parsedBody) => {
        const response = new StandardResponseWrapper([
          {
            success: true,
            detail: {
              stripeUserId: parsedBody.stripe_user_id,
            },
          },
        ], constants.SYSTEM.RESPONSE_NAMES.SETUP_BANK_ACCOUNT);

        return res.status(constants.SYSTEM.HTTP_STATUS_CODES.OK)
          .json(response.format);
      })
      .catch((_err) => {
        const err = new StandardErrorWrapper(_err);

        err.append({
          code: constants.SYSTEM.ERROR_CODES.INTERNAL_SERVER_ERROR,
          name: constants.SYSTEM.ERROR_NAMES.CAUGHT_ERROR_IN_BANK_ACCOUNT_CONTROLLER,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: constants.SYSTEM.ERROR_MSG.CAUGHT_ERROR_IN_BANK_ACCOUNT_CONTROLLER,
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
        ], constants.SYSTEM.RESPONSE_NAMES.SETUP_BANK_ACCOUNT);

        return res.status(constants.SYSTEM.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR)
          .json(response.format);
      });

  }

  static _handleRequest(state, res, Svc, strategy) {
    return Promise.try(() => Svc.execute(state, strategy));
  }

}

module.exports = exports = BankAccountController;
