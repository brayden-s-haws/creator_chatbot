import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui/card";

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
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-slate-200/60">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-blue-50">
        <CardTitle className="text-md font-medium text-slate-800">Suggested Topics</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-4 bg-white">
        <div className="space-y-2.5">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-2.5 px-3 text-sm font-normal border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              onClick={() => handleQuestionClick(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}