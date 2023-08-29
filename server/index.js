require('dotenv').config(); //add environment variables in .env file to process.env file

const express = require('express');
const app = express();
const port = 3000;

/**** Configure Express JS ****/

//EJS template engine
app.set('views', './server/views'); //set directory where template engine will retrieve templates
app.set('view engine', 'ejs'); // set template engine to EJS


app.use(express.static("./public")); //set where static files are served

//other imported files
const {test} = require("./database.js");

//routes
app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/user/login", (req, res) => {
  res.render("user/login.ejs");
});

app.get("/user/create", (req, res) => {
  res.render("user/create.ejs");
});


//very last middleware handles 404 errors
app.use((req, res, next) => {
  res.status(404).send("404 Error!");
});


//start web server
app.listen(port, () => {
  console.log(`Web app runnin on port ${port}`);

  test();
  
});