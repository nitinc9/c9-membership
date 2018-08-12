# Introduction

C9-Membership is a simple membership management application based on Node.js and MySQL that demonstrates key aspects of a typical web application. It is intentionally simple, yet covers some core areas of application development.

## Features

It supports 2 personas.

* Member: A regular member of the application.
* Admin: An admin user that can manage other users.

Following are the features supported.

* Member
    * Self-registration
    * Login
    * Profile Management
    * Upload Avatar (uses AWS S3 for storage)
* Admin
    * Configurable Admin user
    * View all Members
    * Delete Member

    
# Getting Started

## Pre-requisites

* Node.js 8+
* npm 5.6+
* MySQL 5.6+
* Optional: Latest AWS CLI

## AWS Setup

* Create an IAM user (say, `c9-membership-app`) with programmatic access and policy as specified in `resources/IAM/C9-Membership_App_Permissions.json`. Make sure to grab the access and secret keys and store these on your development machine under `${HOME}/.aws/credentials`. Example
```
[c9-membership-app]
aws_access_key_id = <your-access-key>
aws_secret_access_key = <your-secret-key>
```
Note: The `c9-membership-app` in the above file is referred to as an AWS profile.
* Create an S3 bucket and assign it a bucket policy as specified in `resources/S3/s3_bucket_policy.json`. Ensure that the policy has the correct IP address(es). Feel free to tweak the policy further per your need.

## Setup

* Create the database using the `src/scripts/db/create_db.sql`. Change the database name, user name and password, if needed.
* Create the database schema using the `src/scripts/db/create_schema.sql`.
* Switch to the `src/node` directory.
* Install the required dependencies.
```
npm i
```
* Generate encrypted password for database.
```
node password_util.js -enc
```
* Update `config.json` per your deployment.
  * Make sure to update the bucket name to the one created during AWS setup.

## Running the Application

* Create an environment variable `AWS_PROFILE` and point it to the `c9-membership-app` profile.
```
export AWS_PROFILE=c9-membership-app
```

### Running the Application in Development Mode

* Use the following command to run in the development mode. This supports hot deployment (i.e., changes to source code are dynamically picked up without needing to restart the application).
```
  npm run dev
```

### Running the Application in Production

* Use the following command to start the application (runs as a daemon).
```
npm run start
```
* Use the following command to stop the application (daemon).
```
npm run stop
```
* Use the following command to check the status of the application.
```
npm run status
```
* Once the application is running successfully, use the following command to install the application as a service (restarts application automatically post reboot).
```
npm run install-service
```
* Connect to your application
```
http://host:port/
```
Example
```
http://localhost:9090/
```


# Resources

* Node.js installer (or use homebrew)
    https://nodejs.org/en/download/


# Credits

- [icons8.com](https://icons8.com)
  - For avatar images
