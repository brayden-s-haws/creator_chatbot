
import { Card } from "@/components/ui/card";

export default function ProfileCard() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <img 
            src="https://substackcdn.com/image/fetch/w_256,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F5e3aa9f8-e1c0-4bd8-bea5-3cb8e96f0a74_400x400.jpeg"
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
