const router = require('express').Router();
const postController = require('../controllers/postController');
const userController = require('../controllers/userController');
const commentController = require('../controllers/commentController');

// Get all the posts in the app
router.get('/posts/all', postController.getAllPosts);

// Register user
// TODO Validate the user registration info
// Issue a new token and send it to the client
router.post(
  '/register',
  userController.validateRegInfo,
  userController.register
);

// Login api
router.post('/login', userController.validateLoginInfo, userController.login);

// Create a new reddit post
// TODO Add validations
// Only allow valid users to be able to post
router.post(
  '/posts/new',
  postController.verifyToken,
  postController.checkIfUserExistsAndIsNotBanned,
  postController.submitNewPost
);

// Upvote a post
router.post(
  '/post/:id/upvote',
  postController.verifyToken,
  postController.upvote
);

// Downvote a post
router.post(
  '/post/:id/downvote',
  postController.verifyToken,
  postController.downvote
);

// Delete a post
router.delete(
  '/post/:id/delete',
  postController.verifyToken,
  postController.deletePost
);

// Get all comments
router.get('/post/:id/comments/all', commentController.allComments);

// Post a comment
router.post(
  '/post/:id/comment',
  postController.verifyToken,
  commentController.submitComment
);

module.exports = router;
