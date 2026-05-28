export type SupportPlan = {
  id: "light" | "core" | "priority";
  name: string;
  hours: string;
  label: string;
  labelClass: string;
  description: string;
  items: string[];
  featured: boolean;
};

export const supportPlans: SupportPlan[] = [
  {
    id: "light",
    name: "Light Operations Support",
    hours: "2 hours per week",
    label: "For cleanup",
    labelClass: "text-stone-600 bg-stone-100 border-stone-200",
    description:
      "For a few stuck items, follow-ups, or small cleanup requests.",
    items: [
      "1-2 stuck jobs per week",
      "Occasional follow-up calls",
      "CRM cleanup batches",
      "Weekly capacity reserved in advance",
    ],
    featured: false,
  },
  {
    id: "core",
    name: "Steady Operations Support",
    hours: "5 hours per week",
    label: "Most common",
    labelClass: "text-amber-800 bg-amber-50 border-amber-200",
    description:
      "For recurring weekly help keeping permits, utility follow-up, customer updates, PTO, and active jobs moving.",
    items: [
      "Ongoing permit and utility tracking",
      "Customer communication on schedule",
      "CRM updates and job status hygiene",
      "Quote and proposal support as needed",
    ],
    featured: true,
  },
  {
    id: "priority",
    name: "Heavy Operations Support",
    hours: "10 hours per week",
    label: "For active pipelines",
    labelClass: "text-stone-600 bg-stone-100 border-stone-200",
    description:
      "For contractors with multiple active jobs, backlog cleanup, or ongoing operations coordination needs.",
    items: [
      "Multiple job pipelines at once",
      "More time for calls and resubmittals",
      "Stuck job resolution across stages",
      "Enphase and equipment setup support",
    ],
    featured: false,
  },
];

export const capacityNote = {
  title: "How capacity works",
  body: "Support levels reserve weekly operations capacity, not unlimited hours. If work exceeds your level, we prioritize what moves revenue and schedules first. Remaining items can roll to the next week or be approved as overflow.",
};
