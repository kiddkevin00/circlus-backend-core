const stateContext = Symbol('process-state-context');

class ProcessState {

  constructor(options, { containerId, requestCount }) {
    this[stateContext] = {};

    this[stateContext].context = { containerId, requestCount };
    this[stateContext].email = options.email;
    this[stateContext].tokenId = options.tokenId;
    this[stateContext].chargeAmount = options.chargeAmount;
    this[stateContext].authorizationCode = options.authorizationCode;
  }

  get context() {
    return this[stateContext].context;
  }

  get email() {
    return this[stateContext].email;
  }

  get tokenId() {
    return this[stateContext].tokenId;
  }

  get chargeAmount() {
    return this[stateContext].chargeAmount;
  }

  get dealId() {
    return this[stateContext].dealId;
  }

  get influencerStripeUserId() {
    return this[stateContext].influencerStripeUserId;
  }

  get merchantStripeUserId() {
    return this[stateContext].merchantStripeUserId;
  }

  get authorizationCode() {
    return this[stateContext].authorizationCode;
  }

  static create(options, context) {
    return new ProcessState(options, context);
  }

}

module.exports = exports = ProcessState;
