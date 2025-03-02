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
import React from "react";
import { useQueryClient } from "@tanstack/react-query";

const questions = [
  "How do I get my first 1000 customers?",
  "What are the best strategies for B2B pricing?",
  "How can I improve customer retention?",
  "Tell me how to be a great PM",
  "What's the difference between sales and marketing?"
];

export default function SuggestedQuestions() {
  const queryClient = useQueryClient();

  const handleQuestionClick = (question: string) => {
    // Trigger chat with this question
    const event = new CustomEvent("suggested-question", {
      detail: { question }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-medium text-slate-800 mb-3">Suggested Questions</h2>
      <div className="space-y-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionClick(question)}
            className="w-full text-left p-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-slate-700 transition-colors text-sm"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
