# Content Chatbot Template

## Description
Knowledge resources often exist as vast collections of long-form content, making quick information retrieval challenging. This Content Chatbot template solves this problem by creating an AI-powered assistant trained on your own content. This allows users to have interactive conversations about topics in your content and get insights directly inspired by your expertise.

![Screenshot of Chatbot](https://github.com/user-attachments/assets/943169b8-913f-4aa9-86f7-96e12eb9be96)

You can customize this chatbot for any field or topic where you have valuable content that users would benefit from exploring through conversation.

## Customization Guide
This is a generic template designed to be easily customized for your specific content and branding:

1. **Replace Branding**: 
   - Update ProfileCard.tsx with your name, title, and profile image
   - Modify LinksDropdown.tsx with your relevant links
   - Customize SuggestedQuestions.tsx with questions specific to your content
   - Edit ChatInterface.tsx welcome message to reflect your brand voice

2. **Add Your Content**: 
   - Import your own content using the CSV uploader (use articles-sample.csv.template as a guide)
   - Or modify server/rss-processor.ts to connect to your own content source
   - Template data files provided: data.json.template, vector-store.json.template

3. **Style Customization**: 
   - Update theme.json to match your brand colors
   - Customize UI components as needed in the client/src/components directory

4. **Set Up Database**: 
   - Configure a PostgreSQL database to store your content and embeddings
   - Update environment variables to include your DATABASE_URL
   - Set your OPENAI_API_KEY to enable embedding generation and response creation

## How It Works
The chatbot is built by ingesting content from your content source, creating embeddings, and using AI to generate conversational responses based on semantic search. This diagram shows the various content flows in detail:

```mermaid
graph TD
    A[Start] --> B[Import content from source]
    B --> C[Process content]
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

- **Content Ingestion**: The system automatically fetches content from your source and processes it into chunks suitable for embeddings.
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
- **server/rss-processor.ts**: Fetches and processes content from your content source's RSS feed.
- **client/src/components/ChatInterface.tsx**: The main chat UI component that handles user interactions.
- **client/src/components/ChatMessage.tsx**: Renders individual messages with support for markdown and citations.
- **shared/schema.ts**: Defines the database schema and TypeScript types used throughout the application.
- **scripts/fetch-more-articles.ts**: Utility for fetching additional articles from content archives.
- **scripts/import-from-csv.ts**: Utility for importing articles from CSV files.

## Setup
The compute demands for this are minimal since it's primarily connecting APIs and serving a web interface. The application can be deployed on any platform that supports Node.js and PostgreSQL. Here's how to set it up:

1. Clone the repository:
   ```
   git clone https://github.com/username/content-chatbot.git
   cd content-chatbot
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
- Add support for multiple content sources
- Add authentication to support personal conversation history
- Implement more advanced vector search techniques

## Acknowledgements
- Thanks to the creators of the libraries and tools that power this chatbot template

## License

This project is open source and available under the [MIT License](LICENSE).
