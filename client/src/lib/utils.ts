import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isToday, isYesterday } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date for display
 * Returns today, yesterday, or a formatted date
 */
export function formatDate(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  
  return format(date, "MMM d, yyyy 'at' h:mm a");
}
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
