# Blog Website

## Requirements
* Create a blogging website
* Allow users to sign up
* Be able to write and publish blog posts
* Interact with other users' posts through comments
* Search for users, groups, or posts

## Architecture / Design
* Web Server - Node JS
  * Routes
    * User
      * Create
      * Edit Profile
      * Login
      * Delete
    * Blog
      * View a users blogs
      * View a blog by id
      * Create
      * Edit
      * Delete
      * Search
        * by blog
        * by user
      * Groups
        * Create
        * Move Blog
        * Edit
        * Delete
      * Comment
        * Create
        * Edit
        * Delete
  * Dependencies
    * mysql2
    * ejs
    * express
    * express-session
* Database - MySQL
  * User
  * BlogGroup
  * BlogPost
  * BlogComment

## How To Use

### After Pulling From GitHub
1. Run `npm install` to install dependencies listed in package.json

### Running The Web Server
1. Run `npm run test` to turn on web server on port 3000.
2. Visit [localhost:3000](http://localhost:3000) on your browser.
3. Type Ctrl+C to turn off web server in terminal.