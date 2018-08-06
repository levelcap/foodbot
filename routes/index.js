const express = require('express');
const { getRsmq } = require('../src/common');
const router = express.Router();
const RedisSMQ = require("rsmq");
const allIndexStart = 39305;
const allIndexEnd = 265000;

/* GET home page. */
router.get('/allRecipes', async function(req, res, next) {
  for (let i = allIndexStart; i <= allIndexEnd; i++) {
    await getRsmq().sendMessage({ qname: 'allRecipes', message: i.toString() });
  }
  res.status(200).json({ status: 'Success' });
});

module.exports = router;
