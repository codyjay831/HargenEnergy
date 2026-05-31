import { describe, expect, it } from "vitest";
import {
  canEditPacketDraft,
  canGeneratePacket,
  canMarkSentManually,
  canReturnToDraft,
  isPacketImmutable,
} from "@/lib/agreements/status";

describe("agreement packet status", () => {
  it("allows draft edits only in DRAFT", () => {
    expect(canEditPacketDraft("DRAFT")).toBe(true);
    expect(canEditPacketDraft("READY")).toBe(false);
    expect(canEditPacketDraft("SENT")).toBe(false);
  });

  it("treats signed/active/voided/superseded as immutable", () => {
    expect(isPacketImmutable("SIGNED")).toBe(true);
    expect(isPacketImmutable("ACTIVE")).toBe(true);
    expect(isPacketImmutable("VOIDED")).toBe(true);
    expect(isPacketImmutable("SUPERSEDED")).toBe(true);
    expect(isPacketImmutable("READY")).toBe(false);
  });

  it("allows generate only from draft", () => {
    expect(canGeneratePacket("DRAFT")).toBe(true);
    expect(canGeneratePacket("READY")).toBe(false);
  });

  it("allows manual sent only from ready", () => {
    expect(canMarkSentManually("READY")).toBe(true);
    expect(canMarkSentManually("DRAFT")).toBe(false);
    expect(canMarkSentManually("SENT")).toBe(false);
  });

  it("allows return to draft from ready or sent", () => {
    expect(canReturnToDraft("READY")).toBe(true);
    expect(canReturnToDraft("SENT")).toBe(true);
    expect(canReturnToDraft("DRAFT")).toBe(false);
  });
});
