import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/ChatInterface";
import ProfileCard from "@/components/ProfileCard";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import SystemStatus from "@/components/SystemStatus";
import CsvUploader from "@/components/CsvUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  // Fetch system status when the component mounts
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system-status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">Run the Business Chatbot</h1>
          <a href="https://runthebusiness.substack.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 hover:text-primary transition">About</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row container mx-auto px-4 py-6 gap-8 max-w-screen-xl">
        {/* Left Column (Chat) - Mobile: Full Width, Desktop: 3/4 Width */}
        <div className="w-full md:w-3/4 flex flex-col">
          <ChatInterface />
          
          {/* Powered By Section */}
          <div className="mt-3 flex justify-center">
            <p className="text-sm text-slate-500">Powered by Run the Business content & OpenAI</p>
          </div>
        </div>
        
        {/* Right Column (Sidebar) - Mobile: Full Width, Desktop: 1/4 Width */}
        <div className="w-full md:w-1/4 space-y-6">
          <ProfileCard />
          <SuggestedQuestions />
          <SystemStatus status={systemStatus} />
          
          {/* CSV Uploader Component */}
          <div className="bg-white rounded-lg shadow">
            <CsvUploader />
          </div>
        </div>
      </main>
    </div>
  );
}
