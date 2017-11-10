const Controller = require('../../controllers/payment.controller');
const { Router } = require('express');


const router = Router();

router.post('/proceed', Controller.proceed);

module.exports = exports = router;
