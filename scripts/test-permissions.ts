import { strict as assert } from "node:assert";
import { clientHasCapability, staffHasCapability } from "../src/lib/permissions";

// Staff OWNER
assert.equal(staffHasCapability("OWNER", "staff.manage"), true);
assert.equal(staffHasCapability("OWNER", "billing.manage"), true);
assert.equal(staffHasCapability("OWNER", "catalog.manage"), true);
assert.equal(staffHasCapability("OWNER", "clients.manage"), true);
assert.equal(staffHasCapability("OWNER", "ops.full"), true);

// Staff MEMBER
assert.equal(staffHasCapability("MEMBER", "staff.manage"), false);
assert.equal(staffHasCapability("MEMBER", "billing.manage"), false);
assert.equal(staffHasCapability("MEMBER", "catalog.manage"), false);
assert.equal(staffHasCapability("MEMBER", "clients.manage"), true);
assert.equal(staffHasCapability("MEMBER", "ops.full"), true);

// Client OWNER
assert.equal(clientHasCapability("OWNER", "team.manage"), true);
assert.equal(clientHasCapability("OWNER", "billing.view"), true);
assert.equal(clientHasCapability("OWNER", "disbursement.approve"), true);
assert.equal(clientHasCapability("OWNER", "portal.work"), true);

// Client MEMBER
assert.equal(clientHasCapability("MEMBER", "team.manage"), false);
assert.equal(clientHasCapability("MEMBER", "billing.view"), false);
assert.equal(clientHasCapability("MEMBER", "disbursement.approve"), false);
assert.equal(clientHasCapability("MEMBER", "portal.work"), true);

console.log("All permissions matrix checks passed.");
