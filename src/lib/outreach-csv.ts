import { OutreachCompanyStatus } from "@/generated/prisma/client";
import {
  enrichmentFromCsvRow,
  serializeEnrichmentToCsvFields,
  type OutreachEnrichmentSnapshot,
} from "@/lib/outreach-signals";

function normalizeNameForGroupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Symmetric CSV column headers for ChatGPT round-trip. */
export const OUTREACH_CSV_COLUMNS = [
  "id",
  "googlePlaceId",
  "Company Name",
  "City",
  "State",
  "Website",
  "Status",
  "contactId",
  "contactRole",
  "isPrimary",
  "Contact Name",
  "Contact Email",
  "Contact Phone",
  "googleRating",
  "googleReviewCount",
  "yelpRating",
  "yelpReviewCount",
  "businessStatus",
  "licenseNumber",
  "licenseStatus",
  "reviewSummary",
  "topReviewSnippet",
  "outreachAngle",
  "nextFollowUpAt",
  "Notes",
  "fitScore",
  "painTags",
  "leadSource",
] as const;

export type OutreachCsvColumn = (typeof OUTREACH_CSV_COLUMNS)[number];

export type OutreachCsvRow = Record<OutreachCsvColumn, string>;

export function serializePainTags(tags: string[]): string {
  return tags.filter(Boolean).join(";");
}

export function parsePainTags(value?: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(";")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function parseFitScore(value?: string | null): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 5) {
    return undefined;
  }
  return parsed;
}

export function parseOutreachStatus(value?: string | null): OutreachCompanyStatus | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (Object.values(OutreachCompanyStatus).includes(normalized as OutreachCompanyStatus)) {
    return normalized as OutreachCompanyStatus;
  }
  return undefined;
}

export function parseIsPrimary(value?: string | null): boolean {
  const normalized = (value || "").trim().toUpperCase();
  return normalized === "Y" || normalized === "YES" || normalized === "TRUE" || normalized === "1";
}

