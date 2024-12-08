"use strict"

var winston = require('winston');

var consoleTransport = new winston.transports.Console();

let logger = winston.createLogger({
  transports: [
    new (winston.transports.Console)(console)
  ],
  exitOnError: false,
});


module.exports = logger;