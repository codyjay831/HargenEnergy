import { PRIVACY_LAST_UPDATED, PRIVACY_VERSION } from "@/lib/legal-versions";

export const metadata = {
  title: "Privacy Policy | Hargen Energy",
};

const SUPPORT_EMAIL = "support@hargenenergy.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last Updated: {PRIVACY_LAST_UPDATED} (Version: {PRIVACY_VERSION})
      </p>

      <p>
        Hargen Energy LLC (&ldquo;Hargen Energy,&rdquo; &ldquo;Hargen,&rdquo; &ldquo;we,&rdquo;
        &ldquo;our,&rdquo; or &ldquo;us&rdquo;) provides solar operations support, back-office
        project follow-through, document coordination, permit and utility support, customer update
        assistance, CRM cleanup, scheduling support, and related services for residential solar
        companies and contractors.
      </p>
      <p>
        This Privacy Policy explains how we collect, use, disclose, retain, and protect information
        when you visit our website, submit a request, communicate with us, use our client portal, or
        receive services from us.
      </p>
      <p>
        This Privacy Policy applies to information collected through{" "}
        <strong>hargenenergy.com</strong>, any Hargen Energy client portal or intake form, email
        communications, scheduling tools, payment flows, uploaded documents, and other service-related
        interactions.
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">1. Information We Collect</h2>
        <p>
          We collect information that is reasonably necessary to operate our business, respond to
          inquiries, provide requested services, manage client accounts, and protect the security of
          our systems.
        </p>

        <h3 className="text-base font-medium">A. Business Contact Information</h3>
        <p>We may collect business contact information, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name</li>
          <li>Company name</li>
          <li>Job title or role</li>
          <li>Business email address</li>
          <li>Business phone number</li>
          <li>Business address</li>
          <li>Website URL</li>
          <li>Contractor license information, where relevant</li>
          <li>Communication preferences</li>
          <li>Notes or information you provide during sales, onboarding, or support conversations</li>
        </ul>

        <h3 className="text-base font-medium">B. Client Account and Portal Information</h3>
        <p>If you create an account or use a Hargen Energy portal, we may collect:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Login credentials or authentication information</li>
          <li>Account role and permission level</li>
          <li>Company profile information</li>
          <li>Submitted work requests</li>
          <li>Uploaded files</li>
          <li>Internal notes related to your account or requested services</li>
          <li>Service history, support block usage, request status, and billing status</li>
          <li>Messages, comments, approvals, and instructions submitted through the portal</li>
        </ul>

        <h3 className="text-base font-medium">C. Project and Service Information</h3>
        <p>
          Because Hargen Energy provides solar operations support, clients may provide information
          related to solar projects, customer jobs, permits, utility applications, inspections,
          equipment, scheduling, and CRM records.
        </p>
        <p>This may include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Customer names and contact information</li>
          <li>Service addresses or project addresses</li>
          <li>Utility account information</li>
          <li>Permit documents</li>
          <li>Interconnection or PTO documents</li>
          <li>Plan sets, drawings, or engineering documents</li>
          <li>Inspection results, correction notices, or approval records</li>
          <li>Project photos</li>
          <li>Equipment information</li>
          <li>Inverter, battery, panel, monitoring, or warranty information</li>
          <li>Customer communication history</li>
          <li>CRM exports, spreadsheets, notes, or task lists</li>
          <li>Scheduling information, appointment windows, and access instructions</li>
          <li>Other documents or information needed to perform requested services</li>
        </ul>
        <p>
          We process this information to provide services requested by our business clients. When a
          contractor or solar company provides information about its own customers, employees,
          subcontractors, projects, or jobs, that contractor or solar company is responsible for
          ensuring it has the right to provide that information to Hargen Energy.
        </p>

        <h3 className="text-base font-medium">D. Payment and Billing Information</h3>
        <p>We may collect billing-related information, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Billing contact name</li>
          <li>Billing email address</li>
          <li>Company billing information</li>
          <li>Selected service plan, support block, or request type</li>
          <li>Payment status</li>
          <li>Invoice history</li>
          <li>Transaction records</li>
        </ul>
        <p>
          Payments may be processed by third-party payment processors. We do not intentionally store
          full credit card numbers or complete payment card credentials on our own systems.
        </p>

        <h3 className="text-base font-medium">E. Communications</h3>
        <p>We may collect information from communications with you, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Emails</li>
          <li>Contact form submissions</li>
          <li>Scheduling requests</li>
          <li>Meeting notes</li>
          <li>Support requests</li>
          <li>Phone call notes</li>
          <li>Text messages or other business communications, where applicable</li>
        </ul>

        <h3 className="text-base font-medium">F. Website, Device, and Usage Information</h3>
        <p>
          When you visit our website or use our online systems, we may collect limited technical
          information, including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device type</li>
          <li>Operating system</li>
          <li>Pages viewed</li>
          <li>Referring page or source</li>
          <li>Approximate location derived from IP address</li>
          <li>Date, time, and duration of visits</li>
          <li>Error logs or security logs</li>
          <li>Cookie or similar tracking information</li>
        </ul>
        <p>
          We use this information to operate the website, improve usability, understand how visitors
          find us, prevent abuse, and maintain security.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">2. How We Use Information</h2>
        <p>We use information for legitimate business and service purposes, including to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Respond to inquiries</li>
          <li>Schedule discovery calls or service meetings</li>
          <li>Evaluate whether Hargen Energy is a fit for requested support</li>
          <li>Create and manage client accounts</li>
          <li>Provide solar operations support</li>
          <li>Process submitted work requests</li>
          <li>Organize documents and project information</li>
          <li>
            Assist with permits, utilities, interconnection, PTO, CRM cleanup, scheduling, customer
            updates, equipment coordination, and related project-support work
          </li>
          <li>Track support block usage, request status, and service history</li>
          <li>
            Communicate with clients about open items, missing information, project status, billing,
            and account matters
          </li>
          <li>Prepare drafts, summaries, checklists, and service notes</li>
          <li>Process payments and invoices</li>
          <li>Improve our website, portal, workflows, and internal operations</li>
          <li>
            Detect, prevent, and respond to fraud, abuse, unauthorized access, and security incidents
          </li>
          <li>Comply with legal, tax, accounting, contractual, and regulatory obligations</li>
          <li>Enforce our agreements and protect our rights, clients, systems, and business</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">3. AI-Assisted Processing</h2>
        <p>
          Hargen Energy may use AI-assisted tools to help organize, summarize, extract, classify,
          draft, or review information submitted by clients. For example, AI-assisted tools may help
          us summarize project notes, identify missing information, organize uploaded files, draft
          customer updates, review permit or utility documents, or prepare internal task lists.
        </p>
        <p>
          AI-assisted tools are used to support service delivery and internal operations. We do not
          treat AI output as automatically final. Human review may be used before service-critical
          decisions, client-facing messages, or operational actions are completed.
        </p>
        <p>
          Clients should not submit unnecessary sensitive information, payment credentials, Social
          Security numbers, bank login credentials, or other information that is not required for the
          requested service. If sensitive information is accidentally submitted, we may delete,
          redact, or restrict it where practical.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">4. How We Share Information</h2>
        <p>We do not sell personal information.</p>
        <p>
          We may share information only as reasonably necessary for business operations, service
          delivery, legal compliance, security, or with your direction.
        </p>

        <h3 className="text-base font-medium">A. Service Providers and Subprocessors</h3>
        <p>
          We may share information with vendors that help us operate our business, including
          providers for:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Website hosting</li>
          <li>Cloud storage</li>
          <li>Authentication and account security</li>
          <li>Email delivery</li>
          <li>Scheduling</li>
          <li>Payment processing</li>
          <li>Analytics</li>
          <li>CRM or support tools</li>
          <li>Document management</li>
          <li>AI-assisted processing</li>
          <li>Security, logging, and monitoring</li>
          <li>Accounting, tax, or legal support</li>
        </ul>
        <p>
          These providers are authorized to use information only as needed to provide services to us
          or as otherwise permitted by law or their applicable service terms.
        </p>

        <h3 className="text-base font-medium">B. With Client Direction</h3>
        <p>
          If a client asks Hargen Energy to perform work involving third-party portals, utilities,
          building departments, AHJs, equipment platforms, CRM systems, subcontractors, drafting
          companies, engineering companies, or customer communications, we may use or disclose
          information as necessary to complete the requested work.
        </p>
        <p>
          Examples may include submitting information to a utility portal, preparing a permit package,
          coordinating with a building department, sending a customer update, organizing documents in
          a client&rsquo;s CRM, or communicating with a project-related party as directed by the
          client.
        </p>

        <h3 className="text-base font-medium">C. Legal, Safety, and Compliance Reasons</h3>
        <p>We may disclose information if we believe it is reasonably necessary to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Comply with law, regulation, subpoena, legal process, or government request</li>
          <li>Protect the rights, safety, property, or security of Hargen Energy, our clients, or others</li>
          <li>Investigate fraud, abuse, security incidents, or unauthorized activity</li>
          <li>Enforce our agreements</li>
          <li>Respond to claims or disputes</li>
          <li>Protect against legal liability</li>
        </ul>

        <h3 className="text-base font-medium">D. Business Transfers</h3>
        <p>
          If Hargen Energy is involved in a merger, acquisition, financing, sale of assets,
          reorganization, or similar business transaction, information may be transferred as part of
          that transaction, subject to reasonable confidentiality protections.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">5. Client-Provided Customer and Project Data</h2>
        <p>
          Hargen Energy often receives information from business clients about their own customers,
          projects, employees, subcontractors, vendors, or jobs.
        </p>
        <p>
          When we process that information, we generally do so to provide services requested by the
          business client. The business client remains responsible for:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Having the right to provide the information to Hargen Energy</li>
          <li>
            Giving any required notices to its own customers, employees, subcontractors, or other
            individuals
          </li>
          <li>Obtaining any required permissions or authorizations</li>
          <li>Ensuring that submitted information is accurate and appropriate for the requested work</li>
          <li>Avoiding submission of unnecessary sensitive information</li>
        </ul>
        <p>
          Hargen Energy is not responsible for the privacy practices of our clients, utilities, AHJs,
          CRMs, equipment platforms, payment processors, or other third-party systems that a client
          directs us to use.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">6. Cookies and Analytics</h2>
        <p>
          We may use cookies, analytics tools, log files, or similar technologies to operate our
          website, remember preferences, understand website traffic, improve our services, and protect
          against fraud or abuse.
        </p>
        <p>
          You may be able to disable cookies through your browser settings. Some website features may
          not function properly if cookies are disabled.
        </p>
        <p>
          We do not currently intend to sell personal information or share personal information for
          cross-context behavioral advertising. If this changes, we will update this Privacy Policy
          and provide any required choices.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">7. Data Retention</h2>
        <p>
          We keep information for as long as reasonably necessary for the purposes described in this
          Privacy Policy, including to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide services</li>
          <li>Maintain account records</li>
          <li>Track support history</li>
          <li>Complete requested work</li>
          <li>Resolve disputes</li>
          <li>Maintain business, tax, accounting, and legal records</li>
          <li>Enforce agreements</li>
          <li>Maintain security and fraud-prevention logs</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          Retention periods may vary depending on the type of information, the client relationship,
          the nature of the project, legal requirements, and operational needs.
        </p>
        <p>
          We may delete, archive, anonymize, or de-identify information when it is no longer
          reasonably needed.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">8. Security</h2>
        <p>
          We use reasonable technical, administrative, and organizational safeguards designed to
          protect information against unauthorized access, loss, misuse, alteration, or disclosure.
        </p>
        <p>
          Security measures may include access controls, role-based permissions, authentication
          controls, vendor security practices, secure storage systems, monitoring, and internal
          procedures.
        </p>
        <p>
          No website, portal, cloud system, email account, or internet-based service can be guaranteed
          to be completely secure. Clients are responsible for protecting their own login credentials,
          limiting access within their own teams, and avoiding submission of unnecessary sensitive
          information.
        </p>
        <p>
          If you believe information submitted to Hargen Energy has been accessed or used improperly,
          contact us immediately at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">9. Your Choices and Rights</h2>
        <p>
          Depending on where you live and the nature of your relationship with Hargen Energy, you may
          have rights to request access to, correction of, deletion of, or information about certain
          personal information we maintain.
        </p>
        <p>You may contact us to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Request access to personal information associated with you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of certain information</li>
          <li>Ask how information is used or shared</li>
          <li>Opt out of certain marketing communications</li>
          <li>Ask questions about this Privacy Policy</li>
        </ul>
        <p>
          We may need to verify your identity or authority before responding to a request. We may
          deny or limit a request where permitted by law, including where information must be retained
          for legal, security, accounting, dispute-resolution, service-delivery, or contractual
          reasons.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">10. California Privacy Notice</h2>
        <p>This section provides additional information for California residents.</p>
        <p>
          California privacy laws may provide certain rights regarding personal information, including
          the right to know, access, correct, delete, opt out of sale or sharing, limit certain uses
          of sensitive personal information, and not be discriminated against for exercising privacy
          rights.
        </p>

        <h3 className="text-base font-medium">Categories of Personal Information We May Collect</h3>
        <p>Depending on how you interact with us, we may collect the following categories of personal information:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Identifiers, such as name, email address, phone number, company name, business address,
            account identifiers, IP address, or online identifiers
          </li>
          <li>
            Commercial information, such as service selections, billing records, invoice history, and
            support history
          </li>
          <li>
            Internet or electronic activity information, such as website usage, device information,
            browser information, and log data
          </li>
          <li>
            Geolocation information, such as approximate location from IP address or service/project
            addresses submitted for work requests
          </li>
          <li>
            Professional or employment-related information, such as company role, job title,
            contractor information, or project responsibility
          </li>
          <li>
            Audio, electronic, or visual information, such as communications, uploaded photos, files, or
            meeting notes
          </li>
          <li>
            Sensitive personal information, if submitted by a client or necessary for a requested
            service, such as account details contained in utility documents or precise service address
            information
          </li>
          <li>
            Inferences, such as service needs, account status, or workflow recommendations based on
            submitted information
          </li>
        </ul>

        <h3 className="text-base font-medium">Sources of Personal Information</h3>
        <p>We may collect personal information from:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You directly</li>
          <li>Your company or employer</li>
          <li>Your authorized representatives</li>
          <li>Client-submitted documents or files</li>
          <li>Publicly available business sources</li>
          <li>Website and portal activity</li>
          <li>Payment, scheduling, hosting, communication, analytics, and other service providers</li>
          <li>Third-party systems you direct us to use</li>
        </ul>

        <h3 className="text-base font-medium">Business Purposes for Collection and Use</h3>
        <p>
          We collect and use personal information for the business purposes described in this Privacy
          Policy, including service delivery, account management, billing, communications, security,
          compliance, analytics, and internal operations.
        </p>

        <h3 className="text-base font-medium">Sale or Sharing of Personal Information</h3>
        <p>We do not sell personal information.</p>
        <p>
          We do not intend to share personal information for cross-context behavioral advertising. If
          our practices change, we will update this Privacy Policy and provide any required opt-out
          rights.
        </p>

        <h3 className="text-base font-medium">Sensitive Personal Information</h3>
        <p>
          We do not use sensitive personal information to infer characteristics about individuals. We
          use sensitive personal information only as reasonably necessary to provide requested
          services, maintain security, comply with law, or for other purposes permitted by applicable
          law.
        </p>

        <h3 className="text-base font-medium">California Privacy Requests</h3>
        <p>California residents may submit privacy requests by contacting us at:</p>
        <p>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>
          We may verify your identity before fulfilling a request. Authorized agents may submit
          requests where permitted by law, but we may require proof of authorization.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">11. Marketing Communications</h2>
        <p>
          We may send business-related emails, service updates, scheduling messages, account notices,
          or marketing communications.
        </p>
        <p>
          You may opt out of marketing emails by following the unsubscribe instructions in the email or
          contacting us. Even if you opt out of marketing communications, we may still send
          non-marketing messages related to active services, billing, security, legal notices, or
          account administration.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">12. Third-Party Websites and Services</h2>
        <p>
          Our website, portal, emails, or services may link to or interact with third-party websites,
          platforms, portals, utilities, payment processors, CRMs, scheduling tools, AHJ portals,
          equipment platforms, or other services.
        </p>
        <p>
          We are not responsible for the privacy practices, security, content, or terms of third-party
          services. Your use of third-party services may be governed by their own privacy policies and
          terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">13. Children&rsquo;s Privacy</h2>
        <p>
          Hargen Energy provides business-to-business services and does not knowingly collect personal
          information from children under 13. If we learn that we have collected personal information
          from a child under 13 without appropriate consent, we will take reasonable steps to delete
          it.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">14. International Users</h2>
        <p>
          Hargen Energy is based in the United States. If you access our website or services from
          outside the United States, you understand that your information may be processed and stored
          in the United States or other locations where our service providers operate.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">15. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The updated version will be posted on
          this page with a new &ldquo;Last Updated&rdquo; date. If changes are material, we may
          provide additional notice where appropriate.
        </p>
        <p>
          Your continued use of our website, portal, or services after an updated Privacy Policy is
          posted means the updated policy applies going forward.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">16. Contact Us</h2>
        <p>For questions about this Privacy Policy or to submit a privacy request, contact us at:</p>
        <p>
          <strong>Hargen Energy LLC</strong>
          <br />
          <strong>Email:</strong>{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          <br />
          <strong>Website:</strong> hargenenergy.com
        </p>
      </section>
    </main>
  );
}
