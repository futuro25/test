"use strict"

const logger = require('../utils/logger');
const Receipt = require('../models/receipt.model');
const Invoice = require('../models/billing.model');
const billingStates = require('../utils/billingStates.js');
const utils = require('../utils/utils');
const self = {};

self.createReceipt = async (req, res) => {
  try {
    const createdReceipts = await processReceipts(req.body);
    logger.info('created receipts', JSON.stringify(createdReceipts));
    return res.json(createdReceipts);
  } catch (e) {
    handleReceiptCreationError(e, res);
  }
};

// === Helper functions ===

async function processReceipts(receiptsData) {
  const createdReceipts = [];

  for (const receiptToCreate of receiptsData) {
    const createdReceipt = await createAndSaveReceipt(receiptToCreate);
    createdReceipts.push(createdReceipt);

    const periodIds = extractPeriodIds(createdReceipt);
    const studentIds = extractStudentIds(createdReceipt);

    await processInvoicesForReceipt(receiptToCreate.invoice, createdReceipt, periodIds, studentIds);
  }

  return createdReceipts;
}

async function createAndSaveReceipt(receiptToCreate) {
  return await createInvoiceReceipt(receiptToCreate);
}

function extractPeriodIds(receipt) {
  return receipt.invoicedPeriods.map(period => period.periodId);
}

function extractStudentIds(receipt) {
  return receipt.invoicedPeriods.map(period => period.student);
}

async function processInvoicesForReceipt(invoices, createdReceipt, periodIds, studentIds) {
  for (const invoiceId of invoices) {
    const currentInvoice = await findInvoice(invoiceId, periodIds, studentIds);

    if (currentInvoice) {
      await updateInvoiceWithReceipt(currentInvoice, createdReceipt);
    }
  }
}

async function findInvoice(invoiceId, periodIds, studentIds) {
  return await Invoice.findOne({
    _id: invoiceId,
    periods: { $elemMatch: { _id: { $in: periodIds } } },
    students: { $in: studentIds }
  });
}

function handleReceiptCreationError(error, res) {
  logger.error('failed created receipts', error.message);
  console.log('failed created receipts', error.message);
  res.status(error.status || 500).json({ error: error.message });
}

self.getReceipts = async (req, res) => {
  try {
    let query = { deletedAt: null };
    let notStatusArray = [];

    if (req.query.not_status) {
      notStatusArray = req.query.not_status.split(',');
    }
    query.status = { $nin: notStatusArray };

    const receipts = await Receipt.find(query).sort({ createdAt: -1 });;
    res.json(receipts);
  } catch (e) {
    logger.error('get receipts', e.message)
    res.json({ error: e.message })
  }
};

self.getReceiptById = async (req, res) => {
  try {
    const receiptId = req.params.receiptId;
    const receipt = await Receipt.findOne({ _id: receiptId, deletedAt: null })
    logger.info('get receipt by id', receiptId)
    res.json(receipt);
  } catch (e) {
    logger.error('get receipt by id', e.message)
    res.json({ error: e.message })
  }
};

self.getReceiptByIdAndUpdate = async (req, res) => {
  try {
    const receiptId = req.params.receiptId;

    const filter = { _id: receiptId, deletedAt: null };
    const update = req.body;

    await Receipt.findOneAndUpdate(filter, update)
    const updatedReceipt = await Receipt.findOne({ _id: receiptId })
    console.log('update receipt by id', receiptId, ' update', JSON.stringify(update))
    res.json(updatedReceipt);
  } catch (e) {
    logger.error('update receipt by id', e.message)
    res.json({ error: e.message })
  }
};

self.deleteReceiptById = async (req, res) => {
  try {
    const receiptId = req.params.receiptId;

    const filter = { _id: receiptId };
    const update = { deletedAt: new Date().toISOString() };

    await Receipt.findOneAndUpdate(filter, update)
    const updatedReceipt = await Receipt.findOne({ _id: receiptId })
    logger.info('delete receipt by id', receiptId)
    res.json(updatedReceipt);
  } catch (e) {
    logger.error('delete receipt by id', e.message)
    res.json({ error: e.message })
  }
};

self.deleteAllReceipts = async (req, res) => {
  try {
    const filter = { deletedAt: null }
    const update = { deletedAt: new Date().toISOString() };
    const updatedReceipt = await Receipt.updateMany(filter, update);
    res.json(updatedReceipt);
  } catch (e) {
    logger.error('delete all receipts', e.message)
    res.json({ error: e.message })
  }
}

async function updateInvoiceWithReceipt(currentInvoice, createdReceipt) {
  const invoicedPeriods = createdReceipt.invoicedPeriods;
  const hasStudentField = checkStudentField(invoicedPeriods);

  const relevantPeriods = filterRelevantPeriods(currentInvoice, invoicedPeriods, hasStudentField);

  const invoiceReceipts = await findInvoiceReceipts(currentInvoice._id);
  const receiptsAmount = calculateReceiptsAmount(invoiceReceipts, currentInvoice, hasStudentField);

  const invoiceUpdateBody = buildInvoiceUpdateBody(currentInvoice, createdReceipt, relevantPeriods, receiptsAmount);
  return await updateInvoiceInDatabase(currentInvoice._id, invoiceUpdateBody);
}

