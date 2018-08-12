#
# Performs schema creation.
#
# Usage:
# - Run script through an SQL client.
#

CREATE TABLE member (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(100) NOT NULL,
  password varchar(255) NOT NULL,
  avatar varchar(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  KEY name_idx (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;