host=localhost
port=9090
# Update with the token value from the login API response
access_token=

# Login
curl -X POST http://${host}:${port}/api/login -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "admin"}'
curl -X POST http://${host}:${port}/api/login -H "Content-Type: application/json" -d '{"email": "user1@example.com", "password": "password"}'

# Get all members
curl -X GET http://${host}:${port}/api/members -H "x-access-token: ${access_token}"

# Get a member
curl -X GET http://${host}:${port}/api/members/1

# Add a member
curl -X POST http://${host}:${port}/api/members -H "Content-Type: application/json" -d '{"firstName": "User1", "lastName": "Last1", "email": "user1@example.com", "password": "password"}'
curl -X POST http://${host}:${port}/api/members -H "Content-Type: application/json" -d '{"firstName": "User2", "lastName": "Last2", "email": "user2@example.com", "password": "password"}'
curl -X POST http://${host}:${port}/api/members -H "Content-Type: application/json" -d '{"firstName": "User3", "lastName": "Last3", "email": "user3@example.com", "password": "password"}'

# Update a member
curl -X PUT http://${host}:${port}/api/members/1 -H "Content-Type: application/json" -H "x-access-token: ${access_token}" -d '{"firstName": "UserX", "lastName": "LastX", "email": "userX@example.com"}'

# Delete a member
curl -X DELETE http://${host}:${port}/api/members/1 -H "x-access-token: ${access_token}"

# Logout
curl -X GET http://${host}:${port}/api/logout
