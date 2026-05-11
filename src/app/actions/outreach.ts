"use server";

import { prisma } from "@/lib/prisma";
import { outreachCompanySchema, OutreachCompanyInput } from "@/lib/validations";
import { auth } from "@/auth";
import {
  BusinessType,
  OutreachCompanyStatus,
  OutreachSearchSource,
  OutreachSearchStatus,
  Prisma,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  annotateFinderResults,
  buildOutreachSearchReplaySnapshot,
  findExistingOutreachCompany,
  getOutreachSearchRunById,
  getRecentOutreachSearchRuns,
  logOutreachSearchRun,
  normalizeCompanyName,
  OUTREACH_SEARCH_RESULT_LIMIT,
  type OutreachSearchReplayPayload,
} from "@/lib/outreach-search";
import {
  type PermitStackSearchInput,
  loadPermitStackCoverage,
  parsePermitStackQueryLocally,
  runPermitStackSearch,
  sanitizePermitStackJurisdiction,
} from "@/lib/outreach-permitstack";
import {
  mapYelpCandidate,
  scoreYelpCandidate,
  type YelpBusinessCandidate,
} from "@/lib/outreach-yelp";

async function enforceOutreachRateLimit(
  bucket:
    | "outreach-google-search"
    | "outreach-permitstack-search"
    | "outreach-yelp-enrich"
    | "outreach-gemini-assist",
  userId: string
) {
  const result = await checkRateLimit(bucket, `user:${userId}`);
  if (!result.allowed) {
    return `Too many requests. Try again in ${result.retryAfterSec} seconds.`;
  }

  return null;
}

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
    const duplicate = await findExistingOutreachCompany({
      name: validatedFields.data.name,
      city: validatedFields.data.city,
      state: validatedFields.data.state,
      website: validatedFields.data.website,
    });

    if (duplicate) {
      return {
        error: "This company already exists in outreach.",
        existingCompanyId: duplicate.company.id,
        matchReason: duplicate.reason,
      };
    }

    const { enrichmentData, ...companyFields } = validatedFields.data;

    const company = await prisma.outreachCompany.create({
      data: {
        ...companyFields,
        enrichmentData: (enrichmentData ?? undefined) as Prisma.InputJsonValue | undefined,
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
    const { enrichmentData, ...companyFields } = data;

    const company = await prisma.outreachCompany.update({
      where: { id },
      data: {
        ...companyFields,
        enrichmentData:
          enrichmentData === undefined
            ? undefined
            : (enrichmentData as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput),
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

  const rateLimitError = await enforceOutreachRateLimit(
    "outreach-google-search",
    session.user.id
  );
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Google Maps API key not configured." };
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { error: "Enter a search query." };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(trimmedQuery)}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      await logOutreachSearchRun({
        source: OutreachSearchSource.GOOGLE,
        createdById: session.user.id,
        queryText: trimmedQuery,
        params: { query: trimmedQuery },
        resultCount: 0,
        status: OutreachSearchStatus.ERROR,
        errorMessage: data.status,
      });
      return { error: `Google API error: ${data.status}` };
    }

    const rawResults = (data.results || []).slice(0, OUTREACH_SEARCH_RESULT_LIMIT).map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      ...parseAddress(place.formatted_address),
    }));

    const results = await annotateFinderResults(rawResults);
    const status =
      results.length > 0 ? OutreachSearchStatus.SUCCESS : OutreachSearchStatus.EMPTY;

    await logOutreachSearchRun({
      source: OutreachSearchSource.GOOGLE,
      createdById: session.user.id,
      queryText: trimmedQuery,
      params: { query: trimmedQuery },
      resultCount: results.length,
      status,
      resultSnapshot: buildOutreachSearchReplaySnapshot({
        results,
      }),
    });

    return { success: true, results, count: results.length };
  } catch (error) {
    console.error("Error searching contractors:", error);
    await logOutreachSearchRun({
      source: OutreachSearchSource.GOOGLE,
      createdById: session.user.id,
      queryText: trimmedQuery,
      params: { query: trimmedQuery },
      resultCount: 0,
      status: OutreachSearchStatus.ERROR,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return { error: "Failed to search contractors." };
  }
}

export async function listOutreachSearchHistory(limit = 20) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const runs = await getRecentOutreachSearchRuns(limit);
  return { success: true, runs };
}

export async function getOutreachSearchRun(runId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const run = await getOutreachSearchRunById(runId);
  if (!run) {
    return { error: "Search run not found." };
  }

  const snapshot = run.resultSnapshot as OutreachSearchReplayPayload | null;
  if (!snapshot) {
    return {
      success: true,
      run,
      replay: {
        results: [],
        searchMode: run.searchMode,
        message: run.errorMessage,
        resolvedJurisdiction: null,
        attemptDiagnostics: null,
      },
    };
  }

  const results = await annotateFinderResults(
    (snapshot.results || []) as Array<{
      placeId: string;
      name: string;
      city?: string | null;
      state?: string | null;
      website?: string | null;
    }>
  );

  return {
    success: true,
    run,
    replay: {
      ...snapshot,
      results,
    },
  };
}

