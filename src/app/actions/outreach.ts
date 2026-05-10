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

    return { success: true, results };
  } catch (error) {
    console.error("Error searching contractors:", error);
    return { error: "Failed to search contractors." };
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
    // Using gemini-3-flash as gemini-1.5-flash is no longer available in this project
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

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
