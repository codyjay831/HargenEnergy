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
    name: "Light Support",
    hours: "2 hours per week",
    label: "For cleanup",
    labelClass: "text-stone-600 bg-stone-100 border-stone-200",
    description:
      "Small backlogs, a few stuck jobs, or occasional permit and utility follow-up.",
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
    name: "Core Support",
    hours: "5 hours per week",
    label: "Most common",
    labelClass: "text-amber-800 bg-amber-50 border-amber-200",
    description:
      "Steady weekly help for companies with active pipelines and regular paperwork.",
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
    name: "Priority Support",
    hours: "10 hours per week",
    label: "For active pipelines",
    labelClass: "text-stone-600 bg-stone-100 border-stone-200",
    description:
      "Multiple crews and jobs moving at once. More room for daily follow-up and deeper cleanup.",
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
  body: "Blocks reserve time each week, not unlimited hours. If work exceeds your block, we prioritize what moves revenue and schedules first. Remaining items can roll to the next week or be approved as overflow.",
};
