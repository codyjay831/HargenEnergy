import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OutreachCompanyStatus, Prisma } from "@/generated/prisma/client";
import { fetchGooglePlaceSignals } from "@/lib/outreach-google";
import { fetchLicenseSignals } from "@/lib/outreach-license";
import { fetchYelpSignalsForCompany } from "@/lib/outreach-yelp";
import {
  applyBusinessStatusSignals,
  deriveBusinessStatus,
  mergeEnrichmentSnapshots,
  parseEnrichmentSnapshot,
  type OutreachEnrichmentSnapshot,
} from "@/lib/outreach-signals";

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
  reviewThemes?: string[];
  outreachAngle?: string;
  reviewSummary?: string;
  businessStatusAssessment?: string;
};

export type EnrichmentMode = "light" | "full";

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

function buildLightEnrichmentPrompt(input: {
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

function buildFullEnrichmentPrompt(input: {
  name: string;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  websiteContent: string;
  signalBundle: OutreachEnrichmentSnapshot;
}) {
  const signals = JSON.stringify(input.signalBundle, null, 2);
  return `
You analyze solar contractors for Hargen Energy, which sells remote admin/ops support to solar installers (permitting backlog, CRM cleanup, customer comms, scheduling).

Company: ${input.name}
Website: ${input.website || "N/A"}
Location: ${input.city || ""}, ${input.state || ""}

External signals (Google, Yelp, license, reviews):
${signals}

Website content:
${input.websiteContent || "No website content available."}

Return JSON only:
{
  "contacts": [{ "name": "", "role": "", "email": "", "phone": "", "linkedinUrl": "" }],
  "painPoints": ["specific operational pain points for solar installers"],
  "fitScore": 1-5,
  "summary": "1-2 sentence company summary",
  "topPainPoint": "single strongest outreach angle for Hargen",
  "reviewThemes": ["themes from customer reviews if available"],
  "reviewSummary": "1-2 sentence summary of review sentiment",
  "outreachAngle": "best personalized outreach hook for Hargen",
  "businessStatusAssessment": "active | closed | temp_closed | unknown with brief reason"
}

Use review excerpts to infer operational pain. If business appears closed, note it clearly.
Only include contacts with evidence. fitScore 4-5 = strong fit for Hargen ops support.
`.trim();
}

async function gatherExternalSignals(company: {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  notes: string | null;
  googlePlaceId: string | null;
  enrichmentData: unknown;
}): Promise<OutreachEnrichmentSnapshot> {
  const existing = parseEnrichmentSnapshot(company.enrichmentData) || {};
  let snapshot = { ...existing };

  if (company.googlePlaceId) {
    const google = await fetchGooglePlaceSignals(company.googlePlaceId);
    if (google.snapshot) {
      snapshot = mergeEnrichmentSnapshots(snapshot, google.snapshot);
    }
  }

  const yelp = await fetchYelpSignalsForCompany({
    name: company.name,
    city: company.city,
    state: company.state,
    notes: company.notes,
  });
  if (yelp.snapshot && Object.keys(yelp.snapshot).length > 0) {
    snapshot = mergeEnrichmentSnapshots(snapshot, yelp.snapshot);
  }

  const license = await fetchLicenseSignals({
    name: company.name,
    state: company.state,
  });
  if (license.snapshot && Object.keys(license.snapshot).length > 0) {
    snapshot = mergeEnrichmentSnapshots(snapshot, license.snapshot);
  }

  const businessStatus = deriveBusinessStatus({
    googleBusinessStatus: snapshot.google?.businessStatus,
    yelpIsClosed: snapshot.yelp?.isClosed,
  });

  snapshot.signals = {
    ...snapshot.signals,
    businessStatus,
  };

  return snapshot;
}

export async function runCompanyEnrichment(
  companyId: string,
  options?: { mode?: EnrichmentMode }
): Promise<{
  success?: boolean;
  error?: string;
  enrichment?: EnrichmentResult;
}> {
  const mode = options?.mode ?? "light";
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

  let signalBundle: OutreachEnrichmentSnapshot =
    parseEnrichmentSnapshot(company.enrichmentData) || {};

  if (mode === "full") {
    signalBundle = await gatherExternalSignals(company);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const prompt =
      mode === "full"
        ? buildFullEnrichmentPrompt({
            name: company.name,
            website: company.website,
            city: company.city,
            state: company.state,
            websiteContent,
            signalBundle,
          })
        : buildLightEnrichmentPrompt({
            name: company.name,
            website: company.website,
            city: company.city,
            state: company.state,
            phone: discovery?.phone ?? company.contacts.find((c) => c.isPrimary)?.phone,
            rating: discovery?.rating,
            address: discovery?.address,
            websiteContent,
          });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const enrichment = JSON.parse(jsonMatch[0]) as EnrichmentResult;

    const businessStatus =
      mode === "full"
        ? deriveBusinessStatus({
            googleBusinessStatus: signalBundle.google?.businessStatus,
            yelpIsClosed: signalBundle.yelp?.isClosed,
          })
        : parseBusinessStatusFromAi(enrichment.businessStatusAssessment);

    const statusSignals = applyBusinessStatusSignals({
      businessStatus,
      doNotContactReason:
        businessStatus === "closed"
          ? "Detected as closed via external signals or AI assessment"
          : null,
    });

    const mergedSnapshot = mergeEnrichmentSnapshots(signalBundle, {
      ai: {
        summary: enrichment.summary,
        topPainPoint: enrichment.topPainPoint || null,
        reviewThemes: enrichment.reviewThemes || [],
        outreachAngle: enrichment.outreachAngle || enrichment.topPainPoint || null,
        fitScore: enrichment.fitScore || null,
        reviewSummary: enrichment.reviewSummary || null,
      },
      summary: enrichment.summary,
      topPainPoint: enrichment.topPainPoint,
      fitScore: enrichment.fitScore,
      painPoints: enrichment.painPoints,
      contacts: enrichment.contacts,
      signals: statusSignals.signals,
    });

    await prisma.outreachCompany.update({
      where: { id: companyId },
      data: {
        enrichmentData: mergedSnapshot as unknown as Prisma.InputJsonValue,
        enrichmentStatus: "complete",
        fitScore: enrichment.fitScore || company.fitScore,
        painTags: {
          set: [
            ...new Set([
              ...(company.painTags || []),
              ...(enrichment.painPoints || []),
              ...(enrichment.reviewThemes || []),
            ]),
          ],
        },
        notes: company.notes
          ? `${company.notes}\n\nAI Summary: ${enrichment.summary}`
          : enrichment.summary,
        ...(mode === "full" && businessStatus === "closed"
          ? {
              doNotContact: true,
              status: OutreachCompanyStatus.BAD_FIT,
              interestLevel: 0,
            }
          : {}),
      },
    });

    for (const contact of enrichment.contacts || []) {
      const exists = company.contacts.some(
        (c) =>
          (contact.email && c.email?.toLowerCase() === contact.email.toLowerCase()) ||
          (contact.name && c.name === contact.name)
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

function parseBusinessStatusFromAi(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("closed") && normalized.includes("temp")) {
    return "temp_closed" as const;
  }
  if (normalized.includes("closed")) {
    return "closed" as const;
  }
  if (normalized.includes("active") || normalized.includes("operational")) {
    return "active" as const;
  }
  return "unknown" as const;
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
    const result = await runCompanyEnrichment(row.id, { mode: "light" });
    if (result.success) {
      processed += 1;
    }
  }
  return processed;
}
