
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
      <DropdownMenuTrigger className="flex items-center text-sm text-slate-800 bg-slate-100 hover:bg-slate-200 transition rounded-full px-4 py-2 border border-slate-200">
        Ibrahim's Links <Link className="ml-2 h-4 w-4" />
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
import React, { useState } from "react";
import { Menu, ChevronDown } from "lucide-react";

const links = [
  { name: "Newsletter", url: "https://runthebusiness.substack.com" },
  { name: "Twitter", url: "https://twitter.com/ibrahimcesar" },
  { name: "LinkedIn", url: "https://linkedin.com/in/ibrahimbashir" }
];

export default function LinksDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-slate-600 hover:text-slate-900"
      >
        <span>Links</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
