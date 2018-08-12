#
# Performs initial database creation.
#
# Usage:
# - Replace <password>.
# - Run script through an SQL client.
#

create database c9_membership;
create user 'c9_member'@'%' identified by '<password>';
grant all privileges on c9_membership.* to 'c9_member'@'%' identified by '<password>';
flush privileges;