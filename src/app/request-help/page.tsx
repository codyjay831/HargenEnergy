import { RequestHelpForm } from "@/components/forms/RequestHelpForm";

export default function RequestHelpPage() {
  return (
    <div className="py-20 bg-slate-50 min-h-screen">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Request Solar Ops Support</h1>
            <p className="text-xl text-muted-foreground">
              Tell us where you&apos;re stuck, and we&apos;ll help you get moving.
            </p>
          </div>
          
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border">
            <RequestHelpForm />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-muted-foreground">
            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold text-slate-900 mb-2">What happens next?</h3>
              <p>
                Once you submit this form, we&apos;ll review your needs and check our current capacity. You&apos;ll hear from us within 24 hours to schedule a brief call or discuss the next steps via email.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border">
              <h3 className="font-bold text-slate-900 mb-2">No long-term commitment</h3>
              <p>
                Our support is designed to be flexible. You can start with a small block of time to see if we&apos;re a good fit, and scale up or down as your project volume changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
