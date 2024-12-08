"use strict"

const logger      = require('../utils/logger');
const Insurance        = require('../models/insurance.model');
const self        = {};

self.createInsurance = async (req, res) => {  
  try {
    const insurance = {
      'name': req.body.name,
      'plan': req.body.plan,
      'contact': req.body.contact,
      'cuit': req.body.cuit,
      'address': req.body.address,
      'city': req.body.city,
      'category': req.body.category,
      'email': req.body.email,
      'phone': req.body.phone,
      'daysForPayment': req.body.daysForPayment,
      'billingDay': req.body.billingDay,
      'observations': req.body.observations
    }
    const newInsurance = await Insurance.create(insurance);
    logger.info('create insurance', JSON.stringify(insurance))
    return res.json(newInsurance);
  } catch (e) {
    logger.error('create insurance', e.message)
    res.json({error: e.message})
  }
};

self.getInsurances = async (req, res) => {  
  try {
    const insurances = await Insurance.find({deletedAt: null});
    // logger.info('get insurances', JSON.stringify(insurances))
    res.json(insurances);
  } catch (e) {
    logger.error('get insurances', e.message)
    res.json({error: e.message})
  }
};

self.getInsuranceById = async (req, res) => {  
  try {
    const insuranceId = req.params.insuranceId;
    const insurance = await Insurance.findOne({_id: insuranceId, deletedAt: null})
    logger.info('get insurance by id', insuranceId)
    res.json(insurance);
  } catch (e) {
    logger.error('get insurance by id', e.message)
    res.json({error: e.message})
  }
};

self.getInsuranceByIdAndUpdate = async (req, res) => {  
  try {
    const insuranceId = req.params.insuranceId;

    const filter = { _id: insuranceId, deletedAt: null };
    const update = req.body;

    await Insurance.findOneAndUpdate(filter, update)
    const updatedInsurance = await Insurance.findOne({_id: insuranceId})
    console.log('update insurance by id', insuranceId, ' update', JSON.stringify(update))
    res.json(updatedInsurance);
  } catch (e) {
    logger.error('update insurance by id', e.message)
    res.json({error: e.message})
  }
};

self.deleteInsuranceById = async (req, res) => {  
  try {
    const insuranceId = req.params.insuranceId;

    const filter = { _id: insuranceId };
    const update = {deletedAt: Date.now()};

    await Insurance.findOneAndUpdate(filter, update)
    const updatedInsurance = await Insurance.findOne({_id: insuranceId})
    logger.info('delete insurance by id', insuranceId)
    res.json(updatedInsurance);
  } catch (e) {
    logger.error('delete insurance by id', e.message)
    res.json({error: e.message})
  }
};

module.exports = self;