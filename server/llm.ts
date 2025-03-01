import OpenAI from "openai";
import { MessageType, SourceCitation } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-api-key",
});

// Default model
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const CHAT_MODEL = "gpt-4o";

// Max number of sources to include with each message
// There is no hard-coded limit - we'll include all relevant sources
const MAX_SOURCES = 10; // Setting a reasonable limit, but can be increased if needed

console.log("Using MAX_SOURCES:", MAX_SOURCES);

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
 * Generate an answer based on the user's question and retrieved content
 */
export async function generateAnswer(
  question: string,
  relevantChunks: VectorDocumentWithScore[]
): Promise<MessageType> {
  // If no relevant chunks, use general knowledge
  const usingGeneralKnowledge = relevantChunks.length === 0;

  // Format context for the prompt
  let contextText = "";
  const sources: SourceCitation[] = [];

  if (!usingGeneralKnowledge) {
    contextText = "Here are the relevant content sections to build your answer from:\n\n";

    // Add each chunk to the context
    relevantChunks.forEach((chunk, index) => {
      contextText += `[Content ${index + 1}] ${chunk.content}\n\n`;

      // Add source if not already included
      const sourceExists = sources.some(source => source.url === chunk.url);
      if (!sourceExists) {
        sources.push({
          title: chunk.title,
          url: chunk.url,
        });
      }
    });
  }

  // Create system message
  const systemMessage = {
    role: "system",
    content: `You are Ibrahim Bashir, a product management expert. Your responses should reflect your writing style and perspective. Answer questions in the first person as if in a direct conversation with the user.

${usingGeneralKnowledge ? 
  "You don't have specific content from your articles to answer this question, so please use your general knowledge about product management. Make it clear in your response that you're using general knowledge." : 
  "Use ONLY the provided content to answer the question. If the provided content doesn't contain enough information to answer the question completely, acknowledge the limitations and provide the best answer based on what's available."}

Respond in a clear, conversational tone. Use markdown formatting for rich text display:
- Use **bold** for emphasis
- Use headings (##, ###) for section titles
- Use bullet lists and numbered lists where appropriate
- Use \`code\` formatting for technical terms or snippets
- Use > for blockquotes when referencing direct quotes
Format these elements appropriately to improve readability.

When citing information from the provided sources, use numbered inline citations like [1], [2], etc. that correspond to the order of sources provided. Each citation number should match the index of the source in the sources list (starting from 1). For example, "According to research [1], product teams should focus on..." where [1] refers to the first source in the list.

Important: Do not mention "Run the Business" or "Substack" in your actual answer. Respond as if you're having a direct conversation.`,
  };

  // Create user message
  const userMessage = {
    role: "user",
    content: `Question: ${question}

${usingGeneralKnowledge ? "Please answer using your general knowledge about product management." : contextText}`,
  };

  try {
    // Generate response from OpenAI
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        systemMessage as any,
        userMessage as any,
      ],
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