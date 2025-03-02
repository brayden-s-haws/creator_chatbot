import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-slate-200/60">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5">
        <div className="flex items-center gap-4">
          <img 
            src="/headshot.png" 
            alt="Ibrahim Bashir" 
            className="rounded-full w-20 h-20 border-2 border-white/90 shadow-md"
          />
          <div>
            <h2 className="font-semibold text-xl text-white">Ibrahim Bashir</h2>
            <p className="text-blue-100 text-sm font-medium">Product & Business Leader</p>
          </div>
        </div>
      </div>
      <div className="p-5 bg-white">
        <p className="text-sm text-slate-600 leading-relaxed">
          Experienced product executive who has led teams at companies like Twitter, Coinbase, and Quid. Writer of the Run the Business newsletter and an active advisor.
        </p>
      </div>
    </Card>
  );
}