import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import NewsCard from './components/NewsCard'
import PromptBar from './components/PromptBar'
import { getApiEndpoint } from './utils/api'

export default function App() {
  const [news, setNews] = useState([])
  const [readNews, setReadNews] = useState([])
  const [prompt, setPrompt] = useState("Explain in the simplest possible way")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fullUrl = getApiEndpoint('articles');
    
    console.log('🔍 Fetching articles from:', fullUrl);
    console.log('🌐 Environment:', import.meta.env.MODE);
    console.log('🔗 VITE_API_URL:', import.meta.env.VITE_API_URL || 'Not set (using default /api)');
    
    axios.get(fullUrl)
      .then(res => {
        console.log('✅ Articles fetched successfully:', res.data.length, 'articles');
        setNews(res.data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching articles:', err);
        console.error('📡 API URL used:', fullUrl);
        console.error('🔍 Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText
        });
        
        setLoading(false);
        
        // Show user-friendly error
        if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
          const errorMsg = `Cannot connect to backend API. Please check if VITE_API_URL is set correctly. Current URL: ${fullUrl}`;
          console.error('⚠️ Network Error:', errorMsg);
          setError(errorMsg);
        } else if (err.response) {
          setError(`Backend error: ${err.response.status} - ${err.response.statusText}`);
        } else {
          setError(`Error: ${err.message}`);
        }
      })
  }, [])

  const markAsRead = (id) => {
    const article = news.find(n => n._id === id)
    setReadNews([...readNews, article])
    setNews(news.filter(n => n._id !== id))
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  return (
    <div className="min-h-screen w-full relative z-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-16"
      >
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-8 sm:mb-12 lg:mb-16"
        >
          <motion.div
            className="inline-block mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl">📰</span>
          </motion.div>
          
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 text-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Financial News
            <br className="sm:hidden" />
            <span className="gradient-accent-text"> Simplifier</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-base sm:text-lg lg:text-xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed"
          >
            Transform complex financial news into clear, actionable insights
          </motion.p>
        </motion.div>

        {/* Prompt Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8 sm:mb-12"
        >
          <PromptBar prompt={prompt} setPrompt={setPrompt} />
        </motion.div>

        {/* Unread News Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-12 sm:mb-16"
        >
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-0"
            variants={containerVariants}
          >
            <motion.h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 flex items-center gap-3 flex-wrap"
              variants={containerVariants}
            >
              <span className="relative inline-block">
                Unread News
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-0.5 gradient-accent rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                />
              </span>
              {news.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.7 }}
                  className="px-3 py-1 sm:px-4 sm:py-1.5 gradient-accent rounded-full text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-500/30"
                >
                  {news.length}
                </motion.span>
              )}
            </motion.h2>
          </motion.div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-2xl p-8 sm:p-12 lg:p-16 text-center border-2 border-red-500/50"
            >
              <motion.div
                className="text-5xl sm:text-6xl mb-4"
              >
                ⚠️
              </motion.div>
              <p className="text-lg sm:text-xl lg:text-2xl text-red-400 font-medium mb-4">
                Connection Error
              </p>
              <p className="text-sm sm:text-base text-slate-400 mb-4">
                {error}
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Check browser console (F12) for more details
              </p>
            </motion.div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-2xl p-8 sm:p-12 lg:p-16 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="text-5xl sm:text-6xl mb-4 inline-block"
              >
                ⏳
              </motion.div>
              <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-medium">
                Loading news...
              </p>
            </motion.div>
          ) : news.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-2xl p-8 sm:p-12 lg:p-16 text-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl sm:text-6xl mb-4"
              >
                ✨
              </motion.div>
              <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-medium">
                All caught up! No unread news.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {news.map((article, index) => (
                <motion.div
                  key={article._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <NewsCard
                    article={article}
                    onRead={() => markAsRead(article._id)}
                    prompt={prompt}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Read News Section */}
        {readNews.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-12 sm:mb-16"
          >
            <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
              <motion.h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 flex items-center gap-3 flex-wrap"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="relative inline-block">
                  Already Read
                  <motion.span
                    className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                </span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="px-3 py-1 sm:px-4 sm:py-1.5 bg-slate-800/50 rounded-full text-xs sm:text-sm font-semibold text-slate-300 border border-slate-700/50"
                >
                  {readNews.length}
                </motion.span>
              </motion.h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 opacity-70">
              {readNews.map((article, index) => (
                <motion.div
                  key={article._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NewsCard article={article} read />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
