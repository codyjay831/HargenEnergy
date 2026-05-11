"use server";

import { prisma } from "@/lib/prisma";
import { outreachCompanySchema, OutreachCompanyInput } from "@/lib/validations";
import { auth } from "@/auth";
import { OutreachCompanyStatus, BusinessType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function createOutreachCompany(data: OutreachCompanyInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const validatedFields = outreachCompanySchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      error: "Invalid fields.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const company = await prisma.outreachCompany.create({
      data: {
        ...validatedFields.data,
        status: (validatedFields.data.status as OutreachCompanyStatus) || OutreachCompanyStatus.LEAD_FOUND,
        businessType: (validatedFields.data.businessType as BusinessType) || BusinessType.OTHER,
      },
    });

    revalidatePath("/admin/outreach/companies");
    return { success: true, company };
  } catch (error) {
    console.error("Error creating outreach company:", error);
    return { error: "Failed to create company." };
  }
}

export async function updateOutreachCompany(id: string, data: Partial<OutreachCompanyInput>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const company = await prisma.outreachCompany.update({
      where: { id },
      data: {
        ...data,
        status: data.status ? (data.status as OutreachCompanyStatus) : undefined,
        businessType: data.businessType ? (data.businessType as BusinessType) : undefined,
      },
    });

    revalidatePath("/admin/outreach/companies");
    revalidatePath(`/admin/outreach/companies/${id}`);
    return { success: true, company };
  } catch (error) {
    console.error("Error updating outreach company:", error);
    return { error: "Failed to update company." };
  }
}

export async function deleteOutreachCompany(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    await prisma.outreachCompany.delete({
      where: { id },
    });

    revalidatePath("/admin/outreach/companies");
    return { success: true };
  } catch (error) {
    console.error("Error deleting outreach company:", error);
    return { error: "Failed to delete company." };
  }
}

export async function importOutreachCSV(csvContent: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return { error: "Failed to parse CSV.", details: parsed.errors };
  }

  const rows = parsed.data as any[];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const name = row["Company Name"] || row["name"] || row["Company"];
    const website = row["Website"] || row["website"] || row["URL"];
    const email = row["Email"] || row["email"] || row["Contact Email"];
    const phone = row["Phone"] || row["phone"] || row["Contact Phone"];
    const contactName = row["Contact Name"] || row["contact_name"] || row["Person"];
    const city = row["City"] || row["city"];
    const state = row["State"] || row["state"];
    const notes = row["Notes"] || row["notes"] || row["Description"];

    if (!name) {
      skippedCount++;
      continue;
    }

    try {
      // Duplicate detection
      const conditions: any[] = [];
      
      if (website) {
        conditions.push({ 
          website: { 
            contains: website.replace(/^https?:\/\/(www\.)?/, ""), 
            mode: "insensitive" 
          } 
        });
      }
      
      if (name && city) {
        conditions.push({
          AND: [
            { name: { equals: name, mode: "insensitive" } },
            { city: { equals: city, mode: "insensitive" } }
          ]
        });
      } else if (name) {
        conditions.push({ name: { equals: name, mode: "insensitive" } });
      }

      let existing = null;
      if (conditions.length > 0) {
        existing = await prisma.outreachCompany.findFirst({
          where: { OR: conditions }
        });
      }

      if (existing) {
        // Update existing
        await prisma.outreachCompany.update({
          where: { id: existing.id },
          data: {
            website: website || existing.website,
            city: city || existing.city,
            state: state || existing.state,
            notes: notes ? `${existing.notes || ""}\n\nImported Note: ${notes}` : existing.notes,
          }
        });
        updatedCount++;
      } else {
        // Create new
        const company = await prisma.outreachCompany.create({
          data: {
            name,
            website,
            city,
            state,
            notes,
            status: OutreachCompanyStatus.LEAD_FOUND,
          }
        });

        if (contactName || email || phone) {
          await prisma.outreachContact.create({
            data: {
              companyId: company.id,
              name: contactName || "Primary Contact",
              email,
              phone,
              isPrimary: true,
            }
          });
        }
        createdCount++;
      }
    } catch (err) {
      console.error(`Error importing row for ${name}:`, err);
      skippedCount++;
    }
  }

  revalidatePath("/admin/outreach/companies");
  return { 
    success: true, 
    stats: { createdCount, updatedCount, skippedCount } 
  };
}

