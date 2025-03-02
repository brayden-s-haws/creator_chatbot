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
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h2 className="font-semibold text-lg">Chat with Ibrahim</h2>
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
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img 
                  src="/headshot.png" 
                  alt="Ibrahim Bashir" 
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
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() === "" || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Adjust textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Add user message to state
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    
    setIsLoading(true);
    
    try {
      // Send message to server
      const response = await axios.post("/api/chat", { 
        message: userMessage,
        history: messages
      });
      
      // Add assistant response to state
      const newAssistantMessage: Message = { 
        role: "assistant", 
        content: response.data.message 
      };
      
      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      const errorMessage: Message = { 
        role: "assistant", 
        content: "Sorry, I'm having trouble connecting right now. Please try again later." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-lg shadow overflow-hidden">
      {/* Chat Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-2xl font-medium text-slate-700">Welcome to Ibrahim Bot</h2>
              <p className="text-slate-500">
                Ask me anything about running a B2B business, product management, or growth strategies.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}>
                <ReactMarkdown
                  className="prose prose-slate max-w-none"
                  remarkPlugins={[remarkGfm]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <div className="flex space-x-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="resize-none min-h-[50px] max-h-[200px] rounded-xl border-slate-300 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || input.trim() === ""}
            className="orange-button h-10 w-10 p-0 flex items-center justify-center"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
