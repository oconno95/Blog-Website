const express = require('express');
const router = express.Router();

const path = require('path');
const crypto = require('node:crypto');


//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));

//HELPER functions

/**
 * 
 * @param {string} password 
 * @param {string?} salt
 * @returns { {hash: string, salt: string} }
 */
function hashAndSaltPassword(password, salt) {
  //salt and hash password using scryptSync, a computationally expensive hashing function designed to slow down a
  //attacker who brute forces password guesses. Use instead of bcrypt.

  if(!salt) {
    salt = crypto.randomBytes(16);
  }
  const desiredHashSize = 64;
  //must divide length by 2 when converting string to hex since hex doubles the length of the buffer
  const hashedPassword = crypto.scryptSync(password, salt, desiredHashSize/2).toString('hex');

  return {hash: hashedPassword, salt: salt};
}

/**
 * This function is called when a user attempts to login with a username and
 * password. It returns true if login was successful and false otherwise
 * @param {string} username 
 * @param {string} password 
 * @param {session.Session} session 
 * @returns {Promise<boolean>}
 */
async function tryLogin(username, password, session) {
  const [rows, fields] = await db.query("SELECT * FROM User WHERE username=?", [username]);
  console.log(rows);
  //generate hash from password in the request
  const hashedPassword = hashAndSaltPassword(password, rows[0].pwd_salt).hash;

  //if hashed password generated from the request is not the same as the hashed password from the database
  //the password from the request was wrong
  if(hashedPassword !== rows[0].pwd) {
    return false;
  }

  await login(username, session, rows);

  return true;
}

/**
 * This function sets the session variables needed to log a user into their account.
 * WARNING: Make sure the user was already validated before logging them in
 * @param {string} username 
 * @param {session.Session} session 
 * @param {{[key: string] : any} | null} preFetchedUserData - user data previously retrieved from 
 *  the User database that is stored in User's session. This allows the 
 *  server to avoid making a second call to the database if it already
 *  has all the data needed to create a session.
 */
async function login(username, session, preFetchedUserData) {
  if(!preFetchedUserData) {
    preFetchedUserData = (await db.query("SELECT * FROM User WHERE username=?", [username])).rows;
  }

  //set session variables
  session.username = username;

  console.log(session);
}

/**
 * 
 * @param {session.Session} session 
 */
function logout(session) {
  session.destroy();
}

router.get("/login", (req, res) => {
  res.render("user/login.ejs");
});

router.post("/login", async (req, res) => {
  const {username, password} = req.body;

  if(!(await tryLogin(username, password, req.session))) {
    return res.render("user/login.ejs", {login_err: "Invalid Username or Password!"});
  }

  //redirect to home page
  res.redirect("/");
});

router.post("/logout", async (req, res) => {
  logout(req.session);

  //redirect to home page
  res.redirect("/");
});

router.get("/create", (req, res) => {
  res.render("user/create.ejs");
});

router.post("/create", async (req, res) => {
  const {username, password1, password2} = req.body;

  //INPUT VALIDATION 
  let errors = {};

  if(username.length > 10) {
    errors.username_err = "Your username must be 10 characters or less!";
  }

  if(password1 !== password2) {
    errors.password_retype_err = "Your password does not match with your retyped password!";
  }

  if(password1.length < 8) {
    errors.password_err = "Your password must be 8 characters or more!";
  }

  let errorFound = Object.keys(errors).length > 0;

  //if there was an error, display error messages to create account page
  if(errorFound) {
    return res.render("user/create.ejs", {
      username: username,
      password1: password1,
      password2: password2,
      errors: errors
    });
  } 

  //generate hash and salt from password and store those on the database
  //NEVER STORE PLAINTEXT PASSWORDS! An attacker would have access to
  //every account if they hijacked the database with plaintext passwords
  const {hash, salt} = hashAndSaltPassword(password1);

  //Add user to database
  try {
    //must store salt for login to work
    await db.query("INSERT INTO User(username, pwd, pwd_salt, about) VALUES (?,?,?,'')", [username, hash, salt]);

    //automatically login the new user
    await login(username, req.session);

    res.redirect("/");
  } catch(e) {
    //if this user already exists
    if(e.code === "ER_DUP_ENTRY") {
      return res.render("user/create.ejs", {
        username: username,
        password1: password1,
        password2: password2,
        errors: {username_err: `The user ${username} already exists!`}
      });
    }

    //if this is a different error
    console.error(e);
    res.send("Failed to create account, please try again later!");
  }

});

router.get("/edit", async (req, res) => {
  res.render("user/edit.ejs", {username: req.session.username});
});

router.post("/edit", async (req, res) => {
  let {new_username, new_password, confirm_new_password, password} = req.body;

  new_username = new_username.trim();
  new_password = new_password.trim();
  confirm_new_password = confirm_new_password.trim();

  const changedUsername = new_username != "";

  let renderErr = (err) => res.render("user/edit.ejs", {username: req.session.username, err: err});

  //check if current password is correct
  const [rows, _] = await db.query("SELECT * FROM User WHERE username=?", [req.session.username]);
  const hashedPassword = hashAndSaltPassword(password, rows[0].pwd_salt).hash;
  if(hashedPassword !== rows[0].pwd) {
    return renderErr("Incorrect current password!");
  }


  if(!changedUsername) {
    new_username = req.session.username;
  } else if(new_username.length > 10) {
    return renderErr("Your username must be 10 characters or less!");
  }

  let args = [new_username];
  let query = "UPDATE User SET username=?";

  if(new_password) {
    if(confirm_new_password !== new_password) {
      return renderErr("New Password does not match!");
    } else if(new_password.length < 8) {
      return renderErr("Your password must be 8 characters or more!");
    }

    let {hash, salt} = hashAndSaltPassword(new_password);
    query += " ,pwd=?, pwd_salt=?";
    args.push(hash, salt)
  }

  query += " WHERE username=?";
  args.push(req.session.username);

  const [result, fields] = await db.query(query, args);

  if(result.affectedRows == 0) {
    return renderErr("Failed for some reason!");
  }

  if(changedUsername) {
    req.session.username = new_username;
  }

  res.redirect("/");
});

module.exports = router;