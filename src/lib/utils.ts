import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge classNames with proper Tailwind CSS precedence handling.
 * Combines clsx for conditional classes with twMerge for Tailwind specificity.
 * @param inputs - Class values to merge
 * @returns Merged className string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
