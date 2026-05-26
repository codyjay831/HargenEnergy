import "server-only";

import {
  WalkthroughAppointmentStatus,
  WalkthroughReminderChannel,
  WalkthroughReminderStatus,
  WalkthroughReminderType,
} from "@/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { sendWalkthroughReminderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sendSmsMessage } from "@/lib/sms";
import { getWalkthroughAvailabilitySettings } from "@/lib/walkthrough-scheduling/availability-settings";
import { isWalkthroughSchedulingEnabled } from "@/lib/walkthrough-scheduling/constants";

function reminderLabel(type: WalkthroughReminderType): string {
  switch (type) {
    case WalkthroughReminderType.CONFIRMATION:
      return "Walkthrough confirmed";
    case WalkthroughReminderType.TWENTY_FOUR_HOUR:
      return "Walkthrough tomorrow";
    case WalkthroughReminderType.ONE_HOUR:
      return "Walkthrough in one hour";
    default:
      return "Walkthrough reminder";
  }
}

function smsReminderBody(input: {
  contactName: string;
  companyName: string;
  startUtc: Date;
  timezone: string;
  meetingUrl: string | null;
  reminderLabel: string;
}): string {
  const when = formatInTimeZone(
    input.startUtc,
    input.timezone,
    "EEE MMM d 'at' h:mm a zzz",
  );
  const meeting = input.meetingUrl ? ` Join: ${input.meetingUrl}` : "";
  return `Hi ${input.contactName}, ${input.reminderLabel} for your Hargen Energy walkthrough (${input.companyName}) on ${when}.${meeting}`;
}

async function processReminderBatch(input: {
  channel: WalkthroughReminderChannel;
  now: Date;
  smsRemindersEnabled: boolean;
}) {
  const due = await prisma.walkthroughReminder.findMany({
    where: {
      status: WalkthroughReminderStatus.PENDING,
      channel: input.channel,
      scheduledFor: { lte: input.now },
    },
    include: {
      appointment: {
        include: { client: true },
      },
    },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of due) {
    const appointment = reminder.appointment;
    if (
      appointment.status === WalkthroughAppointmentStatus.CANCELED ||
      appointment.status === WalkthroughAppointmentStatus.COMPLETED ||
      appointment.status === WalkthroughAppointmentStatus.NO_SHOW
    ) {
      await prisma.walkthroughReminder.update({
        where: { id: reminder.id },
        data: { status: WalkthroughReminderStatus.SKIPPED },
      });
      skipped += 1;
      continue;
    }

    try {
      if (reminder.type === WalkthroughReminderType.CONFIRMATION) {
        await prisma.walkthroughReminder.update({
          where: { id: reminder.id },
          data: { status: WalkthroughReminderStatus.SENT, sentAt: input.now },
        });
        sent += 1;
        continue;
      }

      if (input.channel === WalkthroughReminderChannel.SMS) {
        if (!input.smsRemindersEnabled || !appointment.customerPhone?.trim()) {
          await prisma.walkthroughReminder.update({
            where: { id: reminder.id },
            data: { status: WalkthroughReminderStatus.SKIPPED },
          });
          skipped += 1;
          continue;
        }

        const result = await sendSmsMessage({
          to: appointment.customerPhone.trim(),
          body: smsReminderBody({
            contactName: appointment.customerContactName,
            companyName: appointment.client.companyName,
            startUtc: appointment.scheduledStartUtc,
            timezone: appointment.timezone,
            meetingUrl: appointment.meetingUrl,
            reminderLabel: reminderLabel(reminder.type),
          }),
          smsRemindersEnabled: input.smsRemindersEnabled,
        });

        if ("error" in result && result.error) {
          await prisma.walkthroughReminder.update({
            where: { id: reminder.id },
            data: { status: WalkthroughReminderStatus.FAILED, error: result.error },
          });
          failed += 1;
        } else {
          await prisma.walkthroughReminder.update({
            where: { id: reminder.id },
            data: { status: WalkthroughReminderStatus.SENT, sentAt: input.now },
          });
          sent += 1;
        }
        continue;
      }

      const result = await sendWalkthroughReminderEmail({
        to: appointment.customerEmail,
        contactName: appointment.customerContactName,
        companyName: appointment.client.companyName,
        appointmentId: appointment.id,
        schedulingLinkId: appointment.schedulingLinkId ?? appointment.id,
        startUtc: appointment.scheduledStartUtc,
        endUtc: appointment.scheduledEndUtc,
        timezone: appointment.timezone,
        meetingUrl: appointment.meetingUrl,
        reminderLabel: reminderLabel(reminder.type),
      });

      if ("error" in result && result.error) {
        await prisma.walkthroughReminder.update({
          where: { id: reminder.id },
          data: { status: WalkthroughReminderStatus.FAILED, error: result.error },
        });
        failed += 1;
      } else {
        await prisma.walkthroughReminder.update({
          where: { id: reminder.id },
          data: { status: WalkthroughReminderStatus.SENT, sentAt: input.now },
        });
        sent += 1;
      }
    } catch (error) {
      await prisma.walkthroughReminder.update({
        where: { id: reminder.id },
        data: {
          status: WalkthroughReminderStatus.FAILED,
          error: error instanceof Error ? error.message : "Reminder failed",
        },
      });
      failed += 1;
    }
  }

  return { processed: due.length, sent, failed, skipped };
}

export async function processWalkthroughReminders(now = new Date()) {
  const settings = await getWalkthroughAvailabilitySettings();
  const smsRemindersEnabled = Boolean(
    isWalkthroughSchedulingEnabled() && settings?.smsRemindersEnabled,
  );

  const email = await processReminderBatch({
    channel: WalkthroughReminderChannel.EMAIL,
    now,
    smsRemindersEnabled,
  });
  const sms = await processReminderBatch({
    channel: WalkthroughReminderChannel.SMS,
    now,
    smsRemindersEnabled,
  });

  return {
    processed: email.processed + sms.processed,
    sent: email.sent + sms.sent,
    failed: email.failed + sms.failed,
    skipped: email.skipped + sms.skipped,
  };
}
