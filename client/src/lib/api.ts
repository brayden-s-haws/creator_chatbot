import { MessageType } from "@shared/schema";

// Helper function to make API requests
export async function fetchChat(message: string): Promise<MessageType> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to get response");
  }

  return response.json();
}

// Helper function to get system status
export async function fetchSystemStatus() {
  const response = await fetch("/api/system-status");
  
  if (!response.ok) {
    throw new Error("Failed to fetch system status");
  }
  
  return response.json();
}
