import { MessageType } from "@shared/schema";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useState, useCallback } from 'react';

type ChatMessageProps = {
  message: MessageType;
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end max-w-3xl ml-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-primary/10 px-4 py-3 rounded-lg">
          <p>{message.content}</p>
        </div>
        
      </div>
    );
  }

  // State to track active citation
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  // Handle citation click
  const handleCitationClick = useCallback((index: number) => {
    setActiveCitation(activeCitation === index ? null : index);

    // Only try to open URLs for sources that exist
    if (message.sources && index < message.sources.length && message.sources[index]?.url) {
      window.open(message.sources[index].url, '_blank', 'noopener,noreferrer');
    } else {
      console.log(`Citation source [${index + 1}] not found or has no URL`);
    }
  }, [activeCitation, message.sources]);

  // Process content to add interactive citation buttons and filter invalid citations
  const processContent = (content: string) => {
    if (!message.sources) {
      return content;
    }

    // Replace citation markers like [1], [2], etc. with interactive citation buttons
    // or remove invalid citations entirely
    return content.replace(/\[(\d+)\]/g, (match, citationNumber) => {
      const num = parseInt(citationNumber, 10) - 1; // Convert to 0-based index
      const sourceExists = message.sources && num >= 0 && num < message.sources.length;

      // If the citation is invalid (references a non-existent source)
      if (!sourceExists) {
        console.warn(`Invalid citation found: [${citationNumber}] - only ${message.sources?.length || 0} sources available`);
        // Instead of showing invalid citations, we'll remove them completely
        return '';
      }

      // For valid citations, create the normal interactive button
      return `<span class="inline-citation" data-citation-index="${num}" data-citation-number="${citationNumber}">${citationNumber}</span>`;
    });
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>

        {/* Message bubble */}
        <div
          className={`p-4 rounded-lg shadow-sm ${
            message.role === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-800'
          }`}
        >
          {/* Message content */}
          <div className="prose prose-sm max-w-none break-words">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              components={{
                a: ({ node, ...props }) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                    className={`underline ${message.role === 'user' ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                  />
                ),
                code: ({ node, inline, className, children, ...props }) => {
                  if (inline) {
                    return (
                      <code
                        className={`${message.role === 'user' ? 'bg-blue-700/60 text-blue-100' : 'bg-slate-100 text-slate-800'} px-1.5 py-0.5 rounded text-sm`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <div className={`${message.role === 'user' ? 'bg-blue-700/60' : 'bg-slate-100'} rounded-md overflow-hidden my-2`}>
                      <pre className={`p-3 overflow-x-auto text-sm ${message.role === 'user' ? 'text-blue-100' : 'text-slate-800'}`}>
                        <code {...props}>{children}</code>
                      </pre>
                    </div>
                  );
                },
                span: ({ node, ...props }) => {
                  if (props.className === 'inline-citation') {
                    // Extract citation index from the data attribute
                    const citationIndexAttr = node.properties?.['data-citation-index'];
                    const citationNumberAttr = node.properties?.['data-citation-number'];

                    const citationIndex = typeof citationIndexAttr === 'string'
                      ? parseInt(citationIndexAttr, 10)
                      : parseInt(props.children?.toString() || '1', 10) - 1;

                    const citationNumber = typeof citationNumberAttr === 'string'
                      ? citationNumberAttr
                      : props.children?.toString() || '1';

                    // Determine if the source exists - ensure it's within the available sources
                    const sourceExists = message.sources &&
                                        citationIndex >= 0 &&
                                        citationIndex < message.sources.length;

                    // If this is a citation number that exceeds our sources, display it differently
                    const isInvalidCitation = parseInt(citationNumber, 10) > (message.sources?.length || 0);

                    // Log issue with invalid citations for debugging
                    if (isInvalidCitation) {
                      console.warn(`Invalid citation: [${citationNumber}] - only ${message.sources?.length || 0} sources available`);
                    }

                    return (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (sourceExists) {
                            handleCitationClick(citationIndex);
                          }
                        }}
                        className={`inline-flex items-center justify-center text-xs rounded-full w-5 h-5 align-text-top font-medium transition-colors ${
                          sourceExists
                            ? "bg-blue-100 text-primary hover:bg-blue-200 cursor-pointer"
                            : isInvalidCitation
                              ? "bg-red-100 text-red-500 cursor-not-allowed"
                              : "bg-gray-100 text-gray-500 cursor-not-allowed"
                        }`}
                        style={{ border: 'none', padding: 0, margin: '0 2px' }}
                        title={sourceExists
                          ? "Click to view source"
                          : isInvalidCitation
                            ? "Invalid citation: source does not exist"
                            : "Source not available"}
                        disabled={!sourceExists}
                      >
                        {citationNumber}
                      </button>
                    );
                  }
                  return <span {...props} />;
                }
              }}
            >
              {processContent(message.content)}
            </ReactMarkdown>

            {/* Only show sources section when there are sources AND it's not general knowledge */}
            {message.sources && message.sources.length > 0 && !message.isGeneralKnowledge && (
              <div className="bg-slate-50 p-3 rounded-md mt-3 text-sm border border-slate-200">
                <h4 className="font-medium text-slate-700 mb-1">Sources:</h4>
                <ul className="space-y-1 text-slate-600">
                  {message.sources.map((source, idx) => (
                    <li
                      key={idx}
                      className={`transition-colors duration-200 rounded p-1 ${activeCitation === idx ? 'bg-blue-100' : ''}`}
                    >
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="inline-flex items-center justify-center bg-blue-100 text-primary text-xs rounded-full w-5 h-5 mr-1 font-medium">{idx + 1}</span>
                        <span>{source.title || `Source ${idx + 1}`}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {message.isGeneralKnowledge && (
              <div className="bg-slate-50 p-3 rounded-md mt-3 text-sm border border-slate-200">
                <h4 className="font-medium text-slate-700 mb-1">Note:</h4>
                <p className="text-slate-600">
                  This response is based on general knowledge about product management and business strategy.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}