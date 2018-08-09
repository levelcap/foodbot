const express = require('express');
const _ = require('lodash');
const { getRsmq } = require('../src/common');
const router = express.Router();
const allIndexStart = 211267;
const allIndexEnd = 265000;
const geniusStart = 40;
const geniusEnd = 536702;

/* GET home page. */
router.get('/allRecipes', async function(req, res, next) {
  const start = parseInt(_.get(req, 'query.start', '0'), 10);
  const end = parseInt(_.get(req, 'query.end', '0'), 10);

  res.status(200).json({ status: 'Success' });
  for (let i = start; i <= end; i++) {
    console.log(`Adding ${i} to queue`);
    try {
      await getRsmq().sendMessage({ qname: 'allRecipes', message: i.toString() });
      console.log(`Added ${i}`);
    } catch (err) {
      console.log(err);
    }
  }
});

router.get('/genius', async function(req, res, next) {
  const start = parseInt(_.get(req, 'query.start', '0'), 10);
  const end = parseInt(_.get(req, 'query.end', '0'), 10);

  res.status(200).json({ status: 'Success' });
  for (let i = start; i <= end; i++) {
    console.log(`Adding ${i} to queue`);
    try {
      await getRsmq().sendMessage({ qname: 'allRecipes', message: i.toString() });
      console.log(`Added ${i}`);
    } catch (err) {
      console.log(err);
    }
  }
});

module.exports = router;
