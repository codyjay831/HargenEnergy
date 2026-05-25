import { strict as assert } from "node:assert";
import { ClientStatus } from "../src/generated/prisma/client";
import { getIntakeClientMutationStrategy } from "../src/lib/intake-client-upsert";

function run() {
  assert.equal(
    getIntakeClientMutationStrategy(null),
    "create",
    "null existing status should create a new LEAD",
  );
  assert.equal(
    getIntakeClientMutationStrategy(undefined),
    "create",
    "undefined existing status should create a new LEAD",
  );
  assert.equal(
    getIntakeClientMutationStrategy(ClientStatus.LEAD),
    "update-lead",
    "LEAD should be updated in-place",
  );
  assert.equal(
    getIntakeClientMutationStrategy(ClientStatus.ACTIVE),
    "preserve-existing",
    "ACTIVE client should not be overwritten by public intake",
  );
  assert.equal(
    getIntakeClientMutationStrategy(ClientStatus.PAUSED),
    "preserve-existing",
    "PAUSED client should not be overwritten by public intake",
  );
  assert.equal(
    getIntakeClientMutationStrategy(ClientStatus.CANCELLED),
    "preserve-existing",
    "CANCELLED client should not be overwritten by public intake",
  );
}

run();
console.log("All intake client upsert strategy checks passed.");
