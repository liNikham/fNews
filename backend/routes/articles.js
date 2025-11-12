const express = require('express');
const router = express.Router();
const Article = require('../models/Article');

// fetch unread OR read; default unread only; optional ?today=true
router.get('/', async (req, res) => {
  try {
    const { read, today } = req.query;
    const filter = {};
    if (read === 'true') filter.isRead = true;
    if (read === 'false' || !read) filter.isRead = false;

    if (today === 'true') {
      const start = new Date();
      start.setHours(0,0,0,0);
      const end = new Date();
      end.setHours(23,59,59,999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const articles = await Article.find(filter).sort({createdAt:-1}).lean();
    res.json(articles);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// mark as read/unread
router.patch('/:id/read', async (req, res) => {
  try {
    const { isRead } = req.body;
    const a = await Article.findByIdAndUpdate(req.params.id, { isRead }, {new:true});
    res.json(a);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// add (used by your scraper) - upsert by url
router.post('/', async (req, res) => {
  try {
    const doc = req.body;
    
    // Check if article already exists
    const existing = await Article.findOne({ url: doc.url });
    const isNew = !existing;
    
    // Upsert: update if exists, insert if new
    // $setOnInsert only sets fields when inserting, not when updating
    const article = await Article.findOneAndUpdate(
      { url: doc.url }, 
      { 
        $set: {
          title: doc.title,
          description: doc.description,
          content: doc.content,
          date: doc.date || new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          isRead: false,
        }
      }, 
      { 
        upsert: true, 
        new: true, 
        setDefaultsOnInsert: true 
      }
    );
    
    // Add flag to indicate if it was new or existing
    res.json({
      ...article.toObject(),
      isNew: isNew,
      wasCreated: isNew
    });
  } catch (err) {
    // Handle duplicate key error (MongoDB unique constraint)
    if (err.code === 11000) {
      const existing = await Article.findOne({ url: req.body.url });
      return res.json({
        ...existing.toObject(),
        isNew: false,
        wasCreated: false
      });
    }
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
