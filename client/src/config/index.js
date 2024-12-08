let config;

if (window.location.hostname === 'localhost') {
  console.log('env local')
  config = require("./local.config.js");  
}

if (window.location.hostname === 'crear-app-a94ef456bf1a.herokuapp.com') {
  console.log('env dev')
  config = require("./dev.config.js");  
}

if (window.location.hostname === 'crear-prod-532897b63fc6.herokuapp.com' || window.location.hostname === 'facturacion.institutocrear.edu.ar') {
  console.log('env prod')
  config = require("./prod.config.js");  
}

module.exports = config;