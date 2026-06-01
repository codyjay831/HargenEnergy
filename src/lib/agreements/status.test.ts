import { describe, expect, it } from "vitest";
import {
  canAcceptOnline,
  canCreateSigningLink,
  canEditPacketDraft,
  canGeneratePacket,
  canMarkManuallySigned,
  canMarkSentManually,
  canReturnToDraft,
  canReturnToDraftWithGuards,
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

  it("blocks return to draft after view or signing activity", () => {
    expect(
      canReturnToDraftWithGuards({
        status: "READY",
        hasViewed: true,
        hasUsedSigningLink: false,
        hasAcceptances: false,
      }),
    ).toBe(false);
    expect(
      canReturnToDraftWithGuards({
        status: "SENT",
        hasViewed: false,
        hasUsedSigningLink: true,
        hasAcceptances: false,
      }),
    ).toBe(false);
    expect(
      canReturnToDraftWithGuards({
        status: "READY",
        hasViewed: false,
        hasUsedSigningLink: false,
        hasAcceptances: false,
      }),
    ).toBe(true);
  });

  it("allows signing links for ready, sent, and viewed", () => {
    expect(canCreateSigningLink("READY")).toBe(true);
    expect(canCreateSigningLink("SENT")).toBe(true);
    expect(canCreateSigningLink("VIEWED")).toBe(true);
    expect(canCreateSigningLink("SIGNED")).toBe(false);
  });

  it("allows online acceptance and manual sign before signed", () => {
    expect(canAcceptOnline("VIEWED")).toBe(true);
    expect(canMarkManuallySigned("SENT")).toBe(true);
    expect(canAcceptOnline("SIGNED")).toBe(false);
    expect(canMarkManuallySigned("SIGNED")).toBe(false);
  });
});
