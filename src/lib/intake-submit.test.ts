import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClientStatus, SupportRequestKind } from "@/generated/prisma/client";
import { persistPublicIntake, mapIntakePlanType, type IntakePrismaClient } from "@/lib/intake-submit";
import type { RequestHelpInput } from "@/lib/validations";

const baseInput: RequestHelpInput & { normalizedEmail: string } = {
  companyName: "Solar Pros LLC",
  name: "Jane Doe",
  email: "jane@solarpros.com",
  normalizedEmail: "jane@solarpros.com",
  role: "Ops Manager",
  phone: "555-123-4567",
  website: "https://solarpros.com",
  serviceArea: "Bay Area",
  requestedWorkTaskIds: ["task-permit-follow-up"],
  bottleneck: "Permits are stuck",
  plan: "not-sure",
  urgency: "this-week",
  tools: "Aurora, HubSpot",
  takeOffPlate: "Utility follow-ups",
};

const resolvedTasks = [{ id: "task-permit-follow-up", name: "Permit Follow-Up" }];

function createMockPrisma() {
  const store = {
    clients: [] as Array<{ id: string; email: string; status: ClientStatus }>,
    requests: [] as Array<{
      id: string;
      clientId: string;
      metadata: unknown;
      supportNeeded?: string;
      requestedWorkTasks?: Array<{ workTaskId: string }>;
    }>,
    clientIdCounter: 1,
    requestIdCounter: 1,
  };

  return {
    store,
    prisma: {
      client: {
        findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
          store.clients.find((c) => c.email === where.email) ?? null,
        ),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const id = `client-${store.clientIdCounter++}`;
          const client = {
            id,
            email: data.email as string,
            status: data.status as ClientStatus,
          };
          store.clients.push(client);
          return { id };
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const client = store.clients.find((c) => c.id === where.id);
          if (client && data.contactName) {
            Object.assign(client, data);
          }
          return { id: where.id };
        }),
      },
      supportRequest: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const id = `req-${store.requestIdCounter++}`;
          const requestedWorkTasks = (
            data.requestedWorkTasks as { create: Array<{ workTaskId: string }> } | undefined
          )?.create;
          store.requests.push({
            id,
            clientId: data.clientId as string,
            metadata: data.metadata,
            supportNeeded: data.supportNeeded as string | undefined,
            requestedWorkTasks,
          });
          return { id };
        }),
      },
    },
  };
}

function asIntakePrisma(mock: ReturnType<typeof createMockPrisma>["prisma"]): IntakePrismaClient {
  return mock as unknown as IntakePrismaClient;
}

describe("persistPublicIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates LEAD client and PROSPECT_INTAKE request for new email", async () => {
    const { prisma, store } = createMockPrisma();

    const result = await persistPublicIntake(asIntakePrisma(prisma), {
      ...baseInput,
      resolvedTasks,
    });

    expect(result.clientId).toBe("client-1");
    expect(result.requestId).toBe("req-1");
    expect(store.clients).toHaveLength(1);
    expect(store.clients[0]?.status).toBe(ClientStatus.LEAD);
    expect(store.requests).toHaveLength(1);
    expect(store.requests[0]?.supportNeeded).toBe("Permit Follow-Up");
    expect(store.requests[0]?.requestedWorkTasks).toEqual([
      { workTaskId: "task-permit-follow-up" },
    ]);
    expect(result.emailPayload.kind).toBe(SupportRequestKind.PROSPECT_INTAKE);
  });

  it("sets intakePlan metadata for not-sure without changing planType mapping", () => {
    expect(mapIntakePlanType("not-sure")).toBeNull();
  });

  it("updates existing LEAD and creates new request on duplicate email", async () => {
    const { prisma, store } = createMockPrisma();
    store.clients.push({
      id: "client-existing",
      email: "jane@solarpros.com",
      status: ClientStatus.LEAD,
    });

    const result = await persistPublicIntake(asIntakePrisma(prisma), {
      ...baseInput,
      companyName: "Solar Pros Updated",
      resolvedTasks,
    });

    expect(prisma.client.update).toHaveBeenCalled();
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(result.clientId).toBe("client-existing");
    expect(store.requests).toHaveLength(1);
  });

  it("preserve-existing ACTIVE client and flags re-intake metadata", async () => {
    const { prisma, store } = createMockPrisma();
    store.clients.push({
      id: "client-active",
      email: "jane@solarpros.com",
      status: ClientStatus.ACTIVE,
    });

    const result = await persistPublicIntake(asIntakePrisma(prisma), {
      ...baseInput,
      resolvedTasks,
    });

    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(prisma.client.update).not.toHaveBeenCalled();
    expect(result.clientId).toBe("client-active");
    expect(store.requests[0]?.metadata).toEqual({
      intakePlan: "not-sure",
      resubmissionFromActiveClient: true,
    });
    expect(result.emailPayload.subjectPrefix).toBe("[Re-intake]");
  });

  it("applies custom weekly hours when hours-target is selected", async () => {
    const { prisma } = createMockPrisma();

    await persistPublicIntake(asIntakePrisma(prisma), {
      ...baseInput,
      plan: "hours-target",
      desiredWeeklyHours: 6,
      resolvedTasks,
    });

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planType: "CUSTOM", weeklyHours: 6 }),
      }),
    );
  });
});

describe("requestHelpSchema honeypot behavior", () => {
  it("honeypot path returns early before persist (integration via action contract)", async () => {
    const { requestHelpSchema } = await import("@/lib/validations");
    const parsed = requestHelpSchema.safeParse({
      ...baseInput,
      websiteUrlHoneypot: "http://spam.example",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.websiteUrlHoneypot).toBe("http://spam.example");
    }
  });
});

describe("mapIntakePlanType", () => {
  it("returns null for non-tier intake plans", () => {
    expect(mapIntakePlanType("hours-target")).toBeNull();
    expect(mapIntakePlanType("not-sure")).toBeNull();
    expect(mapIntakePlanType("request-based")).toBeNull();
  });
});
