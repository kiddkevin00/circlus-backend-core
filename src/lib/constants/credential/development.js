exports.JWT = {
  SECRET: 'my-jwt-secret',
  ISSUER: '0.0.0.0:8087',
  AUDIENCE: 'circlus_mobile_app',
  EXPIRES_IN: '365 days',
  NOT_BEFORE: 0,

  COOKIE_NAME: 'jwt',
  COOKIE_HTTP_ONLY: true,
  COOKIE_SECURE: false,
  COOKIE_PATH: '/api',
  COOKIE_SIGNED: false,
};

exports.STRIPE = {
  PRIVATE_KEY: 'sk_test_QgxbESIIxtkIfbprJvWPCOch',
};
