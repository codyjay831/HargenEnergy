import { describe, it, expect } from "vitest";
import {
  walkthroughScopeMatchesApproved,
  flattenApprovedTaskIds,
} from "@/lib/portal-walkthrough-utils";
import { requestScopeChangeSchema } from "@/lib/validations";

describe("portal-walkthrough helpers", () => {
  it("walkthroughScopeMatchesApproved returns true when sets match", () => {
    expect(walkthroughScopeMatchesApproved(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("walkthroughScopeMatchesApproved returns false when sets differ", () => {
    expect(walkthroughScopeMatchesApproved(["a", "b"], ["a"])).toBe(false);
    expect(walkthroughScopeMatchesApproved(["a"], ["b"])).toBe(false);
  });

  it("walkthroughScopeMatchesApproved treats empty requested as matched", () => {
    expect(walkthroughScopeMatchesApproved([], ["a"])).toBe(true);
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
