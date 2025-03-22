
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "lucide-react";

export default function LinksDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm font-medium text-slate-800 bg-white hover:bg-slate-50 transition rounded-full px-4 py-2 border border-slate-200 shadow-sm">
        Creator Links <Link className="h-4 w-4 text-slate-600" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem className="py-2.5 cursor-pointer">
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center"
          >
            Website
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2.5 cursor-pointer">
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center"
          >
            Social Media
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2.5 cursor-pointer">
          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center"
          >
            Portfolio
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
