DROP TABLE IF EXISTS User;
CREATE TABLE User (
  username varchar(10) PRIMARY KEY,
  pwd varchar(20) NOT NULL,
  about varchar(500) DEFAULT ""
);

DROP TABLE IF EXISTS BlogGroup;
CREATE TABLE BlogGroup(
  username varchar(10) NOT NULL,
  groupname varchar(100) NOT NULL,
  PRIMARY KEY(username, groupname)
);

DROP TABLE IF EXISTS BlogPost;
CREATE TABLE BlogPost(
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user varchar(10) NOT NULL,
  date_utc DATETIME NOT NULL,
  title varchar(100) NOT NULL,
  body varchar(5000) NOT NULL,
  groupname varchar(100) NULL,

  FOREIGN KEY (user) REFERENCES User(username) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY(user, groupname) REFERENCES BlogGroup(username, groupname) ON UPDATE CASCADE ON DELETE CASCADE
);

