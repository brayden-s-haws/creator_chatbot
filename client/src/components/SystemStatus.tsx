import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { SystemStatusType } from "@shared/schema";
import { formatDate } from "@/lib/utils";

type SystemStatusProps = {
  status?: SystemStatusType;
};

export default function SystemStatus({ status }: SystemStatusProps) {
  const dbConnected = status?.dbConnected ?? false;
  const lastUpdated = status?.lastUpdated ? new Date(status.lastUpdated) : null;
  const nextUpdate = status?.nextUpdate ? new Date(status.nextUpdate) : null;
  const articlesIndexed = status?.articlesIndexed ?? 0;
  
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">System Status</h3>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Content Database</span>
          <span className="flex items-center text-green-600">
            {dbConnected ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1 text-red-500" />
                <span className="text-red-500">Disconnected</span>
              </>
            )}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Last Updated</span>
          <span className="text-slate-700">
            {lastUpdated ? formatDate(lastUpdated) : "Never"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Articles Indexed</span>
          <span className="text-slate-700">{articlesIndexed}</span>
        </div>
        
        <div className="border-t border-slate-100 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Next Update</span>
            <span className="text-slate-700">
              {nextUpdate ? formatDate(nextUpdate) : "Not scheduled"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
