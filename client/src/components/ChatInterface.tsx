import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from "./ChatMessage";
import { MessageType } from "@shared/schema";
import { Send } from "lucide-react";

export default function ChatInterface() {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content: "Hi there! I'm the Run the Business chatbot. I can answer questions about product management, business strategy, and more based on Ibrahim Bashir's Substack content.\n\nAsk me anything about product management, or try one of the suggested questions on the right.",
      createdAt: new Date().toISOString(),
      sources: [],
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response.json();
    },
    onSuccess: (data: MessageType) => {
      setMessages((prev) => [...prev, data]);
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message to the chat
    const userMessage: MessageType = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString(),
      sources: [],
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    
    // Send the message to the API
    chatMutation.mutate(inputMessage);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-message",
        role: "assistant",
        content: "Hi there! I'm the Run the Business chatbot. I can answer questions about product management, business strategy, and more based on Ibrahim Bashir's Substack content.\n\nAsk me anything about product management, or try one of the suggested questions on the right.",
        createdAt: new Date().toISOString(),
        sources: [],
      },
    ]);
  };

  return (
    <Card className="flex-grow flex flex-col overflow-hidden shadow-sm border border-slate-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h2 className="font-semibold text-lg">Chat with Run the Business</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearChat}
          className="text-slate-500 hover:text-primary px-3 py-1"
        >
          Clear chat
        </Button>
      </div>
      
      {/* Chat Messages Area */}
      <div 
        ref={chatMessagesRef}
        className="flex-grow p-4 overflow-y-auto space-y-6"
        style={{ height: "calc(100vh - 280px)" }}
      >
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
          />
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 max-w-3xl">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
            </div>
            <div className="bg-slate-100 px-4 py-3 rounded-lg flex items-center">
              <div className="typing-indicator">
                <span className="mx-0.5 inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
                <span className="mx-0.5 inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                <span className="mx-0.5 inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input Area */}
      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question about product management..."
            className="flex-grow"
          />
          <Button type="submit" disabled={isTyping || !inputMessage.trim()}>
            <span className="mr-1">Send</span>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
