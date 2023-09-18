const express = require('express');
const router = express.Router();

const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));
  
router.post("/", async (req, res) => {
  const {blogId, blogComment} = req.body;
  try {
    await db.query("INSERT INTO BlogComment(blog_id, commenter, date_utc, body) VALUES (?,?,NOW(),?)", [blogId, req.session.username, blogComment]);
    res.send("Comment Posted!");
  }
  catch(e) {
    console.error(e);
    res.send("Comment Failed");
  }
});

module.exports = router;