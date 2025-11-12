import { useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { getApiEndpoint } from '../utils/api'
import AIResponse from './AIResponse'

export default function NewsCard({ article, onRead, prompt, read }) {
  const [expanded, setExpanded] = useState(false)
  const [simplified, setSimplified] = useState('')
  const [loading, setLoading] = useState(false)

  const handleExplain = async () => {
    try {
      if (simplified) {
        setExpanded(true)
        return
      }

      setLoading(true)
      const explainUrl = getApiEndpoint('explain');
      const res = await axios.post(explainUrl, {
        articleId: article._id,
        customPrompt: prompt
      })

      setSimplified(res.data.summary)
      setExpanded(true)
    } catch (err) {
      console.error("❌ Explain error:", err.response?.data || err.message)
      alert("Failed to explain news. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.div
        className={`group relative glass-strong rounded-xl sm:rounded-2xl p-5 sm:p-6 overflow-hidden transition-all duration-300 h-full flex flex-col ${
          read ? 'opacity-60' : ''
        }`}
        whileHover={!read ? { y: -4, transition: { duration: 0.2 } } : {}}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:via-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-500 rounded-xl sm:rounded-2xl pointer-events-none"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col flex-grow">
          <motion.h3
            className="text-lg sm:text-xl font-bold text-slate-100 mb-3 line-clamp-2 leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {article.title}
          </motion.h3>

          <motion.p
            className="text-slate-400 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 line-clamp-3 flex-grow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {article.description || (article.content ? article.content.slice(0, 150) : 'No description available')}...
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4 border-t border-slate-800/50">
            <motion.button
              onClick={handleExplain}
              disabled={loading || read}
              className={`flex-1 px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm transition-all duration-300 ${
                loading || read
                  ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800/50'
                  : 'gradient-accent text-white hover:shadow-lg hover:shadow-emerald-500/30 border-0'
              }`}
              whileHover={!loading && !read ? { scale: 1.02 } : {}}
              whileTap={!loading && !read ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="hidden sm:inline">Loading...</span>
                  <span className="sm:hidden">Load...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>💡</span>
                  <span>Explain</span>
                </span>
              )}
            </motion.button>

            {!read && (
              <motion.button
                onClick={onRead}
                className="px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm bg-slate-800/30 text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span className="hidden sm:inline">Mark Read</span>
                  <span className="sm:hidden">Read</span>
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              className="relative glass-strong rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <motion.button
                onClick={() => setExpanded(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white text-xl sm:text-2xl transition-all duration-300"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>

              <motion.h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 mb-4 sm:mb-6 pr-12 sm:pr-16 leading-tight"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {article.title}
              </motion.h2>

              <motion.div
                className="max-w-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {simplified ? (
                  <div className="ai-response-wrapper">
                    <div className="mb-4 pb-4 border-b border-slate-700/50">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg text-sm font-medium text-emerald-300">
                        <span>✨</span>
                        <span>AI-Powered Explanation</span>
                      </span>
                    </div>
                    <div className="ai-content">
                      <AIResponse content={simplified} />
                    </div>
                  </div>
                ) : (
                  <div className="original-content">
                    <div className="mb-4 pb-4 border-b border-slate-700/50">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-slate-400">
                        <span>📄</span>
                        <span>Original Article</span>
                      </span>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-slate-300 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">
                        {article.content || 'No content available'}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
