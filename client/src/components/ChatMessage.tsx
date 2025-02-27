import { MessageType } from "@shared/schema";
import { ExternalLink } from "lucide-react";

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
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex gap-3 max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
      </div>
      <div className="flex-grow">
        <div className="prose prose-sm max-w-none">
          {message.content.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
          
          {message.sources && message.sources.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-md mt-3 text-sm border border-slate-200">
              <h4 className="font-medium text-slate-700 mb-1">Sources:</h4>
              <ul className="space-y-1 text-slate-600">
                {message.sources.map((source, idx) => (
                  <li key={idx}>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
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
                This response is based on general knowledge. For more specific insights from Ibrahim Bashir, check out the Run the Business Substack.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
