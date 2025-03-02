import { MessageType } from "@shared/schema";

// Helper function to make API requests
export async function fetchChat(
  message: string, 
  history?: { role: string, content: string }[]
): Promise<MessageType> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        message,
        history
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to get response");
    }

    // Parse the JSON response explicitly
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error in fetchChat:", error);
    throw new Error("Failed to send message: " + (error.message || "Unknown error"));
  }
}

// Helper function to get system status
export async function fetchSystemStatus() {
  const response = await fetch("/api/system-status");
  
  if (!response.ok) {
    throw new Error("Failed to fetch system status");
  }
  
  return response.json();
}
