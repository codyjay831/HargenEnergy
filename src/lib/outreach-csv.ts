import { OutreachCompanyStatus } from "@/generated/prisma/client";

/** Symmetric CSV column headers for ChatGPT round-trip. */
export const OUTREACH_CSV_COLUMNS = [
  "id",
  "googlePlaceId",
  "Company Name",
  "City",
  "State",
  "Website",
  "Status",
  "Contact Name",
  "Contact Email",
  "Contact Phone",
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

export function buildOutreachCsvTemplate(): string {
  const header = OUTREACH_CSV_COLUMNS.join(",");
  const example = [
    "",
    "",
    "Example Solar Co",
    "Sacramento",
    "CA",
    "https://examplesolar.com",
    "LEAD_FOUND",
    "Jane Owner",
    "jane@examplesolar.com",
    "9165550100",
    "Notes from research",
    "4",
    "permit backlog;slow admin",
    "Google",
  ].join(",");
  return `${header}\n${example}\n`;
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
