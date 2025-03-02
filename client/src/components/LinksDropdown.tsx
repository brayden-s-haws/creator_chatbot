
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
        Ibrahim's Links <Link className="h-4 w-4 text-slate-600" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem className="py-2.5 cursor-pointer">
          <a 
            href="https://runthebusiness.substack.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center"
          >
            Substack
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2.5 cursor-pointer">
          <a 
            href="https://www.linkedin.com/in/ibrahimbashir/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center"
          >
            LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="py-2.5 cursor-pointer">
          <a 
            href="https://maven.com/ibscribe/scaling-b2b-saas" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center"
          >
            Teaching
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
