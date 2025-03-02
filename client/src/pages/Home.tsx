import { useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import ProfileCard from "@/components/ProfileCard";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import CsvUploader from "@/components/CsvUploader";
import LinksDropdown from "@/components/LinksDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <img src="/rtblogo.png" alt="Run the Business" className="h-8" />
          <h1 className="text-xl font-semibold text-slate-800">Run the Business</h1>
          <LinksDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row container mx-auto px-4 py-6 gap-8 max-w-screen-xl">
        {/* Left Column (Sidebar) - Mobile: Full Width, Desktop: 1/4 Width */}
        <div className="w-full md:w-1/4 space-y-6">
          <ProfileCard />
          <SuggestedQuestions />

          {/* CSV Uploader Component - Hidden */}
          {/* <div className="bg-white rounded-lg shadow">
            <CsvUploader />
          </div> */}
        </div>

        {/* Right Column (Chat) - Mobile: Full Width, Desktop: 3/4 Width */}
        <div className="w-full md:w-3/4 flex flex-col">
          <ChatInterface />

          {/* Powered By Section */}
          <div className="mt-3 flex justify-center">
            <p className="text-sm text-slate-500">Powered by <a href="https://runthebusiness.substack.com" target="_blank" rel="noopener noreferrer" className="text-blue-600">Run the Business</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}