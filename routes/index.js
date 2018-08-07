const express = require('express');
const { getRsmq } = require('../src/common');
const router = express.Router();
const allIndexStart = 39305;
const allIndexEnd = 265000;

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

module.exports = router;
