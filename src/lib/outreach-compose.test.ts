import { describe, expect, it } from "vitest";
import {
  buildGmailComposeUrl,
  fitBodyForGmailUrl,
  GMAIL_URL_MAX_LENGTH,
  replaceTemplateVariables,
} from "@/lib/outreach-compose";

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
