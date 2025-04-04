
import { useState } from "react";
import { Card } from "./ui/card";

const SUGGESTED_QUESTIONS = [
  "Tell me about the key topics in this knowledge base",
  "What are the best practices for this domain?",
  "How can I learn more about this subject?",
  "What are the fundamental concepts I should understand?"
];

type SuggestedQuestionsProps = {
  onSelectQuestion?: (question: string) => void;
};

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
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <h3 className="font-semibold text-base mb-4">Suggested Questions</h3>
        
        <div className="space-y-2">
          {questions.map((question, index) => (
            <button 
              key={index}
              className="flex items-center w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-700 hover:text-primary transition"
              onClick={() => handleQuestionClick(question)}
            >
              <span className="text-slate-400 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </span>
              <span className="text-left">{question}</span>
            </button>
          ))}
        </div>
      </Card>
      
      {/* Branding section */}
      <Card className="p-6 flex flex-col items-center">
        <div className="text-center mt-2 text-sm text-slate-500">
          <p> </p>
        </div>
        <img 
          src="/user_icon.svg" 
          alt="Knowledge Base" 
          className="max-w-full h-auto w-24"
        />
        <div className="text-center mt-2 text-sm text-slate-500">
          <p className="text-sm text-slate-500"></p>
          <p> </p>
          <p></p>
        </div>
        <div className="text-center mt-2 text-sm text-slate-500">
          <p className="text-sm text-slate-500">Powered by <a href="#" target="_blank" rel="noopener noreferrer" className="text-blue-600">Knowledge Assistant</a></p>
          <p></p>
          <p></p>
        </div>
      </Card>
    </div>
  );
}
