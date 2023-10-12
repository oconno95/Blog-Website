const express = require('express');
const router = express.Router();
const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));


//View a users blogs ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const username = req.session.username;
  const [groups, items] = await db.query("SELECT * FROM BlogGroup WHERE username=? ORDER BY groupName desc", [username]);
  const [rows, fields] = await db.query("SELECT BP.*, (SELECT groupname FROM BlogGroup AS BG WHERE BG.id=BP.group_id) AS groupname FROM BlogPost AS BP WHERE user=? ORDER BY date_utc desc", [username]);
  console.log(groups);
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogGroup: groups, BlogData: rows, User: username, Account: req.session.username});
});

router.get("/user/:user", async (req, res) => {
  console.log(req.params)
  const username = req.params.user;
  const [user, _] = await db.query("SELECT about FROM User WHERE username=?", [username]);
  const [groups, items] = await db.query("SELECT * FROM BlogGroup WHERE username=? ORDER BY groupName desc", [username]);
  const [rows, fields] = await db.query("SELECT BP.*, (SELECT groupname FROM BlogGroup AS BG WHERE BG.id=BP.group_id) AS groupname FROM BlogPost AS BP WHERE user=? ORDER BY date_utc desc", [username]);
  console.log(groups);
  console.log(rows);
  res.render("blog/usersBlogs.ejs", {BlogGroup: groups, BlogData: rows, User: username, UserAbout: user[0].about, Account: req.session.username});
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
  const [rows, fields] = await db.query("SELECT BP.*, (SELECT groupname FROM BlogGroup AS BG WHERE BP.group_id=BG.id) AS groupname FROM BlogPost AS BP WHERE BP.id=?", [blogId]);
  console.log(rows);
  const [comments, elements] = await db.query("SELECT * FROM BlogComment WHERE blog_id=?", [blogId]);
  const username = req.session.username;
  const [groups, items] = await db.query("SELECT groupname FROM BlogGroup WHERE username=? ORDER BY groupName desc", [username]);
  if (rows.length == 1) {
    //use rows[0] because there should only ever be 1 element when asking for an existing blog post
    res.render("blog/view.ejs", {blog: rows[0], User: username, CommentData: comments, editCommentId: editCommentId, BlogGroup: groups});
  }
  else {
    res.send("No blog post with that id!");
  }
});

//Create a blog --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/create", async (req, res) => {
  let [rows, fields] = await db.query("SELECT id, groupname FROM BlogGroup WHERE username=?", [req.session.username]);
  res.render("blog/create.ejs", {groups: rows});
});

router.post("/create", async (req, res) => {
  const {title, blogContent, group_id} = req.body;
  try {
    let [result, fields] = await db.query("INSERT INTO BlogPost(user, date_utc, title, body, group_id) VALUES (?,NOW(),?,?,?)",
      [req.session.username, title, blogContent, group_id ? group_id : null]);
    res.redirect(`/blog/id/${result.insertId}`);
  }
  catch(e) {
    console.error(e);
    let [rows, fields] = await db.query("SELECT id, groupname FROM BlogGroup WHERE username=?", [req.session.username]);
    res.render("blog/create.ejs", {title: title, body: blogContent, group_id: group_id, groups: rows, error: true});
  }
});

//Edit a blog ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/edit", async (req, res) => {
  let blogId = req.query.blogId; //because this is a GET request

  let [rows, fields] = await db.query("SELECT user, title, body, group_id FROM BlogPost WHERE id=?", blogId);
  let [groups, fields1] = await db.query("SELECT groupname, id FROM BlogGroup WHERE username=?", [req.session.username]);

  if(rows.length == 0) {
    res.send("No blog post with that id!");
  }

  if(rows[0].user !== req.session.username) {
    return res.status(401).send("Unauthorized");
  }

  res.render("blog/create.ejs", {isEditing: true, title: rows[0].title, body: rows[0].body, groups: groups, group_id: rows[0].group_id, blogId: blogId});
});

router.post("/edit", async (req, res) => {
  const {title, blogContent, group_id} = req.body;
  let blogId = req.body.blogId;

  //returns [ResultSetHeader, undefined] for UPDATE SQL statements
  let [resultHeader, fields] = await db.query("UPDATE BlogPost SET title=?, body=?, group_id=? WHERE id=? AND user=?",
    [title, blogContent, group_id ? group_id : null, blogId, req.session.username]);
  
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
  res.redirect("/blog");
});

module.exports = router;