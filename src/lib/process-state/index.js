const stateContext = Symbol('process-state-context');

class ProcessState {

  constructor(options, { containerId, requestCount }) {
    this[stateContext] = {};

    this[stateContext].context = { containerId, requestCount };
    this[stateContext].email = options.email;
  }

  get context() {
    return this[stateContext].context;
  }

  get email() {
    return this[stateContext].email;
  }


  static create(options, context) {
    return new ProcessState(options, context);
  }

}

module.exports = exports = ProcessState;
