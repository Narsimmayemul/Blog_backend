// index.js

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_jwt_secret';

// Middleware
app.use(bodyParser.json());
app.use(cors())

// Connect to MongoDB
mongoose.connect('mongodb+srv://narsimma123:yemul123@cluster0.mpwqvph.mongodb.net/blog_data');
const db = mongoose.connection;
db.once('open', () => console.log('Connected to MongoDB'));

// Models
const  User  = require('./models/User');
const BlogPost  = require('./models/BlogPost');
const Comment = require('./models/Comment');

// Routes

// User registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully'+ "Password :"+ password});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});


const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'Authorization token is required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// CRUD operations for BlogPosts

// Create a new blog post
app.post('/api/posts', verifyToken, async (req, res) => {
  const { title, content } = req.body;
  try {
    const newPost = new BlogPost({ title, content, authorId: req.userId });
    await newPost.save();
    res.status(201).json({ message: 'Blog post created successfully', post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all blog posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await BlogPost.find().populate('authorId', 'username');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const posts = await BlogPost.findOne({_id:id}).populate('authorId', 'username');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ err: error.message });
  }
});
// Update a blog post
app.put('/api/posts/:id', async (req, res) => {
  const { title, content } = req.body;
  const postId = req.params.id;
  try {
    const updatedPost = await BlogPost.findOneAndUpdate(
      { _id: postId, authorId: req.userId },
      { title, content },
      { new: true }
    );
    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found or user not authorized' });
    }
    res.json({ message: 'Blog post updated successfully', post: updatedPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a blog post
app.delete('/api/posts/:id', async (req, res) => {
  const postId = req.params.id;
  try {
    const deletedPost = await BlogPost.findOneAndDelete({ _id: postId, authorId: req.userId });
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found or user not authorized' });
    }
    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD operations for Comments

// Add a comment to a post
app.post('/api/posts/:postId/comments', verifyToken, async (req, res) => {
  const { comment } = req.body;
  const { postId } = req.params;
  try {
    const newComment = new Comment({ postId, userId: req.userId, comment });
    await newComment.save();
    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a comment
app.put('/api/comments/:id', verifyToken, async (req, res) => {
  const { comment } = req.body;
  const commentId = req.params.id;
  try {
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentId, userId: req.userId },
      { comment },
      { new: true }
    );
    if (!updatedComment) {
      return res.status(404).json({ message: 'Comment not found or user not authorized' });
    }
    res.json({ message: 'Comment updated successfully', comment: updatedComment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment
app.delete('/api/comments/:id', verifyToken, async (req, res) => {
  const commentId = req.params.id;
  try {
    const deletedComment = await Comment.findOneAndDelete({ _id: commentId, userId: req.userId });
    if (!deletedComment) {
      return res.status(404).json({ message: 'Comment not found or user not authorized' });
    }
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
