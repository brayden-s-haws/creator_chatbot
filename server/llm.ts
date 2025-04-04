import OpenAI from "openai";
import { MessageType, SourceCitation } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-api-key",
});

// Default model
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const CHAT_MODEL = "gpt-4o";

// We'll use all available sources with each message
// No maximum limit to ensure all citations have corresponding sources
console.log("Using all available sources for citations");

// This function has been moved to embeddings.ts

interface VectorDocumentWithScore {
  id: number;
  documentId: string;
  content: string;
  embedding: number[] | any; // Need to handle unknown type from database
  articleId: number;
  title: string;
  url: string;
  createdAt: Date;
  score?: number;
}

/**
 * Generate an answer based on the user's question, retrieved content, and conversation history
 */
export async function generateAnswer(
  question: string,
  relevantChunks: VectorDocumentWithScore[],
  conversationHistory: { role: string; content: string }[] = []
): Promise<MessageType> {
  // If no relevant chunks, use general knowledge
  const usingGeneralKnowledge = relevantChunks.length === 0;

  // Format context for the prompt
  let contextText = "";
  const sources: SourceCitation[] = [];
  const sourceMap: Record<string, number> = {}; // Track citation indices

  if (!usingGeneralKnowledge) {
    contextText = "Here are the relevant content sections to build your answer from:\n\n";

    // Add each chunk to the context
    relevantChunks.forEach((chunk, index) => {
      contextText += `[Content ${index + 1}] ${chunk.content}\n\n`;

      // Add source if not already included
      const sourceExists = sourceMap[chunk.url];
      if (sourceExists === undefined) {
        // Add to sources array and track its index
        sources.push({
          title: chunk.title,
          url: chunk.url,
        });
        sourceMap[chunk.url] = sources.length - 1;
      }
    });
  }

  // Create system message
  const systemMessage = {
    role: "system",
    content: `You are a knowledge expert in your field. Your responses should be helpful, informative and conversational. Answer questions in the first person as if in a direct conversation with the user. After providing a response ask an engaging follow up question to the user or encourage them to dive deeper into their questions.

${usingGeneralKnowledge ? 
  "You don't have specific content from your knowledge base to answer this question, so please use your general knowledge. Make it clear in your response that you're using general knowledge." : 
  "Use ONLY the provided content to answer the question. If the provided content doesn't contain enough information to answer the question completely, acknowledge the limitations and provide the best answer based on what's available."}

Respond in a clear, conversational tone. Use markdown formatting for rich text display:
- Use **bold** for emphasis
- Use headings (##, ###) for section titles
- Use bullet lists and numbered lists where appropriate
- Use \`code\` formatting for technical terms or snippets
- Use > for blockquotes when referencing direct quotes
Format these elements appropriately to improve readability.

When citing information from the provided sources, use numbered inline citations like [1], [2], etc. that correspond to the order of sources provided. Each citation number should match the index of the source in the sources list (starting from 1). For example, "According to research [1], product teams should focus on..." where [1] refers to the first source in the list.

IMPORTANT: Always ensure that every citation number in your response ([1], [2], etc.) corresponds to an actual source in the sources list. The maximum number of sources available is ${sources.length}, so you MUST ONLY use citation numbers [1] through [${sources.length}]. NEVER use citation numbers higher than the number of available sources or reference nonexistent citations. Before submitting your final response, thoroughly check that all citation numbers are valid and within range. Each [n] citation must have a corresponding source in the sources list. If you need to mention something that's not in the provided sources, do not include a citation number for it at all.

To be absolutely clear: 
1. If you have 4 sources, then only use [1], [2], [3], and [4] in your answer.
2. NEVER include a [5] or higher if you only have 4 sources.
3. If you need to reference something without a citation, simply state it as general knowledge WITHOUT using any numbered citation markers.
4. Do not use placeholder citations that don't correspond to sources in the list.

Important: Do not mention the source platform or publication name in your actual answer. Respond as if you're having a direct conversation.`,
  };

  // Create user message
  const userMessage = {
    role: "user",
    content: `Question: ${question}

${usingGeneralKnowledge ? "Please answer using your general knowledge on this topic." : contextText}`,
  };

  try {
    // Create messages array including conversation history
    const messages = [
      systemMessage as any
    ];
    
    // Add conversation history if it exists
    if (conversationHistory.length > 0) {
      // Add a system message explaining the context
      messages.push({
        role: "system",
        content: "The following is the conversation history between the user and assistant. Use this context to inform your response to the current question."
      });
      
      // Add the conversation history
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }
    
    // Add the current user question
    messages.push(userMessage as any);
    
    // Generate response from OpenAI
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 1000,
    });

    const answer = response.choices[0].message.content || "I couldn't generate an answer.";

    // Return formatted message
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: answer,
      createdAt: new Date().toISOString(),
      sources: sources,
      isGeneralKnowledge: usingGeneralKnowledge,
    };
  } catch (error) {
    console.error("Error generating answer:", error);

    // Return error message
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "I'm sorry, but I encountered an error while generating a response. Please try again later.",
      createdAt: new Date().toISOString(),
      sources: [],
    };
  }
}