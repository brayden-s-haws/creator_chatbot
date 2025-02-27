import { useState } from "react";
import { Card } from "@/components/ui/card";

type SuggestedQuestionsProps = {
  onSelectQuestion?: (question: string) => void;
};

const SUGGESTED_QUESTIONS = [
  "How do I build a GTM strategy for a new product?",
  "What metrics should I track for product-market fit?",
  "How do I prioritize features for my roadmap?",
  "What's the difference between product-led vs sales-led growth?",
  "How do I create an effective product launch plan?"
];

export default function SuggestedQuestions({ onSelectQuestion }: SuggestedQuestionsProps) {
  const [questions] = useState(SUGGESTED_QUESTIONS);
  
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
  
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Suggested Questions</h3>
      
      <div className="space-y-2">
        {questions.map((question, index) => (
          <button 
            key={index}
            className="text-left w-full px-3 py-2 text-sm rounded-md hover:bg-primary/5 text-slate-700 hover:text-primary transition block"
            onClick={() => handleQuestionClick(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </Card>
  );
}
