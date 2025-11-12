# 📰 Financial News Simplifier

A modern web application that automatically scrapes financial news, stores them in MongoDB, and provides AI-powered explanations to help users understand complex financial news in simple terms.

## ✨ Features

- 🤖 **Automated Scraping**: Runs every hour automatically
- 🧹 **Daily Cleanup**: Deletes all news at midnight and starts fresh
- 💡 **AI Explanations**: Get simplified explanations using OpenAI or Google Gemini
- 📱 **Responsive Design**: Beautiful, mobile-friendly UI built with Tailwind CSS
- 🎨 **Modern UI**: Professional design with smooth animations using Framer Motion
- ⚡ **Real-time Updates**: News updates automatically every hour

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- OpenAI API key OR Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd news-simplifier
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your MongoDB URI and API keys
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4000

## 📁 Project Structure

```
news-simplifier/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Scraper and scheduler services
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   └── App.jsx      # Main app component
│   └── package.json
└── scraper/             # Legacy scraper (now integrated in backend)
```

## ⚙️ Configuration

### Environment Variables

**Backend (.env)**
```env
MONGODB_URI=mongodb://localhost:27017/news-simplifier
PORT=4000
BACKEND_API=http://localhost:4000/api/articles
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
# OR
GEMINI_API_KEY=your_key_here
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:4000
```

## 🔄 Automated Scheduling

The application includes built-in scheduling:

- **Hourly Scraping**: Automatically scrapes news every hour at :00 minutes
- **Daily Cleanup**: Deletes all articles at midnight (00:00) and starts fresh
- **Auto-restart**: After cleanup, automatically scrapes fresh news for the new day

No additional setup required! The scheduler starts automatically when the backend server starts.

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options:

1. **Railway** (Recommended) - Easiest setup
2. **Render** - Good free tier
3. **Vercel** (Frontend) + Railway/Render (Backend)

All platforms offer free tiers perfect for this application!

## 📊 API Endpoints

- `GET /api/articles` - Get all articles
- `POST /api/articles` - Add article (used by scraper)
- `POST /api/explain` - Get AI explanation
- `DELETE /api/cleanup/all` - Delete all articles
- `GET /api/cleanup/stats` - Get article statistics
- `GET /health` - Health check

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- node-cron (scheduling)
- Cheerio (web scraping)
- OpenAI / Google Gemini (AI)

### Frontend
- React + Vite
- Tailwind CSS
- Framer Motion
- Axios

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

