const express = require('express');
const { getDashboardSummary, getMonthlyReport } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/summary', getDashboardSummary);
router.get('/reports/monthly', getMonthlyReport);

module.exports = router;
