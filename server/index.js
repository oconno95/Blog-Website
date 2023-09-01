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

//routes
app.get("/", (req, res) => {
  console.log(req.session);
  res.render("home.ejs");
});

app.get("/user/login", (req, res) => {
  res.render("user/login.ejs");
});
app.post("/user/login", (req, res) => {
  console.log(req.body);
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

  //encrypt password
  const salt = crypto.randomBytes(16);
  let desiredHashSize = 64;
  const encryptedPassword = crypto.scryptSync(password1, salt, desiredHashSize/2).toString('hex'); //must divide length by 2 when converting string to hex


  //Add user to database
  try {
    await db.query("INSERT INTO User(username, pwd, pwd_salt, about) VALUES (?,?,?,'')", [username, encryptedPassword, salt]);

    //TODO: Login user here
    res.send("Account created successfully!");
  } catch(e) {
    console.error(e);
    res.send("Failed to create account, please try again later!");
  }

});

app.get("/blog/search", (req, res) => {
  res.render("blog/search.ejs");
});
app.post("/blog/search", (req, res) => {
  console.log(req.body);
});

//very last middleware handles 404 errors
app.use((req, res, next) => {
  res.status(404).send("404 Error!");
});


//start web server
app.listen(port, () => {
  console.log(`Web app runnin on port ${port}`);

  //quick test of Promise-based database driver
  db.query("SHOW TABLES").then((res) => {
    console.log(res);
  }).catch((e) => {
    console.error(e);
  });
  
});