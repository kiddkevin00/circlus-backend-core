exports.ERROR_NAMES = {
  JWT_INVALID: 'JWT_INVALID',
  JWT_NOT_AUTHORIZED: 'JWT_NOT_AUTHORIZED',
  JWT_GENERATION_ERROR: 'JWT_GENERATION_ERROR',
};

exports.ERROR_MSG = {
  JWT_INVALID: 'The provided JWT is invalid.',
  JWT_NOT_AUTHORIZED: 'The provided JWT identity is not authorized to access the resource.',
  JWT_GENERATION_ERROR: 'Something went wrong while generating JWT token.',
};

exports.CORS = {
  WHITELIST: [
    'https://circlus.herokuapp.com',
    'http://0.0.0.0:8086',
    'http://127.0.0.1:8086',
    'http://localhost:8086',
  ],
};

