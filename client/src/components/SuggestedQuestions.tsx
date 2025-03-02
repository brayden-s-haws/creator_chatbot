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

      <div className="flex flex-wrap gap-2"> {/* Added flexbox for better layout */}
        {questions.map((question, index) => (
          <button
            key={index}
            className="w-full text-left p-2 text-sm rounded-md hover:bg-slate-100 transition-colors bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"  {/* Improved styling */}
            onClick={() => handleQuestionClick(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </Card>
  );
}