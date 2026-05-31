"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { outreachCompanySchema, OutreachCompanyInput } from "@/lib/validations";
import { authorizeStaffAction, requireStaff } from "@/lib/auth-guards";
import {
  BusinessType,
  OutreachActivityType,
  OutreachChannel,
  OutreachCompanyStatus,
  OutreachDiscoveryStatus,
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
  GOOGLE_NEXT_PAGE_DELAY_MS,
  logOutreachSearchRun,
  normalizeCompanyName,
  OUTREACH_SEARCH_RESULT_LIMIT,
  parseAddress,
  type OutreachSearchReplayPayload,
} from "@/lib/outreach-search";
import {
  ingestSearchResultsIntoDiscoveryPool,
  placeDetailsAreFresh,
  pruneStaleDiscoveries,
} from "@/lib/outreach-discovery";
import {
  buildOutreachCsvTemplate,
  getCsvField,
  OUTREACH_CSV_COLUMNS,
  parseFitScore,
  parseOutreachStatus,
  parsePainTags,
  serializePainTags,
} from "@/lib/outreach-csv";
import { runCompanyEnrichment } from "@/lib/outreach-enrichment";
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

export type OutreachCsvImportTarget = "discovery" | "save";

async function enforceOutreachRateLimit(
  bucket:
    | "outreach-google-search"
    | "outreach-permitstack-search"
    | "outreach-yelp-enrich"
    | "outreach-gemini-assist"
    | "outreach-auto-enrich",
  userId: string
) {
  const result = await checkRateLimit(bucket, `user:${userId}`);
  if (!result.allowed) {
    return `Too many requests. Try again in ${result.retryAfterSec} seconds.`;
  }

  return null;
}

function scheduleCompanyEnrichment(companyId: string) {
  after(async () => {
    try {
      await runCompanyEnrichment(companyId);
    } catch (error) {
      console.error("Background enrichment failed:", error);
    }
  });
}

async function upsertPrimaryContact(
  companyId: string,
  input: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }
) {
  if (!input.name && !input.email && !input.phone) {
    return;
  }

  const existingPrimary = await prisma.outreachContact.findFirst({
    where: { companyId, isPrimary: true },
  });

  if (existingPrimary) {
    await prisma.outreachContact.update({
      where: { id: existingPrimary.id },
      data: {
        name: input.name || existingPrimary.name,
        email: input.email || existingPrimary.email,
        phone: input.phone || existingPrimary.phone,
      },
    });
    return;
  }

  await prisma.outreachContact.create({
    data: {
      companyId,
      name: input.name || "Primary Contact",
      email: input.email || undefined,
      phone: input.phone || undefined,
      isPrimary: true,
    },
  });
}

async function markDiscoverySaved(discoveryId: string, companyId: string) {
  await prisma.outreachDiscovery.update({
    where: { id: discoveryId },
    data: {
      status: OutreachDiscoveryStatus.SAVED,
      matchedCompanyId: companyId,
    },
  });
}

export async function createOutreachCompany(
  data: OutreachCompanyInput,
  options?: { discoveryId?: string; scheduleEnrichment?: boolean }
) {
  await requireStaff("ops.full");

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
      googlePlaceId: validatedFields.data.googlePlaceId,
      permitStackContractorId: validatedFields.data.permitStackId,
    });

    if (duplicate) {
      return {
        error: "This company already exists in outreach.",
        existingCompanyId: duplicate.company.id,
        matchReason: duplicate.reason,
      };
    }

    const {
      enrichmentData,
      primaryContactPhone,
      primaryContactName,
      primaryContactEmail,
      googlePlaceId,
      permitStackId,
      ...companyFields
    } = validatedFields.data;

    const company = await prisma.outreachCompany.create({
      data: {
        ...companyFields,
        normalizedName: normalizeCompanyName(validatedFields.data.name),
        googlePlaceId: googlePlaceId ?? undefined,
        permitStackId: permitStackId ?? undefined,
        enrichmentData: (enrichmentData ?? undefined) as Prisma.InputJsonValue | undefined,
        enrichmentStatus: options?.scheduleEnrichment === false ? undefined : "pending",
        enrichmentQueuedAt: options?.scheduleEnrichment === false ? undefined : new Date(),
        status:
          (validatedFields.data.status as OutreachCompanyStatus) ||
          OutreachCompanyStatus.LEAD_FOUND,
        businessType:
          (validatedFields.data.businessType as BusinessType) || BusinessType.OTHER,
      },
    });

    await upsertPrimaryContact(company.id, {
      name: primaryContactName,
      email: primaryContactEmail,
      phone: primaryContactPhone,
    });

    if (options?.discoveryId) {
      await markDiscoverySaved(options.discoveryId, company.id);
    } else if (googlePlaceId) {
      const discovery = await prisma.outreachDiscovery.findUnique({
        where: { googlePlaceId },
      });
      if (discovery) {
        await markDiscoverySaved(discovery.id, company.id);
      }
    }

    if (options?.scheduleEnrichment !== false) {
      scheduleCompanyEnrichment(company.id);
    }

    revalidatePath("/admin/outreach/companies");
    revalidatePath("/admin/outreach/discovery");
    revalidatePath("/admin/outreach");
    return { success: true, company };
  } catch (error) {
    console.error("Error creating outreach company:", error);
    return { error: "Failed to create company." };
  }
}

