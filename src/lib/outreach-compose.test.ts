import { describe, expect, it } from "vitest";
import {
  buildGmailComposeUrl,
  fitBodyForGmailUrl,
  GMAIL_URL_MAX_LENGTH,
  replaceTemplateVariables,
  getFirstName,
  getGreeting,
  getSignature,
  renderOutreachTemplate,
} from "@/lib/outreach-compose";
import { OUTREACH_MESSAGE_TEMPLATES } from "@/lib/outreach-templates";

describe("outreach compose helpers", () => {
  it("builds Gmail compose URL with encoded params", () => {
    const url = buildGmailComposeUrl({
      to: "jane@acme.com",
      subject: "Helping Acme & Co with ops",
      body: "Hi Jane,\n\nTest message.",
    });

    expect(url).toContain("mail.google.com/mail/");
    expect(url).toContain("view=cm");
    expect(url).toContain("to=jane%40acme.com");
    expect(url).toContain("su=Helping");
    expect(url).toContain("body=Hi");
  });

  it("omits to when email is missing", () => {
    const url = buildGmailComposeUrl({
      subject: "Follow up",
      body: "Hello",
    });

    expect(url).not.toContain("to=");
    expect(url).toContain("su=Follow+up");
  });

  it("replaces template variables including outreach angle", () => {
    const result = replaceTemplateVariables(
      "Hi {{contactName}}, {{companyName}} in {{city}} — {{outreachAngle}}",
      {
        companyName: "Sun Power LLC",
        city: "Denver",
        state: "CO",
        contactName: "Jane Doe",
        outreachAngle: "permit backlog",
      }
    );

    expect(result).toBe("Hi Jane, Sun Power LLC in Denver — permit backlog");
  });

  it("escapes special characters in company names", () => {
    const url = buildGmailComposeUrl({
      subject: 'Quote for "Acme" & Sons',
      body: "Line 1",
    });

    expect(url.length).toBeLessThanOrEqual(GMAIL_URL_MAX_LENGTH + 100);
    expect(url).toContain("su=Quote");
    expect(url).toContain("%22Acme%22");
    expect(url).toContain("%26");
  });

  it("truncates long bodies to fit URL limit", () => {
    const longBody = "A".repeat(5000);
    const { urlBody, truncated } = fitBodyForGmailUrl(
      "Subject",
      longBody,
      "test@example.com"
    );

    expect(truncated).toBe(true);
    expect(urlBody.length).toBeLessThan(longBody.length);
    expect(
      buildGmailComposeUrl({
        to: "test@example.com",
        subject: "Subject",
        body: urlBody,
      }).length
    ).toBeLessThanOrEqual(GMAIL_URL_MAX_LENGTH);
  });
});

describe("getFirstName", () => {
  it("returns the first word of a full name", () => {
    expect(getFirstName("Jane Doe")).toBe("Jane");
  });

  it("returns a single-word name as-is", () => {
    expect(getFirstName("Maria")).toBe("Maria");
  });

  it("returns null for empty string", () => {
    expect(getFirstName("")).toBeNull();
    expect(getFirstName("  ")).toBeNull();
  });

  it("returns null for null or undefined", () => {
    expect(getFirstName(null)).toBeNull();
    expect(getFirstName(undefined)).toBeNull();
  });

  it('returns null when the name is "Unknown"', () => {
    expect(getFirstName("Unknown")).toBeNull();
    expect(getFirstName("unknown")).toBeNull();
    expect(getFirstName("UNKNOWN")).toBeNull();
  });
});

describe("getGreeting", () => {
  it("produces a first-name greeting when a name is available", () => {
    expect(getGreeting({ name: "Jane Doe" })).toBe("Hi Jane,");
  });

  it('produces "Hi team," when no contact is provided', () => {
    expect(getGreeting(null)).toBe("Hi team,");
    expect(getGreeting(undefined)).toBe("Hi team,");
  });

  it('produces "Hi team," when the name is empty', () => {
    expect(getGreeting({ name: "" })).toBe("Hi team,");
    expect(getGreeting({ name: null })).toBe("Hi team,");
  });

  it('produces "Hi team," when the name is "Unknown"', () => {
    expect(getGreeting({ name: "Unknown" })).toBe("Hi team,");
  });

  it('never produces "Hi Unknown,"', () => {
    expect(getGreeting({ name: "Unknown" })).not.toBe("Hi Unknown,");
  });
});

