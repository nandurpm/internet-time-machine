/*
 * ============================================================
 * FILE: utils.ts
 * PURPOSE: Provides shared client utility functions, including safe conditional CSS class composition.
 * ============================================================
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
