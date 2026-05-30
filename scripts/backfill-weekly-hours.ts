import { EngagementType, PlanType } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { getWeeklyHoursForPlanType } from "../src/lib/support-plan-hours";

const APPLY = process.argv.includes("--apply");

async function main() {
  const candidates = await prisma.client.findMany({
    where: {
      engagementType: EngagementType.SUPPORT_BLOCK,
      weeklyHours: 0,
      planType: { in: [PlanType.LIGHT, PlanType.CORE, PlanType.PRIORITY] },
    },
    select: {
      id: true,
      companyName: true,
      planType: true,
      weeklyHours: true,
    },
  });

  if (candidates.length === 0) {
    console.log("No Support Block clients need weekly hours backfill.");
    return;
  }

  console.log(
    `${APPLY ? "Applying" : "Dry run"}: ${candidates.length} client(s) with weeklyHours=0 and tier planType.`,
  );

  for (const client of candidates) {
    const nextHours = getWeeklyHoursForPlanType(client.planType);
    console.log(
      `  ${client.id} | ${client.companyName} | ${client.planType} -> ${nextHours} hrs/wk`,
    );

    if (APPLY) {
      await prisma.client.update({
        where: { id: client.id },
        data: { weeklyHours: nextHours },
      });
    }
  }

  if (!APPLY) {
    console.log("\nRe-run with --apply to persist changes.");
  } else {
    console.log(`\nUpdated ${candidates.length} client(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
