const cron = require("node-cron");
const { runScraper } = require("./scraper");
const Article = require("../models/Article");

let scraperJob = null;
let cleanupJob = null;

// 🕐 Run scraper every 30 minutes
function startHourlyScraper() {
  const port = process.env.PORT || 4000;
  const backendApiUrl = process.env.BACKEND_API || `http://localhost:${port}/api/articles`;
  
  // Run immediately on start
  console.log("🚀 Running initial scraper...");
  runScraper(backendApiUrl);

  // Schedule to run every 30 minutes
  scraperJob = cron.schedule("*/60 * * * *", async () => {
    const triggerTime = new Date();
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`⏰ CRON JOB TRIGGERED at ${triggerTime.toISOString()}`);
    console.log(`📅 Time: ${triggerTime.toLocaleString()}`);
    console.log(`${'#'.repeat(60)}`);
    await runScraper(backendApiUrl);
  });

  console.log("✅ Scraper scheduled (runs every 30 minutes)");
  console.log("📋 Cron pattern: */30 * * * * (every 30 minutes)");
}

// 🧹 Daily cleanup - delete all articles at midnight (end of day)
function startDailyCleanup() {
  // Run at 00:00 (midnight) every day - deletes all articles from previous day
  cleanupJob = cron.schedule("0 0 * * *", async () => {
    try {
      const cleanupTime = new Date();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧹 [${cleanupTime.toISOString()}] Daily cleanup triggered`);
      console.log(`📅 Deleting all articles from previous day...`);
      console.log(`${'='.repeat(60)}`);
      
      // Delete all articles (they will be replaced with today's news)
      const result = await Article.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} articles from previous day`);
      
      // Run scraper immediately after cleanup to get fresh news for the new day
      console.log("🔄 Starting fresh scraper after cleanup...");
      const port = process.env.PORT || 4000;
      const backendApiUrl = process.env.BACKEND_API || `http://localhost:${port}/api/articles`;
      await runScraper(backendApiUrl);
      
      console.log(`${'='.repeat(60)}\n`);
    } catch (error) {
      console.error("❌ Cleanup error:", error.message);
      console.error("Stack:", error.stack);
    }
  });

  console.log("✅ Daily cleanup scheduled (runs at 00:00 every day - deletes all articles)");
}

// 🛑 Stop all scheduled jobs
function stopScheduler() {
  if (scraperJob) {
    scraperJob.stop();
    console.log("⏹️ Scraper stopped");
  }
  if (cleanupJob) {
    cleanupJob.stop();
    console.log("⏹️ Daily cleanup stopped");
  }
}

// 🚀 Initialize scheduler
function initScheduler() {
  startHourlyScraper();
  startDailyCleanup();
  console.log("✅ Scheduler initialized");
}

module.exports = {
  initScheduler,
  stopScheduler,
  startHourlyScraper,
  startDailyCleanup,
};

