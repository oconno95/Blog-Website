-- Used to force table to be deleted even after a 'cannot drop table
-- referenced by foreign key' error occurs 
SET foreign_key_checks = 0; 

DROP TABLE IF EXISTS User;
CREATE TABLE User (
  username varchar(10) PRIMARY KEY,
  pwd varchar(64) NOT NULL,
  pwd_salt varbinary(16) NOT NULL,
  about varchar(500) DEFAULT ""
);

DROP TABLE IF EXISTS BlogGroup;
CREATE TABLE BlogGroup(
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username varchar(10) NOT NULL,
  groupname varchar(100) NOT NULL,
  UNIQUE (username, groupname),
  FOREIGN KEY (username) REFERENCES User(username) ON UPDATE CASCADE ON DELETE CASCADE
);

DROP TABLE IF EXISTS BlogPost;

-- Set this back to 1 to ensure database checks foreign keys after this
-- script finishes running
SET foreign_key_checks = 1;

CREATE TABLE BlogPost(
  id INT(5) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user varchar(10) NOT NULL,
  date_utc DATETIME NOT NULL,
  title varchar(100) NOT NULL,
  body varchar(5000) NOT NULL,
  group_id INT NULL,

  FOREIGN KEY (user) REFERENCES User(username) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY(group_id) REFERENCES BlogGroup(id) ON UPDATE CASCADE ON DELETE CASCADE
);

DROP TABLE IF EXISTS BlogComment;
CREATE TABLE BlogComment(
  comment_id INT(5) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  blog_id INT(5) NOT NULL,
  commenter varchar(10) NOT NULL,
  date_utc DATETIME NOT NULL,
  body varchar(500) NOT NULL,

  FOREIGN KEY(blog_id) REFERENCES BlogPost(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY(commenter) REFERENCES User(username) ON UPDATE CASCADE ON DELETE CASCADE
);