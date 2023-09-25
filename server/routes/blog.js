const express = require('express');
const router = express.Router();
const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));


//View a users blogs ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const username = req.session.username;
  const [groups, items] = await db.query("SELECT groupname FROM BlogGroup WHERE username=? ORDER BY groupName desc", [username]);
  const [rows, fields] = await db.query("SELECT * FROM BlogPost WHERE user=? ORDER BY date_utc desc", [username]);
  console.log(groups);
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogGroup: groups, BlogData: rows, User: username, Account: req.session.username});
});

router.get("/user/:user", async (req, res) => {
  const username = req.params.user;
  const [groups, items] = await db.query("SELECT groupname FROM BlogGroup WHERE username=? ORDER BY groupName desc", [username]);
  const [rows, fields] = await db.query("SELECT * FROM BlogPost WHERE user=? ORDER BY date_utc desc", [username]);
  console.log(groups);
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogGroup: groups, BlogData: rows, User: username, Account: req.session.username});
});

//View a blog by id ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
// the :id in the route is a route parameter (see https://expressjs.com/en/guide/routing.html#route-parameters)
// Ex: When the user visits /blog/id/3, the "3" is stored in the req.params.id variable so you can retrieve the blog post with an id of 3.
router.get("/id/:id", async (req, res) => {
  const blogId = req.params.id; //access :id through req.params
  const editCommentId = req.query.editCommentId;

  //Note that db.query returns an array with 2 elements: a "rows" array and a "fields" array.
  //The "rows" array will contain 0 to many rows of data. 
  //The "fields" array is almost useless for what we're doing, since it only lists the columns accessed.
  const [rows, fields] = await db.query("SELECT * FROM BlogPost WHERE id=?", [blogId]);
  const [comments, elements] = await db.query("SELECT * FROM BlogComment WHERE blog_id=?", [blogId]);
  const username = req.session.username;
  const [groups, items] = await db.query("SELECT groupname FROM BlogGroup WHERE username=? ORDER BY groupName desc", [username]);
  //use rows[0] because there should only ever be 1 element when asking for an existing blog post

  res.render("blog/view.ejs", {blog: rows[0], User: username, CommentData: comments, editCommentId: editCommentId, BlogGroup: groups});
});

//Create a blog --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/create", (req, res) => {
  res.render("blog/create.ejs");
});

router.post("/create", async (req, res) => {
  const {title, blogContent} = req.body;
  try {
    let [result, fields] = await db.query("INSERT INTO BlogPost(user, date_utc, title, body) VALUES (?,NOW(),?,?)", [req.session.username, title, blogContent]);
    res.redirect(`/blog/id/${result.insertId}`);
  }
  catch(e) {
    console.error(e);
    res.render("blog/create.ejs", {title: title, body: blogContent, error: true});
  }
});

//Edit a blog ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/edit", async (req, res) => {
  let blogId = req.query.blogId; //because this is a GET request

  let [rows, fields] = await db.query("SELECT user, title, body FROM BlogPost WHERE id=?", blogId);

  if(rows.length == 0) {
    res.send("No blog post with that id!");
  }

  if(rows[0].user !== req.session.username) {
    return res.status(401).send("Unauthorized");
  }

  res.render("blog/create.ejs", {isEditing: true, title: rows[0].title, body: rows[0].body, blogId: blogId});
});

router.post("/edit", async (req, res) => {
  const {title, blogContent} = req.body;
  let blogId = req.body.blogId;

  //returns [ResultSetHeader, undefined] for UPDATE SQL statements
  let [resultHeader, fields] = await db.query("UPDATE BlogPost SET title=?, body=? WHERE id=? AND user=?", [title, blogContent, blogId, req.session.username]);
  
  if(resultHeader.affectedRows == 0) {
    return res.send("Failed to edit post");
  }
  
  res.redirect(`/blog/id/${blogId}`);
});

//Delete a blog --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.post("/delete", async (req, res) => {
  const blogId = req.body.blogId;

  //returns [ResultSetHeader, undefined] for UPDATE SQL statements
  let [resultHeader, fields] = await db.query("DELETE FROM BlogPost WHERE id=? AND user=?", [blogId, req.session.username]);

  if(resultHeader.affectedRows == 0) {
    return res.send("Failed to delete post");
  }

  res.send("Blog Post Deleted!");
});

//Move a blog to a group -----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.post("/group/move", async (req, res) => {
  const blogId = req.body.blogId;
  const blogGroup = req.body.groups;
  const username = req.session.username;
  let [resultHeader, fields] = await db.query("UPDATE BlogPost SET groupname=? WHERE id=? AND user=?", [blogGroup, blogId, username]);
  res.redirect("/blog");
});

//Create a blog group --------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/group/create", (req, res) => {
  res.render("blog/createGroup.ejs");
});

router.post("/group/create", async (req, res) => {
  const {groupName} = req.body;
  try {
    let [result, fields] = await db.query("INSERT INTO BlogGroup(username, groupname) VALUES (?,?)", [req.session.username, groupName]);
    res.redirect("/blog");
  }
  catch(e) {
    console.error(e);
    res.render("blog/createGroup.ejs", {groupname: groupName, error: true});
  }
});

//Search ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/search", async (req, res) => {
  if(req.query.filter_by === 'user') {
    const [rows, fields] = await db.query(`SELECT * FROM User WHERE username LIKE CONCAT('%',?,'%')`, [req.query.search_query]);
    res.render("blog/search_results_user", {rows: rows});
    return;
  } 

  const [rows, fields] = await db.query(`SELECT * FROM BlogPost WHERE title LIKE CONCAT('%',?,'%') OR groupname LIKE CONCAT('%',?,'%')`, [req.query.search_query, req.query.search_query]);
  res.render("blog/search_results", {rows: rows});
});

module.exports = router;