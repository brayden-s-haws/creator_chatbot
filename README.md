# Ibrahim Chatbot

## Description
Product management is a field filled with nuanced strategies and knowledge. While there's plenty of long-form content, accessing this information quickly through conversation can be challenging. Ibrahim Chatbot solves this problem by creating an AI-powered assistant trained on Ibrahim Bashir's content from his "Run the Business" blog. This allows product managers to have interactive conversations about product management concepts and get insights directly inspired by Ibrahim's expertise.

![Ibrahim Chatbot Screenshot](https://github.com/username/ibrahim-chatbot/assets/12345678/example-image-id)

If you're a product manager or interested in product, you can interact with this chatbot to get advice and insights on various product management topics.

## How It Works
The chatbot is built by ingesting content from Ibrahim Bashir's Substack blog, creating embeddings, and using AI to generate conversational responses based on semantic search. This diagram shows the various content flows in detail:

```mermaid
graph TD
    A[Start] --> B[Scrape articles from Substack]
    B --> C[Process article content]
    C --> D[Split content into chunks]
    D --> E[Generate embeddings with OpenAI API]
    E --> F[Store in vector database]
    F --> G[User asks question]
    G --> H[Generate embedding for query]
    H --> I[Search for similar chunks]
    I --> J[Retrieve relevant content]
    J --> K[Generate response with OpenAI]
    K --> L[Return answer to user with citations]
    L --> G
```

Here's a detailed view of how the system processes user queries:

```mermaid
graph TD
    A[User submits question] --> B[Create embedding for query]
    B --> C[Search vector store for similar content]
    C --> D[Retrieve top relevant chunks]
    D --> E{Are chunks found?}
    E -->|Yes| F[Prepare context with chunks]
    E -->|No| G[Use general knowledge mode]
    F --> H[Send query + context to OpenAI]
    G --> H
    H --> I[Format response with citations]
    I --> J[Return answer to user]
    J --> K[Log query for future improvement]
```

## Features
This describes some of the key features of how the code works to generate an interactive chat experience.

- **Content Ingestion**: The system automatically fetches content from Ibrahim Bashir's Substack blog and processes it into chunks suitable for embeddings.
- **Embedding Generation**: Each content chunk is processed through OpenAI's embedding API to create vector representations that can be semantically searched.
- **Vector Search**: When a user asks a question, the system finds the most semantically similar content chunks to provide as context.
- **Citation System**: The chatbot includes a citation system that references sources for the information it provides, maintaining transparency and credibility.
- **Scheduled Updates**: The system periodically checks for new content and updates its knowledge base automatically.
- **Admin Interface**: A simple dashboard allows monitoring of the system status and manually triggering updates.
- **CSV Import**: Additional content can be imported via CSV files to expand the chatbot's knowledge.

## Files
This describes the role of key files in creating the chatbot experience.
- **server/index.ts**: The main entry point for the application that sets up Express and serves both the API and client.
- **server/routes.ts**: Defines the API endpoints for chat, content refresh, and system status.
- **server/llm.ts**: Handles the interaction with OpenAI's API to generate responses.
- **server/embeddings.ts**: Manages the creation of embeddings for content and queries.
- **server/vector-store.ts**: Provides functionality for storing and searching vector embeddings.
- **server/rss-processor.ts**: Fetches and processes content from Ibrahim's Substack RSS feed.
- **client/src/components/ChatInterface.tsx**: The main chat UI component that handles user interactions.
- **client/src/components/ChatMessage.tsx**: Renders individual messages with support for markdown and citations.
- **shared/schema.ts**: Defines the database schema and TypeScript types used throughout the application.
- **scripts/fetch-more-articles.ts**: Utility for fetching additional articles from the Substack archive.
- **scripts/import-from-csv.ts**: Utility for importing articles from CSV files.

## Setup
The compute demands for this are minimal since it's primarily connecting APIs and serving a web interface. The application can be deployed on any platform that supports Node.js and PostgreSQL. Here's how to set it up:

1. Clone the repository:
   ```
   git clone https://github.com/username/ibrahim-chatbot.git
   cd ibrahim-chatbot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   DATABASE_URL=postgresql://user:password@localhost:5432/database
   ```

4. Set up the database:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

Key Packages/Tools:
- **OpenAI**: Used for accessing GPT models and generating embeddings
- **Express**: Web server framework for the API
- **Drizzle ORM**: Database ORM for PostgreSQL
- **React**: Frontend UI library
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TypeScript**: Typed JavaScript for better developer experience
- **Vite**: Fast build tool and development server

## Roadmap
- Add support for multiple content sources beyond Substack
- Add authentication to support personal conversation history

## Acknowledgements
- Huge thanks to Ibrahim Bashir for creating the valuable content that powers this chatbot

## License

This project is open source and available under the [MIT License](LICENSE).