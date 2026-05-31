import "dotenv/config";
import { ensureDefaultLegalTemplates } from "../src/lib/agreements/ensure-templates";

async function main() {
  await ensureDefaultLegalTemplates();
  console.log("Legal templates ensured.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
