import { describe, expect, it } from "vitest";
import { computeDiscoveryRailNodes } from "@/lib/discovery-scheduling/discovery-rail-utils";

describe("computeDiscoveryRailNodes", () => {
  it("does not mark discovery/recap/decision complete when only scheduling link exists", () => {
    const nodes = computeDiscoveryRailNodes("link_sent");

    expect(nodes).toHaveLength(4);
    expect(nodes.find((n) => n.id === "request")).toMatchObject({
      label: "Request",
      state: "current",
    });
    expect(nodes.find((n) => n.id === "discovery")).toMatchObject({
      label: "Discovery",
      state: "future",
    });
    expect(nodes.find((n) => n.id === "recap")).toMatchObject({
      label: "Recap",
      state: "future",
    });
    expect(nodes.find((n) => n.id === "decision")).toMatchObject({
      label: "Decision",
      state: "future",
    });
  });

  it("marks request complete and discovery current when appointment is scheduled", () => {
    const nodes = computeDiscoveryRailNodes("scheduled");

    expect(nodes.find((n) => n.id === "request")).toMatchObject({
      state: "complete",
    });
    expect(nodes.find((n) => n.id === "discovery")).toMatchObject({
      state: "current",
    });
    expect(nodes.find((n) => n.id === "recap")).toMatchObject({
      state: "future",
    });
  });
});
