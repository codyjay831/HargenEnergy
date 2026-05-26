export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary: boolean;
};

export type GoogleCalendarEventResult = {
  eventId: string;
  htmlLink: string | null;
  meetingUrl: string | null;
  meetingType: string;
};

export type GoogleFreeBusyInterval = {
  start: Date;
  end: Date;
};
