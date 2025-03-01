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
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img 
              src="/user_icon.png" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  // State to track active citation
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  // Handle citation click
  const handleCitationClick = useCallback((index: number) => {
    setActiveCitation(activeCitation === index ? null : index);
    
    // Open the URL in a new tab if sources exist
    if (message.sources && message.sources[index]?.url) {
      window.open(message.sources[index].url, '_blank', 'noopener,noreferrer');
    }
  }, [activeCitation, message.sources]);

  // Process content to add inline citation links
  const processContent = (content: string) => {
    if (!message.sources || message.sources.length === 0) {
      return content;
    }

    // Replace citation markers like [1], [2], etc. with interactive citation spans
    return content.replace(/\[(\d+)\]/g, (match, citationNumber) => {
      const num = parseInt(citationNumber, 10);
      if (num > 0 && num <= message.sources.length) {
        return `<span class="inline-citation">[${citationNumber}]</span>`;
      }
      return match;
    });
  };

  return (
    <div className="flex gap-3 max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden">
            <img 
              src="/headshot.png" 
              alt="Ibrahim Bashir" 
              className="w-full h-full object-cover"
            />
          </div>
      </div>
      <div className="flex-grow">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown 
            rehypePlugins={[rehypeRaw]}
            components={{
              a: ({ node, ...props }) => (
                <a 
                  {...props} 
                  className="text-primary hover:underline" 
                  target="_blank" 
                  rel="noopener noreferrer"
                />
              ),
              h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mt-4 mb-2" />,
              h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mt-3 mb-2" />,
              h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold mt-3 mb-1" />,
              ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 my-2" />,
              ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 my-2" />,
              blockquote: ({ node, ...props }) => (
                <blockquote {...props} className="border-l-4 border-slate-300 pl-4 italic my-2" />
              ),
              code: ({ node, inline, ...props }) => (
                inline 
                  ? <code {...props} className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono" />
                  : <pre className="bg-slate-100 p-3 rounded my-2 text-sm font-mono overflow-x-auto"><code {...props} /></pre>
              ),
              span: ({ node, ...props }) => {
                if (props.className === 'inline-citation') {
                  const citationText = props.children?.toString() || '';
                  const citationNumber = parseInt(citationText.replace(/[\[\]]/g, ''), 10);
                  
                  return (
                    <a 
                      {...props}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCitationClick(citationNumber - 1);
                      }}
                      className="inline-flex items-center justify-center bg-blue-100 text-primary text-xs rounded-full w-5 h-5 align-baseline font-medium hover:bg-blue-200 transition-colors"
                      style={{ textDecoration: 'none', verticalAlign: 'text-top' }}
                    >
                      {citationNumber}
                    </a>
                  );
                }
                return <span {...props} />;
              }
            }}
          >
            {processContent(message.content)}
          </ReactMarkdown>

          {message.sources && message.sources.length > 0 && (
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
                      <span>{source.title}</span>
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
  );
}