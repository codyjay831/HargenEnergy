import "server-only";

import {
  DiscoveryAppointmentStatus,
  DiscoveryReminderChannel,
  DiscoveryReminderStatus,
  DiscoveryReminderType,
} from "@/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { sendDiscoveryReminderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sendSmsMessage } from "@/lib/sms";
import { getDiscoveryAvailabilitySettings } from "@/lib/discovery-scheduling/availability-settings";
import { isDiscoverySchedulingEnabled } from "@/lib/discovery-scheduling/constants";

function reminderLabel(type: DiscoveryReminderType): string {
  switch (type) {
    case DiscoveryReminderType.CONFIRMATION:
      return "Discovery confirmed";
    case DiscoveryReminderType.TWENTY_FOUR_HOUR:
      return "Discovery tomorrow";
    case DiscoveryReminderType.ONE_HOUR:
      return "Discovery in one hour";
    default:
      return "Discovery reminder";
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
  return `Hi ${input.contactName}, ${input.reminderLabel} for your Hargen Energy discovery (${input.companyName}) on ${when}.${meeting}`;
}

async function processReminderBatch(input: {
  channel: DiscoveryReminderChannel;
  now: Date;
  smsRemindersEnabled: boolean;
}) {
  const due = await prisma.discoveryReminder.findMany({
    where: {
      status: DiscoveryReminderStatus.PENDING,
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
      appointment.status === DiscoveryAppointmentStatus.CANCELED ||
      appointment.status === DiscoveryAppointmentStatus.COMPLETED ||
      appointment.status === DiscoveryAppointmentStatus.NO_SHOW
    ) {
      await prisma.discoveryReminder.update({
        where: { id: reminder.id },
        data: { status: DiscoveryReminderStatus.SKIPPED },
      });
      skipped += 1;
      continue;
    }

    try {
      if (reminder.type === DiscoveryReminderType.CONFIRMATION) {
        await prisma.discoveryReminder.update({
          where: { id: reminder.id },
          data: { status: DiscoveryReminderStatus.SENT, sentAt: input.now },
        });
        sent += 1;
        continue;
      }

      if (input.channel === DiscoveryReminderChannel.SMS) {
        if (!input.smsRemindersEnabled || !appointment.customerPhone?.trim()) {
          await prisma.discoveryReminder.update({
            where: { id: reminder.id },
            data: { status: DiscoveryReminderStatus.SKIPPED },
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
          await prisma.discoveryReminder.update({
            where: { id: reminder.id },
            data: { status: DiscoveryReminderStatus.FAILED, error: result.error },
          });
          failed += 1;
        } else {
          await prisma.discoveryReminder.update({
            where: { id: reminder.id },
            data: { status: DiscoveryReminderStatus.SENT, sentAt: input.now },
          });
          sent += 1;
        }
        continue;
      }

      const result = await sendDiscoveryReminderEmail({
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
        await prisma.discoveryReminder.update({
          where: { id: reminder.id },
          data: { status: DiscoveryReminderStatus.FAILED, error: result.error },
        });
        failed += 1;
      } else {
        await prisma.discoveryReminder.update({
          where: { id: reminder.id },
          data: { status: DiscoveryReminderStatus.SENT, sentAt: input.now },
        });
        sent += 1;
      }
    } catch (error) {
      await prisma.discoveryReminder.update({
        where: { id: reminder.id },
        data: {
          status: DiscoveryReminderStatus.FAILED,
          error: error instanceof Error ? error.message : "Reminder failed",
        },
      });
      failed += 1;
    }
  }

  return { processed: due.length, sent, failed, skipped };
}

export async function processDiscoveryReminders(now = new Date()) {
  const settings = await getDiscoveryAvailabilitySettings();
  const smsRemindersEnabled = Boolean(
    isDiscoverySchedulingEnabled() && settings?.smsRemindersEnabled,
  );

  const email = await processReminderBatch({
    channel: DiscoveryReminderChannel.EMAIL,
    now,
    smsRemindersEnabled,
  });
  const sms = await processReminderBatch({
    channel: DiscoveryReminderChannel.SMS,
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
