"use strict";

const logger        = require('../utils/logger'),
Product       = require('../models/product.model'),
User       = require('../models/user.model'),
self          = {};


self.getData = async () => {
  return await Product.findOne({});
};


self.createUser = async (user) => {
  return await User.insertOne(user);
};



module.exports = self;