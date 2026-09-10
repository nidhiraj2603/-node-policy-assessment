const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');

// Post-service to schedule message insertion into DB at given day and time
router.post('/schedule', (req, res, next) => {
  messageController.scheduleMessage(req, res, next);
});

// View scheduled message records
router.get('/scheduled', (req, res, next) => {
  messageController.getScheduledMessages(req, res, next);
});

// View messages inserted into DB
router.get('/inserted', (req, res, next) => {
  messageController.getInsertedMessages(req, res, next);
});

module.exports = router;
