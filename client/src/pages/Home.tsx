import { useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import ProfileCard from "@/components/ProfileCard";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import CsvUploader from "@/components/CsvUploader";
import LinksDropdown from "@/components/LinksDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 shadow-sm">
        <div className="container mx-auto px-4 max-w-screen-xl flex items-center">
          <div className="flex items-center gap-4">
            <img src="/chatbot_icon.svg" alt="Knowledge Assistant" className="h-12" />
            <h1 className="text-xl font-semibold text-slate-800 font-['Poppins']">Knowledge Assistant</h1>
          </div>
          <div className="ml-auto">
            <LinksDropdown />
          </div>
        </div>
      </header>

      {/* Main Content - Make this flex with proper height */}
      <main className="flex-1 flex flex-col md:flex-row container mx-auto px-4 py-6 gap-8 max-w-screen-xl">
        {/* Left Column (Sidebar) */}
        {!isMobile && (
          <div className="w-full md:w-1/3 flex flex-col space-y-6">
            <ProfileCard />
            {/* Regular questions section */}
            <div className="flex-1">
              <SuggestedQuestions />
            </div>
          </div>
        )}

        {/* Right Column (Chat) - Make this flex-1 to fill space */}
        <div className={`w-full ${!isMobile ? 'md:w-2/3' : ''} flex flex-col`}>
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}