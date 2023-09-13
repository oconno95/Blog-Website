require('dotenv').config(); //add environment variables in .env file to process.env file

const express = require('express');
const crypto = require('node:crypto');
const app = express();
const port = 3000;

/**** Configure Express JS ****/

//EJS template engine
app.set('views', './server/views'); //set directory where template engine will retrieve templates
app.set('view engine', 'ejs'); // set template engine to EJS


app.use(express.static("./public")); //set where static files are served

//use this to read parameters from POST requests as JSON values
app.use(express.json()); 
app.use(express.urlencoded({extended: true}));

// configure SESSION 
app.use(require('express-session')({
  secret: "in-development-so-secret-does-not-matter-right-now",

  //used to remove warnings
  resave: false,
  saveUninitialized: true, //change to true later so session data is only stored when data is actually put in session on login

  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 365, // cookie is valid for 1 year
    httpOnly: true,  //dont get cookies in Javascript
    secure: false, //secure can only be set to true if using HTTPS
  }

}));

//other imported files
const {db} = require("./database.js");

/**** HELPER FUNCTIONS ****/

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

//routes
app.get("/", (req, res) => {
  res.render("home.ejs", {username: req.session.username});
});
// USER --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
app.get("/user/login", (req, res) => {
  res.render("user/login.ejs");
});

app.post("/user/login", async (req, res) => {
  const {username, password} = req.body;

  if(!(await tryLogin(username, password, req.session))) {
    return res.render("user/login.ejs", {login_err: "Invalid Username or Password!"});
  }

  //redirect to home page
  res.redirect("/");
});

app.post("/user/logout", async (req, res) => {
  logout(req.session);

  //redirect to home page
  res.redirect("/");
});

app.get("/user/create", (req, res) => {
  res.render("user/create.ejs");
});

app.post("/user/create", async (req, res) => {
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
// BLOG --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
app.get("/blog", async (req, res) => {
  const [rows, fields] = await db.query("SELECT id, date_utc, title, body FROM BlogPost WHERE user=? ORDER BY date_utc desc", [req.session.username]);
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogData: rows});
});

//the :id in the route is a route parameter (see https://expressjs.com/en/guide/routing.html#route-parameters)
// Ex: When the user visits /blog/id/3, the "3" is stored in the req.params.id variable so you can retrieve the 
// blog post with an id of 3.
app.get("/blog/id/:id", async (req, res) => {
  const blogId = req.params.id; //access :id through req.params

  //Note that db.query returns an array with 2 elements: a "rows" array and a "fields" array.
  //The "rows" array will contain 0 to many rows of data. The "fields" array 
  //is almost useless for what we're doing, since it only lists the columns accessed
  const [rows, fields] = await db.query("SELECT date_utc, title, body FROM BlogPost WHERE id=?", [blogId]);


  //use rows[0] because there should only ever be 1 element when asking for an existing blog post
  res.render("blog/view.ejs", {blog: rows[0]});
});

app.get("/blog/create", (req, res) => {
  res.render("blog/create.ejs");
});

app.post("/blog/create", async (req, res) => {
  const {title, blogContent} = req.body;
  try {
    await db.query("INSERT INTO BlogPost(user, date_utc, title, body) VALUES (?,NOW(),?,?)", [req.session.username, title, blogContent]);
    console.log(req.body);
    res.send("Blog Posted!");
  }
  catch(e) {
    console.error(e);
    res.send("Blog Post Failed");
  }
});

app.get("/blog/search", (req, res) => {
  res.render("blog/search_results.ejs");
});
app.post("/blog/search", (req, res) => {
  console.log(req.body);
});

//very last middleware handles 404 errors
app.use((req, res, next) => {
  res.status(404).send("404 Error!");
});


//start web server ---------------------------------------------------------------------------------------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Web app runnin on port ${port}`);

  //quick test of Promise-based database driver
  db.query("SHOW TABLES").then((res) => {
    console.log(res);
  }).catch((e) => {
    console.error(e);
  });
});