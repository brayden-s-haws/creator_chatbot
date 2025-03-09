
import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <img 
            src="/headshot_new.jpeg"
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
