const express = require("express");
const router = express.Router();
const Article = require("../models/Article");

const axios = require("axios");

// Helper: call OpenAI (completion/chat)
async function callOpenAI(prompt) {
  const OpenAI = require("openai");
  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini", // pick a generally available model; change if you have access
    messages: [{role: "user", content: prompt}],
    max_tokens: 800,
  });
  return res.choices[0].message.content;
}

// Helper: call Gemini (Google) — minimal example (v1)
async function callGemini(prompt) {
  // user already installed @google/generative-ai if using Gemini
  const {GoogleGenerativeAI} = require("@google/generative-ai");
  const gen = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
    apiVersion: "v1",
  });
  const model = gen.getGenerativeModel({model: "gemini-2.5-flash"}); // pick available model
  const result = await model.generateContent(prompt);
  return result.response ? result.response.text() : "";
}

router.post("/", async (req, res) => {
  
  try {
    const {articleId, customPrompt} = req.body;
    
    if (!articleId || !customPrompt)
      return res.status(400).json({error: "articleId & customPrompt required"});
    const article = await Article.findById(articleId);
    if (!article) return res.status(404).json({error: "article not found"});

    // Build system prompt + article
    const fullPrompt = `${customPrompt}\n\nArticle:\n${article.content}`;

    // choose provider
    let explanation = "";
    if (process.env.AI_PROVIDER === "gemini" && process.env.GEMINI_API_KEY) {
      explanation = await callGemini(fullPrompt);
    } else if (process.env.OPENAI_API_KEY) {
      explanation = await callOpenAI(fullPrompt);
    } else {
      return res.status(500).json({error: "No AI provider configured"});
    }

    // save summary & last prompt
    article.summary = explanation;
    article.aiPrompt = customPrompt;
    await article.save();

    res.json({summary: explanation});
  } catch (err) {
    console.error("explain error", err);
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
