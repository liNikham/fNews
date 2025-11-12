const express = require("express");
const router = express.Router();
const Article = require("../models/Article");

// 🧹 Manual cleanup endpoint (for testing or manual triggers)
router.delete("/all", async (req, res) => {
  try {
    const result = await Article.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} articles`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧹 Cleanup articles older than a specific date
router.delete("/old", async (req, res) => {
  try {
    const { beforeDate } = req.query;
    if (!beforeDate) {
      return res.status(400).json({ error: "beforeDate query parameter required (ISO format)" });
    }

    const date = new Date(beforeDate);
    const result = await Article.deleteMany({ createdAt: { $lt: date } });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} articles before ${beforeDate}`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📊 Get cleanup stats
router.get("/stats", async (req, res) => {
  try {
    const total = await Article.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Article.countDocuments({ createdAt: { $gte: today } });

    res.json({
      totalArticles: total,
      todayArticles: todayCount,
      olderArticles: total - todayCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