export async function exportOutreachCSV() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const companies = await prisma.outreachCompany.findMany({
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1
        }
      }
    });

    const data = companies.map(c => ({
      "Company Name": c.name,
      "Website": c.website || "",
      "City": c.city || "",
      "State": c.state || "",
      "Status": c.status,
      "Contact Name": c.contacts[0]?.name || "",
      "Contact Email": c.contacts[0]?.email || "",
      "Contact Phone": c.contacts[0]?.phone || "",
      "Notes": c.notes || "",
    }));

    const csv = Papa.unparse(data);
    return { success: true, csv };
  } catch (error) {
    console.error("Error exporting outreach CSV:", error);
    return { error: "Failed to export CSV." };
  }
}

export async function searchContractors(query: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Google Maps API key not configured." };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { error: `Google API error: ${data.status}` };
    }

    const results = data.results.map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      // Attempt to extract city/state from formatted_address
      ...parseAddress(place.formatted_address)
    }));

    return { success: true, results, count: results.length };
  } catch (error) {
    console.error("Error searching contractors:", error);
    return { error: "Failed to search contractors." };
  }
}

const PERMITSTACK_API_BASE = "https://api.permit-stack.com";
const PERMITSTACK_PAGE_SIZE = "100";

type PermitStackSearchMode =
  | "contractors_by_area"
  | "contractors_by_name"
  | "derived_from_permits";

type PermitStackContractorSummary = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  total_permits?: number;
  first_permit_date?: string | null;
  last_permit_date?: string | null;
  specialties?: string[] | null;
};

type PermitStackPermitSummary = {
  id: string;
  contractor_name?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  date_issued?: string | null;
  date_filed?: string | null;
  jurisdiction_name?: string | null;
};

type PermitStackSearchResponse<T> = {
  total?: number;
  page?: number;
  per_page?: number;
  results?: T[];
};

type PermitStackContractorResult = {
  placeId: string;
  name: string;
  address: string;
  rating: null;
  userRatingsTotal: number;
  city: string | null;
  state: string | null;
  permitCount: number | null;
  lastPermitDate: string | null;
  specialties: string[];
  jurisdiction: string | null;
};

