import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Calendar, 
  MessageSquare, 
  ClipboardCheck, 
  Settings, 
  Database,
  ArrowRight
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const services = [
  {
    title: "Quote & Proposal Support",
    icon: FileText,
    description: "We help your sales team stay in the field by handling the technical quote and proposal building in the office.",
    items: [
      "Proposal generation in Aurora, Solo, or your preferred tool",
      "Drafting initial design layouts",
      "Price sheet validation",
      "Financing document preparation"
    ]
  },
  {
    title: "Scheduling & Job Coordination",
    icon: Calendar,
    description: "Keep your crews moving and your projects on schedule without the headache of constant phone tag.",
    items: [
      "Site assessment scheduling",
      "Installation crew coordination",
      "Inspection scheduling with local jurisdictions",
      "Service call coordination"
    ]
  },
  {
    title: "Customer Communication Support",
    icon: MessageSquare,
    description: "Professional, timely updates for homeowners that reduce anxiety and prevent 'where is my project?' calls.",
    items: [
      "Weekly project status updates",
      "Post-install follow-up calls",
      "Collecting missing documents from customers",
      "Handling basic inbound project inquiries"
    ]
  },
  {
    title: "Permit, Utility & Application Follow-up",
    icon: ClipboardCheck,
    description: "The biggest bottleneck in solar. We proactively push applications through the system so they don't sit idle.",
    items: [
      "Utility interconnection application submission",
      "Permit application tracking and follow-up",
      "PG&E / Utility deficiency resolution",
      "Incentive and rebate application support"
    ]
  },
  {
    title: "Enphase, Plan Set & Equipment Coordination",
    icon: Settings,
    description: "Technical back-office tasks that require attention to detail and specific platform knowledge.",
    items: [
      "Enphase Enlighten / monitoring setup",
      "Plan set coordination with engineers",
      "Equipment ordering and tracking",
      "RMA coordination for failed components"
    ]
  },
  {
    title: "CRM Cleanup & Back-office Organization",
    icon: Database,
    description: "Stop losing track of jobs. We keep your CRM updated so you have a clear view of your pipeline.",
    items: [
      "Stuck job follow-up and resolution",
      "CRM data entry and auditing",
      "Document organization and filing",
      "Basic reporting on project cycle times"
    ]
  }
];

export default function ServicesPage() {
  return (
    <div className="py-20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            Specialized Solar Operations Services
          </h1>
          <p className="text-xl text-muted-foreground">
            We don&apos;t just provide general virtual assistants. We provide a solar-specific operations desk that understands your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground mb-6">
                  {service.description}
                </p>
                <ul className="space-y-3">
                  {service.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-20 bg-slate-50 rounded-2xl p-8 md:p-12 border text-center">
          <h2 className="text-3xl font-bold mb-6">Need help with something else?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our support is flexible. If you have a specific back-office bottleneck that isn&apos;t listed here, tell us about it and we&apos;ll see if we can help.
          </p>
          <Link 
            href="/request-help" 
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Request Custom Support <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
