import { TERMS_LAST_UPDATED, TERMS_VERSION } from "@/lib/legal-versions";

export const metadata = {
  title: "Terms of Service | Hargen Energy",
};

const SUPPORT_EMAIL = "support@hargenenergy.com";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Last Updated: {TERMS_LAST_UPDATED} (Version: {TERMS_VERSION})
      </p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the website,
        portal, intake forms, account tools, communications, and related online services provided by{" "}
        <strong>Hargen Energy LLC</strong> (&ldquo;Hargen Energy,&rdquo; &ldquo;Hargen,&rdquo;
        &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;).
      </p>
      <p>
        Hargen Energy provides business-to-business solar operations support services for
        residential solar companies, contractors, and related businesses. These services may include
        project follow-through, permit support, utility and interconnection support, PTO follow-up,
        CRM cleanup, document organization, scheduling support, customer update assistance, quote or
        proposal support, equipment coordination, and other scoped back-office or operations support
        services.
      </p>
      <p>
        By accessing our website, submitting a request, creating an account, using our portal,
        approving a scope of work, or otherwise using our services, you agree to these Terms.
      </p>
      <p>
        If you are using Hargen Energy on behalf of a company or other organization, you represent
        that you have authority to bind that company or organization to these Terms.
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">1. Business-to-Business Services</h2>
        <p>
          Hargen Energy provides services to businesses, not to homeowners or general consumers.
        </p>
        <p>
          Our services are intended for solar contractors, residential solar companies, project
          managers, office teams, and related business users who need support with solar operations,
          documentation, follow-up, scheduling, customer communication, and project administration.
        </p>
        <p>
          Hargen Energy is not acting as the homeowner&rsquo;s contractor, salesperson, financial
          advisor, legal advisor, tax advisor, engineer, utility representative, AHJ representative,
          or permit authority. Unless specifically agreed in a separate written agreement, Hargen
          Energy does not act as the contractor of record, installer of record, engineer of record,
          or permit holder for any project.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          2. Relationship to Client Agreements and Scopes of Work
        </h2>
        <p>
          These Terms govern general website, portal, account, intake, and service-access use.
        </p>
        <p>Specific paid services may also be governed by one or more separate documents, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Client Services Agreement</li>
          <li>Master Services Agreement</li>
          <li>Statement of Work</li>
          <li>Support Block Agreement</li>
          <li>Request-Based Work Authorization</li>
          <li>Payment authorization</li>
          <li>Written email approval</li>
          <li>Portal approval</li>
          <li>Other signed or electronically accepted service terms</li>
        </ul>
        <p>
          If there is a conflict between these Terms and a signed or electronically accepted client
          agreement, statement of work, or work authorization, the more specific client agreement or
          scope document will control for that specific service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">3. Account Access and Authorized Users</h2>
        <p>If you receive access to a Hargen Energy portal or account, you are responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Keeping login credentials secure</li>
          <li>Limiting access to authorized users only</li>
          <li>
            Ensuring users are permitted to submit work, upload files, approve requests, and
            communicate on behalf of your company
          </li>
          <li>Promptly notifying Hargen Energy if access should be removed or changed</li>
          <li>Promptly notifying Hargen Energy of suspected unauthorized access or misuse</li>
        </ul>
        <p>
          You are responsible for activity conducted through your account or by users acting under
          your company&rsquo;s account.
        </p>
        <p>
          Hargen Energy may suspend or restrict access if we believe an account is being misused,
          compromised, used unlawfully, used to submit harmful content, or used in a way that creates
          security, legal, payment, or operational risk.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">4. Client Responsibilities</h2>
        <p>
          You are responsible for the information, documents, instructions, approvals, and access
          you provide to Hargen Energy.
        </p>
        <p>You agree that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Information submitted to Hargen Energy will be accurate to the best of your knowledge</li>
          <li>
            You have the right to provide submitted information, documents, photos, customer data,
            project data, and account access
          </li>
          <li>You will not submit information you are not authorized to disclose</li>
          <li>
            You will provide required approvals, missing information, corrections, and clarifications
            in a timely manner
          </li>
          <li>
            You will review work product, drafts, submissions, summaries, and communications where
            review is requested or reasonably required
          </li>
          <li>You will not ask Hargen Energy to perform unlawful, deceptive, unsafe, or unauthorized work</li>
          <li>
            You remain responsible for your own customer relationships, contractor obligations,
            license obligations, project obligations, job files, utility requirements, AHJ
            requirements, and business decisions
          </li>
        </ul>
        <p>
          Hargen Energy may rely on the information, documents, instructions, and approvals you
          provide.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">5. Submitted Information, Files, and Project Materials</h2>
        <p>
          You may submit or provide access to documents and information related to solar projects,
          customers, permits, utilities, inspections, equipment, CRMs, scheduling, communications,
          billing, and other business operations.
        </p>
        <p>
          This may include customer names, addresses, phone numbers, emails, utility documents, permit
          documents, plan sets, inspection records, photos, job notes, CRM records, spreadsheets,
          correction notices, equipment information, and other project materials.
        </p>
        <p>
          You retain ownership of your submitted materials. You grant Hargen Energy a limited right to
          access, use, process, copy, store, transmit, organize, summarize, and disclose submitted
          materials as reasonably necessary to provide requested services, operate our business,
          maintain records, comply with law, protect our systems, and enforce our agreements.
        </p>
        <p>
          You are responsible for ensuring submitted materials are appropriate, accurate, authorized,
          and necessary for the requested service.
        </p>
        <p>
          Do not submit unnecessary sensitive information, bank login credentials, Social Security
          numbers, personal financial credentials, medical information, or unrelated private
          information.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">6. Use of Third-Party Systems</h2>
        <p>
          Many solar operations tasks involve third-party systems, including utility portals, AHJ
          portals, permit portals, CRM systems, email systems, file storage systems, equipment
          platforms, scheduling tools, payment processors, design tools, engineering firms, drafting
          companies, subcontractors, and customer communication platforms.
        </p>
        <p>
          When you direct Hargen Energy to use a third-party system, submit information to a third
          party, communicate with a third party, or access a third-party account, you represent that
          you have authority to do so.
        </p>
        <p>Hargen Energy is not responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Utility delays</li>
          <li>AHJ delays</li>
          <li>Permit review timelines</li>
          <li>Inspection outcomes</li>
          <li>Utility application outcomes</li>
          <li>PTO approval timing</li>
          <li>Third-party portal outages</li>
          <li>CRM errors or restrictions</li>
          <li>Inaccurate third-party records</li>
          <li>Changes in third-party requirements</li>
          <li>
            Rejections caused by incomplete, inaccurate, outdated, or inconsistent client-provided
            information
          </li>
          <li>
            Acts or omissions of utilities, AHJs, inspectors, equipment manufacturers, CRMs,
            subcontractors, engineering firms, drafting companies, or other third parties
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">7. No Guaranteed Approvals, Timelines, or Outcomes</h2>
        <p>
          Hargen Energy provides support, follow-through, coordination, documentation, organization,
          and administrative assistance. We do not guarantee:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Permit approval</li>
          <li>Utility approval</li>
          <li>Interconnection approval</li>
          <li>PTO approval</li>
          <li>Inspection pass results</li>
          <li>Rebate approval</li>
          <li>Program eligibility</li>
          <li>Specific AHJ or utility processing timelines</li>
          <li>Customer payment</li>
          <li>Customer approval</li>
          <li>Customer responsiveness</li>
          <li>CRM accuracy</li>
          <li>Project completion date</li>
          <li>Any business result, revenue result, or operational outcome</li>
        </ul>
        <p>
          Any turnaround times, response targets, or completion estimates are estimates only unless a
          signed agreement expressly states otherwise.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">8. Service Requests, Support Blocks, and Work Authorization</h2>
        <p>
          Hargen Energy may provide services through support blocks, request-based work, scoped
          service packages, custom scopes, or other agreed service arrangements.
        </p>
        <p>
          Work may begin after the applicable scope, payment terms, client responsibilities, and
          access requirements have been accepted.
        </p>
        <p>Hargen Energy may decline, pause, or rescope work if:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Required information is missing</li>
          <li>Required access is unavailable</li>
          <li>The request is outside the agreed scope</li>
          <li>The request requires specialized professional review</li>
          <li>The request creates legal, security, ethical, licensing, payment, or operational concerns</li>
          <li>The request depends on third-party action outside Hargen Energy&rsquo;s control</li>
          <li>The client account is past due</li>
          <li>The client fails to provide needed approvals or instructions</li>
        </ul>
        <p>
          Unless otherwise agreed in writing, unused time, support blocks, request credits, billing
          cycles, cancellation terms, and refund terms are governed by the applicable client
          agreement, support block agreement, statement of work, order form, invoice, or payment
          authorization.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">9. Payment and Billing</h2>
        <p>
          Fees, billing schedules, payment methods, renewal terms, support block amounts, request
          fees, deposits, late fees, cancellation terms, and refund terms are stated in the applicable
          client agreement, order form, invoice, checkout page, payment authorization, or statement of
          work.
        </p>
        <p>You agree to pay all amounts owed under the applicable billing terms.</p>
        <p>
          If payment is late, declined, disputed, reversed, or not received, Hargen Energy may pause
          work, restrict portal access, withhold non-critical deliverables, suspend services, or
          terminate the account, subject to applicable law and any signed agreement.
        </p>
        <p>
          You are responsible for any taxes, payment processor fees, chargeback costs, collection
          costs, or other amounts described in the applicable agreement or invoice.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">10. Client Approvals and Communications</h2>
        <p>
          Hargen Energy may prepare drafts, summaries, customer updates, permit-support materials,
          utility-support materials, CRM updates, task lists, emails, or other work product.
        </p>
        <p>
          Where approval is requested or reasonably required, you are responsible for reviewing and
          approving the work before it is sent, submitted, relied upon, or treated as final.
        </p>
        <p>
          If you authorize Hargen Energy to send communications, submit documents, update records, or
          interact with third parties on your behalf, Hargen Energy may rely on that authorization.
        </p>
        <p>
          Hargen Energy is not responsible for errors caused by inaccurate, incomplete, outdated, or
          unauthorized client instructions or source documents.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">11. AI-Assisted Tools</h2>
        <p>
          Hargen Energy may use AI-assisted tools to help with internal operations and client service
          delivery, including organizing documents, summarizing project notes, drafting messages,
          identifying missing information, preparing task lists, classifying work requests, or
          reviewing uploaded materials.
        </p>
        <p>
          AI-assisted tools are used to support, not replace, business judgment. Hargen Energy may
          review AI-assisted outputs before using them for client-facing, service-critical, or
          operationally important work.
        </p>
        <p>
          You agree not to submit confidential, sensitive, regulated, or unnecessary information
          unless it is needed for the requested service and you are authorized to provide it.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">12. Acceptable Use</h2>
        <p>
          You agree not to use Hargen Energy&rsquo;s website, portal, forms, or services to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Violate any law, regulation, contract, license requirement, or third-party right</li>
          <li>Submit false, misleading, fraudulent, or unauthorized information</li>
          <li>Upload malware, malicious code, harmful files, or abusive content</li>
          <li>Attempt to access systems, accounts, data, or files without authorization</li>
          <li>Interfere with website, portal, or service operation</li>
          <li>Reverse engineer, scrape, overload, attack, or misuse Hargen Energy systems</li>
          <li>Impersonate another person or company</li>
          <li>Submit information you do not have permission to provide</li>
          <li>Use Hargen Energy to send spam, deceptive communications, or unlawful messages</li>
          <li>
            Request work that would require Hargen Energy to misrepresent facts, forge documents, hide
            material information, or submit knowingly inaccurate information
          </li>
        </ul>
        <p>Hargen Energy may suspend or terminate access for violations of this section.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">13. Confidentiality</h2>
        <p>
          Each party may receive confidential or business-sensitive information from the other party.
        </p>
        <p>
          Confidential information may include client records, customer information, project files,
          pricing, workflows, business processes, login access, documents, internal notes,
          communications, and non-public business information.
        </p>
        <p>
          Each party agrees to use reasonable care to protect the other party&rsquo;s confidential
          information and to use it only for the purpose of the business relationship, service
          delivery, legal compliance, security, or as otherwise authorized.
        </p>
        <p>
          Confidentiality obligations do not apply to information that is publicly available,
          independently developed without use of confidential information, lawfully received from
          another source, or required to be disclosed by law.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">14. Privacy</h2>
        <p>
          Hargen Energy&rsquo;s collection and use of personal information is described in our Privacy
          Policy.
        </p>
        <p>
          By using our website, portal, forms, or services, you acknowledge that information may be
          collected, used, processed, stored, and shared as described in the Privacy Policy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">15. Intellectual Property</h2>
        <p>
          Hargen Energy owns its website, portal, workflows, templates, service processes, internal
          tools, text, designs, trade names, logos, business methods, AI-assisted workflows, and other
          intellectual property, except for materials owned by clients or third parties.
        </p>
        <p>
          You may not copy, reproduce, modify, distribute, sell, exploit, or create derivative works
          from Hargen Energy materials without written permission.
        </p>
        <p>
          You retain ownership of materials you submit to Hargen Energy. Hargen Energy may use
          submitted materials only as described in these Terms, the Privacy Policy, and applicable
          client agreements.
        </p>
        <p>
          Unless otherwise agreed in writing, work product created specifically for a client may be
          used by that client for its internal business purposes after all applicable fees have been
          paid.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">16. Feedback</h2>
        <p>
          If you provide suggestions, ideas, requests, improvements, or feedback about Hargen
          Energy&rsquo;s website, portal, workflows, services, or business processes, you grant Hargen
          Energy the right to use that feedback without restriction or compensation.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">17. Disclaimers</h2>
        <p>
          Hargen Energy provides its website, portal, intake tools, communications, and services on an
          &ldquo;as available&rdquo; basis.
        </p>
        <p>
          To the maximum extent permitted by law, Hargen Energy disclaims all warranties, express or
          implied, including warranties of merchantability, fitness for a particular purpose,
          non-infringement, uninterrupted operation, error-free operation, and any warranty arising
          from course of dealing or usage of trade.
        </p>
        <p>
          Hargen Energy does not guarantee that the website, portal, services, third-party systems,
          files, communications, or work product will be uninterrupted, error-free, secure, accepted
          by third parties, or achieve any particular result.
        </p>
        <p>
          Some jurisdictions do not allow certain warranty disclaimers, so some disclaimers may not
          apply to you.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">18. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Hargen Energy will not be liable for indirect,
          incidental, consequential, special, exemplary, punitive, or lost-profit damages, including
          loss of revenue, loss of business, loss of goodwill, project delay, customer dispute, lost
          opportunity, data loss, or third-party platform issue, even if Hargen Energy has been
          advised of the possibility of such damages.
        </p>
        <p>
          To the maximum extent permitted by law, Hargen Energy&rsquo;s total liability for any claim
          arising out of or related to these Terms, the website, the portal, or services will not
          exceed the amounts paid by the client to Hargen Energy for the specific service giving rise
          to the claim during the three months before the event giving rise to the claim.
        </p>
        <p>
          The limitations in this section apply to all theories of liability, including contract,
          tort, negligence, strict liability, warranty, statute, and otherwise, to the maximum extent
          permitted by law.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations of liability, so some limitations may
          not apply.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">19. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless Hargen Energy, its owners, employees,
          contractors, representatives, service providers, and affiliates from and against claims,
          damages, losses, liabilities, costs, and expenses, including reasonable attorneys&rsquo;
          fees, arising out of or related to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your use of the website, portal, or services</li>
          <li>Your submitted information, documents, instructions, or approvals</li>
          <li>Your breach of these Terms or any client agreement</li>
          <li>Your violation of law or third-party rights</li>
          <li>Unauthorized account access caused by your failure to secure credentials</li>
          <li>
            Claims from your customers, employees, subcontractors, vendors, utilities, AHJs, or other
            third parties relating to work requested by you
          </li>
          <li>Inaccurate, incomplete, outdated, or unauthorized information provided by you</li>
          <li>Your misuse of Hargen Energy services or systems</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">20. Suspension and Termination</h2>
        <p>
          Hargen Energy may suspend or terminate access to the website, portal, account, or services
          if:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You violate these Terms</li>
          <li>You violate a client agreement</li>
          <li>Payment is overdue, declined, disputed, or reversed</li>
          <li>Required information, access, or approvals are not provided</li>
          <li>Continued service creates legal, security, ethical, operational, or payment risk</li>
          <li>We suspect fraud, abuse, unauthorized access, or system misuse</li>
          <li>We discontinue or modify a service offering</li>
        </ul>
        <p>
          Termination does not eliminate payment obligations, confidentiality obligations, liability
          limitations, indemnity obligations, or other terms that by their nature should survive
          termination.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">21. Electronic Records and Acceptance</h2>
        <p>
          You agree that agreements, approvals, authorizations, notices, records, signatures, checkbox
          confirmations, portal approvals, email approvals, and other communications may be provided
          electronically.
        </p>
        <p>
          You agree that electronic acceptance may have the same legal effect as a handwritten
          signature where permitted by law.
        </p>
        <p>
          You are responsible for keeping copies of agreements, invoices, approvals, and service
          records for your own records.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">22. Governing Law and Venue</h2>
        <p>
          These Terms are governed by the laws of the State of California, without regard to
          conflict-of-law rules.
        </p>
        <p>
          Unless a separate signed agreement states otherwise, any dispute arising out of or related to
          these Terms, the website, the portal, or services will be brought in the state or federal
          courts located in California, and each party consents to personal jurisdiction and venue in
          those courts.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">23. Changes to These Terms</h2>
        <p>
          Hargen Energy may update these Terms from time to time. The updated Terms will be posted on
          this page with a new &ldquo;Last Updated&rdquo; date.
        </p>
        <p>
          Changes apply going forward after they are posted, unless otherwise required by law or stated
          in a separate agreement.
        </p>
        <p>
          For active paid services, material changes to service-specific terms will not override an
          existing signed agreement or statement of work unless the parties agree or the agreement
          allows the change.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">24. Miscellaneous</h2>
        <p>
          If any part of these Terms is found unenforceable, the remaining parts will remain in
          effect.
        </p>
        <p>
          Hargen Energy&rsquo;s failure to enforce any provision does not waive our right to enforce
          it later.
        </p>
        <p>
          You may not assign your rights or obligations under these Terms without Hargen Energy&rsquo;s
          written consent. Hargen Energy may assign these Terms in connection with a merger,
          acquisition, sale of assets, reorganization, or business transfer.
        </p>
        <p>
          These Terms, together with the Privacy Policy and any applicable client agreement,
          statement of work, invoice, payment authorization, or work authorization, form the agreement
          between you and Hargen Energy regarding the applicable use or service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">25. Contact</h2>
        <p>For legal notices, account questions, or contractual questions, contact:</p>
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
