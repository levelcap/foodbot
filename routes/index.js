const express = require('express');
const { getRsmq } = require('../src/common');
const router = express.Router();
const allIndexStart = 117277;
const allIndexEnd = 265000;
const geniusStart = 40;
const geniusEnd = 536702;

/* GET home page. */
router.get('/allRecipes', async function(req, res, next) {
  res.status(200).json({ status: 'Success' });
  for (let i = allIndexStart; i <= allIndexEnd; i++) {
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
  res.status(200).json({ status: 'Success' });
  for (let i = geniusStart; i <= geniusEnd; i++) {
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
