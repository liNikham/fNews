require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const articlesRoutes = require("./routes/articles");
const explainRoutes = require("./routes/explain");
const cleanupRoutes = require("./routes/cleanup");
const { initScheduler } = require("./services/scheduler");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/articles", articlesRoutes);
app.use("/api/explain", explainRoutes);
app.use("/api/cleanup", cleanupRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});






const PORT = process.env.PORT || 4000;
console.log(process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
      // Initialize scheduler after server starts
      initScheduler();
    });
  })
  .catch((err) => console.error("MongoDB connect error", err));
