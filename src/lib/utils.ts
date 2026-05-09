import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the value only if it parses as an http(s) URL. Otherwise returns null.
 * Use to render user-supplied URLs (e.g. client.website) inside an `<a href>`,
 * which would otherwise allow `javascript:` / `data:` URLs to execute when an
 * admin clicks the link.
 */
export function safeExternalHref(value: string | null | undefined): string | null {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null
  }
  return url.toString()
}
