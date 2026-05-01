const express = require('express');
const router = express.Router();
const { setBudget, getBudgets, deleteBudget } = require('../controllers/budgetController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', setBudget);
router.get('/', getBudgets);
router.delete('/:id', deleteBudget);

module.exports = router;
