import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "./ChatMessage";
import { MessageType } from "@shared/schema";
import { Send } from "lucide-react";

export default function ChatInterface() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content: "Hi there! I'm your knowledge assistant. What questions can I help you with today?",
      createdAt: new Date().toISOString(),
      sources: [],
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [conversationHistory, setConversationHistory] = useState<MessageType[]>([]); // Added state for conversation history

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Track user interactions to only auto-scroll after user action
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false);
    }
  }, [messages, isTyping, initialLoad]);

  // Set user interaction flag when input receives focus or text changes
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };

    // Add event listeners to track user interaction with the page
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

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
        setConversationHistory((prev) => [...prev, userMessage]); // Update conversation history
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
        // Call the API to get a response
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            message,
            history: conversationHistory 
          }),
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
      setConversationHistory((prev) => [...prev, data]); // Update conversation history
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

    // Mark that user has interacted with the chat
    setHasUserInteracted(true);

    // Add user message to the chat
    const userMessage: MessageType = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString(),
      sources: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationHistory((prev) => [...prev, userMessage]); // Update conversation history
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
        content: "What other topics would you like to discuss?",
        createdAt: new Date().toISOString(),
        sources: [],
      },
    ]);
    setConversationHistory([]); // Clear conversation history
  };

  return (
    <>
    <Toaster />
      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border border-slate-200">
        {/* Chat Messages Area - using ScrollArea for controlled scrolling */}
        <ScrollArea 
          ref={chatMessagesRef}
          className="flex-1 p-4 space-y-6"
          style={{ 
            minHeight: "250px",
            height: "calc(100vh - 252px)",
            maxHeight: "calc(100vh - 252px)"
          }}
        >
          <div className="space-y-6 pr-4">
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
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img 
                  src="/user_icon.svg" 
                  alt="Assistant" 
                  className="w-full h-full object-cover"
                />
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
        </ScrollArea>

      {/* Chat Input Area */}
        <div className="p-4 border-t border-slate-200 mt-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {messages.length > 1 && (
            <div className="flex justify-end items-center gap-2 mb-2"> {/* Added container for buttons */}
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  const chatContent = messages.map(m => 
                    `${m.role === 'assistant' ? 'Assistant' : 'You'}: ${m.content}`
                  ).join('\n\n');

                  navigator.clipboard.writeText(chatContent)
                    .then(() => {
                      toast({
                        title: "Copied!",
                        description: "Chat copied to clipboard",
                        variant: "default",
                      });
                    })
                    .catch(err => {
                      console.error('Failed to copy: ', err);
                      toast({
                        title: "Error",
                        description: "Failed to copy chat to clipboard",
                        variant: "destructive",
                      });
                    });
                }}
                className="text-slate-500 hover:text-primary px-2 py-1 flex items-center justify-center"
                title="Copy chat to clipboard"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={handleClearChat}
                className="text-slate-500 hover:text-primary px-2 py-1 flex items-center justify-center"
                title="Clear chat"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question..."
              className="flex-grow"
            />
            <Button type="submit" disabled={isTyping || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </Card>
    </>
  );
}