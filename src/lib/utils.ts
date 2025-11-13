import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// DateTime helpers for datetime-local inputs
export function formatDateTimeForInput(isoString?: string): string {
  try {
    const date = isoString ? new Date(isoString) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    // yyyy-MM-ddTHH:mm (local time, no timezone)
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function parseDateTimeFromInput(localString: string): string {
  try {
    // localString expected format: yyyy-MM-ddTHH:mm
    // Construct Date in local timezone
    const date = new Date(localString);
    // Store as ISO (UTC) for backend consistency
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
