"use strict"

const logger      = require('../utils/logger');
const Withholding   = require('../models/withholding.model');
const self        = {};

self.createWithholding = async (req, res) => {  
  try {
    const withholding = {
      'name': req.body.name
    }
    const newWithholding = await Withholding.create(withholding);
    logger.info('create withholding', JSON.stringify(withholding))
    return res.json(newWithholding);
  } catch (e) {
    logger.error('create withholding', e.message)
    res.json({error: e.message})
  }
};

self.getWithholdings = async (req, res) => {  
  try {
    const withholdings = await Withholding.find({deletedAt: null});
    logger.info('get withholdings', JSON.stringify(withholdings))
    res.json(withholdings);
  } catch (e) {
    logger.error('get withholdings', e.message)
    res.json({error: e.message})
  }
};

self.getWithholdingById = async (req, res) => {  
  try {
    const withholdingId = req.params.withholdingId;
    const withholding = await Withholding.findOne({_id: withholdingId, deletedAt: null})
    logger.info('get withholding by id', withholdingId)
    res.json(withholding);
  } catch (e) {
    logger.error('get withholding by id', e.message)
    res.json({error: e.message})
  }
};

self.getWithholdingByIdAndUpdate = async (req, res) => {  
  try {
    const withholdingId = req.params.withholdingId;

    const filter = { _id: withholdingId, deletedAt: null };
    const update = req.body;

    await Withholding.findOneAndUpdate(filter, update)
    const updatedWithholding = await Withholding.findOne({_id: withholdingId})
    console.log('update withholding by id', withholdingId, ' update', JSON.stringify(update))
    res.json(updatedWithholding);
  } catch (e) {
    logger.error('update withholding by id', e.message)
    res.json({error: e.message})
  }
};

self.deleteWithholdingById = async (req, res) => {  
  try {
    const withholdingId = req.params.withholdingId;

    const filter = { _id: withholdingId };
    const update = {deletedAt: Date.now()};

    await Withholding.findOneAndUpdate(filter, update)
    const updatedWithholding = await Withholding.findOne({_id: withholdingId})
    logger.info('delete withholding by id', withholdingId)
    res.json(updatedWithholding);
  } catch (e) {
    logger.error('delete withholding by id', e.message)
    res.json({error: e.message})
  }
};

module.exports = self;