
import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTED_QUESTIONS = [
  "How do I build a GTM strategy for a new product?",
  "What metrics should I track for product-market fit?",
  "How do I prioritize features for my roadmap?",
  "What's the difference between product-led vs sales-led growth?",
  "How do I create an effective product launch plan?",
  "How can I reduce customer churn?",
  "What's the best way to gather user feedback?",
  "How do I identify my product's core value proposition?",
  "What frameworks help with product pricing decisions?",
  "How should I structure my product team for success?",
  "What are best practices for running effective customer interviews?",
  "How do I validate product ideas before building them?",
  "What is a good North Star metric for SaaS products?"
];

type SuggestedQuestionsProps = {
  onSelectQuestion?: (question: string) => void;
};

export default function SuggestedQuestions({ onSelectQuestion }: SuggestedQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allQuestions] = useState(SUGGESTED_QUESTIONS);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  
  // Get 4 questions based on current index
  const visibleQuestions = () => {
    const questions = [];
    for (let i = 0; i < 4; i++) {
      const idx = (currentIndex + i) % allQuestions.length;
      questions.push(allQuestions[idx]);
    }
    return questions;
  };
  
  // Rotate questions every 10 seconds
  useEffect(() => {
    if (!isAutoScrolling) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % allQuestions.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [allQuestions.length, isAutoScrolling]);
  
  const handleQuestionClick = (question: string) => {
    if (typeof window !== 'undefined') {
      // Dispatch a custom event that ChatInterface can listen for
      const event = new CustomEvent('suggested-question', { detail: question });
      window.dispatchEvent(event);
    }
    
    // Also call the callback if provided
    if (onSelectQuestion) {
      onSelectQuestion(question);
    }
  };
  
  const handleRefresh = () => {
    // Shuffle to a random position
    const randomIndex = Math.floor(Math.random() * allQuestions.length);
    setCurrentIndex(randomIndex);
  };
  
  // Pause auto-scrolling when hovering
  const handleMouseEnter = () => setIsAutoScrolling(false);
  const handleMouseLeave = () => setIsAutoScrolling(true);
  
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-base">Suggested Questions</h3>
        <button 
          onClick={handleRefresh}
          className="text-xs text-primary hover:text-primary/80 transition"
        >
          Refresh
        </button>
      </div>
      
      <div 
        className="space-y-2 min-h-[240px] overflow-hidden" 
        ref={carouselRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="transition-all duration-500 ease-in-out" style={{ transform: `translateY(0)` }}>
          {visibleQuestions().map((question, index) => (
            <motion.button 
              key={`${question}-${currentIndex + index}`}
              className="flex items-center w-full px-4 py-3 mb-2 text-xs bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-700 hover:text-primary transition"
              onClick={() => handleQuestionClick(question)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <span className="text-slate-400 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </span>
              <span className="text-left truncate">{question}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </Card>
  );
}
