import { motion } from 'framer-motion'

// Clean, professional component for rendering AI responses with markdown support
export default function AIResponse({ content }) {
  if (!content) return null;

  // Parse markdown formatting
  const formatText = (text) => {
    const elements = [];
    let currentIndex = 0;
    
    // Combined regex for bold (**text**), italic (*text*), and code (`text`)
    const markdownRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
    let match;
    
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > currentIndex) {
        elements.push(text.slice(currentIndex, match.index));
      }
      
      // Add formatted content
      if (match[1]) {
        // Bold
        elements.push(
          <strong key={match.index} className="font-semibold text-white">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic
        elements.push(
          <em key={match.index} className="italic">
            {match[4]}
          </em>
        );
      } else if (match[5]) {
        // Code
        elements.push(
          <code key={match.index} className="bg-slate-700/50 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-[0.9em]">
            {match[6]}
          </code>
        );
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      elements.push(text.slice(currentIndex));
    }
    
    return elements.length > 0 ? elements : text;
  };

  // Split content into paragraphs
  const paragraphs = content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6 text-slate-200 leading-relaxed">
      {paragraphs.map((paragraph, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.4,
            delay: idx * 0.08,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="text-[1.0625rem] tracking-wide"
        >
          {formatText(paragraph)}
        </motion.div>
      ))}
    </div>
  );
}
