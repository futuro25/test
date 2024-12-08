var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var logSchema = new Schema({
    'action': {type:String, required:false},
    'data': {type:String, required:false},
    "createdAt": {type: Date, default: Date.now},
});


module.exports = mongoose.model('Log', logSchema);
