
import { useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import ProfileCard from "@/components/ProfileCard";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import LinksDropdown from "@/components/LinksDropdown";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="/rtblogo.png" alt="Run the Business" className="h-8" />
            <h1 className="text-xl font-medium text-slate-800">Run the Business</h1>
          </div>
          <LinksDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row container mx-auto px-4 py-6 gap-8 max-w-screen-xl">
        {/* Left Column (Sidebar) - Mobile: Full Width, Desktop: 1/4 Width */}
        <div className="w-full md:w-1/4 space-y-6">
          <ProfileCard />
          <SuggestedQuestions />
        </div>

        {/* Right Column (Chat) - Mobile: Full Width, Desktop: 3/4 Width */}
        <div className="w-full md:w-3/4 flex flex-col">
          <ChatInterface />

          {/* Powered By Section */}
          <div className="mt-3 flex justify-center">
            <p className="text-sm text-slate-500">Powered by <a href="https://runthebusiness.substack.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Run the Business</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}
