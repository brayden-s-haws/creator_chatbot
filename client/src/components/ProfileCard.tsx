
import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <img 
            src="/headshot.png"
            alt="Ibrahim Bashir"
            className="w-20 h-20 rounded-full object-cover"
          />
        </div>
        <h3 className="font-semibold text-lg">Ibrahim Bashir</h3>
        <p className="text-sm text-slate-600 mt-1">Author of Run the Business | Host of 60 Minute Stories</p>
      </div>
    </Card>
  );
}
import React from "react";

export default function ProfileCard() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <img 
            src="/headshot.png" 
            alt="Ibrahim Bashir"
            className="h-12 w-12 rounded-full object-cover border border-slate-200" 
          />
          <div>
            <h2 className="font-medium text-slate-800">Ibrahim Bashir</h2>
            <p className="text-sm text-slate-500">Product & Growth Strategist</p>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-slate-600">
          <p>
            Former VP of Product at various tech companies. I write about B2B business, 
            product management, and growth strategies.
          </p>
        </div>
        
        <div className="mt-4">
          <a 
            href="https://runthebusiness.substack.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="orange-button inline-block text-sm"
          >
            Subscribe to Newsletter
          </a>
        </div>
      </div>
    </div>
  );
}
