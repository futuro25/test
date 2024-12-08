"use strict"

const logger      = require('../utils/logger');
const Bank   = require('../models/bank.model');
const self        = {};

self.createBank = async (req, res) => {  
  try {
    const bank = {
      'name': req.body.name
    }
    const newBank = await Bank.create(bank);
    logger.info('create bank', JSON.stringify(bank))
    return res.json(newBank);
  } catch (e) {
    logger.error('create bank', e.message)
    res.json({error: e.message})
  }
};

self.getBanks = async (req, res) => {  
  try {
    const banks = await Bank.find({deletedAt: null});
    logger.info('get banks', JSON.stringify(banks))
    res.json(banks);
  } catch (e) {
    logger.error('get banks', e.message)
    res.json({error: e.message})
  }
};

self.getBankById = async (req, res) => {  
  try {
    const bankId = req.params.bankId;
    const bank = await Bank.findOne({_id: bankId, deletedAt: null})
    logger.info('get bank by id', bankId)
    res.json(bank);
  } catch (e) {
    logger.error('get bank by id', e.message)
    res.json({error: e.message})
  }
};

self.getBankByIdAndUpdate = async (req, res) => {  
  try {
    const bankId = req.params.bankId;

    const filter = { _id: bankId, deletedAt: null };
    const update = req.body;

    await Bank.findOneAndUpdate(filter, update)
    const updatedBank = await Bank.findOne({_id: bankId})
    console.log('update bank by id', bankId, ' update', JSON.stringify(update))
    res.json(updatedBank);
  } catch (e) {
    logger.error('update bank by id', e.message)
    res.json({error: e.message})
  }
};

self.deleteBankById = async (req, res) => {  
  try {
    const bankId = req.params.bankId;

    const filter = { _id: bankId };
    const update = {deletedAt: Date.now()};

    await Bank.findOneAndUpdate(filter, update)
    const updatedBank = await Bank.findOne({_id: bankId})
    logger.info('delete bank by id', bankId)
    res.json(updatedBank);
  } catch (e) {
    logger.error('delete bank by id', e.message)
    res.json({error: e.message})
  }
};

module.exports = self;