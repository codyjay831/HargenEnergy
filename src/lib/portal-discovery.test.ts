import { describe, it, expect } from "vitest";
import {
  discoveryScopeMatchesApproved,
  flattenApprovedTaskIds,
} from "@/lib/portal-discovery-utils";
import { requestScopeChangeSchema } from "@/lib/validations";

describe("portal-discovery helpers", () => {
  it("discoveryScopeMatchesApproved returns true when sets match", () => {
    expect(discoveryScopeMatchesApproved(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("discoveryScopeMatchesApproved returns false when sets differ", () => {
    expect(discoveryScopeMatchesApproved(["a", "b"], ["a"])).toBe(false);
    expect(discoveryScopeMatchesApproved(["a"], ["b"])).toBe(false);
  });

  it("discoveryScopeMatchesApproved treats empty requested as matched", () => {
    expect(discoveryScopeMatchesApproved([], ["a"])).toBe(true);
  });

  it("flattenApprovedTaskIds collects task ids", () => {
    expect(
      flattenApprovedTaskIds([
        { tasks: [{ id: "a" }, { id: "b" }] },
        { tasks: [{ id: "c" }] },
      ]),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("requestScopeChangeSchema", () => {
  it("requires a note", () => {
    const result = requestScopeChangeSchema.safeParse({ note: "" });
    expect(result.success).toBe(false);
  });

  it("accepts note with optional task ids", () => {
    const result = requestScopeChangeSchema.safeParse({
      note: "Please add permit follow-up.",
      requestedWorkTaskIds: ["task-1"],
    });
    expect(result.success).toBe(true);
  });
});
