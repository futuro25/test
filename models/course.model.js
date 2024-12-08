var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var periodSchema = new Schema({
  'month': {type:String, required:false},
  'year': {type:String, required:false},
  'price': {type:String, required:false},
  'partialPrice': {type:String, required:false},
  'resolution': {type:String, required:false},
})

var courseSchema = new Schema({
  'name': {type:String, required:false},
  'periods': { type: [periodSchema], default: [], required: false },
  'year': {type:String, required:false},
  'month': {type:String, required:false},
  'price': {type:String, required:false},
  "createdAt": {type: Date, default: Date.now},
  "updatedAt": {type: Date, default: Date.now},
  "deletedAt": {type: Date, default: null}
});

module.exports = mongoose.model('Course', courseSchema);
