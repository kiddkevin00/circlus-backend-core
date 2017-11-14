const stateContext = Symbol('process-state-context');

class ProcessState {

  constructor(options, { containerId, requestCount }) {
    this[stateContext] = {};

    this[stateContext].context = { containerId, requestCount };
    this[stateContext].email = options.email;
    this[stateContext].tokenId = options.tokenId;
    this[stateContext].chargeAmount = options.chargeAmount;
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

  static create(options, context) {
    return new ProcessState(options, context);
  }

}

module.exports = exports = ProcessState;
