/**
 * Tailwind class name helper: merges `clsx` conditional classes and resolves Tailwind conflicts with `tailwind-merge`.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
