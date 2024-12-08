var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var billingStates = require('../utils/billingStates.js');

var withholdingSchema = new Schema({
  'name': { type: String, required: false },
  'amount': { type: String, required: false },
  'createdAt': { type: String, required: false },
  'updatedAt': { type: String, required: false },
  'deletedAt': { type: String, required: false },
})

var invoicedPeriodSchema = new Schema({
  'periodId': { type: String, required: false },
  'student': { type: String, required: false },
  'amount': { type: String, required: false },
})

var debitNoteSchema = new Schema({
  'debitNoteNumber': { type: String, required: false },
  'debitNoteAmount': { type: String, required: false },
  'debitNoteDate': { type: String, required: false },
  'debitNoteCae': { type: String, required: false },
})

var receiptSchema = new Schema({
  'receiptNumber': { type: String, required: false },
  'amount': { type: String, required: false },
  'bankName': { type: String, required: false },
  'paymentMethod': { type: String, required: false },
  'cae': { type: String, required: false },
  'invoice': { type: [String], default: [], required: false },
  'invoicedPeriods': { type: [invoicedPeriodSchema], default: [], required: false },
  'itemsDetail': { type: String, required: false },
  'detail': { type: String, required: false },
  'debitNotes': { type: [debitNoteSchema], default: [], required: false },
  'withholdings': { type: [withholdingSchema], default: [], required: false },
  'status': { type: String, enum: Object.values(billingStates), default: billingStates.RECEIPT_CREATED, required: false },
  'createdAt': { type: String, required: false },
  'updatedAt': { type: String, required: false },
  'deletedAt': { type: String, required: false },
})

module.exports = mongoose.model('Receipt', receiptSchema);
