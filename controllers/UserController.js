"use strict"

const logger      = require('../utils/logger');
const User        = require('../models/user.model');
const sendEmail = require('../utils/emails');
const utilsController = require('./UtilsController');
const self        = {};
const utils       = require('../utils/utils');
const config = require('../config');
const API_URL = config.api_url;

self.createUser = async (req, res) => {
  try {
    const user = {
      'name': req.body.name,
      'lastName': req.body.lastName,
      'username': req.body.username,
      'password': req.body.password,
      'email': req.body.email,
      'pictureUrl': req.body.pictureUrl,
      'securityLevel': req.body.securityLevel
    }

    const newUser = await User.create(user);
    const inviteLink = API_URL + "/invite?inviteId=" + newUser._id;

    const html = '<div className="flex text-sm w-full px-4"><div className="w-full py-4 flex flex-col justify-start"><p className="p-2">Bienvenid@ ' + req.body.name + '!</p><p className="p-2">Habilita tu usuario haciendo <a href="' + inviteLink + '">click aqui</a></p></div></div>';
    await sendEmail(user.email, html)

    await utilsController.createLog('User created', JSON.stringify(newUser));
    await utilsController.createLog('Welcome email sent', 'Email sent to ' + user.email);

    return res.json(newUser);
  } catch (e) {
    await utilsController.createLog('User creation error', e.message);
    console.log('User creation error', e.message)
    res = utils.handleError(res, e);
  }
};


self.getUsers = async (req, res) => {  
  try {
    const users = await User.find({deletedAt: null});
    console.log('get users', JSON.stringify(users))
    logger.info('get users', JSON.stringify(users))
    res.json(users);
  } catch (e) {
    logger.error('get users', e.message)
    res.json({error: e.message})
  }
};

self.getUserById = async (req, res) => {  
  try {
    const userId = req.params.userId;
    const user = await User.findOne({_id: userId, deletedAt: null})
    logger.info('get user by id', userId)
    res.json(user);
  } catch (e) {
    logger.error('get user by id', e.message)
    res.json({error: e.message})
  }
};

self.getUserByUsername = async (req, res) => {  
  try {
    const search = req.params.username;
    const user = await User.findOne({username: search, deletedAt: null}).exec()
    logger.info('get user by username', search)
    res.json(user);
  } catch (e) {
    logger.error('get user by username', e.message)
    res.json({error: e.message})
  }
};

self.getUserByIdAndUpdate = async (req, res) => {  
  try {
    const userId = req.params.userId;

    const filter = { _id: userId, deletedAt: null };
    const update = req.body;

    await User.findOneAndUpdate(filter, update)
    const updatedUser = await User.findOne({_id: userId})
    console.log('update user by id', userId, ' update', JSON.stringify(update))
    await utilsController.createLog('User updated', JSON.stringify(updatedUser));
    res.json(updatedUser);
  } catch (e) {
    logger.error('update user by id', e.message)
    res.json({error: e.message})
  }
};

self.deleteUserById = async (req, res) => {  
  try {
    const userId = req.params.userId;

    const filter = { _id: userId };
    const update = {deletedAt: Date.now()};

    await User.findOneAndUpdate(filter, update)
    const updatedUser = await User.findOne({_id: userId})
    await utilsController.createLog('User deleted', JSON.stringify(updatedUser));
    logger.info('delete user by id', userId)
    res.json(updatedUser);
  } catch (e) {
    logger.error('delete user by id', e.message)
    res.json({error: e.message})
  }
};

self.login = async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const masteruser = process.env.MASTERUSER;
  const masterpassword = process.env.MASTERPASS;
  logger.info('masteruser', masteruser, 'masterpassword', masterpassword, 'username', username, 'password', password)

  try {
    if (masteruser === username && masterpassword === password) {
      logger.info("es el admin")
      res.json({ username: "admin", name: "admin", lastName: "admin" });
    } else {
      const user = await User.findOne({username: username, password: password, deletedAt: null})

      if (!user) {
        throw new Error("User not found");
      }

      console.log('validate login, user: ', user)
      res.json(user);
    }
  } catch (e) {
    logger.error('validate login', e.message)
    console.log('validate login', e.message)
    res.status(401).json({error: e.message})
  }
}

module.exports = self;