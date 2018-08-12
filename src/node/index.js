/**
 * The main file for the C9-Membership application.
 */

"use strict";

var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var MembershipAPI = require('./routes/MembershipAPI');
var MembershipUI = require('./routes/MembershipUI');


// Initialize
var config = require('./config.json');
var logger = require('winston');
app.use(express.static('public'));
app.use(session({key: 'member_id', secret: config.authentication.secret, resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload());


////////////////////////////////////////////////////////////////////////////////
// Methods
////////////////////////////////////////////////////////////////////////////////

/**
 * Initializes the application.
 */
function init() {
  initLogger();
  var api = new MembershipAPI(config);
  var ui = new MembershipUI(config);
  api.setupAPIRoutes(app);
  ui.setupUIRoutes(app);
}

/**
 * Initializes the logger.
 */
function initLogger() {
  var options = {
    console: {
      level: config.logLevel
    },
    file: {
      level: config.logLevel,
      filename: './c9-membership.log'
    }
  };
  logger.configure({
    format: logger.format.combine(
      logger.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
      logger.format.printf(entry => `${entry.timestamp} [${entry.level}]: ${entry.message}`)
    ),
    transports: [
      new logger.transports.Console(options.console),
      new logger.transports.File(options.file)
    ]
  });
  logger.debug("Logger initialized.");
}


////////////////////////////////////////////////////////////////////////////////
// Main
////////////////////////////////////////////////////////////////////////////////

//Create web server
init();
app.listen(config.port, function() {
  logger.info("Server is running on port " + config.port);
});
