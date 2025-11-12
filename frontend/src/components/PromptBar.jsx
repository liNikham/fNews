import { motion } from 'framer-motion'

export default function PromptBar({ prompt, setPrompt }) {
  const suggestions = [
    "Explain in simplest terms",
    "How this affects the economy",
    "What does this mean for investors?",
    "Break down the key points",
    "Explain like I'm 10 years old",
    "What's the bottom line?"
  ]

  return (
    <motion.div
      className="glass-strong rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 backdrop-blur-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.label
        htmlFor="prompt-input"
        className="block text-base sm:text-lg font-semibold text-slate-100 mb-3 sm:mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Customize your explanation:
      </motion.label>

      <motion.div
        className="relative mb-4 sm:mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <input
          id="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter how you want to understand news..."
          className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-slate-900/50 border-2 border-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 text-base sm:text-lg"
        />
      </motion.div>

      <motion.div
        className="text-xs sm:text-sm font-medium text-slate-400 mb-3 sm:mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Quick suggestions:
      </motion.div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        {suggestions.map((s, index) => (
          <motion.button
            key={s}
            onClick={() => setPrompt(s)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 ${
              prompt === s
                ? 'gradient-accent text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800/30 text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50'
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
