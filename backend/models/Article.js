const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  url: { type: String, unique: true, index: true },
  date: { type: Date, default: Date.now }, // if your scraper provides actual publish date, set here
  summary: String,
  isRead: { type: Boolean, default: false },
  aiPrompt: { type: String, default: '' }, // last used prompt
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', ArticleSchema);