async function fetchPermitStack(
  path: string,
  params: Record<string, string>,
  apiKey: string
) {
  const url = new URL(`${PERMITSTACK_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-API-Key": apiKey,
    },
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        return {
          error: `PermitStack error: ${response.status} ${response.statusText}`,
        };
      }

      return { error: "PermitStack returned an invalid response." };
    }
  }

  if (!response.ok) {
    const payload = data as {
      message?: string;
      error?: string | { description?: string; message?: string };
    } | null;
    const nestedError = payload?.error;
    const message =
      payload?.message ||
      (typeof nestedError === "string"
        ? nestedError
        : nestedError?.description || nestedError?.message) ||
      response.statusText;

    return { error: `PermitStack error: ${message}` };
  }

  return { data };
}

function getPermitStackResults<T>(data: unknown): T[] {
  const payload = data as PermitStackSearchResponse<T> | null;
  if (!payload || !Array.isArray(payload.results)) {
    return [];
  }

  return payload.results;
}

function parsePermitStackLocationQuery(
  query: string
): { city: string; state?: string } | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const commaParts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const city = commaParts[0];
    const statePart = commaParts[1];
    const stateMatch = statePart.match(/^([A-Za-z]{2})\b/);

    return {
      city,
      state: stateMatch ? stateMatch[1].toUpperCase() : statePart,
    };
  }

  const businessPattern =
    /\b(llc|inc|corp|company|solar|electric|roofing|construction|services|group)\b/i;
  if (businessPattern.test(trimmed)) {
    return null;
  }

  return { city: trimmed };
}

function mapPermitStackContractor(
  contractor: PermitStackContractorSummary
): PermitStackContractorResult {
  return {
    placeId: contractor.id,
    name: contractor.name,
    address: "",
    rating: null,
    userRatingsTotal: 0,
    city: contractor.city || null,
    state: contractor.state || null,
    permitCount: contractor.total_permits ?? null,
    lastPermitDate: contractor.last_permit_date || null,
    specialties: contractor.specialties || [],
    jurisdiction: null,
  };
}

function contractorsFromPermits(
  permits: PermitStackPermitSummary[]
): PermitStackContractorResult[] {
  const byKey = new Map<string, PermitStackContractorResult>();

  for (const permit of permits) {
    const name = permit.contractor_name?.trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    const permitDate = permit.date_issued || permit.date_filed || null;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        placeId: `permit-${key}`,
        name,
        address: permit.address_street || "",
        rating: null,
        userRatingsTotal: 0,
        city: permit.address_city || null,
        state: permit.address_state || null,
        permitCount: 1,
        lastPermitDate: permitDate,
        specialties: [],
        jurisdiction: permit.jurisdiction_name || null,
      });
      continue;
    }

    existing.permitCount = (existing.permitCount || 0) + 1;
    if (
      permitDate &&
      (!existing.lastPermitDate || String(permitDate) > String(existing.lastPermitDate))
    ) {
      existing.lastPermitDate = permitDate;
    }

    if (permit.jurisdiction_name && !existing.jurisdiction) {
      existing.jurisdiction = permit.jurisdiction_name;
    }
  }

  return Array.from(byKey.values());
}

async function searchPermitStackContractors(
  params: Record<string, string>,
  apiKey: string
) {
  const response = await fetchPermitStack(
    "/v1/contractors/search",
    {
      per_page: PERMITSTACK_PAGE_SIZE,
      ...params,
    },
    apiKey
  );

  if (response.error) {
    return { error: response.error };
  }

  return {
    results: getPermitStackResults<PermitStackContractorSummary>(response.data).map(
      mapPermitStackContractor
    ),
  };
}

async function searchPermitStackPermits(
  params: Record<string, string>,
  apiKey: string
) {
  const response = await fetchPermitStack(
    "/v1/permits/search",
    {
      per_page: PERMITSTACK_PAGE_SIZE,
      ...params,
    },
    apiKey
  );

  if (response.error) {
    return { error: response.error };
  }

  return {
    results: contractorsFromPermits(
      getPermitStackResults<PermitStackPermitSummary>(response.data)
    ),
  };
}

function getPermitStackCoverageJurisdictions(data: unknown) {
  if (!data || typeof data !== "object") {
    return [] as Array<{ name?: string; city?: string; state?: string }>;
  }

  const payload = data as {
    results?: Array<{ name?: string; city?: string; state?: string }>;
    jurisdictions?: Array<{ name?: string; city?: string; state?: string }>;
  };

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.jurisdictions)) {
    return payload.jurisdictions;
  }

  return getPermitStackResults<{ name?: string; city?: string; state?: string }>(data);
}

async function getPermitStackCoverageMessage(
  location: { city: string; state?: string },
  apiKey: string
) {
  const response = await fetchPermitStack("/v1/permits/stats/coverage", {}, apiKey);
  if (response.error || !response.data) {
    return null;
  }

  const jurisdictions = getPermitStackCoverageJurisdictions(response.data);
  const cityLower = location.city.toLowerCase();
  const stateLower = location.state?.toLowerCase();

  const matches = jurisdictions.filter((jurisdiction) => {
    const jurisdictionCity = jurisdiction.city?.toLowerCase();
    const jurisdictionName = jurisdiction.name?.toLowerCase();
    const jurisdictionState = jurisdiction.state?.toLowerCase();

    const cityMatches =
      jurisdictionCity === cityLower ||
      jurisdictionName?.includes(cityLower) ||
      jurisdictionName === cityLower;
    const stateMatches = !stateLower || jurisdictionState === stateLower;

    return cityMatches && stateMatches;
  });

  if (matches.length === 0) {
    return `No PermitStack coverage found for ${location.city}${location.state ? `, ${location.state}` : ""}. Try another covered city or search by contractor name.`;
  }

  return `${location.city}${location.state ? `, ${location.state}` : ""} is in PermitStack coverage, but no solar contractors matched this search. Permit activity may be limited or stale in that jurisdiction.`;
}

function buildPermitStackEmptyMessage(
  location: { city: string; state?: string } | null,
  coverageMessage: string | null
) {
  if (coverageMessage) {
    return coverageMessage;
  }

  if (location) {
    return `No PermitStack contractors matched ${location.city}${location.state ? `, ${location.state}` : ""}. Try adding a state code or searching by contractor name.`;
  }

  return "No PermitStack contractors matched that search. Try a covered city/state or a contractor name.";
}

export async function searchPermitStack(query: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.PERMITSTACK_API_KEY;
  if (!apiKey) {
    return { error: "PermitStack API key not configured." };
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { error: "Enter a city, state, or contractor name to search PermitStack." };
  }

  try {
    const location = parsePermitStackLocationQuery(trimmedQuery);

    if (location) {
      const contractorParams: Record<string, string> = {
        city: location.city,
        specialty: "solar",
      };

      if (location.state) {
        contractorParams.state = location.state;
      }

      const contractorSearch = await searchPermitStackContractors(contractorParams, apiKey);
      if (contractorSearch.error) {
        return { error: contractorSearch.error };
      }

      const areaContractors = contractorSearch.results ?? [];
      if (areaContractors.length > 0) {
        return {
          success: true,
          results: areaContractors,
          count: areaContractors.length,
          searchMode: "contractors_by_area" as PermitStackSearchMode,
        };
      }

      const permitParams: Record<string, string> = {
        city: location.city,
        category: "solar",
        jurisdiction: location.city,
      };

      if (location.state) {
        permitParams.state = location.state;
      }

      const permitSearch = await searchPermitStackPermits(permitParams, apiKey);
      if (permitSearch.error) {
        return { error: permitSearch.error };
      }

      const derivedContractors = permitSearch.results ?? [];
      if (derivedContractors.length > 0) {
        return {
          success: true,
          results: derivedContractors,
          count: derivedContractors.length,
          searchMode: "derived_from_permits" as PermitStackSearchMode,
        };
      }

      const coverageMessage = await getPermitStackCoverageMessage(location, apiKey);
      return {
        success: true,
        results: [],
        count: 0,
        searchMode: "contractors_by_area" as PermitStackSearchMode,
        message: buildPermitStackEmptyMessage(location, coverageMessage),
      };
    }

    const contractorSearch = await searchPermitStackContractors(
      {
        name: trimmedQuery,
        specialty: "solar",
      },
      apiKey
    );

    if (contractorSearch.error) {
      return { error: contractorSearch.error };
    }

    const namedContractors = contractorSearch.results ?? [];
    if (namedContractors.length > 0) {
      return {
        success: true,
        results: namedContractors,
        count: namedContractors.length,
        searchMode: "contractors_by_name" as PermitStackSearchMode,
      };
    }

    return {
      success: true,
      results: [],
      count: 0,
      searchMode: "contractors_by_name" as PermitStackSearchMode,
      message: buildPermitStackEmptyMessage(null, null),
    };
  } catch (error) {
    console.error("Error searching PermitStack:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to search PermitStack: ${message}` };
  }
}

