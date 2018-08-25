/**
 * The class to provide REST API for C9-Membership.
 */

"use strict";

var logger = require('winston');
var crypto = require('crypto');
var mysql = require("mysql");
var jwt = require('jsonwebtoken');
var AWS = require('aws-sdk');
const uuidv1 = require('uuid/v1');

const DEFAULT_AVATAR = 'default_avatar.png';


module.exports = class MembershipAPI {
  
  /** Initialize. */
  constructor(config) {
    this.config = config;
    var decipher = crypto.createDecipher('aes-128-cbc', this.config.authentication.secret);
    var passwd = decipher.update(this.config.database.password, 'hex', 'utf8');
    passwd += decipher.final('utf8');
    this.pool = mysql.createPool({
      host           : this.config.database.host,
      port           : this.config.database.port,
      user           : this.config.database.user,
      password       : passwd,
      database       : this.config.database.dbName,
      connectionLimit: this.config.database.numPooledConnections
    });
  }

  
  ////////////////////////////////////////////////////////////////////////////////
  // Routes
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Set up API routes.
   * 
   * @param app: The application instance.
   */
  setupAPIRoutes(app) {
    var self = this;
    app.post('/api/login', function(request, response) {
      self.login(request, response, function(err, response, status, data) {
        // If status not provided, compute it
        if (!status) {
          status = (!err) ? 200 : 401;
        }
        self.handleAPIResponse(status, err, response, data);
      });
    });
    app.get('/api/logout', function(request, response) {
      self.logout(request, response, function(err, response, data) {
        var status = (!err) ? 200 : 500;
        self.handleAPIResponse(status, err, response, data);
      });
    });
    app.get('/api/members', self.checkAuthentication(this, true), function(request, response) {
      self.getMembers(request, response, function(err, response, data) {
        var status = (!err) ? 200 : 500;
        self.handleAPIResponse(status, err, response, data);
      });
    });
    app.get('/api/members/:id', self.checkAuthentication(this, false), function(request, response) {
      self.getMember(request, response, function(err, response, data) {
        var status = (!err) ? 200 : 500;
        self.handleAPIResponse(status, err, response, data);
      });
    });
    app.post('/api/members', function(request, response) {
      self.addMember(request, response, function(err, response, data) {
        var status = (!err) ? 201 : 500;
        self.handleAPIResponse(status, err, response, data);
      });
    });
    app.put('/api/members/:id', self.checkAuthentication(this, false), function(request, response) {
      self.updateMember(request, response, function(err, response, data) {
        var status = (!err) ? 200 : 500;
        self.handleAPIResponse(status, err, response, data);
      });
    });
    app.delete('/api/members/:id', self.checkAuthentication(this, true), function(request, response) {
      self.deleteMember(request, response, function(err, response, data) {
        var status = (!err) ? 200 : 500;
        self.handleAPIResponse(status, err, response, data);
      });
    });
  }

  
  ////////////////////////////////////////////////////////////////////////////////
  // Methods
  ////////////////////////////////////////////////////////////////////////////////
  
  /**
   * Performs login.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   * 
   * @return Returns the response as (status, id) where
   * - status: Indicates the status of request from {success|failure}.
   * - id: The member's ID if the login was successful.
   */
  login(request, response, callback) {
    var self = this;
    var email = request.body.email;
    var password = request.body.password;
    var requiredFields = [];
    if (!email) {
      requiredFields.push('Email');
    }
    if (!password) {
      requiredFields.push('Password');
    }
    if (requiredFields.length > 0) {
      return callback(new Error("Missing required field(s)"), response, 500, this.prepareErrorResponse("Following field(s) are required: " + JSON.stringify(requiredFields)));
    }
    var stmt = "select id, email from member where email=? and password=SHA1(?)";
    var params = [email, password];
    var maskFields = [1];
    this.executeDBRequest(stmt, params, maskFields, function(err, data) {
      if (err) {
        return callback(err, response);
      }
      else if (data != null && data.length > 0){
        var id = data[0]['id'];
        var email = data[0]['email'];
        var isAdmin = (self.config.adminEmail == email) ? true : false;
        data = {"status": "success", "id": id, "isAdmin": isAdmin};
        var token = jwt.sign(data, self.config.authentication.secret, {expiresIn: self.config.authentication.tokenValidity});
        data['token'] = token;
        return callback(null, response, 200, data);
      }
      else {
        logger.error("MembershipAPI::login(): No matching record found.");
        data = {"status": "error"};
        return callback(new Error("Login failure"), response, 401, data);
      }
    });
  }
  
  /**
   * Performs logout.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  logout(request, response, callback) {
    request.session.member_id = null;
    callback(null, response, null);
  }
  
  /**
   * Returns the list of members.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  getMembers(request, response, callback) {
    var stmt = "select ID as 'id', first_name as 'firstName', last_name as 'lastName', email from member";
    var params = null;
    this.executeDBRequest(stmt, params, null, function(err, data) {
      if (err) {
        return callback(err, response);
      }
      else {
        return callback(null, response, data);
      }
    });
  }

  /**
   * Returns the specified member.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  getMember(request, response, callback) {
    var id = request.params.id;
    var stmt = "select ID as 'id', first_name as 'firstName', last_name as 'lastName', email, avatar from member where ID=?";
    var params = [id];
    this.executeDBRequest(stmt, params, null, function(err, data) {
      if (err) {
        return callback(err, response);
      }
      else {
        var member = {};
        if (Array.isArray(data) && data.length > 0) {
          member = data[0];
          member['avatar'] = member['avatar'] ? member['avatar'] : DEFAULT_AVATAR;
        }
        return callback(null, response, member);
      }
    });
  }
  
  /**
   * Adds a member.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  addMember(request, response, callback) {
    var firstName = request.body.firstName;
    var lastName = request.body.lastName;
    var email = request.body.email;
    var password = request.body.password;
    var avatar_file = DEFAULT_AVATAR;
    var requiredFields = [];
    if (!firstName) {
      requiredFields.push('First Name');
    }
    if (!lastName) {
      requiredFields.push('Last Name');
    }
    if (!email) {
      requiredFields.push('Email');
    }
    if (!password) {
      requiredFields.push('Password');
    }
    if (requiredFields.length > 0) {
      return callback(new Error("Missing required field(s)"), response, this.prepareErrorResponse("Following field(s) are required: " + JSON.stringify(requiredFields)));
    }
    var stmt = "insert into member(first_name, last_name, email, password, avatar) values(?, ?, ?, SHA1(?), ?)";
    var params = [firstName, lastName, email, password, avatar_file];
    var maskFields = [3];
    this.executeDBRequest(stmt, params, maskFields, function(err, data) {
      if (err) {
        return callback(err, response);
      }
      else {
        data = {"status": "success"};
        return callback(null, response, data);
      }
    });
  }
  
  /**
   * Updates a member.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  updateMember(request, response, callback) {
    var self = this;
    var id = request.params.id;
    var firstName = request.body.firstName;
    var lastName = request.body.lastName;
    var password = request.body.password;
    var avatar = request.files ? request.files.avatar : null;
    var requiredFields = [];
    if (request.files) {
      logger.debug("MembershipAPI::updateMember(): Avatar supplied, uploading it to S3 bucket '" + self.config.aws.bucket + "'");
    }
    if (!firstName) {
      requiredFields.push('First Name');
    }
    if (!lastName) {
      requiredFields.push('Last Name');
    }
    if (requiredFields.length > 0) {
      return callback(new Error("Missing required field(s)"), response, this.prepareErrorResponse("Following field(s) are required: " + JSON.stringify(requiredFields)));
    }
    var stmt = "update member set first_name=?, last_name=? where ID=?";
    var params = [firstName, lastName, id];
    var maskFields = null;
    if (password) {
      stmt = "update member set first_name=?, last_name=?, password=SHA1(?) where ID=?";
      params = [firstName, lastName, password, id];
      maskFields = [2];
    }
    this.executeDBRequest(stmt, params, maskFields, function(err, data) {
      if (err) {
        return callback(err, response);
      }
      else {
        if (avatar) {
          logger.debug("MembershipAPI::updateMember(): Avatar supplied, uploading it to S3 bucket: " + self.config.aws.s3Bucket);
          var s3 = new AWS.S3();
          var uploadReq = {
            Bucket: self.config.aws.s3Bucket,
            Key: 'avatars/' + avatar.name,
            ACL: 'private',
            Body: avatar.data
          };
          s3.upload(uploadReq, function(err, data) {
            if (err) {
              return callback(err, response);
            }
            else {
              // File uploaded to S3 successfully
              logger.debug("MembershipAPI::updateMember(): Avatar '" + avatar.name + "' uploaded to S3 bucket successfully");
              var stmt = "update member set avatar=? where ID=?";
              var params = [avatar.name, id];
              self.executeDBRequest(stmt, params, null, function(err, data) {
                if (err) {
                  return callback(err, response);
                }
                else {
                  data = {"status": "success"};
                  return callback(null, response, data);
                }
              });
            }
          });
        }
        else {
          data = {"status": "success"};
          return callback(null, response, data);
        }
      }
    });
  }

  /**
   * Deletes the specified member.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  deleteMember(request, response, callback) {
    var id = request.params.id;
    var stmt = "delete from member where ID=?";
    var params = [id];
    this.executeDBRequest(stmt, params, null, function(err, data) {
      if (err) {
        return callback(err, response);
      }
      else {
        data = {"status": "success"};
        return callback(null, response, data);
      }
    });
  }
  
  /**
   * Executes a database request.
   * 
   * @param stmt: The SQL statement.
   * @param params: The statement parameters, if any. Otherwise, specify null.
   * @param maskFields: An array of field indexes to be masked from logging. Otherwise, specify null.
   * @param callback: The callback to invoke with the results.
   */
  executeDBRequest(stmt, params, maskFields, callback) {
    var logParams = JSON.parse(JSON.stringify(params));
    if (maskFields != null ) {
      for (var i = 0; i < maskFields.length; i++) {
        logParams[maskFields[i]] = "*****";
      }
    }
    if (logParams != null) {
      logger.debug("MembershipAPI::executeDBRequest(): stmt: '" + stmt + "', params: " + JSON.stringify(logParams));
    }
    else {
      logger.debug("MembershipAPI::executeDBRequest(): stmt: '" + stmt + "'");
    }
    this.pool.getConnection(function(err, con) {
      if (err) {
        return callback(err);
      }
      else {
        con.query(stmt, params, function(err, rows, fields) {
          con.release(); // Release connection to make it available for other requests
          if (err) {
            return callback(err);
          }
          else {
            return callback(null, rows);
          }
        });
        
        // Error handling
        con.on('error', function(err) {
          return callback(err);
        });
      }
    });
  }
  
  /**
   * Prepares an error response.
   * 
   * @param msg: The error message.
   */
  prepareErrorResponse(msg) {
    return {"error": msg};
  }
  
  /**
   * Checks for authentication.
   * 
   * @param self: A reference to the object.
   * @param checkAdmin: If true, it will check additionally for user to be an admin user.
   */
  checkAuthentication(self, checkAdmin) {
    // Note: We need to wrap the actual authentication method inside another method as 'this' is not available to callbacks directly.
    return function(request, response, next) {
      var token = request.headers['x-access-token'];
      var tokenMsg = (token) ? "available" : "empty";
      logger.debug("MembershipAPI::checkAuthentication(): token: " + tokenMsg + ", x-amzn-trace-id: " + request.headers['x-amzn-trace-id']);
      if (!token) {
        logger.error("MembershipAPI::checkAuthentication(): Unauthorized request.");
        return response.status(401).send(self.prepareErrorResponse("Unauthorized request."));
      }
      else {
        jwt.verify(token, self.config.authentication.secret, function(err, data) {
          if (err) {
            logger.error("MembershipAPI::checkAuthentication(): Invalid token.");
            return response.status(401).send(self.prepareErrorResponse("Invalid token."));
          }
          else {
            request.params.authData = data;
            if (checkAdmin && !data.isAdmin) {
              logger.error("MembershipAPI::checkAuthentication(): Admin access required, but specified token is not for an admin.");
              return response.status(401).send(self.prepareErrorResponse("Admin access is required, but the specified token is not for an admin."));
            }
            next();
          }
        });
      }
    }
  }
  
  /**
   * Handles the API response.
   * 
   * @param status: The HTTP status code.
   * @param err: The error, if any.
   * @param response: The response object to use for sending response.
   * @param data: The data to send.
   */
  handleAPIResponse(status, err, response, data) {
    response.status(status);
    if (data) {
      response.json(data);
    }
    else {
      response.end();
    }
    if (err) {
      data = data ? data : '';
      logger.error("MembershipAPI::handleAPIResponse(): Error: " + err + ", data: " + JSON.stringify(data));
    }
  }
}