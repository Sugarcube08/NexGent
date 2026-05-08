import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a Solana wallet address for compact UI display
 */
export const truncateWallet = (address: string, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Safely parses a JSON string, returning the original string or a fallback if it fails.
 */
export const safeJsonParse = (str: string, fallback: any = null) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};
