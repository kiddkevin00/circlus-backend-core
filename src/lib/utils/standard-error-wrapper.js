/*
 * Standard error format:
 *
 *  ```
 *  {
 *    context: {
 *      containerId: "a123",
 *      requestCount: 0
 *    },
 *    errors: [
 *      {
 *        code: 404,
 *        name: "SOMETHING_NOT_FOUND",
 *        source: "another-app",
 *        message: "Something is not found.",
 *        detail: `err` // optional
 *      },
 *      {
 *        code: 500,
 *        name: "SOMETHING_WENT_WRONG",
 *        source: "current-app",
 *        message: "Something went wrong.",
 *        detail: `err` // optional
 *      }
 *    ]
 *  }
 *  ```
 */

const constants = require('../constants/');

// [TODO] When throwing an object with `Symbol('error-context')` property, it will become `{}`.
const errorContext = 'error-context';

class StandardErrorWrapper {

  constructor(initialErr) {
    this[errorContext] = {};

    if (initialErr instanceof StandardErrorWrapper) {
      this[errorContext].errorStack = initialErr[errorContext].errorStack;
    } else if (Array.isArray(initialErr)) {
      /*
       * If the initial error(s) are wrapped into an array, each of them should follow standard
       * error format.
       */
      this[errorContext].errorStack = initialErr;
    } else if (initialErr) {
      // If the initial error doesn't follow standard error format, will attempt to standardized it.
      const errMsg = initialErr.toString() !== '[object Object]' ?
        initialErr.toString() : JSON.stringify(initialErr, null, 2);

      this[errorContext].errorStack = [{
        code: constants.SYSTEM.ERROR_CODES.UNKNOWN_ERROR,
        name: constants.SYSTEM.ERROR_NAMES.UNKNOWN_ERROR,
        source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
        message: errMsg,
        detail: initialErr,
      }];
    } else {
      // If there is no initial error provided, default to an empty array.
      this[errorContext].errorStack = [];
    }
  }

  append(newError) {
    let errElement;

    if (newError.toString() !== '[object Object]') {
      errElement = { message: newError.toString(), detail: newError };
    } else {
      // If new error is an object, it should follow standard error format.
      errElement = newError;
    }

    this[errorContext].errorStack.push(errElement);
  }

  getNthError(nth) {
    return this[errorContext].errorStack[nth];
  }

  format(context = {}) {
    return {
      context,
      errors: this[errorContext].errorStack,
    };
  }

  static deserialize(errorPayloadObj) {
    if (!StandardErrorWrapper.verifyFormat(errorPayloadObj)) {
      const err = new StandardErrorWrapper([
        {
          code: constants.SYSTEM.ERROR_CODES.INVALID_ERROR_INTERFACE,
          name: constants.SYSTEM.ERROR_NAMES.ERROR_OBJ_PARSE_ERROR,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: constants.SYSTEM.ERROR_MSG.ERROR_OBJ_PARSE_ERROR,
        },
      ]);

      throw err;
    }

    const errors = errorPayloadObj.errors;

    return new StandardErrorWrapper(errors);
  }

  static verifyFormat(obj) {
    const errors = obj.errors;

    return !!Array.isArray(errors);
  }

}

module.exports = exports = StandardErrorWrapper;
