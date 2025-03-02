import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, Newspaper, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function LinksDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
          <Link className="h-4 w-4 mr-2 text-blue-600" />
          Links
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border border-slate-200 shadow-md">
        <DropdownMenuLabel className="text-slate-700">Resources</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-200" />
        <DropdownMenuItem asChild className="hover:bg-blue-50 cursor-pointer">
          <a href="https://runthebusiness.substack.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <Newspaper className="h-4 w-4 mr-2 text-blue-600" />
            Newsletter
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-blue-50 cursor-pointer">
          <a href="https://twitter.com/ibrahimbashir" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <Twitter className="h-4 w-4 mr-2 text-blue-500" />
            Twitter
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-blue-50 cursor-pointer">
          <a href="https://www.linkedin.com/in/ibrahimbashir/" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <Linkedin className="h-4 w-4 mr-2 text-blue-800" />
            LinkedIn
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}