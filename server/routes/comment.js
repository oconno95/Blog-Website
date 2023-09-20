const express = require('express');
const router = express.Router();

const path = require('path');

//other imported files
const {db} = require(path.resolve(process.cwd(), "./server/utils/database.js"));
  
router.post("/", async (req, res) => {
  const {blogId, blogComment} = req.body;
  try {
    await db.query("INSERT INTO BlogComment(blog_id, commenter, date_utc, body) VALUES (?,?,NOW(),?)", [blogId, req.session.username, blogComment]);
    res.redirect(`/blog/id/${blogId}`)
  }
  catch(e) {
    console.error(e);
    res.send("Comment Failed");
  }
});

router.get("/edit", async (req, res) => {
  const commentId = req.query.commentId;

  const [rows, fields] = await db.query("SELECT blog_id FROM BlogComment WHERE comment_id=?", [commentId]);

  res.redirect(`/blog/id/${rows[0].blog_id}?editCommentId=${commentId}#comment${commentId}`);
});

router.post("/edit", async (req, res) => {
  const {commentId, commentBody, blogId} = req.body;

  const [rows, fields1] = await db.query("SELECT blog_id FROM BlogComment WHERE comment_id=?", [commentId]);

  const [result, fields] = await db.query("UPDATE BlogComment SET body=? WHERE comment_id=?", [commentBody, commentId]);

  if(result.affectedRows != 0) {
    return res.redirect(`/blog/id/${rows[0].blog_id}#comment${commentId}`);
  } 
  
  res.send("Failed to edit comment!");
});



module.exports = router;