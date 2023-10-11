require('dotenv').config(); //add environment variables in .env file to process.env file

const express = require('express');
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


//routes
const userRoute = require('./routes/user');
const blogRoute = require('./routes/blog');
const commentRoute = require('./routes/comment');
const groupRoute = require('./routes/group');


const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));


//routes
app.get("/", (req, res) => {
  res.render("home.ejs", {username: req.session.username});
});

//Search
app.get("/search", async (req, res) => {
  if(req.query.filter_by === 'user') {
    const [rows, fields] = await db.query(`SELECT * FROM User WHERE username LIKE CONCAT('%',?,'%')`, [req.query.search_query]);
    res.render("search/search_results_user", {rows: rows});
    return;
  } 
  else {
    const [rows, fields] = await db.query
      (`SELECT * FROM BlogPost WHERE title LIKE CONCAT('%',?,'%') OR group_id IN (SELECT id FROM BlogGroup WHERE groupname LIKE CONCAT('%',?,'%'))`,
      [req.query.search_query, req.query.search_query]);
    res.render("search/search_results_blog", {rows: rows});
  }
});

app.use('/user', userRoute);
app.use('/blog', blogRoute);
app.use('/blog/comment', commentRoute);
app.use('/blog/group', groupRoute);


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