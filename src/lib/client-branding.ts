import "server-only";

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 512_000;

function resolveUrl(candidate: string, base: URL): string | null {
  try {
    if (candidate.startsWith("//")) {
      return `${base.protocol}${candidate}`;
    }
    const resolved = new URL(candidate, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractLinkHref(html: string, rel: string): string | null {
  const pattern = new RegExp(
    `<link[^>]+rel=["'][^"']*\\b${rel}\\b[^"']*["'][^>]+href=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

export async function discoverLogoUrlFromWebsite(
  website: string,
): Promise<string | null> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return null;
  }

  if (base.protocol !== "http:" && base.protocol !== "https:") {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(base.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "HargenEnergyPortalBranding/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) {
        break;
      }
      chunks.push(value);
      total += value.length;
    }
    reader.cancel().catch(() => undefined);

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      Buffer.concat(chunks),
    );

    const candidates = [
      extractMetaContent(html, "og:image"),
      extractMetaContent(html, "twitter:image"),
      extractLinkHref(html, "apple-touch-icon"),
      extractLinkHref(html, "icon"),
      extractLinkHref(html, "shortcut icon"),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolved = resolveUrl(candidate, base);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
