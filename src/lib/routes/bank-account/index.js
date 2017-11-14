const Controller = require('../../controllers/bank-account.controller');
const { Router } = require('express');


const router = Router();

router.post('/setup', Controller.setup);

module.exports = exports = router;
