import { prisma } from "../src/lib/prisma";
import {
  encryptFieldValue,
  isEncryptedFieldValue,
} from "../src/lib/crypto/field-encryption";

async function main() {
  const rows = await prisma.clientSystemAccess.findMany({
    select: { id: true, vaultLink: true, adminSecureNote: true },
  });

  let updated = 0;
  for (const row of rows) {
    const nextVault =
      row.vaultLink && !isEncryptedFieldValue(row.vaultLink)
        ? encryptFieldValue(row.vaultLink)
        : undefined;
    const nextNote =
      row.adminSecureNote && !isEncryptedFieldValue(row.adminSecureNote)
        ? encryptFieldValue(row.adminSecureNote)
        : undefined;

    if (nextVault === undefined && nextNote === undefined) {
      continue;
    }

    await prisma.clientSystemAccess.update({
      where: { id: row.id },
      data: {
        ...(nextVault !== undefined ? { vaultLink: nextVault } : {}),
        ...(nextNote !== undefined ? { adminSecureNote: nextNote } : {}),
      },
    });
    updated += 1;
  }

  console.log(`Encrypted system access records updated: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
