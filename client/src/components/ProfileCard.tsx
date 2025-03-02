
import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="bg-white rounded-lg shadow-md p-6"> {/* Added shadow and padding */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <img 
            src="/headshot.png"
            alt="Ibrahim Bashir"
            className="w-20 h-20 rounded-full object-cover shadow-md" 
            /* Added shadow */
          />
        </div>
        <h3 className="font-semibold text-lg text-gray-800">Ibrahim Bashir</h3> {/*Improved contrast*/}
        <p className="text-sm text-gray-600 mt-1">Author of Run the Business | Host of 60 Minute Stories</p>
      </div>
    </Card>
  );
}
