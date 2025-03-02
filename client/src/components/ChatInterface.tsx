import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button, buttonVariants } from "@/components/ui/button";
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
      content: "Hi there! I'm Ibrahim Bashir, experienced product leader and author of Run the Business. What product or business questions can I help you with today?",
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

  // Listen for suggested question events
  useEffect(() => {
    const handleSuggestedQuestion = (event: CustomEvent) => {
      const question = event.detail;
      if (question) {
        // Add user message to the chat
        const userMessage: MessageType = {
          id: `user-${Date.now()}`,
          role: "user",
          content: question,
          createdAt: new Date().toISOString(),
          sources: [],
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsTyping(true);

        // Send the message to the API
        chatMutation.mutate(question);
      }
    };

    window.addEventListener('suggested-question', handleSuggestedQuestion as EventListener);

    return () => {
      window.removeEventListener('suggested-question', handleSuggestedQuestion as EventListener);
    };
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      try {
        // Use the updated apiRequest function from queryClient
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
        }

        // Parse JSON manually
        const data = await response.json();
        return data as MessageType;
      } catch (error: any) {
        console.error("Error in chat mutation:", error);
        throw error;
      }
    },
    onSuccess: (data: MessageType) => {
      setMessages((prev) => [...prev, data]);
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onError: (error: any) => {
      setIsTyping(false);
      console.error("Chat mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message || "Unknown error"}`,
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
        content: "What other product management or business strategy topics would you like to discuss?",
        createdAt: new Date().toISOString(),
        sources: [],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-lg shadow-md border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <h2 className="text-slate-700 font-medium">Chat with Ibrahim</h2>
        </div>

        {/* Chat Messages Area */}
        <div 
          ref={chatMessagesRef}
          className="flex-grow overflow-y-auto space-y-5 p-5 h-[550px] md:h-[650px] bg-slate-50/50"
          style={{ backgroundImage: "radial-gradient(circle at 25px 25px, rgba(240, 249, 255, 0.15) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(240, 249, 255, 0.15) 2%, transparent 0%)", backgroundSize: "100px 100px" }}
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isTyping && (
            <div className="flex items-center">
              <div className="animate-pulse flex space-x-2 ml-12">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-400 rounded-full animation-delay-200"></div>
                <div className="h-2 w-2 bg-blue-400 rounded-full animation-delay-400"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
              placeholder="Ask me anything about product or business..."
              className="flex-grow shadow-sm focus-visible:ring-blue-500"
              disabled={chatMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={chatMutation.isPending || !inputMessage.trim()}
              className="px-4 bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}