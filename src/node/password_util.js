/**
 * A utility to generate encrypted password.
 * 
 * Usage:
 *   node password_util.js -enc
 */

"use strict";

var crypto = require('crypto');
var prompt = require('prompt');


/**
 * Encrypts the specified password.
 * 
 * @param passwd: The password to encrypt.
 * 
 * @returns Returns the encrypted password.
 */
function encrypt(passwd) {
  var secret = "c9-membership";
  var cipher = crypto.createCipher('aes-128-cbc', secret);
  var encryptedPasswd = cipher.update(passwd, 'utf8', 'hex');
  encryptedPasswd += cipher.final('hex');
  return encryptedPasswd;
}

/**
 * Prints the usage.
 */
function usage() {
  console.log("node password_util.js -enc");
  process.exit(1);
}

/**
 * Main.
 */
function main() {
  var args = process.argv.slice(2);
  if (args[0] != '-enc') {
    usage();
  }
  var props = [{
    name: 'password',
    hidden: true
  }];
  prompt.start();
  prompt.get(props, function(err, result) {
    if (err) {
      console.log(err);
    }
    else {
      var encryptedPasswd = encrypt(result.password);
      console.log(encryptedPasswd);
      process.exit(0);
    }
  });
}

main();