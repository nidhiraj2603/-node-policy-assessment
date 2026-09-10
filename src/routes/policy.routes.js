const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const upload = require('../middlewares/upload.middleware');

// 1. Upload XLSX/CSV file using worker threads
router.post('/upload', upload.single('file'), (req, res, next) => {
  policyController.uploadFile(req, res, next);
});

// 2. Search API to find policy info with the help of username
router.get('/search', (req, res, next) => {
  policyController.searchByUsername(req, res, next);
});
router.get('/search/:username', (req, res, next) => {
  policyController.searchByUsername(req, res, next);
});

// 3. API to provide aggregated policy by each user
router.get('/aggregated', (req, res, next) => {
  policyController.getAggregatedPoliciesByUser(req, res, next);
});

module.exports = router;
