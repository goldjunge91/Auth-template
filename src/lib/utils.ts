import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A utility function for conditionally joining CSS class names.
 * It uses `clsx` to handle conditional classes and `tailwind-merge` to resolve
 * conflicting Tailwind CSS utility classes, ensuring a clean and predictable
 * final class string. This is a common pattern in projects using Tailwind CSS.
 *
 * @param inputs - A list of class values to be merged. These can be strings, arrays, or objects.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