export function normalizePhone(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

export function getCsvField(
  row: Record<string, string | undefined>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function getCompanyRowGroupKey(row: Record<string, string | undefined>): string | null {
  const name = getCsvField(row, "Company Name", "name", "Company");
  if (!name) {
    return null;
  }
  const id = getCsvField(row, "id");
  const googlePlaceId = getCsvField(row, "googlePlaceId");
  const city = getCsvField(row, "City", "city") || "";
  if (id) return `id:${id}`;
  if (googlePlaceId) return `place:${googlePlaceId}`;
  return `name:${normalizeNameForGroupKey(name)}:${city.toLowerCase()}`;
}

export function groupCsvRowsByCompany(
  rows: Record<string, string | undefined>[]
): Map<string, Record<string, string | undefined>[]> {
  const groups = new Map<string, Record<string, string | undefined>[]>();
  for (const row of rows) {
    const key = getCompanyRowGroupKey(row);
    if (!key) continue;
    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
  }
  return groups;
}

export type ParsedContactRow = {
  contactId?: string;
  contactRole?: string;
  isPrimary: boolean;
  name?: string;
  email?: string;
  phone?: string;
};

export function parseContactFromRow(
  row: Record<string, string | undefined>
): ParsedContactRow | null {
  const contactId = getCsvField(row, "contactId");
  const contactRole = getCsvField(row, "contactRole", "Contact Role");
  const isPrimary = parseIsPrimary(getCsvField(row, "isPrimary"));
  const name = getCsvField(row, "Contact Name", "contact_name", "Person");
  const email = getCsvField(row, "Email", "email", "Contact Email");
  const phone = getCsvField(row, "Phone", "phone", "Contact Phone");

  if (!contactId && !name && !email && !phone) {
    return null;
  }

  return { contactId, contactRole, isPrimary, name, email, phone };
}

export type ParsedCompanyFields = {
  name: string;
  website?: string;
  city?: string;
  state?: string;
  notes?: string;
  rowId?: string;
  googlePlaceId?: string;
  leadSource?: string;
  fitScore?: number;
  painTags: string[];
  status?: OutreachCompanyStatus;
  nextFollowUpAt?: Date;
  enrichmentPatch: Partial<OutreachEnrichmentSnapshot>;
};

export function mergeCompanyFieldsFromRows(
  rows: Record<string, string | undefined>[]
): ParsedCompanyFields | null {
  const first = rows[0];
  const name = getCsvField(first, "Company Name", "name", "Company");
  if (!name) {
    return null;
  }

  let website: string | undefined;
  let city: string | undefined;
  let state: string | undefined;
  let notes: string | undefined;
  let rowId: string | undefined;
  let googlePlaceId: string | undefined;
  let leadSource: string | undefined;
  let fitScore: number | undefined;
  let painTags: string[] = [];
  let status: OutreachCompanyStatus | undefined;
  let nextFollowUpAt: Date | undefined;
  let enrichmentPatch: Partial<OutreachEnrichmentSnapshot> = {};

  for (const row of rows) {
    website = getCsvField(row, "Website", "website", "URL") || website;
    city = getCsvField(row, "City", "city") || city;
    state = getCsvField(row, "State", "state") || state;
    notes = getCsvField(row, "Notes", "notes", "Description") || notes;
    rowId = getCsvField(row, "id") || rowId;
    googlePlaceId = getCsvField(row, "googlePlaceId") || googlePlaceId;
    leadSource = getCsvField(row, "leadSource") || leadSource;
    fitScore = parseFitScore(getCsvField(row, "fitScore")) ?? fitScore;
    const rowPainTags = parsePainTags(getCsvField(row, "painTags"));
    if (rowPainTags.length > 0) {
      painTags = rowPainTags;
    }
    status = parseOutreachStatus(getCsvField(row, "Status")) ?? status;

    const followUp = getCsvField(row, "nextFollowUpAt");
    if (followUp) {
      const parsed = new Date(followUp);
      if (!Number.isNaN(parsed.getTime())) {
        nextFollowUpAt = parsed;
      }
    }

    enrichmentPatch = {
      ...enrichmentPatch,
      ...enrichmentFromCsvRow(row),
      google: { ...enrichmentPatch.google, ...enrichmentFromCsvRow(row).google },
      yelp: { ...enrichmentPatch.yelp, ...enrichmentFromCsvRow(row).yelp },
      license: { ...enrichmentPatch.license, ...enrichmentFromCsvRow(row).license },
      signals: { ...enrichmentPatch.signals, ...enrichmentFromCsvRow(row).signals },
      ai: { ...enrichmentPatch.ai, ...enrichmentFromCsvRow(row).ai },
    };
  }

  return {
    name,
    website,
    city,
    state,
    notes,
    rowId,
    googlePlaceId,
    leadSource,
    fitScore,
    painTags,
    status,
    nextFollowUpAt,
    enrichmentPatch,
  };
}

export function buildOutreachCsvTemplate(): string {
  const header = OUTREACH_CSV_COLUMNS.join(",");
  const row1 = [
    "",
    "",
    "Example Solar Co",
    "Sacramento",
    "CA",
    "https://examplesolar.com",
    "LEAD_FOUND",
    "",
    "Owner",
    "Y",
    "Jane Owner",
    "jane@examplesolar.com",
    "9165550100",
    "4.5",
    "42",
    "4.0",
    "18",
    "active",
    "123456",
    "Active",
    "Customers mention slow permit turnaround",
    "Great install quality but office is disorganized",
    "permit backlog",
    "",
    "Notes from research",
    "4",
    "permit backlog;slow admin",
    "Google",
  ].join(",");
  const row2 = [
    "",
    "",
    "Example Solar Co",
    "Sacramento",
    "CA",
    "https://examplesolar.com",
    "LEAD_FOUND",
    "",
    "Ops Manager",
    "N",
    "Bob Ops",
    "bob@examplesolar.com",
    "9165550101",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "4",
    "",
    "Google",
  ].join(",");
  return `${header}\n${row1}\n${row2}\n`;
}

export function buildCompanyExportRow(input: {
  company: {
    id: string;
    googlePlaceId?: string | null;
    name: string;
    website?: string | null;
    city?: string | null;
    state?: string | null;
    status: string;
    notes?: string | null;
    fitScore?: number | null;
    painTags: string[];
    leadSource?: string | null;
    nextFollowUpAt?: Date | null;
    enrichmentData?: unknown;
  };
  contact?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    roleTitle?: string | null;
    isPrimary: boolean;
  } | null;
  discovery?: {
    rating?: number | null;
    userRatingsTotal?: number | null;
  } | null;
}): Record<OutreachCsvColumn, string> {
  const snapshot =
    input.company.enrichmentData && typeof input.company.enrichmentData === "object"
      ? (input.company.enrichmentData as OutreachEnrichmentSnapshot)
      : null;
  const enrichmentFields = serializeEnrichmentToCsvFields(snapshot, input.discovery);

  return {
    id: input.company.id,
    googlePlaceId: input.company.googlePlaceId || "",
    "Company Name": input.company.name,
    City: input.company.city || "",
    State: input.company.state || "",
    Website: input.company.website || "",
    Status: input.company.status,
    contactId: input.contact?.id || "",
    contactRole: input.contact?.roleTitle || "",
    isPrimary: input.contact?.isPrimary ? "Y" : input.contact ? "N" : "",
    "Contact Name": input.contact?.name || "",
    "Contact Email": input.contact?.email || "",
    "Contact Phone": input.contact?.phone || "",
    ...enrichmentFields,
    nextFollowUpAt: input.company.nextFollowUpAt
      ? input.company.nextFollowUpAt.toISOString().split("T")[0]
      : "",
    Notes: input.company.notes || "",
    fitScore: input.company.fitScore?.toString() || "",
    painTags: serializePainTags(input.company.painTags),
    leadSource: input.company.leadSource || "",
  } as Record<OutreachCsvColumn, string>;
}

export function buildEmptyContactExportRow(
  company: Parameters<typeof buildCompanyExportRow>[0]["company"],
  discovery?: Parameters<typeof buildCompanyExportRow>[0]["discovery"]
): Record<OutreachCsvColumn, string> {
  return buildCompanyExportRow({ company, contact: null, discovery });
}
