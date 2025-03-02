import { useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import ProfileCard from "@/components/ProfileCard";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import CsvUploader from "@/components/CsvUploader";
import LinksDropdown from "@/components/LinksDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Card from "@/components/ui/card"; // Assuming this component exists.  Add import if necessary.
import ExternalLink from "@/components/ui/externalLink"; // Assuming this component exists. Add import if necessary.


export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/rtblogo.png" alt="Run The Business" className="h-8" />
            <h1 className="text-xl font-bold text-slate-800">Run the Business</h1>
          </div>
          <a 
            href="https://www.runthebusiness.net/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ibrahim's Links
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                <img 
                  src="/headshot.png" 
                  alt="Ibrahim Bashir" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Ibrahim Bashir</h2>
              <p className="text-sm text-slate-500 mt-1">
                Author of Run the Business | Host of 60 Minute Stories
              </p>
            </Card>

            {/* Suggested Questions */}
            <div className="flex flex-col h-full">
              <SuggestedQuestions />
            </div>
          </div>

          {/* Chat Section */}
          <div className="md:col-span-2">
            <ChatInterface />
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        <div className="container mx-auto px-4">
          Powered by <a href="https://www.runthebusiness.net/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Run the Business</a>
        </div>
      </footer>
    </div>
  );
}