export async function getPlaceDetails(placeId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Google Maps API key not configured." };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,geometry&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status !== "OK") {
      return { error: `Google API error: ${data.status}` };
    }

    return { success: true, place: data.result };
  } catch (error) {
    console.error("Error getting place details:", error);
    return { error: "Failed to get place details." };
  }
}

export async function enrichCompanyWithAI(companyId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Gemini API key not configured." };
  }

  try {
    const company = await prisma.outreachCompany.findUnique({
      where: { id: companyId },
      include: { contacts: true }
    });

    if (!company) return { error: "Company not found." };

    let websiteContent = "";
    if (company.website && (company.website.startsWith("http://") || company.website.startsWith("https://"))) {
      try {
        const res = await fetch(company.website, { 
          signal: AbortSignal.timeout(8000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        if (res.ok) {
          const html = await res.text();
          // Simple HTML to text (strip tags)
          websiteContent = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
                               .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
                               .replace(/<[^>]*>?/gm, ' ')
                               .replace(/\s+/g, ' ')
                               .trim()
                               .slice(0, 8000);
        }
      } catch (e) {
        console.warn(`Could not fetch website ${company.website}:`, e);
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-2.5-flash as gemini-3-flash returned a 404
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze the following information about a solar company and extract contact info and potential business pain points.
      
      Company Name: ${company.name}
      Website: ${company.website || "N/A"}
      Location: ${company.city}, ${company.state}
      
      Website Content Snippet:
      ${websiteContent}
      
      Return a JSON object with:
      - contacts: array of { name, role, email, phone, linkedinUrl }
      - painPoints: array of strings (e.g., "slow response times", "backlog", "needs admin help")
      - fitScore: 1-5 (how well they fit Hargen Energy's services)
      - summary: brief 1-2 sentence summary of the company
      
      IMPORTANT: Only return the JSON object. Do not include any other text or markdown formatting.
    `;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (apiError: any) {
      console.error("Gemini API Error:", apiError);
      return { error: `Gemini API Error: ${apiError.message || "Unknown error"}` };
    }
    
    const response = await result.response;
    const text = response.text();
    
    // Robust JSON extraction
    let enrichment;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      enrichment = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return { error: "AI returned invalid data format. Please try again." };
    }

    // Update company with enrichment data
    await prisma.outreachCompany.update({
      where: { id: companyId },
      data: {
        enrichmentData: enrichment,
        fitScore: enrichment.fitScore || company.fitScore,
        painTags: {
          set: [...new Set([...(company.painTags || []), ...(enrichment.painPoints || [])])]
        },
        notes: company.notes ? `${company.notes}\n\nAI Summary: ${enrichment.summary}` : enrichment.summary
      }
    });

    // Add new contacts if found
    for (const contact of (enrichment.contacts || [])) {
      const exists = company.contacts.some(c => c.email === contact.email || c.name === contact.name);
      if (!exists && (contact.email || contact.phone || contact.name)) {
        await prisma.outreachContact.create({
          data: {
            companyId,
            name: contact.name || "Unknown",
            roleTitle: contact.role,
            email: contact.email,
            phone: contact.phone,
            linkedinUrl: contact.linkedinUrl,
          }
        });
      }
    }

    revalidatePath(`/admin/outreach/companies/${companyId}`);
    return { success: true, enrichment };
  } catch (error) {
    console.error("Error enriching company with AI:", error);
    return { error: "Failed to enrich company." };
  }
}

export async function enrichWithApollo(companyId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return { error: "Apollo API key not configured." };
  }

  try {
    const company = await prisma.outreachCompany.findUnique({ where: { id: companyId } });
    if (!company) return { error: "Company not found." };

    const domain = company.website ? company.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : null;

    const response = await fetch("https://api.apollo.io/v1/people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        api_key: apiKey,
        q_organization_domains: domain,
        organization_name: domain ? undefined : company.name,
        person_titles: ["owner", "founder", "ceo", "president", "operations", "manager"],
      }),
    });

    const data = await response.json();
    if (!response.ok) return { error: `Apollo error: ${data.message || response.statusText}` };

    const people = data.people || [];
    let addedCount = 0;

    for (const person of people) {
      const name = `${person.first_name} ${person.last_name}`;
      const email = person.email;
      const phone = person.phone_numbers?.[0]?.sanitized_number;
      const role = person.title;
      const linkedin = person.linkedin_url;

      const exists = await prisma.outreachContact.findFirst({
        where: { companyId, OR: [{ email: email || undefined }, { name }] }
      });

      if (!exists) {
        await prisma.outreachContact.create({
          data: {
            companyId,
            name,
            email,
            phone,
            roleTitle: role,
            linkedinUrl: linkedin,
          }
        });
        addedCount++;
      }
    }

    revalidatePath(`/admin/outreach/companies/${companyId}`);
    return { success: true, message: `Found and added ${addedCount} contacts from Apollo.` };
  } catch (error) {
    console.error("Error enriching with Apollo:", error);
    return { error: "Failed to enrich with Apollo." };
  }
}

export async function enrichWithYelp(companyId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return { error: "Yelp API key not configured." };
  }

  try {
    const company = await prisma.outreachCompany.findUnique({ where: { id: companyId } });
    if (!company) return { error: "Company not found." };

    // 1. Search for the business to get ID and basic info
    const searchResponse = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(company.name)}&location=${encodeURIComponent(`${company.city || ""}, ${company.state || ""}`)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    if (!searchResponse.ok) return { error: `Yelp Search error: ${searchData.error?.description || searchResponse.statusText}` };

    const biz = searchData.businesses?.[0];
    if (!biz) return { error: "No matching business found on Yelp." };

    // 2. Fetch the most recent reviews for this business
    let latestReview = "";
    try {
      const reviewsResponse = await fetch(
        `https://api.yelp.com/v3/businesses/${biz.id}/reviews?limit=3&sort_by=newest`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        if (reviewsData.reviews && reviewsData.reviews.length > 0) {
          const firstReview = reviewsData.reviews[0];
          latestReview = `\nMost Recent Review (${firstReview.rating} stars): "${firstReview.text.replace(/\n/g, " ")}"`;
        }
      }
    } catch (reviewError) {
      console.warn("Failed to fetch Yelp reviews:", reviewError);
    }

    const isClosed = biz.is_closed;
    const statusText = isClosed ? "PERMANENTLY CLOSED" : "Active";
    const yelpNote = `Yelp Status: ${statusText}\nYelp Rating: ${biz.rating} (${biz.review_count} reviews)${latestReview}`;

    await prisma.outreachCompany.update({
      where: { id: companyId },
      data: {
        notes: company.notes ? `${company.notes}\n\n${yelpNote}` : yelpNote,
        interestLevel: isClosed ? 0 : (Math.round(biz.rating) || company.interestLevel),
        doNotContact: isClosed ? true : company.doNotContact,
        status: isClosed ? OutreachCompanyStatus.BAD_FIT : company.status,
      }
    });

    revalidatePath(`/admin/outreach/companies/${companyId}`);
    return { success: true, message: `Updated from Yelp. Status: ${statusText}` };
  } catch (error) {
    console.error("Error enriching with Yelp:", error);
    return { error: "Failed to enrich with Yelp." };
  }
}

export async function checkLicenseStatus(companyId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const apiKey = process.env.TRADES_API_KEY;
  if (!apiKey) {
    return { error: "TradesAPI key not configured." };
  }

  try {
    const company = await prisma.outreachCompany.findUnique({ where: { id: companyId } });
    if (!company) return { error: "Company not found." };

    const response = await fetch(
      `https://api.tradesapi.com/v1/license/search?q=${encodeURIComponent(company.name)}&state=${company.state || ""}&api_key=${apiKey}`
    );
    const data = await response.json();

    if (!response.ok) return { error: `TradesAPI error: ${data.message || response.statusText}` };

    const license = data.licenses?.[0];
    if (!license) return { error: "No license found for this company." };

    await prisma.outreachCompany.update({
      where: { id: companyId },
      data: {
        notes: company.notes ? `${company.notes}\n\nLicense: ${license.number} (${license.status})` : `License: ${license.number} (${license.status})`,
      }
    });

    revalidatePath(`/admin/outreach/companies/${companyId}`);
    return { success: true, message: `License verified: ${license.status}` };
  } catch (error) {
    console.error("Error checking license status:", error);
    return { error: "Failed to check license status." };
  }
}

function parseAddress(formattedAddress: string) {
  // Simple regex-based address parsing for US addresses
  // Format: "123 Main St, City, ST 12345, USA"
  const parts = formattedAddress.split(", ");
  if (parts.length >= 3) {
    const city = parts[parts.length - 3];
    const stateZip = parts[parts.length - 2].split(" ");
    const state = stateZip[0];
    return { city, state };
  }
  return { city: null, state: null };
}

export async function logOutreachActivity(data: {
  companyId: string;
  contactId?: string;
  channel: string;
  activityType: string;
  notes?: string;
  responseSummary?: string;
  nextFollowUpAt?: Date;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const activity = await prisma.outreachActivity.create({
      data: {
        companyId: data.companyId,
        contactId: data.contactId,
        channel: data.channel as any,
        activityType: data.activityType as any,
        notes: data.notes,
        responseSummary: data.responseSummary,
        nextFollowUpAt: data.nextFollowUpAt,
        createdById: session.user.id,
      },
    });

    // Update company status and dates
    const updateData: any = {
      lastContactedAt: new Date(),
    };

    if (data.nextFollowUpAt) {
      updateData.nextFollowUpAt = data.nextFollowUpAt;
    }

    // Auto-update status based on activity
    if (data.activityType === "MESSAGE_SENT" || data.activityType === "FOLLOW_UP_SENT") {
      updateData.status = OutreachCompanyStatus.CONTACTED;
    } else if (data.activityType === "REPLY_RECEIVED") {
      updateData.status = OutreachCompanyStatus.REPLIED;
    } else if (data.activityType === "CALL_BOOKED") {
      updateData.status = OutreachCompanyStatus.CALL_BOOKED;
    }

    await prisma.outreachCompany.update({
      where: { id: data.companyId },
      data: updateData,
    });

    revalidatePath(`/admin/outreach/companies/${data.companyId}`);
    revalidatePath("/admin/outreach/companies");
    revalidatePath("/admin/outreach");
    
    return { success: true, activity };
  } catch (error) {
    console.error("Error logging outreach activity:", error);
    return { error: "Failed to log activity." };
  }
}

export async function addOutreachContact(data: {
  companyId: string;
  name: string;
  roleTitle?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary?: boolean;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const contact = await prisma.outreachContact.create({
      data,
    });

    revalidatePath(`/admin/outreach/companies/${data.companyId}`);
    return { success: true, contact };
  } catch (error) {
    console.error("Error adding outreach contact:", error);
    return { error: "Failed to add contact." };
  }
}

export async function deleteOutreachContact(id: string, companyId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    await prisma.outreachContact.delete({
      where: { id },
    });

    revalidatePath(`/admin/outreach/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting outreach contact:", error);
    return { error: "Failed to delete contact." };
  }
}
