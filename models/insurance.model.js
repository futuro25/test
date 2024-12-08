var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var insuranceSchema = new Schema({
    'name': {type:String, required:false},
    'plan': {type:String, required:false},
    'contact': {type:String, required:false},
    'email': {type:String, required:false},
    'phone': {type:String, required:false},
    'cuit': {type:String, required:false},
    'address': {type:String, required:false},
    'city': {type:String, required:false},
    'category': {type:String, required:false},
    'daysForPayment': {type:String, required:false},
    'billingDay': {type:String, required:false},
    'observations': {type:String, required:false},
    "createdAt": {type: Date, default: Date.now},
    "updatedAt": {type: Date, default: Date.now},
    "deletedAt": {type: Date, default: null}
});


module.exports = mongoose.model('Insurance', insuranceSchema);
