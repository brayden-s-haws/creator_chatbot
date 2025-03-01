
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export default function LinksDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center text-sm text-slate-600 hover:text-primary transition">
        Ibrahim's Links <ChevronDown className="ml-1 h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <a 
            href="https://runthebusiness.substack.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full"
          >
            Substack
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a 
            href="https://www.linkedin.com/in/ibrahimbashir/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full"
          >
            LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a 
            href="https://maven.com/ibscribe/scaling-b2b-saas" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full"
          >
            Teaching
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
