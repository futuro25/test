var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var studentSchema = new Schema({
    'name': { type: String, required: false },
    'lastName': { type: String, required: false },
    'email': { type: String, required: false },
    'pictureUrl': { type: String, required: false },
    'healthInsurance': { type: String, required: false },
    'documentNumber': { type: String, required: false },
    'cudUrl': { type: String, required: false },
    "cudDueDate": { type: Date, required: false },
    "birthdayDate": { type: String, required: false },
    "billingDue": { type: Date, required: false },
    'course': { type: String, required: false },
    'enabled': { type: String, required: false, default: "SI" },
    "affiliateNumber": { type: String, required: false },
    "affiliateRelative": { type: String, required: false },
    "invoiceHolder": { type: String, required: false },
    "observations": { type: String, required: false },
    'parents': [
        {
            'name': { type: String, required: false },
            'lastName': { type: String, required: false },
            'documentType': { type: String, required: false },
            'documentNumber': { type: String, required: false },
            'phone': { type: String, required: false },
            'email': { type: String, required: false },
            'address': {type:String, required:false},
            'city': {type:String, required:false},
        },
        {
            'name': { type: String, required: false },
            'lastName': { type: String, required: false },
            'documentType': { type: String, required: false },
            'documentNumber': { type: String, required: false },
            'phone': { type: String, required: false },
            'email': { type: String, required: false },
            'address': {type:String, required:false},
            'city': {type:String, required:false},
        }
    ],
    "createdAt": { type: Date, default: Date.now },
    "updatedAt": { type: Date, default: Date.now },
    "deletedAt": { type: Date, default: null }
});


module.exports = mongoose.model('student', studentSchema);