export type { PermitStackSearchInput } from "@/lib/outreach-permitstack";

export async function searchPermitStack(input: PermitStackSearchInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const rateLimitError = await enforceOutreachRateLimit(
    "outreach-permitstack-search",
    session.user.id
  );
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  const apiKey = process.env.PERMITSTACK_API_KEY;
  if (!apiKey) {
    return { error: "PermitStack API key not configured." };
  }

  try {
    const searchResult = await runPermitStackSearch(input, apiKey);
    if ("error" in searchResult && searchResult.error) {
      await logOutreachSearchRun({
        source: OutreachSearchSource.PERMITSTACK,
        createdById: session.user.id,
        queryText: input.contractorName || input.city || null,
        params: input,
        resultCount: 0,
        searchMode: input.searchType,
        status: OutreachSearchStatus.ERROR,
        errorMessage: searchResult.error,
      });
      return { error: searchResult.error };
    }

    const annotated = await annotateFinderResults(searchResult.results ?? []);
    const status =
      annotated.length > 0 ? OutreachSearchStatus.SUCCESS : OutreachSearchStatus.EMPTY;

    await logOutreachSearchRun({
      source: OutreachSearchSource.PERMITSTACK,
      createdById: session.user.id,
      queryText: input.contractorName || input.city || null,
      params: input,
      resultCount: annotated.length,
      searchMode: searchResult.searchMode,
      status,
      errorMessage: searchResult.message,
      resultSnapshot: buildOutreachSearchReplaySnapshot({
        results: annotated,
        searchMode: searchResult.searchMode,
        message: searchResult.message,
        resolvedJurisdiction: searchResult.resolvedJurisdiction,
        attemptDiagnostics: searchResult.attemptDiagnostics,
      }),
    });

    return {
      success: true,
      results: annotated,
      count: annotated.length,
      searchMode: searchResult.searchMode,
      message: searchResult.message,
      resolvedJurisdiction: searchResult.resolvedJurisdiction,
      attemptDiagnostics: searchResult.attemptDiagnostics,
    };
  } catch (error) {
    console.error("Error searching PermitStack:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await logOutreachSearchRun({
      source: OutreachSearchSource.PERMITSTACK,
      createdById: session.user.id,
      queryText: input.contractorName || input.city || null,
      params: input,
      resultCount: 0,
      searchMode: input.searchType,
      status: OutreachSearchStatus.ERROR,
      errorMessage: message,
    });
    return { error: `Failed to search PermitStack: ${message}` };
  }
}

export async function normalizePermitStackQueryWithAI(text: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const rateLimitError = await enforceOutreachRateLimit(
    "outreach-gemini-assist",
    session.user.id
  );
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { error: "Enter text for AI to normalize." };
  }

  const localParse = parsePermitStackQueryLocally(trimmed);
  if (localParse) {
    return {
      success: true,
      input: localParse.input,
      rationale: localParse.rationale,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Gemini API key not configured. Fill the form manually instead." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Convert the following admin search text into PermitStack search parameters.
      Return JSON only with:
      - searchType: "area" or "contractor"
      - city: string or null
      - state: 2-letter US state or null
      - jurisdiction: string or null
      - contractorName: string or null
      - rationale: short string

      Input: ${trimmed}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: "AI could not normalize that query." };
    }

    const parsed = JSON.parse(jsonMatch[0]) as PermitStackSearchInput & {
      rationale?: string;
    };

    const permitStackApiKey = process.env.PERMITSTACK_API_KEY;
    let jurisdiction = parsed.jurisdiction || undefined;
    if (jurisdiction && permitStackApiKey) {
      const coverage = await loadPermitStackCoverage(permitStackApiKey);
      jurisdiction = sanitizePermitStackJurisdiction(jurisdiction, coverage);
    } else if (jurisdiction) {
      jurisdiction = undefined;
    }

    return {
      success: true,
      input: {
        searchType: parsed.searchType === "contractor" ? "contractor" : "area",
        city: parsed.city || undefined,
        state: parsed.state || undefined,
        jurisdiction,
        contractorName: parsed.contractorName || undefined,
        category: "solar",
      } satisfies PermitStackSearchInput,
      rationale: parsed.rationale || null,
    };
  } catch (error) {
    console.error("Error normalizing PermitStack query with AI:", error);
    return { error: "Failed to normalize PermitStack query." };
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

function extractAddressLineFromNotes(notes?: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/^Address:\s*(.+)$/m);
  return match?.[1]?.trim() || null;
}

async function fetchYelpBusinessDetails(apiKey: string, businessId: string) {
  const response = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    return {
      error: `Yelp error: ${data.error?.description || response.statusText}`,
    };
  }

  return { business: data };
}

