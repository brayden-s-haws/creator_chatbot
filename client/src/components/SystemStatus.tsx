import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCw, BookOpen, Loader2 } from "lucide-react";
import { SystemStatusType } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SystemStatusProps = {
  status?: SystemStatusType;
};

export default function SystemStatus({ status }: SystemStatusProps) {
  const dbConnected = status?.dbConnected ?? false;
  const lastUpdated = status?.lastUpdated ? new Date(status.lastUpdated) : null;
  const nextUpdate = status?.nextUpdate ? new Date(status.nextUpdate) : null;
  const articlesIndexed = status?.articlesIndexed ?? 0;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Define response types
  type RefreshResponse = {
    articlesAdded: number;
    chunksAdded: number;
    success?: boolean;
  };
  
  type FetchMoreResponse = {
    success: boolean;
    message?: string;
    inProgress?: boolean;
    articlesAdded?: number;
    totalArticles?: number;
  };
  
  // Refresh RSS content mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<RefreshResponse>("POST", "/api/refresh");
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Content Refreshed",
        description: `${data.articlesAdded || 0} new articles added from RSS feed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh content from RSS feed.",
        variant: "destructive",
      });
    }
  });
  
  // Fetch more articles mutation
  const fetchMoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<FetchMoreResponse>("POST", "/api/fetch-more-articles");
      return response;
    },
    onSuccess: (data) => {
      if (data.inProgress) {
        toast({
          title: "Article Fetch Started",
          description: "Articles are being fetched in the background. Check back in a few minutes.",
        });
      } else {
        toast({
          title: "Articles Fetched",
          description: `${data.articlesAdded || 0} new articles added from archive.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
    },
    onError: () => {
      toast({
        title: "Fetch Failed",
        description: "Failed to fetch more articles from archive.",
        variant: "destructive",
      });
    }
  });
  
  const isLoading = refreshMutation.isPending || fetchMoreMutation.isPending;
  
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
        
        <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={() => refreshMutation.mutate()}
            disabled={isLoading}
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh RSS Content
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={() => fetchMoreMutation.mutate()}
            disabled={isLoading}
          >
            {fetchMoreMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4 mr-2" />
            )}
            Fetch More Articles
          </Button>
        </div>
      </div>
    </Card>
  );
}
