const StandardErrorWrapper = require('./standard-error-wrapper');
const constants = require('../constants/');


class PreconditionValidator {

  static shouldNotBeEmpty(value, errName) {
    if (
      Object.is(value, undefined) || Object.is(value, null) || Object.is(value, '') ||
      (typeof value === 'string' && value.trim().length === 0)
    ) {
      const err = new StandardErrorWrapper([
        {
          code: constants.SYSTEM.ERROR_CODES.BAD_REQUEST,
          name: errName,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: `The provided value \`${value}\` should not be empty.`,
        },
      ]);

      throw err;
    }
    return PreconditionValidator;
  }

  static shouldBeEnumType(value, options, errName) {
    if (options.indexOf(value) < 0) {
      const err = new StandardErrorWrapper([
        {
          code: constants.SYSTEM.ERROR_CODES.BAD_REQUEST,
          name: errName,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: `The provided value \`${value}\` should be one of the enumeration: ` +
            `${options.join(' ,')}.`,
        },
      ]);

      throw err;
    }
    return PreconditionValidator;
  }

  static shouldBeValidDateString(value, errName) {
    if (isNaN((new Date(value)).getTime())) {
      const err = new StandardErrorWrapper([
        {
          code: constants.SYSTEM.ERROR_CODES.BAD_REQUEST,
          name: errName,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: `The provided value \`${value}\` should be a valid timestamp.`,
        },
      ]);

      throw err;
    }
    return PreconditionValidator;
  }

  static shouldBeArrayOrArrayText(input, errName) {
    let array = input;

    if (typeof array === 'string') {
      try {
        array = JSON.parse(array);
      } catch (_err) {
        const err = new StandardErrorWrapper([
          {
            code: constants.SYSTEM.ERROR_CODES.BAD_REQUEST,
            name: errName,
            source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
            message: _err,
          },
        ]);

        throw err;
      }
    }

    if (!Array.isArray(array)) {
      const err = new StandardErrorWrapper([
        {
          code: constants.SYSTEM.ERROR_CODES.BAD_REQUEST,
          name: errName,
          source: constants.SYSTEM.COMMON.CURRENT_SOURCE,
          message: `The provided value \`${input}\` should be an array or an array text.`,
        },
      ]);

      throw err;
    }

    for (const element of array) {
      PreconditionValidator.shouldNotBeEmpty(element);
    }

    return PreconditionValidator;
  }

}

module.exports = exports = PreconditionValidator;
