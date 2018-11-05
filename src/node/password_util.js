/**
 * Copyright (C) 2018, Cloud Nine Apps, LLC. All Rights Reserved.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

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