describe("getSignature", () => {
  it("returns the exact three-line Cody Barbour signature", () => {
    expect(getSignature()).toBe("Best,\nCody Barbour\nHargen Energy");
  });
});

describe("renderOutreachTemplate", () => {
  const ctx = {
    companyName: "Sunbright Solar",
    contactName: "Alex Rivera",
    city: "Phoenix",
    state: "AZ",
  };

  it("replaces {greeting} with first-name greeting", () => {
    expect(renderOutreachTemplate("{greeting}", ctx)).toBe("Hi Alex,");
  });

  it("replaces {signature} with Cody Barbour signature", () => {
    expect(renderOutreachTemplate("{signature}", ctx)).toBe(
      "Best,\nCody Barbour\nHargen Energy"
    );
  });

  it("replaces {companyName} with the company name", () => {
    expect(renderOutreachTemplate("{companyName}", ctx)).toBe("Sunbright Solar");
  });

  it("replaces {firstName} with only the first word", () => {
    expect(renderOutreachTemplate("{firstName}", ctx)).toBe("Alex");
  });

  it('falls back {companyName} to "your company" when name is empty', () => {
    const result = renderOutreachTemplate("{companyName}", {
      companyName: "",
      contactName: null,
    });
    expect(result).toBe("your company");
  });

  it("replaces all four variables in a single pass", () => {
    const result = renderOutreachTemplate(
      "{greeting}\n\nRe: {companyName}\n\n{signature}",
      ctx
    );
    expect(result).toContain("Hi Alex,");
    expect(result).toContain("Sunbright Solar");
    expect(result).toContain("Best,\nCody Barbour\nHargen Energy");
  });
});

describe("template acceptance checks", () => {
  it('no rendered template contains "Hi Unknown,"', () => {
    const ctx = {
      companyName: "Test Co",
      contactName: "Unknown",
      city: null,
      state: null,
    };
    for (const template of OUTREACH_MESSAGE_TEMPLATES) {
      const rendered = renderOutreachTemplate(template.body, ctx);
      expect(rendered).not.toContain("Hi Unknown,");
    }
  });

  it('no rendered template contains "[Your Name]"', () => {
    const ctx = { companyName: "Test Co", contactName: "Jane" };
    for (const template of OUTREACH_MESSAGE_TEMPLATES) {
      const rendered = renderOutreachTemplate(template.body, ctx);
      expect(rendered).not.toContain("[Your Name]");
    }
  });

  it("email-channel templates end with the Cody Barbour signature when rendered", () => {
    const ctx = { companyName: "Test Co", contactName: "Jane" };
    const emailTemplates = OUTREACH_MESSAGE_TEMPLATES.filter(
      (t) => t.channel === "EMAIL"
    );
    for (const template of emailTemplates) {
      const rendered = renderOutreachTemplate(template.body, ctx);
      expect(rendered).toContain("Best,\nCody Barbour\nHargen Energy");
    }
  });

  it("initial outreach category has at least 3 versions", () => {
    const initial = OUTREACH_MESSAGE_TEMPLATES.filter(
      (t) => t.category === "INITIAL_EMAIL"
    );
    expect(initial.length).toBeGreaterThanOrEqual(3);
  });

  it("3-day follow-up category has at least 3 versions", () => {
    const followUp = OUTREACH_MESSAGE_TEMPLATES.filter(
      (t) => t.category === "FOLLOW_UP_3_DAY"
    );
    expect(followUp.length).toBeGreaterThanOrEqual(3);
  });

  it("all four pain-specific categories are represented", () => {
    const categories = new Set(OUTREACH_MESSAGE_TEMPLATES.map((t) => t.category));
    expect(categories.has("PAIN_PERMITS")).toBe(true);
    expect(categories.has("PAIN_UTILITY_PTO")).toBe(true);
    expect(categories.has("PAIN_CRM_CLEANUP")).toBe(true);
    expect(categories.has("PAIN_CUSTOMER_COMMUNICATION")).toBe(true);
  });

  it("all template ids are unique", () => {
    const ids = OUTREACH_MESSAGE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
