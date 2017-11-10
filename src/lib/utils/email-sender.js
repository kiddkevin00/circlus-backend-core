const nodemailer = require('nodemailer');


class EmailSender {

  constructor(senderService, senderEmail) {
    // eslint-disable-next-line max-len
    // Google API Setup URL: https://developers.google.com/oauthplayground/?code=4/H5QyIJiiYzgLO2HKMMN54dMtDG8WW-zrWigW87uWKtI#
    this.transporter = nodemailer.createTransport('SMTP', ({
      service: senderService,
      auth: {
        XOAuth2: {
          user: senderEmail,
          clientId: '572537695908-o1iucehpbk5kn5cqndtlocrq24amti1u.apps.googleusercontent.com',
          clientSecret: 'KOYpGrs16BnuFgyJCvsv7iDz',
          refreshToken: '1/YK7qAoZBi2mB63E-HjvxNV8qxEqc1ZGJwOCg2GqbcZQ',
        },
      },
    }));
  }

  sendMail(from, to, subject, html) {
    return new Promise((resolve, reject) => {
      this.transporter.sendMail({ from, to, subject, html }, (err, info) => {
        if (err) {
          return reject(err);
        }
        return resolve(info);
      });
    });
  }

}

module.exports = exports = EmailSender;
