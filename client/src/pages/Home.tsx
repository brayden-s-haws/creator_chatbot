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
      <header className="bg-white border-b border-slate-200 py-4 shadow-sm">
        <div className="container mx-auto px-4 max-w-screen-xl flex items-center">
          <div className="flex items-center gap-4">
            <img src="/rtblogo.png" alt="Run the Business" className="h-12" />
            <h1 className="text-xl font-semibold text-slate-800 font-['Poppins']">Run the Business</h1>
          </div>
          <div className="ml-auto">
            <LinksDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row container mx-auto px-4 py-6 gap-8 max-w-screen-xl">
        {/* Left Column (Sidebar) - Mobile: Full Width, Desktop: 1/3 Width */}
        <div className="w-full md:w-1/3 flex flex-col gap-6 md:max-h-[calc(100vh-100px)] md:sticky md:top-[100px]">
          <ProfileCard />
          <SuggestedQuestions />
        </div>

        {/* Right Column (Chat) - Mobile: Full Width, Desktop: 2/3 Width */}
        <div className="w-full md:w-2/3 flex flex-col">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}