export async function updateOutreachCompany(id: string, data: Partial<OutreachCompanyInput>) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  try {
    const { enrichmentData, ...companyFields } = data;

    const company = await prisma.outreachCompany.update({
      where: { id },
      data: {
        ...companyFields,
        normalizedName: data.name ? normalizeCompanyName(data.name) : undefined,
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
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

export async function importOutreachCSV(
  csvContent: string,
  target: OutreachCsvImportTarget = "save"
) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return { error: "Failed to parse CSV.", details: parsed.errors };
  }

  const rows = parsed.data as Record<string, string | undefined>[];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let discoveryCount = 0;

  for (const row of rows) {
    const name =
      getCsvField(row, "Company Name", "name", "Company");
    const website = getCsvField(row, "Website", "website", "URL");
    const email = getCsvField(row, "Email", "email", "Contact Email");
    const phone = getCsvField(row, "Phone", "phone", "Contact Phone");
    const contactName = getCsvField(row, "Contact Name", "contact_name", "Person");
    const city = getCsvField(row, "City", "city");
    const state = getCsvField(row, "State", "state");
    const notes = getCsvField(row, "Notes", "notes", "Description");
    const rowId = getCsvField(row, "id");
    const googlePlaceId = getCsvField(row, "googlePlaceId");
    const leadSource = getCsvField(row, "leadSource");
    const fitScore = parseFitScore(getCsvField(row, "fitScore"));
    const painTags = parsePainTags(getCsvField(row, "painTags"));
    const status = parseOutreachStatus(getCsvField(row, "Status"));

    if (!name) {
      skippedCount++;
      continue;
    }

    try {
      let existing = null;

      if (rowId) {
        existing = await prisma.outreachCompany.findUnique({ where: { id: rowId } });
      }

      if (!existing) {
        existing = (
          await findExistingOutreachCompany({
            name,
            city,
            state,
            website,
            googlePlaceId,
          })
        )?.company;
      }

      if (target === "discovery") {
        const normalizedName = normalizeCompanyName(name);
        const existingDiscovery = googlePlaceId
          ? await prisma.outreachDiscovery.findUnique({ where: { googlePlaceId } })
          : await prisma.outreachDiscovery.findFirst({
              where: {
                normalizedName,
                city: city ? { equals: city, mode: "insensitive" } : undefined,
              },
            });

        if (existingDiscovery) {
          await prisma.outreachDiscovery.update({
            where: { id: existingDiscovery.id },
            data: {
              name,
              city: city || existingDiscovery.city,
              state: state || existingDiscovery.state,
              website: website || existingDiscovery.website,
              phone: phone || existingDiscovery.phone,
              leadSource: leadSource || existingDiscovery.leadSource,
              fitScore: fitScore ?? existingDiscovery.fitScore,
              painTags: painTags.length > 0 ? painTags : existingDiscovery.painTags,
              matchedCompanyId: existing?.id ?? existingDiscovery.matchedCompanyId,
              status: existing
                ? OutreachDiscoveryStatus.SAVED
                : existingDiscovery.status === OutreachDiscoveryStatus.SAVED
                  ? OutreachDiscoveryStatus.SAVED
                  : OutreachDiscoveryStatus.NEW,
              lastSeenAt: new Date(),
            },
          });
        } else {
          await prisma.outreachDiscovery.create({
            data: {
              googlePlaceId: googlePlaceId || undefined,
              normalizedName,
              name,
              city,
              state,
              website,
              phone,
              leadSource,
              fitScore,
              painTags,
              matchedCompanyId: existing?.id ?? undefined,
              status: existing ? OutreachDiscoveryStatus.SAVED : OutreachDiscoveryStatus.NEW,
            },
          });
        }
        discoveryCount++;
        continue;
      }

      if (existing) {
        await prisma.outreachCompany.update({
          where: { id: existing.id },
          data: {
            website: website || existing.website,
            city: city || existing.city,
            state: state || existing.state,
            googlePlaceId: googlePlaceId || existing.googlePlaceId,
            normalizedName: normalizeCompanyName(name),
            notes: notes ?? existing.notes,
            fitScore: fitScore ?? existing.fitScore,
            painTags: painTags.length > 0 ? painTags : existing.painTags,
            status: status ?? existing.status,
            leadSource: leadSource || existing.leadSource,
          },
        });

        await upsertPrimaryContact(existing.id, {
          name: contactName,
          email,
          phone,
        });
        updatedCount++;
      } else {
        const company = await prisma.outreachCompany.create({
          data: {
            name,
            normalizedName: normalizeCompanyName(name),
            website,
            city,
            state,
            notes,
            googlePlaceId: googlePlaceId || undefined,
            leadSource,
            fitScore,
            painTags,
            status: status || OutreachCompanyStatus.LEAD_FOUND,
          },
        });

        await upsertPrimaryContact(company.id, {
          name: contactName,
          email,
          phone,
        });
        createdCount++;
      }
    } catch (err) {
      console.error(`Error importing row for ${name}:`, err);
      skippedCount++;
    }
  }

  revalidatePath("/admin/outreach/companies");
  revalidatePath("/admin/outreach/discovery");
  revalidatePath("/admin/outreach");
  return {
    success: true,
    stats: { createdCount, updatedCount, skippedCount, discoveryCount },
  };
}

export type OutreachCsvExportMode = "saved" | "discovery" | "run";

export async function exportOutreachCSV(mode: OutreachCsvExportMode = "saved", runId?: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  try {
    if (mode === "discovery") {
      const discoveries = await prisma.outreachDiscovery.findMany({
        where: {
          status: { in: [OutreachDiscoveryStatus.NEW, OutreachDiscoveryStatus.REVIEWING] },
        },
        orderBy: { lastSeenAt: "desc" },
      });

      const data = discoveries.map((d) => ({
        id: "",
        googlePlaceId: d.googlePlaceId || "",
        "Company Name": d.name,
        City: d.city || "",
        State: d.state || "",
        Website: d.website || "",
        Status: "LEAD_FOUND",
        "Contact Name": "",
        "Contact Email": "",
        "Contact Phone": d.phone || "",
        Notes: d.address || "",
        fitScore: d.fitScore?.toString() || "",
        painTags: serializePainTags(d.painTags),
        leadSource: d.leadSource || d.source || "",
      }));

      return { success: true, csv: Papa.unparse(data, { columns: [...OUTREACH_CSV_COLUMNS] }) };
    }

    if (mode === "run") {
      if (!runId) {
        return { error: "Select a search run to export." };
      }
      const run = await getOutreachSearchRunById(runId);
      if (!run) {
        return { error: "Search run not found." };
      }
      const snapshot = run.resultSnapshot as OutreachSearchReplayPayload | null;
      const results = (snapshot?.results || []) as Array<{
        placeId: string;
        name: string;
        city?: string | null;
        state?: string | null;
        website?: string | null;
        phone?: string | null;
        address?: string | null;
        rating?: number | null;
      }>;

      const data = results.map((result) => ({
        id: "",
        googlePlaceId: result.placeId.startsWith("contractor-") ? "" : result.placeId,
        "Company Name": result.name,
        City: result.city || "",
        State: result.state || "",
        Website: result.website || "",
        Status: "LEAD_FOUND",
        "Contact Name": "",
        "Contact Email": "",
        "Contact Phone": result.phone || "",
        Notes: result.address || "",
        fitScore: "",
        painTags: "",
        leadSource: run.source || "",
      }));

      return { success: true, csv: Papa.unparse(data, { columns: [...OUTREACH_CSV_COLUMNS] }) };
    }

    const companies = await prisma.outreachCompany.findMany({
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = companies.map((c) => ({
      id: c.id,
      googlePlaceId: c.googlePlaceId || "",
      "Company Name": c.name,
      Website: c.website || "",
      City: c.city || "",
      State: c.state || "",
      Status: c.status,
      "Contact Name": c.contacts[0]?.name || "",
      "Contact Email": c.contacts[0]?.email || "",
      "Contact Phone": c.contacts[0]?.phone || "",
      Notes: c.notes || "",
      fitScore: c.fitScore?.toString() || "",
      painTags: serializePainTags(c.painTags),
      leadSource: c.leadSource || "",
    }));

    const csv = Papa.unparse(data, { columns: [...OUTREACH_CSV_COLUMNS] });
    return { success: true, csv };
  } catch (error) {
    console.error("Error exporting outreach CSV:", error);
    return { error: "Failed to export CSV." };
  }
}

export async function getOutreachCsvTemplate() {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  return { success: true, csv: buildOutreachCsvTemplate() };
}

async function fetchGooglePlaceDetailsFromApi(placeId: string, apiKey: string) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,geometry,rating,user_ratings_total&key=${apiKey}`
  );
  const data = await response.json();
  if (data.status !== "OK") {
    return { error: `Google API error: ${data.status}` as const };
  }
  return { success: true as const, place: data.result };
}

export async function searchContractors(query: string, pageToken?: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const session = authResult.session;

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
  if (!trimmedQuery && !pageToken) {
    return { error: "Enter a search query." };
  }

  try {
    if (pageToken) {
      await new Promise((resolve) => setTimeout(resolve, GOOGLE_NEXT_PAGE_DELAY_MS));
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    if (pageToken) {
      url.searchParams.set("pagetoken", pageToken);
    } else {
      url.searchParams.set("query", trimmedQuery);
    }
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      if (!pageToken) {
        await logOutreachSearchRun({
          source: OutreachSearchSource.GOOGLE,
          createdById: session.user.id,
          queryText: trimmedQuery,
          params: { query: trimmedQuery },
          resultCount: 0,
          status: OutreachSearchStatus.ERROR,
          errorMessage: data.status,
        });
      }
      return { error: `Google API error: ${data.status}` };
    }

    const rawResults: Array<{
      placeId: string;
      name: string;
      address?: string;
      rating?: number;
      userRatingsTotal?: number;
      types?: string[];
      city: string | null;
      state: string | null;
    }> = (data.results || []).slice(0, OUTREACH_SEARCH_RESULT_LIMIT).map((place: {
      place_id: string;
      name: string;
      formatted_address?: string;
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
    }) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      ...parseAddress(place.formatted_address ?? ""),
    }));

    const results = await annotateFinderResults(rawResults);
    const status =
      results.length > 0 ? OutreachSearchStatus.SUCCESS : OutreachSearchStatus.EMPTY;

    const run = await logOutreachSearchRun({
      source: OutreachSearchSource.GOOGLE,
      createdById: session.user.id,
      queryText: trimmedQuery,
      params: { query: trimmedQuery, pageToken: pageToken || null },
      resultCount: results.length,
      status,
      resultSnapshot: buildOutreachSearchReplaySnapshot({ results }),
    });

    await ingestSearchResultsIntoDiscoveryPool(
      rawResults.map((result) => ({
        placeId: result.placeId,
        name: result.name,
        city: result.city,
        state: result.state,
        address: result.address,
        rating: result.rating,
        userRatingsTotal: result.userRatingsTotal,
        source: OutreachSearchSource.GOOGLE,
        leadSource: "Google",
        sourceQuery: trimmedQuery,
      })),
      run.id
    );

    revalidatePath("/admin/outreach/discovery");

    return {
      success: true,
      results,
      count: results.length,
      nextPageToken: data.next_page_token || null,
      runId: run.id,
    };
  } catch (error) {
    console.error("Error searching contractors:", error);
    if (!pageToken) {
      await logOutreachSearchRun({
        source: OutreachSearchSource.GOOGLE,
        createdById: session.user.id,
        queryText: trimmedQuery,
        params: { query: trimmedQuery },
        resultCount: 0,
        status: OutreachSearchStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return { error: "Failed to search contractors." };
  }
}

export async function listOutreachSearchHistory(limit = 20) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const runs = await getRecentOutreachSearchRuns(limit);
  return { success: true, runs };
}

export async function getOutreachSearchRun(runId: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const session = authResult.session;

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

    const run = await logOutreachSearchRun({
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

    await ingestSearchResultsIntoDiscoveryPool(
      (searchResult.results ?? []).map((result) => ({
        placeId: result.placeId,
        name: result.name,
        city: result.city,
        state: result.state,
        address: result.address,
        rating: result.rating,
        userRatingsTotal: result.userRatingsTotal,
        source: OutreachSearchSource.PERMITSTACK,
        leadSource: "PermitStack",
        sourceQuery: JSON.stringify(input),
      })),
      run.id
    );

    revalidatePath("/admin/outreach/discovery");

    return {
      success: true,
      results: annotated,
      count: annotated.length,
      searchMode: searchResult.searchMode,
      message: searchResult.message,
      resolvedJurisdiction: searchResult.resolvedJurisdiction,
      attemptDiagnostics: searchResult.attemptDiagnostics,
      runId: run.id,
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const session = authResult.session;

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

export async function getPlaceDetails(placeId: string, discoveryId?: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }

  const discovery = discoveryId
    ? await prisma.outreachDiscovery.findUnique({ where: { id: discoveryId } })
    : await prisma.outreachDiscovery.findUnique({ where: { googlePlaceId: placeId } });

  if (
    discovery &&
    placeDetailsAreFresh(discovery.detailsFetchedAt) &&
    (discovery.website || discovery.phone)
  ) {
    return {
      success: true,
      place: {
        website: discovery.website,
        formatted_phone_number: discovery.phone,
        formatted_address: discovery.address,
        name: discovery.name,
        rating: discovery.rating,
        user_ratings_total: discovery.userRatingsTotal,
      },
      cached: true,
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Google Maps API key not configured." };
  }

  try {
    const details = await fetchGooglePlaceDetailsFromApi(placeId, apiKey);
    if ("error" in details) {
      return { error: details.error };
    }

    const place = details.place;
    const website = place.website as string | undefined;
    const phone = place.formatted_phone_number as string | undefined;
    const address = place.formatted_address as string | undefined;
    const now = new Date();

    if (discovery) {
      await prisma.outreachDiscovery.update({
        where: { id: discovery.id },
        data: {
          website: website || discovery.website,
          phone: phone || discovery.phone,
          address: address || discovery.address,
          detailsFetchedAt: now,
        },
      });
    } else {
      await prisma.outreachDiscovery.upsert({
        where: { googlePlaceId: placeId },
        create: {
          googlePlaceId: placeId,
          normalizedName: normalizeCompanyName((place.name as string) || "Unknown"),
          name: (place.name as string) || "Unknown",
          website,
          phone,
          address,
          detailsFetchedAt: now,
          source: OutreachSearchSource.GOOGLE,
          leadSource: "Google",
        },
        update: {
          website,
          phone,
          address,
          detailsFetchedAt: now,
          lastSeenAt: now,
        },
      });
    }

    return { success: true, place, cached: false };
  } catch (error) {
    console.error("Error getting place details:", error);
    return { error: "Failed to get place details." };
  }
}

export async function enrichCompanyWithAI(companyId: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }

  const rateLimitError = await enforceOutreachRateLimit(
    "outreach-auto-enrich",
    authResult.session.user.id
  );
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  await prisma.outreachCompany.update({
    where: { id: companyId },
    data: {
      enrichmentStatus: "pending",
      enrichmentQueuedAt: new Date(),
    },
  });

  scheduleCompanyEnrichment(companyId);
  revalidatePath(`/admin/outreach/companies/${companyId}`);

  return {
    success: true,
    message: "Enrichment queued. Refresh in a moment to see results.",
  };
}

export async function enrichWithApollo(companyId: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const session = authResult.session;

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
        candidates = matchData.businesses.map((business: Parameters<typeof mapYelpCandidate>[0]) =>
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

      candidates = (searchData.businesses || []).map((business: Parameters<typeof mapYelpCandidate>[0]) =>
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
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

export async function listOutreachDiscoveries(filters?: {
  status?: OutreachDiscoveryStatus;
  state?: string;
  query?: string;
}) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }

  const where: Prisma.OutreachDiscoveryWhereInput = {};
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.state) {
    where.state = { equals: filters.state, mode: "insensitive" };
  }
  if (filters?.query?.trim()) {
    where.OR = [
      { name: { contains: filters.query.trim(), mode: "insensitive" } },
      { city: { contains: filters.query.trim(), mode: "insensitive" } },
      { address: { contains: filters.query.trim(), mode: "insensitive" } },
    ];
  }

  const discoveries = await prisma.outreachDiscovery.findMany({
    where,
    orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
    include: {
      matchedCompany: {
        select: { id: true, name: true },
      },
    },
  });

  return { success: true, discoveries };
}

export async function updateDiscoveryStatus(
  discoveryId: string,
  status: OutreachDiscoveryStatus
) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }

  await prisma.outreachDiscovery.update({
    where: { id: discoveryId },
    data: { status },
  });

  revalidatePath("/admin/outreach/discovery");
  revalidatePath("/admin/outreach");
  return { success: true };
}

export async function saveDiscoveryToCompany(discoveryId: string) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }

  const discovery = await prisma.outreachDiscovery.findUnique({
    where: { id: discoveryId },
  });
  if (!discovery) {
    return { error: "Discovery not found." };
  }

  if (discovery.matchedCompanyId) {
    return { success: true, companyId: discovery.matchedCompanyId, existing: true };
  }

  let website = discovery.website;
  let phone = discovery.phone;
  let address = discovery.address;

  if (discovery.googlePlaceId && (!website || !phone)) {
    const details = await getPlaceDetails(discovery.googlePlaceId, discovery.id);
    if (details.success && details.place) {
      website = details.place.website || website;
      phone = details.place.formatted_phone_number || phone;
      address = details.place.formatted_address || address;
    }
  }

  const result = await createOutreachCompany(
    {
      name: discovery.name,
      city: discovery.city,
      state: discovery.state,
      website,
      googlePlaceId: discovery.googlePlaceId,
      permitStackId: discovery.permitStackId,
      leadSource: discovery.leadSource || discovery.source || undefined,
      sourceQuery: discovery.sourceQuery || undefined,
      sourceUrl: discovery.googlePlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${discovery.googlePlaceId}`
        : undefined,
      notes: [
        discovery.rating
          ? `Google Rating: ${discovery.rating} (${discovery.userRatingsTotal || 0} reviews)`
          : null,
        address ? `Address: ${address}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      primaryContactPhone: phone,
      fitScore: discovery.fitScore ?? undefined,
      painTags: discovery.painTags,
    },
    { discoveryId, scheduleEnrichment: true }
  );

  if (result.success) {
    return { success: true, companyId: result.company.id };
  }

  if ("existingCompanyId" in result && result.existingCompanyId) {
    await markDiscoverySaved(discoveryId, result.existingCompanyId);
    return { success: true, companyId: result.existingCompanyId, existing: true };
  }

  return result;
}

export async function batchSaveDiscoveries(discoveryIds: string[]) {
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }

  let saved = 0;
  let skipped = 0;
  for (const id of discoveryIds) {
    const result = await saveDiscoveryToCompany(id);
    if (result.success) {
      saved += 1;
    } else {
      skipped += 1;
    }
  }

  revalidatePath("/admin/outreach/discovery");
  revalidatePath("/admin/outreach/companies");
  return { success: true, saved, skipped };
}

export async function runOutreachDiscoveryCleanup() {
  const deleted = await pruneStaleDiscoveries();
  return { success: true, deleted };
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
  }
  const session = authResult.session;

  try {
    const activity = await prisma.outreachActivity.create({
      data: {
        companyId: data.companyId,
        contactId: data.contactId,
        channel: data.channel as OutreachChannel,
        activityType: data.activityType as OutreachActivityType,
        notes: data.notes,
        responseSummary: data.responseSummary,
        nextFollowUpAt: data.nextFollowUpAt,
        createdById: session.user.id,
      },
    });

    // Update company status and dates
    const updateData: Prisma.OutreachCompanyUpdateInput = {
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
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
  const authResult = await authorizeStaffAction("ops.full");
  if (!authResult.ok) {
    return { error: authResult.error };
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
