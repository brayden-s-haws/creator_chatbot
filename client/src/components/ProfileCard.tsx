import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center space-y-4"> {/* Added space-y-4 for vertical spacing */}
        <div className="mb-4">
          <img 
            src="/headshot.png"
            alt="Ibrahim Bashir"
            className="w-20 h-20 rounded-full object-cover"
          />
        </div>
        <h3 className="font-semibold text-lg">Ibrahim Bashir</h3>
        <p className="text-sm text-slate-600">Author of Run the Business | Host of 60 Minute Stories</p> {/*Removed unnecessary mt-1 */}
      </div>
    </Card>
  );
}