function checkStudentField(invoicedPeriods) {
  return invoicedPeriods.every(period => period.student);
}

function filterRelevantPeriods(currentInvoice, invoicedPeriods, hasStudentField) {
  return invoicedPeriods.filter(period =>
    currentInvoice.periods.some(invoicePeriod =>
      invoicePeriod._id.toString() === period.periodId &&
      (hasStudentField ? invoicePeriod.student === period.student : true)
    )
  );
}

function calculateReceiptsAmount(invoiceReceipts, currentInvoice, hasStudentField) {
  return invoiceReceipts.reduce((acc, receipt) => acc + receipt.invoicedPeriods
    .filter(rPeriod => currentInvoice.periods.some(iPeriod =>
      iPeriod._id.toString() === rPeriod.periodId &&
      (hasStudentField ? iPeriod.student === rPeriod.student : true)
    ))
    .reduce((sum, rPeriod) => sum + parseFloat(rPeriod.amount), 0),
  0);
}

function buildInvoiceUpdateBody(currentInvoice, createdReceipt, relevantPeriods, total) {
  return {
    receipts: [...currentInvoice.receipts, createdReceipt._id],
    status: total >= parseFloat(currentInvoice.invoiceAmount) ? billingStates.CLOSED : billingStates.RECEIPT_CREATED,
    paidInFull: total >= parseFloat(currentInvoice.invoiceAmount),
    periods: currentInvoice.periods.map(period => {
      const foundPeriod = relevantPeriods.find(
        periodToFind => periodToFind.periodId === period._id.toString() &&
        periodToFind.student === period.student
      );
      if (foundPeriod) {
        period.receipts = [...period.receipts, createdReceipt._id];
      }
      return period;
    })
  };
}

async function updateInvoiceInDatabase(invoiceId, invoiceUpdateBody) {
  const filter = { _id: invoiceId, deletedAt: null };
  const updatedInvoice = await Invoice.findOneAndUpdate(filter, invoiceUpdateBody, { new: true });
  console.log('invoiceUpdateBody', invoiceUpdateBody);
  return updatedInvoice;
}

async function findInvoiceReceipts(invoice) {
  return await Receipt.find({ invoice: invoice, deletedAt: null, debitNotes: [] });
}

async function createInvoiceReceipt(receiptToCreate) {
  const withholdings = receiptToCreate.withholdings.map(withholding => {
    return {
      name: withholding.name,
      amount: withholding.amount,
      createdAt: new Date().toISOString(),
    }
  });

  const receiptBody = {
    'receiptNumber': receiptToCreate.receiptNumber,
    'amount': receiptToCreate.amount,
    'createdAt': new Date().toISOString(),
    'bankName': receiptToCreate.bankName,
    'paymentMethod': receiptToCreate.paymentMethod,
    'cae': receiptToCreate.cae,
    'invoice': receiptToCreate.invoice,
    'invoicedPeriods': receiptToCreate.invoicedPeriods,
    'itemsDetail': receiptToCreate.itemsDetail,
    'detail': receiptToCreate.detail,
    'withholdings': withholdings
  };

  console.log('receiptBody', receiptBody);
  const createdReceipt = await Receipt.create(receiptBody);
  return createdReceipt;
}

self.createDebitNote = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const updateBody = { ...req.body };
    const filter = { _id: receiptId, deletedAt: null };

    const currentReceipt = await Receipt.findOne({ _id: receiptId });
    if (!currentReceipt) throw new Error('Receipt not found');

    updateBody.status = billingStates.DEBIT_NOTE_CREATED;
    updateBody.debitNotes = [...currentReceipt.debitNotes, ...updateBody.debitNotes];

    const updatedReceipt = await Receipt.findOneAndUpdate(filter, updateBody, { new: true });
    if (!updatedReceipt) throw new Error('Receipt update failed');

    await updateInvoiceStatus(updatedReceipt.invoice);

    console.log(`Debit note created for receiptId: ${receiptId}`, {
      receiptUpdate: updateBody,
      invoiceUpdate: { status: billingStates.DEBIT_NOTE_CREATED, paidInFull: false },
    });

    res.json(updatedReceipt);
  } catch (e) {
    console.log(`Debit note creation failed: ${e.message}`);
    res = utils.handleError(res, e);
  }
};

const updateInvoiceStatus = async (invoiceIds) => {
  const invoiceUpdateBody = {
    status: billingStates.DEBIT_NOTE_CREATED,
    paidInFull: false,
  };

  const updatePromises = invoiceIds.map(invoiceId => {
    console.log(`Updating invoice ${invoiceId} with`, invoiceUpdateBody);
    return Invoice.findOneAndUpdate({ _id: invoiceId }, { $set: invoiceUpdateBody });
  });

  const updatedInvoices = await Promise.all(updatePromises);

  if (updatedInvoices.some(invoice => !invoice)) {
    throw new Error('One or more invoice updates failed');
  }
};

module.exports = self;
