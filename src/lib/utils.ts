import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Junta classes condicionais e resolve conflitos do Tailwind (padrão Shadcn UI).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
