
import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <img 
            src="/user_icon.svg"
            alt="Content Creator"
            className="w-20 h-20 rounded-full object-cover"
          />
        </div>
        <h3 className="font-semibold text-lg">Content Creator</h3>
        <p className="text-sm text-slate-600 mt-1">Author & Knowledge Expert</p>
      </div>
    </Card>
  );
}
