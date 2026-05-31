import { describe, expect, it } from "vitest";
import {
  getCompanyRowGroupKey,
  groupCsvRowsByCompany,
  mergeCompanyFieldsFromRows,
  normalizePhone,
  parseContactFromRow,
  parseIsPrimary,
} from "@/lib/outreach-csv";

describe("outreach csv helpers", () => {
  it("groups rows by shared company id", () => {
    const groups = groupCsvRowsByCompany([
      { id: "co1", "Company Name": "Acme Solar", "Contact Email": "a@acme.com" },
      { id: "co1", "Company Name": "Acme Solar", "Contact Email": "b@acme.com" },
      { id: "co2", "Company Name": "Beta Solar", "Contact Email": "c@beta.com" },
    ]);

    expect(groups.size).toBe(2);
    expect(groups.get("id:co1")?.length).toBe(2);
  });

  it("parses multiple contacts from grouped rows", () => {
    const rows = [
      {
        id: "co1",
        "Company Name": "Acme Solar",
        "Contact Name": "Jane",
        "Contact Email": "jane@acme.com",
        isPrimary: "Y",
      },
      {
        id: "co1",
        "Company Name": "Acme Solar",
        "Contact Name": "Bob",
        "Contact Email": "bob@acme.com",
        isPrimary: "N",
      },
    ];

    const contacts = rows
      .map((row) => parseContactFromRow(row))
      .filter((contact) => contact !== null);

    expect(contacts).toHaveLength(2);
    expect(contacts[0]?.isPrimary).toBe(true);
    expect(contacts[1]?.isPrimary).toBe(false);
  });

  it("merges company fields with last non-empty wins", () => {
    const merged = mergeCompanyFieldsFromRows([
      {
        "Company Name": "Acme Solar",
        fitScore: "3",
        painTags: "admin backlog",
      },
      {
        "Company Name": "Acme Solar",
        fitScore: "4",
        outreachAngle: "permit delays",
      },
    ]);

    expect(merged?.fitScore).toBe(4);
    expect(merged?.enrichmentPatch.ai?.outreachAngle).toBe("permit delays");
  });

  it("normalizes phone numbers for dedupe", () => {
    expect(normalizePhone("(916) 555-0100")).toBe("9165550100");
    expect(parseIsPrimary("yes")).toBe(true);
    expect(getCompanyRowGroupKey({ "Company Name": "Acme", City: "Sacramento" })).toBe(
      "name:acme:sacramento"
    );
  });
});
