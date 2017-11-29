/*
 * Standard response format (for 200 status code only):
 *
 * ```
 * {
 *   result: {
 *     meta: { name: "BULK_INSERT" },
 *     data: [
 *       {
 *         success: true,
 *         detail: [
 *           {
 *             _id: "001",
 *             email: "test1@test.com"
 *           },
 *           {
 *             _id: "002",
 *             email: "test2@test.com"
 *           }
 *         ]
 *       },
 *       {
 *         success: false,
 *         status: "ERROR_NAME_1", // optional
 *         message: "Something went wrong.", // optional
 *         detail: { // should be an object (standard error wrapper) or array (database result)
 *           _id: "003",
 *           email: "test3@test.com"
 *         }
 *       }
 *     ]
 *   }
 * }
 * ```
 */

const StandardErrorWrapper = require('./standard-error-wrapper');
const constants = require('../constants/');


const responseContext = Symbol('response-context');

class StandardResponseWrapper {

  constructor(initialData, name) {
    this[responseContext] = {};

    if (Array.isArray(initialData)) {
      this[responseContext].data = initialData;
    } else if (initialData) {
      this[responseContext].data = [initialData];
    } else {
      this[responseContext].data = [];
    }

    this[responseContext].name = name;
  }

  append(newData) {
    this[responseContext].data.push(newData);
  }

  getNthData(nth) {
    return this[responseContext].data[nth];
  }

  get name() {
    return this[responseContext].name;
  }

  get data() {
    return this[responseContext].data;
  }

  get format() {
    return {
      result: {
        meta: { name: this[responseContext].name },
        data: this[responseContext].data,
      },
    };
  }

  static deserialize(successPayloadObj) {
    if (!StandardResponseWrapper.verifyFormat(successPayloadObj)) {
      const err = new StandardErrorWrapper([
        {
          code: constants.SYSTEM.ERROR_CODES.INVALID_RESPONSE_INTERFACE,
          name: constants.SYSTEM.ERROR_NAMES.RESPONSE_OBJ_PARSE_ERROR,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: constants.SYSTEM.ERROR_MSG.RESPONSE_OBJ_PARSE_ERROR,
        },
      ]);

      throw err;
    }

    const data = successPayloadObj.result && successPayloadObj.result.data;
    const name = successPayloadObj.result && successPayloadObj.result.meta &&
      successPayloadObj.result.meta.name;

    return new StandardResponseWrapper(data, name);
  }

  static verifyFormat(obj) {
    const data = obj.result && obj.result.data;

    return !!Array.isArray(data);
  }

}

module.exports = exports = StandardResponseWrapper;
