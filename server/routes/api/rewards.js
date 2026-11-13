const express = require('express');
const { validateRewards } = require('../../validation/rewards');
const { calculateRewards } = require('../../services/rewards');

const router = express.Router();

router.post('/', (req, res) => {
  const { errors, value } = validateRewards(req.body);
  if (errors) {
    return res.status(400).json({ message: 'Check the calculator inputs.', errors });
  }
  return res.json(calculateRewards(value));
});

module.exports = router;
