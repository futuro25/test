var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var bankSchema = new Schema({
  'name': {type:String, required:false},
  "createdAt": {type: Date, default: Date.now},
  "updatedAt": {type: Date, default: Date.now},
  "deletedAt": {type: Date, default: null}
});


module.exports = mongoose.model('Bank', bankSchema);
