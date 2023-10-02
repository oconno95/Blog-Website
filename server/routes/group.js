const express = require('express');
const router = express.Router();

const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));
  

//Move a blog to a group -----------------------------------------------------------------------------------------------------------------------------------------------------------------
router.post("/move", async (req, res) => {
  const blogId = req.body.blogId;
  const blogGroup = req.body.groups;
  const username = req.session.username;
  let [resultHeader, fields] = await db.query("UPDATE BlogPost SET group_id=(SELECT id FROM BlogGroup WHERE groupname=? AND username=? LIMIT 1) WHERE id=? AND user=?", [blogGroup, username, blogId, username]);
  res.redirect("/blog");
});

//Create a blog group --------------------------------------------------------------------------------------------------------------------------------------------------------------------
router.get("/create", (req, res) => {
  res.render("blog/createGroup.ejs");
});

router.post("/create", async (req, res) => {
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

router.get("/edit", async (req, res) => {
  const groupname = req.query.groupname;

  res.render("blog/createGroup.ejs", {groupName: groupname, isEditing: true});
});

router.post("/edit", async (req, res) => {
  const {oldGroupName, groupName} = req.body;

  const [result, fields] = await db.query("UPDATE BlogGroup SET groupname=? WHERE groupname=? AND username=?", [groupName, oldGroupName, req.session.username]);

  if(result.affectedRows != 0) {
    return res.redirect(`/blog`);
  } 
  
  res.send("Failed to edit comment!");
});

router.post("/delete", async (req, res) => {
  const {groupname, keepBlogs} = req.body;
  console.log(req.body);

  let groupId = (await db.query("SELECT id FROM BlogGroup WHERE groupname=? AND username=?",
    [groupname, req.session.username]))[0][0].id;

  console.log(groupId);
  if(keepBlogs === 'true') {
    console.log("Keeping Blogs");
    const [rows2, fields2] = await db.query("UPDATE BlogPost SET group_id=NULL WHERE group_id=?", [groupId]);
  }

  const [result, fields] = await db.query("DELETE FROM BlogGroup WHERE id=?", [groupId]);
  
  if(result.affectedRows == 0) {
    return res.send("failed to delete group");
  }

  return res.redirect(`/blog`);
});


module.exports = router;