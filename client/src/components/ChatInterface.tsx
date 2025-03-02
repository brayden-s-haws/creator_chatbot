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
    <Card className="flex-grow flex flex-col overflow-hidden shadow-sm border border-slate-200">
      {/* Chat Header */}
      <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50"> {/* Increased padding */}
        <h2 className="font-semibold text-lg">Chat with Ibrahim</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearChat}
          className="text-slate-500 hover:text-primary px-4 py-2"
        >
          Clear chat
        </Button>
      </div>

      {/* Chat Messages Area */}
      <div 
        ref={chatMessagesRef}
        className="flex-grow p-6 overflow-y-auto space-y-8" {/* Increased padding and spacing */}
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
          <div className="flex gap-4 max-w-3xl mt-4"> {/* Added margin top and increased gap */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden"> {/* Increased size */}
                <img 
                  src="/headshot.png" 
                  alt="Ibrahim Bashir" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="bg-slate-100 px-6 py-4 rounded-lg flex items-center"> {/* Increased padding */}
              <div className="typing-indicator">
                <span className="mx-1 inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
                <span className="mx-1 inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                <span className="mx-1 inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="p-6 border-t border-slate-200"> {/* Increased padding */}
        <form onSubmit={handleSubmit} className="flex gap-4"> {/* Increased gap */}
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question about product management..."
            className="flex-grow"
          />
          <Button type="submit" disabled={isTyping || !inputMessage.trim()}>
            <span className="mr-2">Send</span> {/* Increased margin */}
            <Send className="h-5 w-5" /> {/* Increased size */}
          </Button>
        </form>
      </div>
    </Card>
  );
}