async function applyYelpBusinessToCompany(
  companyId: string,
  business: {
    id: string;
    name: string;
    rating?: number;
    review_count?: number;
    is_closed?: boolean;
  },
  confidence: number
) {
  const company = await prisma.outreachCompany.findUnique({ where: { id: companyId } });
  if (!company) {
    return { error: "Company not found." };
  }

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return { error: "Yelp API key not configured." };
  }

  let latestReview = "";
  try {
    const reviewsResponse = await fetch(
      `https://api.yelp.com/v3/businesses/${business.id}/reviews?limit=3&sort_by=newest`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (reviewsResponse.ok) {
      const reviewsData = await reviewsResponse.json();
      const firstReview = reviewsData.reviews?.[0];
      if (firstReview?.text) {
        latestReview = `\nMost Recent Review (${firstReview.rating} stars): "${String(firstReview.text).replace(/\n/g, " ")}"`;
      }
    }
  } catch (reviewError) {
    console.warn("Failed to fetch Yelp reviews:", reviewError);
  }

  const isClosed = !!business.is_closed;
  const statusText = isClosed ? "PERMANENTLY CLOSED" : "Active";
  const yelpNote = `Yelp Status: ${statusText}\nYelp Match Confidence: ${Math.round(confidence * 100)}%\nYelp Rating: ${business.rating ?? "N/A"} (${business.review_count ?? 0} reviews)${latestReview}`;

  const existingEnrichment =
    company.enrichmentData && typeof company.enrichmentData === "object"
      ? (company.enrichmentData as Record<string, unknown>)
      : {};

  await prisma.outreachCompany.update({
    where: { id: companyId },
    data: {
      notes: company.notes ? `${company.notes}\n\n${yelpNote}` : yelpNote,
      interestLevel: isClosed ? 0 : (Math.round(business.rating || 0) || company.interestLevel),
      doNotContact: isClosed ? true : company.doNotContact,
      status: isClosed ? OutreachCompanyStatus.BAD_FIT : company.status,
      enrichmentData: {
        ...existingEnrichment,
        yelpBusinessId: business.id,
        yelpMatchConfidence: confidence,
        yelpBusinessName: business.name,
      },
    },
  });

  revalidatePath(`/admin/outreach/companies/${companyId}`);
  return { success: true, message: `Updated from Yelp. Status: ${statusText}` };
}

export async function enrichWithYelp(companyId: string, selectedBusinessId?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const rateLimitError = await enforceOutreachRateLimit(
    "outreach-yelp-enrich",
    session.user.id
  );
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return { error: "Yelp API key not configured." };
  }

  try {
    const company = await prisma.outreachCompany.findUnique({ where: { id: companyId } });
    if (!company) return { error: "Company not found." };

    if (selectedBusinessId) {
      const details = await fetchYelpBusinessDetails(apiKey, selectedBusinessId);
      if (details.error) {
        return { error: details.error };
      }

      return applyYelpBusinessToCompany(companyId, details.business, 1);
    }

    const addressLine = extractAddressLineFromNotes(company.notes);
    let candidates: YelpBusinessCandidate[] = [];

    if (addressLine) {
      const matchUrl = new URL("https://api.yelp.com/v3/businesses/matches");
      matchUrl.searchParams.set("name", company.name);
      matchUrl.searchParams.set("address1", addressLine);
      if (company.city) {
        matchUrl.searchParams.set("city", company.city);
      }
      if (company.state) {
        matchUrl.searchParams.set("state", company.state);
      }
      matchUrl.searchParams.set("country", "US");

      const matchResponse = await fetch(matchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const matchData = await matchResponse.json();
      if (matchResponse.ok && Array.isArray(matchData.businesses)) {
        candidates = matchData.businesses.map((business: any) =>
          mapYelpCandidate(business, scoreYelpCandidate(company, business))
        );
      }
    }

    if (candidates.length === 0) {
      const searchResponse = await fetch(
        `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(company.name)}&location=${encodeURIComponent(`${company.city || ""}, ${company.state || ""}`)}&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) {
        return { error: `Yelp Search error: ${searchData.error?.description || searchResponse.statusText}` };
      }

      candidates = (searchData.businesses || []).map((business: any) =>
        mapYelpCandidate(business, scoreYelpCandidate(company, business))
      );
    }

    candidates.sort((left, right) => right.confidence - left.confidence);

    if (candidates.length === 0) {
      return { error: "No matching business found on Yelp." };
    }

    const best = candidates[0];
    if (best.confidence >= 0.75) {
      const details = await fetchYelpBusinessDetails(apiKey, best.id);
      if (details.error) {
        return { error: details.error };
      }

      return applyYelpBusinessToCompany(companyId, details.business, best.confidence);
    }

    return {
      success: true,
      requiresSelection: true,
      candidates: candidates.slice(0, 3),
      message: "Multiple Yelp matches found. Select the correct business.",
    };
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
