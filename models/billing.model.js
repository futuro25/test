var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var billingStates = require('../utils/billingStates.js');

var periodSchema = new Schema({
  'name': { type: String, required: false },
  'price': { type: String, required: false },
  'resolution': { type: String, required: false },
  'student': { type: String, required: false },
  'receipts': { type: [String], default: [], required: false },
})

var creditNoteSchema = new Schema({
  'creditNoteNumber': { type: String, required: false },
  'creditNoteAmount': { type: String, required: false },
  'creditNoteDate': { type: String, required: false },
  'creditNoteCae': { type: String, required: false },
})

var billingSchema = new Schema({
  'invoiceNumber': { type: String, required: false },
  'invoiceAmount': { type: String, required: false },
  'invoiceDate': { type: String, required: false },
  'insurance': { type: String, required: false },
  'cae': { type: String, required: false },
  'caeDueDate': { type: String, required: false },
  'periods': { type: [periodSchema], default: [], required: false },
  'concept': { type: String, required: false },
  'details': { type: String, required: false },
  "rememberDate": { type: Date, default: null },
  'payDate': { type: Date, default: null, required: false },
  'receipts': { type: [String], default: [], required: false },
  'creditNotes': { type: [creditNoteSchema], default: [], required: false },
  'paidInFull': { type: Boolean, default: false, required: false },
  'students': { type: [String], default: [], required: false },
  'status': { type: String, enum: Object.values(billingStates), default: billingStates.INVOICE_CREATED, required: false },
  'items': { type: [String], default: [], required: false },
  'itemsDetail': { type: String, required: false },
  'isGroupInvoice': { type: Boolean, required: false },
  'receiptType': { type: String, required: false },
  "createdAt": { type: Date, default: Date.now },
  "updatedAt": { type: Date, default: Date.now },
  "deletedAt": { type: Date, default: null }
});


module.exports = mongoose.model('Billing', billingSchema);
