const express = require('express');
const router = express.Router();

const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));

router.get("/", async (req, res) => {
  const [rows, fields] = await db.query("SELECT id, user, date_utc, title, body FROM BlogPost WHERE user=? ORDER BY date_utc desc", [req.session.username]);
  const username = req.session.username;
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogData: rows, User: username});
});

router.get("/user/:user", async (req, res) => {
  const [rows, fields] = await db.query("SELECT id, user, date_utc, title, body FROM BlogPost WHERE user=? ORDER BY date_utc desc", [req.params.user]);
  const username = req.session.username;
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogData: rows, User: username});
});

//the :id in the route is a route parameter (see https://expressjs.com/en/guide/routing.html#route-parameters)
// Ex: When the user visits /blog/id/3, the "3" is stored in the req.params.id variable so you can retrieve the 
// blog post with an id of 3.
router.get("/id/:id", async (req, res) => {
  const blogId = req.params.id; //access :id through req.params

  //Note that db.query returns an array with 2 elements: a "rows" array and a "fields" array.
  //The "rows" array will contain 0 to many rows of data. The "fields" array 
  //is almost useless for what we're doing, since it only lists the columns accessed
  const [rows, fields] = await db.query("SELECT date_utc, user, title, body FROM BlogPost WHERE id=?", [blogId]);
  const [comments, elements] = await db.query("SELECT * FROM BlogComment WHERE blog_id=?", [blogId]);
  const username = req.session.username;
  console.log(username);
  //use rows[0] because there should only ever be 1 element when asking for an existing blog post
  res.render("blog/view.ejs", {blog: rows[0], User: username}, {CommentData: comments, BlogId: blogId});
});

router.get("/create", (req, res) => {
  res.render("blog/create.ejs");
});

router.post("/create", async (req, res) => {
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


router.get("/search", async (req, res) => {
  if(req.query.filter_by === 'user') {
    const [rows, fields] = await db.query(`SELECT * FROM User WHERE username LIKE CONCAT('%',?,'%')`, [req.query.search_query]);
    res.render("blog/search_results_user", {rows: rows});
    return;
  } 

  const [rows, fields] = await db.query(`SELECT * FROM BlogPost WHERE title LIKE CONCAT('%',?,'%') OR groupname LIKE CONCAT('%',?,'%')`, [req.query.search_query, req.query.search_query]);
  res.render("blog/search_results", {rows: rows});
});
  
router.post("/comment", async (req, res) => {
  const {blogId, blogComment} = req.body;
  try {
    await db.query("INSERT INTO BlogComment(blog_id, commenter, date_utc, body) VALUES (?,?,NOW(),?)", [blogId, req.session.username, blogComment]);
    console.log(req.body);
    res.send("Comment Posted!");
  }
  catch(e) {
    console.error(e);
    res.send("Comment Failed");
  }
});




module.exports = router;