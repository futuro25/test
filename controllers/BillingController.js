"use strict"

const logger = require('../utils/logger');
const Billing = require('../models/billing.model');
const self = {};
const utils = require('../utils/utils');
const billingStates = require('../utils/billingStates.js');

self.createBilling = async (req, res) => {
  try {
    const billings = [];
    console.log('req.body', req.body);

    for (const invoiceRequest of req.body) {
      const commonFields = {
        'invoiceNumber': invoiceRequest.invoiceNumber,
        'invoiceAmount': invoiceRequest.invoiceAmount,
        'invoiceDate': invoiceRequest.invoiceDate,
        'cae': invoiceRequest.cae,
        'caeDueDate': invoiceRequest.caeDueDate,
        'insurance': invoiceRequest.insurance,
        'concept': invoiceRequest.concepts.join(', '),
        'details': invoiceRequest.details,
        'rememberDate': utils.addDaysToDate(new Date(), invoiceRequest.rememberDate),
        'isGroupInvoice': invoiceRequest.isGroupInvoice,
        'itemsDetail': invoiceRequest.itemsDetail,
        'receiptType': invoiceRequest.receiptType,
      };

      if (commonFields.isGroupInvoice === true) {
        const billing = {
          ...commonFields,
          'periods': invoiceRequest.periods,
          'students': invoiceRequest.items.map(item => item.student).flat(),
          'items': invoiceRequest.items.map(item => item.detail),
        };

        billings.push(await Billing.create(billing));
      } else {
        for (const item of invoiceRequest.items) {
          const billing = {
            ...commonFields,
            'periods': invoiceRequest.periods.filter(period => period.student === item.student._id),
            'students': [item.student],
            'items': [item.detail],
          };
          const createdInvoice = await Billing.create(billing);
          billings.push(createdInvoice);
        }
      }
    }

    console.log('created billings', billings);
    logger.info('created billings', JSON.stringify(billings));
    return res.json(billings);
  } catch (e) {
    console.error('Error creating billing:', e);
    logger.error('create billing', e.message);
    res = utils.handleError(res, e);
  }
};

self.getBillings = async (req, res) => {
  try {
    let query = { deletedAt: null };
    let notStatusArray = [];

    if (req.query.not_status) {
      notStatusArray = req.query.not_status.split(',');
    }
    // notStatusArray.push('CREDIT_NOTE_CREATED');
    query.status = { $nin: notStatusArray };

    const billings = await Billing.find(query);

    logger.info('get billings', JSON.stringify(billings))
    res.json(billings);
  } catch (e) {
    logger.error('get billings', e.message)
    res = utils.handleError(res, e);
  }
};

self.getBillingsNotifications = async (req, res) => {
  try {
    const { operation = 'add', days = '30' } = req.params;
    const currentDate = new Date(new Date().setHours(0, 0, 0, 0));
    const { startDate, endDate } = buildDateFilters(operation, days, currentDate);

    let billings = await Billing.find({
      deletedAt: null,
      rememberDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'CLOSED' },
      updatedAt: { $lt: currentDate }
    }).sort({ updatedAt: 1 });

    res.json(billings);
  } catch (e) {
    logger.error('get billings', e.message);
    res = utils.handleError(res, e);
  }
};

self.getAllBillingsNotifications = async (req, res) => {
  try {
    const billings = await Billing.find({ deletedAt: null });

    logger.info('get billings', JSON.stringify(billings))
    res.json(billings);
  } catch (e) {
    logger.error('get billings', e.message)
    res = utils.handleError(res, e);
  }
};

self.getBillingById = async (req, res) => {
  try {
    const billingId = req.params.billingId;
    const billing = await Billing.findOne({ _id: billingId, deletedAt: null })
    logger.info('get billing by id', billingId)
    res.json(billing);
  } catch (e) {
    logger.error('get billing by id', e.message)
    res = utils.handleError(res, e);
  }
};

self.getBillingByBillingname = async (req, res) => {
  try {
    const search = req.params.billingname;
    const billing = await Billing.findOne({ billingname: search, deletedAt: null }).exec()
    logger.info('get billing by billingname', search)
    res.json(billing);
  } catch (e) {
    logger.error('get billing by billingname', e.message)
    res = utils.handleError(res, e);
  }
};

self.getBillingByIdAndUpdate = async (req, res) => {
  try {
    const billingId = req.params.billingId;
    const filter = { _id: billingId, deletedAt: null };
    let updateBody = req.body;

    const updatedBilling = await Billing.findOneAndUpdate(filter, updateBody, { new: true });

    logger.info('Updated billing by id', billingId, ' Update', JSON.stringify(updateBody));
    res.json(updatedBilling);
  } catch (e) {
    logger.error('Updated billing by id', e.message);
    res = utils.handleError(res, e);
  }
};

self.createCreditNote = async (req, res) => {
  try {
    let updateBody = req.body;
    const billingId = req.params.billingId;
    const filter = { _id: billingId, deletedAt: null };
    const currentBilling = await Billing.findOne({ _id: billingId });

    updateBody.status = billingStates.CREDIT_NOTE_CREATED;
    updateBody.creditNotes = [...currentBilling.creditNotes, ...updateBody.creditNotes];

    const updatedBilling = await Billing.findOneAndUpdate(filter, updateBody, { new: true });

    logger.info('Credit note created', billingId, ' Body: ', JSON.stringify(updateBody));
    res.json(updatedBilling);
  } catch (e) {
    logger.error('Credit note creation failed', e.message);
    res = utils.handleError(res, e);
  }
}

//TODO Deprecar
self.deleteBillingById = async (req, res) => {
  const billingId = req.params.billingId;

  try {
    const filter = { _id: billingId };
    const update = { deletedAt: Date.now() };

    const updatedBilling = await Billing.findOneAndUpdate(filter, update, { new: true });
    logger.info('Deleted billing with id: ', billingId)

    res.json(updatedBilling);
  } catch (e) {
    logger.error('Error deleting billing with id: ' + billingId, e.message)
    res = utils.handleError(res, e);
  }
};

function buildDateFilters(operation, days, currentDate) {
  const rememberDateTo = new Date(currentDate);
  rememberDateTo.setHours(23, 59, 59, 999);

  if (operation === 'add') {
    rememberDateTo.setDate(rememberDateTo.getDate() + parseInt(days));
  } else {
    rememberDateTo.setDate(rememberDateTo.getDate() - parseInt(days));
  }

  return { startDate: currentDate, endDate: rememberDateTo };
}

self.deleteAllInvoices = async (req, res) => {
  try {
    const filter = { deletedAt: null }
    const update = { deletedAt: new Date().toISOString() };
    const updatedInvoice = await Billing.updateMany(filter, update);
    res.json(updatedInvoice);
  } catch (e) {
    logger.error('delete all invoices', e.message)
    res.json({ error: e.message })
  }
}

module.exports = self;
