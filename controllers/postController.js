const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const config = require('../config');
const helpers = require('../helpers/helpers');
const jwt = require('jsonwebtoken');
const postController = {};

// Verify token middleware
postController.verifyToken = (req, res, next) => {
  let response = {};
  try {
    let recievedToken = req.headers.authorization.split(' ')[1];
    let decodedToken = jwt.verify(recievedToken, config.secret);

    // Check if the token is valid
    if (decodedToken.exp * 1000 > Date.now()) {
      next();
    } else {
      response.message = 'The token is not valid or expired!';
      response.tokenExpired = true;
      res.json(response);
    }
  } catch (error) {
    response.message = `There was an error with checking the token ${error}`;
    response.tokenExpired = true;
    res.json(response);
  }
};

postController.checkIfUserExistsAndIsNotBanned = async (req, res, next) => {
  let response = {};
  try {
    let checkedUser = await User.findById(req.body.author);
    if (checkedUser && !checkedUser.banned) {
      next();
    } else {
      response.message = 'You are not authorized to take this action!';
      res.json(response);
    }
  } catch (error) {
    response.message = `Something went wrong trying to check the user ${error}`;
    res.json(response);
  }
};

// GET all the posts in the reddit sub
postController.getAllPosts = async (req, res) => {
  let response = {};
  try {
    let posts = await Post.find()
      .sort({ created: -1 })
      .limit(50);
    response.data = posts;
    response.success = true;
    res.json(response);
  } catch (error) {
    response.message = 'Error getting the next posts';
    res.json(response);
  }
};

postController.getNextPosts = async (req, res) => {
  let response = {};
  try {
    let { skip, page } = req.params;
    parseInt(skip);
    parseInt(page);
    let skipBy = skip * page;
    let posts = await Post.find()
      .sort({ created: -1 })
      .skip(skipBy)
      .limit(50);
    response.posts = posts;
    response.success = true;
    res.json(response);
  } catch (error) {
    response.message = `Error getting the next posts ${error}`;
    res.json(response);
  }
};

// POST to the database
// TODO only allow posting by checking the user token
postController.submitNewPost = async (req, res) => {
  let response = {};
  try {
    let post = new Post(req.body);
    post.upvotedby = req.body.author;
    await post.save();

    // Also add this post to user upvotes
    let user = await User.findByIdAndUpdate(
      { _id: req.body.author },
      {
        $addToSet: { upvotes: post._id }
      },
      { new: true }
    );

    // TODO Delete the sensitive info from user

    response.post = post;
    response.user = helpers.stripTheUserData(user);
    response.success = true;
    res.json(response);
  } catch (error) {
    response.message = `Could not submit post, check error: ${error}`;
    res.json(response);
  }
};

postController.getSinglePostAndComments = async (req, res) => {
  let response = {};
  try {
    // Find the post
    let post = await Post.findById(req.params.id);
    if (post) {
      // Find all the comments
      let comments = await Comment.find({ post: req.params.id });
      response.success = true;
      response.post = post;
      response.comments = comments;
      res.json(response);
    } else {
      response.message = 'No posts found';
      res.json(response);
    }
  } catch (error) {
    response.message = `Could not get the post, check error: ${error}`;
    res.json(response);
  }
};

postController.upvote = async (req, res) => {
  let response = {};
  try {
    const upvotes = req.body.upvotes.map((obj) => obj.toString());
    const downvotes = req.body.downvotes.map((obj) => obj.toString());

    const operator = upvotes.includes(req.params.id) ? '$pull' : '$addToSet';

    let user;
    let post;

    // if upvote already exists, remove from upvotes
    if (upvotes.includes(req.params.id)) {
      user = await User.findByIdAndUpdate(
        req.body._id,
        {
          $pull: { upvotes: req.params.id }
        },
        { new: true }
      );
      post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { upvotedby: req.body._id }
        },
        { new: true }
      );
    } else {
      // Add to upvotes
      // Remove from downvotes
      user = await User.findByIdAndUpdate(
        req.body._id,
        {
          $addToSet: { upvotes: req.params.id },
          $pull: { downvotes: req.params.id }
        },
        { new: true }
      );
      post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: { upvotedby: req.body._id },
          $pull: { downvotedby: req.body._id }
        },
        { new: true }
      );
    }

    response.user = helpers.stripTheUserData(user);
    response.post = post;
    response.success = true;
    res.json(response);
  } catch (error) {
    response.message = `Could not upvote, check error: ${error}`;
    res.json(response);
  }
};

postController.downvote = async (req, res) => {
  let response = {};
  try {
    const upvotes = req.body.upvotes.map((obj) => obj.toString());
    const downvotes = req.body.downvotes.map((obj) => obj.toString());

    const operator = downvotes.includes(req.params.id) ? '$pull' : '$addToSet';

    let user;
    let post;

    // Downvoting..

    // if downvote already exists, remove from downvotes
    if (downvotes.includes(req.params.id)) {
      user = await User.findByIdAndUpdate(
        req.body._id,
        {
          $pull: { downvotes: req.params.id }
        },
        { new: true }
      );
      post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { downvotedby: req.body._id }
        },
        { new: true }
      );
    } else {
      // Add to downvotes
      // Remove from upvotes
      user = await User.findByIdAndUpdate(
        req.body._id,
        {
          $addToSet: { downvotes: req.params.id },
          $pull: { upvotes: req.params.id }
        },
        { new: true }
      );
      post = await Post.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: { downvotedby: req.body._id },
          $pull: { upvotedby: req.body._id }
        },
        { new: true }
      );
    }

    response.user = helpers.stripTheUserData(user);
    response.post = post;
    response.success = true;
    res.json(response);
  } catch (error) {
    response.message = 'Could not downvote';
    res.json(response);
  }
};

postController.deletePost = async (req, res) => {
  // TODO Check if the user owns the post or if the user is an admin
  let response = {};
  try {
    await Post.findByIdAndDelete({ _id: req.params.id });
    response.success = true;
    response.message = 'Successfully deleted the post!';
    response.deletedId = req.params.id;
    res.json(response);
  } catch (error) {
    response.message = 'Could not delete';
    res.json(response);
  }
};

postController.getAllPostsByUser = async (req, res) => {
  let response = {};
  try {
    let posts = await Post.find({ username: req.params.username }).limit(50);
    let currentUser = await User.findOne({ username: req.params.username });
    response.posts = posts;
    response.currentUser = helpers.stripTheUserData(currentUser);
    response.success = true;
    res.json(response);
  } catch (error) {
    response.message = `The server encountered an error while getting all the posts ${error}`;
    res.json(response);
  }
};

module.exports = postController;
