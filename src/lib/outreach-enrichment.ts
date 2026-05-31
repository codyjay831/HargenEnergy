import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const SCRAPE_TIMEOUT_MS = 8000;
const SCRAPE_TOTAL_BUDGET_MS = 20000;
const MAX_PAGE_CHARS = 6000;

export type EnrichmentResult = {
  contacts: Array<{
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
  }>;
  painPoints: string[];
  fitScore: number;
  summary: string;
  topPainPoint?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PAGE_CHARS);
}

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      return "";
    }
    const html = await res.text();
    return stripHtml(html);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function extractCandidateLinks(baseUrl: string): string[] {
  const paths = ["/about", "/about-us", "/contact", "/contact-us", "/team", "/our-team"];
  const links = new Set<string>();
  try {
    const origin = new URL(baseUrl).origin;
    for (const path of paths) {
      links.add(`${origin}${path}`);
    }
  } catch {
    // ignore invalid base URL
  }
  return [...links];
}

async function scrapeWebsitePages(website: string): Promise<string> {
  const started = Date.now();
  const homepage = await fetchPageText(website);
  const chunks = [`Homepage:\n${homepage}`];

  for (const link of extractCandidateLinks(website)) {
    if (Date.now() - started > SCRAPE_TOTAL_BUDGET_MS) {
      break;
    }
    const text = await fetchPageText(link);
    if (text) {
      chunks.push(`${link}:\n${text}`);
    }
  }

  return chunks.join("\n\n").slice(0, MAX_PAGE_CHARS * 3);
}

function buildEnrichmentPrompt(input: {
  name: string;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  rating?: number | null;
  address?: string | null;
  websiteContent: string;
}) {
  return `
You analyze solar contractors for Hargen Energy, which sells remote admin/ops support to solar installers (permitting backlog, CRM cleanup, customer comms, scheduling).

Company: ${input.name}
Website: ${input.website || "N/A"}
Location: ${input.city || ""}, ${input.state || ""}
Google phone: ${input.phone || "N/A"}
Google rating: ${input.rating ?? "N/A"}
Address: ${input.address || "N/A"}

Website content:
${input.websiteContent || "No website content available."}

Return JSON only:
{
  "contacts": [{ "name": "", "role": "", "email": "", "phone": "", "linkedinUrl": "" }],
  "painPoints": ["specific operational pain points for solar installers"],
  "fitScore": 1-5,
  "summary": "1-2 sentence company summary",
  "topPainPoint": "single strongest outreach angle for Hargen"
}

Only include contacts with evidence. fitScore 4-5 = strong fit for Hargen ops support.
`.trim();
}

export async function runCompanyEnrichment(companyId: string): Promise<{
  success?: boolean;
  error?: string;
  enrichment?: EnrichmentResult;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Gemini API key not configured." };
  }

  const claim = await prisma.outreachCompany.updateMany({
    where: { id: companyId, enrichmentStatus: "pending" },
    data: { enrichmentStatus: "processing" },
  });
  if (claim.count === 0) {
    return { error: "Enrichment already running or not queued." };
  }

  const company = await prisma.outreachCompany.findUnique({
    where: { id: companyId },
    include: { contacts: true },
  });

  if (!company) {
    await prisma.outreachCompany.updateMany({
      where: { id: companyId, enrichmentStatus: "processing" },
      data: { enrichmentStatus: "failed" },
    });
    return { error: "Company not found." };
  }

  let websiteContent = "";
  if (
    company.website &&
    (company.website.startsWith("http://") || company.website.startsWith("https://"))
  ) {
    websiteContent = await scrapeWebsitePages(company.website);
  }

  const discovery = company.googlePlaceId
    ? await prisma.outreachDiscovery.findUnique({
        where: { googlePlaceId: company.googlePlaceId },
      })
    : null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent(
      buildEnrichmentPrompt({
        name: company.name,
        website: company.website,
        city: company.city,
        state: company.state,
        phone: discovery?.phone ?? company.contacts.find((c) => c.isPrimary)?.phone,
        rating: discovery?.rating,
        address: discovery?.address,
        websiteContent,
      })
    );

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const enrichment = JSON.parse(jsonMatch[0]) as EnrichmentResult;

    await prisma.outreachCompany.update({
      where: { id: companyId },
      data: {
        enrichmentData: enrichment as unknown as Prisma.InputJsonValue,
        enrichmentStatus: "complete",
        fitScore: enrichment.fitScore || company.fitScore,
        painTags: {
          set: [...new Set([...(company.painTags || []), ...(enrichment.painPoints || [])])],
        },
        notes: company.notes
          ? `${company.notes}\n\nAI Summary: ${enrichment.summary}`
          : enrichment.summary,
      },
    });

    for (const contact of enrichment.contacts || []) {
      const exists = company.contacts.some(
        (c) => c.email === contact.email || c.name === contact.name
      );
      if (!exists && (contact.email || contact.phone || contact.name)) {
        await prisma.outreachContact.create({
          data: {
            companyId,
            name: contact.name || "Unknown",
            roleTitle: contact.role,
            email: contact.email,
            phone: contact.phone,
            linkedinUrl: contact.linkedinUrl,
          },
        });
      }
    }

    revalidatePath(`/admin/outreach/companies/${companyId}`);
    revalidatePath("/admin/outreach/companies");
    revalidatePath("/admin/outreach");

    return { success: true, enrichment };
  } catch (error) {
    console.error("Enrichment failed:", error);
    await prisma.outreachCompany.update({
      where: { id: companyId },
      data: { enrichmentStatus: "failed" },
    });
    return {
      error: error instanceof Error ? error.message : "Failed to enrich company.",
    };
  }
}

export async function processPendingEnrichmentQueue(limit = 5) {
  const pending = await prisma.outreachCompany.findMany({
    where: { enrichmentStatus: "pending" },
    orderBy: { enrichmentQueuedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let processed = 0;
  for (const row of pending) {
    const result = await runCompanyEnrichment(row.id);
    if (result.success) {
      processed += 1;
    }
  }
  return processed;
}
