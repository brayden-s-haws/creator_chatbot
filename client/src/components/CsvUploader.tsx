import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    if (selectedFile && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      return;
    }
    
    setFile(selectedFile);
  };

  // CSV upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest<any>('POST', '/api/import-csv', formData, {
        // Don't set Content-Type for multipart/form-data
        // Browser will set it correctly with boundary
      });
    },
    onSuccess: (_data) => {
      toast({
        title: "Upload Successful",
        description: "Articles are being processed in the background",
      });
      setFile(null);
      // Clear file input
      const fileInput = document.getElementById('csvfile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh system status after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
      }, 5000);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Sample import mutation
  const sampleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<any>('POST', '/api/import-sample');
    },
    onSuccess: () => {
      toast({
        title: "Sample Import Started",
        description: "Sample articles are being processed in the background",
      });
      
      // Refresh system status after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/system-status"] });
      }, 5000);
    },
    onError: (error) => {
      toast({
        title: "Sample Import Failed",
        description: error instanceof Error ? error.message : "Failed to import sample articles",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      uploadMutation.mutate(formData);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setIsUploading(false);
      
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
    }
  };

  // Import sample articles
  const handleImportSample = () => {
    sampleMutation.mutate();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Import Articles</CardTitle>
        <CardDescription>
          Upload a CSV file with articles to import into the chatbot's knowledge base.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csvfile">CSV File</Label>
            <Input
              id="csvfile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading || uploadMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              CSV format: title, url, text, pubDate(optional), guid(optional)
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={!file || isUploading || uploadMutation.isPending}
          >
            {(isUploading || uploadMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Upload and Process
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground w-full text-center mb-2">
          - or -
        </div>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleImportSample}
          disabled={sampleMutation.isPending}
        >
          {sampleMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Import Sample Articles
        </Button>
      </CardFooter>
    </Card>
  );
}