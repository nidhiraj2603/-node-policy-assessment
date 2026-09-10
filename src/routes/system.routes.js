const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');

// Real-time CPU status
router.get('/cpu', (req, res) => {
  systemController.getCpuStatus(req, res);
});

// Simulate high CPU usage to test 70% auto-restart
router.post('/simulate-cpu-load', (req, res) => {
  systemController.simulateCpuLoad(req, res);
});

// Manually trigger restart
router.post('/restart', (req, res) => {
  systemController.triggerManualRestart(req, res);
});

module.exports = router;
