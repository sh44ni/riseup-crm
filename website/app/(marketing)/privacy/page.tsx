import type { Metadata } from 'next';
import { Section } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { buildMetadata } from '@/lib/seo/metadata';
import { COMPANY_NAME, LICENSE_NUMBER, PHONE_NUMBER, PHONE_HREF } from '@/lib/utils';
import Link from 'next/link';
import { Icon } from '@/components/shared/Icon';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy | Rise Up Roofing & Construction',
  description: `Learn how ${COMPANY_NAME} protects, collects, and manages homeowner information gathered through estimate requests, contact forms, and website analytics.`,
  path: '/privacy',
});

export default function PrivacyPolicyPage() {
  return (
    <Section alternate={false} className="pt-32 sm:pt-36 pb-20">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />

      <SectionHeading
        as="h1"
        label="Privacy & Transparency"
        title="Privacy Policy"
        subtitle={`Effective Date: January 1, 2025 • Last Updated: September 2026. Your privacy is paramount. This policy describes our practices regarding information collected through ${COMPANY_NAME}.`}
      />

      <div className="max-w-4xl mx-auto space-y-8 text-slate-700">
        {/* Intro Highlight Box */}
        <div className="glass-card-hero rounded-2xl p-6 sm:p-8 border border-slate-200/80 bg-blue-50/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center flex-shrink-0">
              <Icon name="lock" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Our Commitment to Homeowner Privacy</h2>
              <p className="text-xs text-slate-500">Zero Selling of Personal Data • California Consumer Privacy Compliance</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            {COMPANY_NAME} (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) values your trust. We are committed to protecting the personally identifiable information you share with us when requesting roof inspections, itemized estimates, or navigating our website. We do not sell, rent, or trade client contact details to third-party telemarketers or lead generation brokers.
          </p>
        </div>

        {/* Section 1 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed">
            We collect personal information that you voluntarily provide to us when interacting with our digital estimate forms, scheduling inspection visits, or communicating with our dispatch desk. This information includes:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li><strong>Contact Details:</strong> Full name, telephone number, and email address.</li>
            <li><strong>Property Information:</strong> Physical street address, city, ZIP code, and notes regarding roof age, leak locations, architectural style, or project goals.</li>
            <li><strong>Communication Records:</strong> Records of telephone calls, SMS dispatch confirmations, emails, and consultation notes.</li>
            <li><strong>Automated Analytics Data:</strong> When you browse our website, we may collect non-identifying technical data including IP addresses, browser types, referring URLs, campaign source tags (UTM parameters), scroll depth, and interaction metrics to optimize site performance and responsiveness.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
          <p className="text-sm leading-relaxed">
            The information collected from homeowners and commercial property managers is used strictly for legitimate construction contracting and client service purposes, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>Scheduling physical roof assessments, leak diagnostics, and digital roof measurement reports.</li>
            <li>Preparing detailed, itemized bids, architectural estimates, and contract proposals.</li>
            <li>Communicating project updates, crew arrival windows, material deliveries, and permitting milestones.</li>
            <li>Processing Owens Corning non-prorated warranty registrations and CSLB compliance records.</li>
            <li>Analyzing website performance to improve page loading speeds, accessibility, and user navigation.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Third-Party Disclosures &amp; Service Providers</h2>
          <p className="text-sm leading-relaxed">
            {COMPANY_NAME} does not sell, license, or monetize your personal information under any circumstance. We disclose necessary data only to vetted service partners who perform operational functions on our behalf under strict confidentiality obligations:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li><strong>Technology Infrastructure:</strong> Cloud hosting, database management, and web analytics tools (e.g., Google Analytics).</li>
            <li><strong>Communication Platforms:</strong> Secure SMS and email dispatch providers utilized exclusively to send estimate confirmations and inspection appointments.</li>
            <li><strong>Manufacturer &amp; Municipal Partners:</strong> Material suppliers (such as Owens Corning for extended warranty registration) and local municipal building departments when submitting mandatory roofing permits.</li>
            <li><strong>Legal &amp; Regulatory Compliance:</strong> When required by court subpoena, California law, or Contractors State License Board regulatory inquiries.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Cookies, Analytics &amp; Tracking Technologies</h2>
          <p className="text-sm leading-relaxed">
            Our website uses standard HTTP cookies and session storage to remember user preferences, preserve form progress, and analyze aggregate visitor traffic. You can choose to disable cookies through your individual browser settings; however, certain interactive website features, such as preliminary estimate calculators, may have reduced functionality.
          </p>
        </div>

        {/* Section 5 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Data Security &amp; Retention</h2>
          <p className="text-sm leading-relaxed">
            We implement industry-standard administrative, technical, and physical safeguards designed to protect personal information against unauthorized access, loss, or alteration. All web transmissions are encrypted via Transport Layer Security (TLS/HTTPS). Client project records and warranty documentation are retained in accordance with California statutory construction documentation standards.
          </p>
        </div>

        {/* Section 6 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">6. California Privacy Rights (CCPA/CPRA)</h2>
          <p className="text-sm leading-relaxed">
            Under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA), California residents are entitled to specific rights regarding their personal data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li><strong>Right to Know:</strong> You may request disclosure of the specific categories and pieces of personal information we have collected about you over the preceding 12 months.</li>
            <li><strong>Right to Delete:</strong> You may request deletion of personal information collected from you, subject to legal and construction warranty retention requirements.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will never discriminate against you, deny services, or alter estimate pricing for exercising your privacy rights.</li>
          </ul>
        </div>

        {/* Section 7 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200/80 space-y-3">
          <h2 className="text-xl font-bold text-slate-900">7. How to Submit a Privacy Request</h2>
          <p className="text-sm leading-relaxed">
            To submit a request to review, update, or delete your contact information, or if you have questions regarding this Privacy Policy, please contact our administrative office:
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-900">{COMPANY_NAME}</p>
              <p className="text-slate-600">Attn: Privacy Compliance</p>
              <p className="text-slate-600">2182 S El Camino Real</p>
              <p className="text-slate-600">Oceanside, CA 92054</p>
              <p className="text-slate-500 mt-1">CSLB Lic #{LICENSE_NUMBER}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2">
                <Icon name="phone" className="w-3.5 h-3.5 text-brand-blue" />
                <a href={PHONE_HREF} className="font-bold text-brand-blue hover:underline">{PHONE_NUMBER}</a>
              </p>
              <p className="flex items-center gap-2">
                <Icon name="mail" className="w-3.5 h-3.5 text-brand-blue" />
                <a href="mailto:info@riseuprac.com" className="font-bold text-brand-blue hover:underline">info@riseuprac.com</a>
              </p>
              <p className="pt-1 text-slate-500">
                <Link href="/terms" className="text-brand-blue hover:underline">View Terms of Service</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
