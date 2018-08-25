/**
 * The UI class to provide user interface for C9-Membership.
 */

"use strict";

var logger = require('winston');
var Request = require('request');


module.exports = class MembershipUI {
  
  /** Initialize. */
  constructor(config) {
    this.config = config;
  }

  
  ////////////////////////////////////////////////////////////////////////////////
  // Routes
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Set up UI routes.
   * 
   * @param app: The application instance.
   */
  setupUIRoutes(app) {
    var self = this;
    app.get('/', function(request, response) {
      response.redirect('/profile');
    });
    app.get('/login', function(request, response) {
      self.showLoginPage(request, response, self.handleHTMLResponse);
    });
    app.post('/login', function(request, response) {
      Request.post({
          "url": self.prepareAPIURL('/api/login'),
          "headers": {"Content-Type": "application/json"},
          "body": JSON.stringify({"email": request.body.email, "password": request.body.password})
        }, function(err, res, body) {
          if (err) {
            self.showErrorPage(response, err, self.handleHTMLResponse);
          }
          else {
            if (res.statusCode == 200) {
              var data = JSON.parse(body);
              request.session.authToken = data.token;
              request.session.memberID = data.id;
              request.session.isAdmin = data.isAdmin;
              if (data.isAdmin) {
                response.redirect('/admin');
              }
              else {
                response.redirect('/profile');
              }
            }
            else {
              response.status(res.statusCode);
              var msg = "Login failure.";
              var data = (body) ? JSON.parse(body) : null;
              if (data) {
                msg = data.error;
              }
              self.showErrorPage(response, msg, self.handleHTMLResponse);
            }
          }
        }
      );
    });
    app.get('/logout', function(request, response) {
      Request.get(self.prepareAPIURL('/api/logout'), function(err, res, body) {
        request.session.authToken = null;
        request.session.memberID = null;
        request.session.isAdmin = null;
        if (err) {
          self.showErrorPage(response, err, self.handleHTMLResponse);
        }
        else {
          if (res.statusCode == 200) {
            self.showLoginPage(request, response, self.handleHTMLResponse);
          }
          else {
            response.status(res.statusCode);
            self.showErrorPage(response, "Unable to load the profile page.", self.handleHTMLResponse);
          }
        }
      });
    });
    app.get('/register', function(request, response) {
      self.showRegistrationPage(request, response, self.handleHTMLResponse);
    });
    app.post('/register', function(request, response) {
      Request.post({
          "url": self.prepareAPIURL('/api/members'),
          "headers": {"Content-Type": "application/json"},
          "body": JSON.stringify({"firstName": request.body.firstName, "lastName": request.body.lastName, "email": request.body.email, "password": request.body.password})
        }, function(err, res, body) {
          if (err) {
            self.showErrorPage(response, err, self.handleHTMLResponse);
          }
          else {
            if (res.statusCode == 201) {
              var data = JSON.parse(body);
              response.redirect('/login');
            }
            else {
              response.status(res.statusCode);
              var msg = "Failed to register member.";
              var data = (body) ? JSON.parse(body) : null;
              if (data) {
                msg = data.error;
              }
              self.showErrorPage(response, msg, self.handleHTMLResponse);
            }
          }
        }
      );
    });
    app.get('/profile', self.checkAuthentication, function(request, response) {
      Request.get({
          "url": self.prepareAPIURL('/api/members/' + request.session.memberID),
          "headers": {"x-access-token": request.session.authToken}
        }, function(err, res, body) {
        if (err) {
          self.showErrorPage(response, err, self.handleHTMLResponse);
        }
        else {
          if (res.statusCode == 200) {
            var data = JSON.parse(body);
            request.params.isAdmin = request.session.isAdmin;;
            request.params.id = data.id;
            request.params.email = data.email;
            request.params.password = data.password;
            request.params.firstName = data.firstName;
            request.params.lastName = data.lastName;
            request.params.avatar = data.avatar;
            self.showProfilePage(request, response, self.handleHTMLResponse);
          }
          else if (res.statusCode == 401){
            response.status(res.statusCode);
            response.redirect('/login');
          }
          else {
            response.status(res.statusCode);
            self.showErrorPage(response, "Unable to load the profile page.", self.handleHTMLResponse);
          }
        }
      });
    });
    app.post('/profile', function(request, response) {
      var requestData = {
        "url": self.prepareAPIURL('/api/members/' + + request.session.memberID),
        "headers": {"x-access-token": request.session.authToken}
      };
      // Form a multipart request if avatar is supplied
      if (request.files && request.files.avatar) {
        requestData['headers']['Content-Type'] = 'multipart/form-data';
      }
      else {
        // Avatar not supplied, submit a regular request
        requestData['headers']['Content-Type'] = 'application/json';
        requestData['body'] = JSON.stringify({"firstName": request.body.firstName, "lastName": request.body.lastName, "password": request.body.password});
      }
      var req = Request.put(requestData, function(err, res, body) {
        if (err) {
          self.showErrorPage(response, err, self.handleHTMLResponse);
        }
        else {
          if (res.statusCode == 200) {
            var data = JSON.parse(body);
            response.redirect('/profile');
          }
          else if (res.statusCode == 401){
            response.status(res.statusCode);
            response.redirect('/login');
          }
          else {
            response.status(res.statusCode);
            var msg = "Failed to update the member profile.";
            var data = (body) ? JSON.parse(body) : null;
            if (data) {
              msg = data.error;
            }
            self.showErrorPage(response, msg, self.handleHTMLResponse);
          }
        }
      });
      if (request.files && request.files.avatar) {
        var form = req.form();
        form.append("firstName", request.body.firstName);
        form.append("lastName", request.body.lastName);
        form.append("password", request.body.password);
        form.append('avatar', request.files.avatar.data, {filename: request.files.avatar.name});
      }
    });
    app.post('/member/delete', self.checkAdminAuthentication, function(request, response) {
      Request.delete({
        "url": self.prepareAPIURL('/api/members/' + request.body.id),
        "headers": {"x-access-token": request.session.authToken}
      }, function(err, res, body) {
        if (err) {
          self.showErrorPage(response, err, self.handleHTMLResponse);
        }
        else {
          if (res.statusCode == 200) {
            self.showMessagePage(response, "Member deleted successfully.", self.handleHTMLResponse);
          }
          else if (res.statusCode == 401){
            response.status(res.statusCode);
            response.redirect('/login');
          }
          else {
            response.status(res.statusCode);
            self.showErrorPage(response, "Unable to delete the member.", self.handleHTMLResponse);
          }
        }
      });
    });
    app.get('/admin', self.checkAdminAuthentication, function(request, response) {
      Request.get({
          "url": self.prepareAPIURL('/api/members'),
          "headers": {"x-access-token": request.session.authToken}
      }, function(err, res, body) {
        if (err) {
          self.showErrorPage(response, err, self.handleHTMLResponse);
        }
        else {
          if (res.statusCode == 200) {
            var id = request.session.memberID;
            var members = JSON.parse(body);
            request.params.id = id;
            request.params.members = members;
            self.showAdminPage(request, response, self.handleHTMLResponse);
          }
          else if (res.statusCode == 401){
            response.status(res.statusCode);
            response.redirect('/login');
          }
          else {
            response.status(res.statusCode);
            self.showErrorPage(response, "Unable to load the admin page.", self.handleHTMLResponse);
          }
        }
      });
    });
  }

  
  ////////////////////////////////////////////////////////////////////////////////
  // Methods
  ////////////////////////////////////////////////////////////////////////////////
  
  /**
   * Shows the registration page.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  showRegistrationPage(request, response, callback) {
    var buf = this.prepareHTMLStart('Member Registration');
    buf += `
    <form action='/register' method='post'>
      <table>
        <tr>
          <td>First Name</td>
          <td><input type='text' name='firstName'/></td>
        </tr>
        <tr>
          <td>Last Name</td>
          <td><input type='text' name='lastName'/></td>
        </tr>
        <tr>
          <td>Email</td>
          <td><input type='text' name='email'/></td>
        </tr>
        <tr>
          <td>Password</td>
          <td><input type='password' name='password'/></td>
        </tr>
        <tr>
          <td colspan='2'><center><input type='submit' value='Submit'/></center></td>
        </tr>
        <tr>
          <td colspan='2'><center><a href="/login">Login</a></center></td>
        </tr>
      </table>
    </form>`;
    buf += this.prepareHTMLEnd();
    callback(null, response, buf);
  }
  
  /**
   * Shows the login page.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  showLoginPage(request, response, callback) {
    var buf = this.prepareHTMLStart('Member Login');
    buf += `
    <form action='/login' method='post'>
      <table>
        <tr>
          <td>Email</td>
          <td><input type='text' name='email'/></td>
        </tr>
        <tr>
          <td>Password</td>
          <td><input type='password' name='password'/></td>
        </tr>
        <tr>
          <td colspan='2'><center><input type='submit' value='Submit'/></center></td>
        </tr>
        <tr>
          <td colspan='2'><center><a href="/register">Register</a></center></td>
        </tr>
      </table>
    </form>`;
    buf += this.prepareHTMLEnd();
    callback(null, response, buf);
  }
  
  /**
   * Shows the profile page.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  showProfilePage(request, response, callback) {
    var buf = this.prepareHTMLStart('Member Profile');
    var isAdmin = request.params.isAdmin;
    var email = request.params.email;
    var password = request.params.password;
    var firstName = request.params.firstName;
    var lastName = request.params.lastName;
    var avatar = request.params.avatar;
    var avatar_url = 'https://s3.amazonaws.com/c9-membership/avatars/' + avatar;
    var menu = '<a href="/logout">Logout</a>';
    if (isAdmin) {
      menu = '<a href="/admin">Admin</a>&nbsp;|&nbsp;' + menu;
    }
    buf += `
    <p><center>${menu}</center></p>
    <form action='/profile' method='post' enctype='multipart/form-data'>
      <table>
        <tr>
          <td>Email</td>
          <td><input type='text' name='email' value='${email}' readonly/></td>
        </tr>
        <tr>
          <td>First Name</td>
          <td><input type='text' name='firstName' value='${firstName}'/></td>
        </tr>
        <tr>
          <td>Last Name</td>
          <td><input type='text' name='lastName' value='${lastName}'/></td>
        </tr>
        <tr>
          <td>Password</td>
          <td><input type='password' name='password' value='' placeholder='New password'/></td>
        </tr>
        <tr>
          <td>Avatar</td>
         <td><img src='${avatar_url}'/><p><input type='file' name='avatar'/></p></td>
        </tr>
        <tr>
          <td colspan='2'><center><input type='submit' value='Submit'/></center></td>
        </tr>
      </table>
    </form>`;
    buf += this.prepareHTMLEnd();
    callback(null, response, buf);
  }
  
  /**
   * Shows the admin page.
   * 
   * @param request: The request.
   * @param response: The response.
   * @param callback: The callback to invoke with the results.
   */
  showAdminPage(request, response, callback) {
    var adminID = request.params.id;
    var members = request.params.members;
    var numMembers = (members && members.length > 0) ? members.length : 0;
    var buf = this.prepareHTMLStart('Admin');
    buf += `
    <p><center><a href="/profile">Profile</a>&nbsp;|&nbsp;<a href="/admin">Refresh</a>&nbsp;|&nbsp;<a href="/logout">Logout</a></center></p>
    <table class="data-table">
      <tr>
        <th>ID</th>
        <th>Email</th>
        <th>First Name</th>
        <th>Last Name</th>
        <th>Actions</th>
      </tr>`;
    for (var i = 0; i < numMembers; i++) {
      var id = members[i]['id'];
      var email = members[i]['email'];
      var firstName = members[i]['firstName'];
      var lastName = members[i]['lastName'];
      var action = `<form action="/member/delete" method="post"><input type="hidden" name="id" value="${id}"/><input type="submit" value="Delete"/></form>`;
      if (id == adminID) {
        action = '&nbsp;';
      }
      buf += `
      <tr>
        <td>${id}</td>
        <td>${email}</td>
        <td>${firstName}</td>
        <td>${lastName}</td>
        <td>${action}</td>
      </tr>`;
    }
    buf += `
    </table>`;
    buf += this.prepareHTMLEnd();
    callback(null, response, buf);
  }
  
  /**
   * Shows a message page.
   * 
   * @param response: The response.
   * @param message: The error message. 
   * @param callback: The callback to invoke with the results.
   */
  showMessagePage(response, message, callback) {
    var buf = this.prepareHTMLStart('Message');
    buf += `
    <div class='message-box'>
      <p>${message}</p>
      <p><center><input type='button' value='Ok' onClick='history.back();'/></center></p>
    </div>`;
    buf += this.prepareHTMLEnd();
    callback(null, response, buf);
  }
  
  /**
   * Shows an error page.
   * 
   * @param response: The response.
   * @param message: The error message. 
   * @param callback: The callback to invoke with the results.
   */
  showErrorPage(response, message, callback) {
    var buf = this.prepareHTMLStart('Error');
    var message = message ? message : 'An unknown error has occured.';
    buf += `
      <div class='error-box'>
      <p>${message}</p>
      <p><center><input type='button' value='Ok' onClick='history.back();'/></center></p>
      </div>`;
    buf += this.prepareHTMLEnd();
    callback(new Error(message), response, buf);
  }
  
  /**
   * Prepares the HTML start.
   * 
   * @param title: The page title.
   */
  prepareHTMLStart(title) {
    var buf = `<html>
  <head>
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="/css/style.css"/>
  </head>
  <body>
    <h1>${title}</h1>`;
    return buf;
  }
  
  /**
   * Prepares the HTML end.
   */
  prepareHTMLEnd() {
    var buf = `
  </body>
</html>`;
    return buf;
  }

  /**
   * Prepares the API URL.
   * 
   * @param path: The API path.
   */
  prepareAPIURL(path) {
    return "http://localhost:" + this.config.port + path ;
  }

  /**
   * Checks for a valid session.
   */
  checkAuthentication(request, response, next) {
    if (request.session.authToken) {
      logger.debug("MembershipUI::checkAuthentication(): User authenticated, proceed...");
      next();
    }
    else {
      logger.debug("MembershipUI::checkAuthentication(): User not authenticated, redirecting to login page...");
      response.redirect('/login');
    }
  }
  
  /**
   * Checks for a valid admin session.
   */
  checkAdminAuthentication(request, response, next) {
    if (request.session.isAdmin) {
      logger.debug("MembershipUI::checkAdminAuthentication(): User is an admin, proceed...");
      next();
    }
    else {
      logger.error("MembershipUI::checkAdminAuthentication(): Not an admin, redirecting to login page...");
      response.redirect('/login');
    }
  }

  /**
   * Handles the HTML response.
   * 
   * @param err: The error, if any.
   * @param response: The response object to use for sending response.
   * @param data: The data to send.
   */
  handleHTMLResponse(err, response, data) {
    if (err) {
      var status = response.statusCode ? response.statusCode : 500;
      response.status(status);
      response.end(data);
    }
    else {
      response.end(data);
    }
  }
}
