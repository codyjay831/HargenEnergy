import { strict as assert } from "node:assert";
import { resolveClientRole, resolveStaffRole } from "../src/lib/permissions";

assert.equal(resolveStaffRole(null), "OWNER");
assert.equal(resolveStaffRole(undefined), "OWNER");
assert.equal(resolveStaffRole("MEMBER"), "MEMBER");

assert.equal(resolveClientRole(null), "OWNER");
assert.equal(resolveClientRole(undefined), "OWNER");
assert.equal(resolveClientRole("MEMBER"), "MEMBER");

console.log("All auth guard role resolution checks passed.");
