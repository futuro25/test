"use strict"

const logger      = require('../utils/logger');
const Log   = require('../models/log.model');
const self        = {};


self.getLogs = async (req, res) => {  
  try {
    const logs = await Log.find({deletedAt: null});
    logger.info('get logs', JSON.stringify(logs))
    res.json(logs);
  } catch (e) {
    logger.error('get logs', e.message)
    res.json({error: e.message})
  }
};

module.exports = self;