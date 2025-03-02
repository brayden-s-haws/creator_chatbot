import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { format } from 'date-fns';

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; timestamp?: Date }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Get initial chat message
  const { data: initialMessage, isLoading: initialLoading } = useQuery({
    queryKey: ["initialMessage"],
    queryFn: async () => {
      const response = await axios.get("/api/chat/initial");
      return response.data;
    },
    onSuccess: (data) => {
      if (data && data.content && chatHistory.length === 0) {
        setChatHistory([{ role: "assistant", content: data.content, timestamp: new Date() }]);
      }
    },
  });

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (newMessage: string) => {
      const response = await axios.post("/api/chat", {
        message: newMessage,
        history: chatHistory,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data && data.content) {
        setChatHistory((prev) => [...prev, { role: "assistant", content: data.content, timestamp: new Date() }]);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message, timestamp: new Date() };
    setChatHistory((prev) => [...prev, userMessage]);
    sendMessage(message);
    setMessage("");
  };

  // Group messages by date for timestamps
  const getMessageGroups = () => {
    const result: { date: string; messages: typeof chatHistory }[] = [];
    let currentDate = '';
    let currentGroup: typeof chatHistory = [];

    chatHistory.forEach((message) => {
      if (!message.timestamp) return;

      const messageDate = format(message.timestamp, 'MMM d, yyyy');

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          result.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      result.push({ date: currentDate, messages: currentGroup });
    }

    return result;
  };

  const messageGroups = getMessageGroups();

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] md:h-[calc(100vh-12rem)] bg-white rounded-lg shadow overflow-hidden">
      {/* Chat messages area */}
      <div className="flex-grow overflow-y-auto p-4 chat-container">
        {initialLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className="timestamp">{group.date}</div>
            {group.messages.map((chat, index) => (
              <div
                key={`${groupIndex}-${index}`}
                className={`${
                  chat.role === "user" ? "flex justify-end" : "flex justify-start"
                }`}
              >
                <div
                  className={`chat-message ${
                    chat.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >
                  <ReactMarkdown className="prose prose-sm max-w-none message-content">
                    {chat.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-grow resize-none rounded-lg"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit" 
            disabled={isSending || !message.trim()}
            className="h-full rounded-full"
            style={{ backgroundColor: "#f97316" }}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}