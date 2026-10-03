import type { ContractRenderContext } from './types';
import { RISEUP_LOGO_SVG, RISEUP_EMBLEM_SVG } from './contractStyles';

export const TOTAL_PAGES = 6;

export function renderFooter(ctx: ContractRenderContext, pageNum: number): string {
  return `
    <div class="page-footer">
      <div class="footer-left">
        <span class="footer-status-label status-${ctx.executionStatusSlug}">${ctx.executionStatusLabel}</span>
      </div>
      <div class="footer-text">Page ${pageNum} of ${TOTAL_PAGES} &bull; Home Improvement Contract</div>
    </div>
  `;
}

export function renderPage1(ctx: ContractRenderContext): string {
  return `
    <main class="sheet">
      <div class="mast">
        <div class="mast-brand">
          ${RISEUP_LOGO_SVG}
          <div class="mast-info">
            <p>2182 S El Camino Real, Suite 202 &bull; Oceanside, CA 92054<br>Tel. (442) 266-2443 ext. 2 &nbsp;|&nbsp; Fax. (442) 266-2422 &nbsp;|&nbsp; www.riseuprac.com</p>
          </div>
        </div>
        <div class="lic"><span>Contractor License</span>${ctx.contractorLicense} B/C39/C46</div>
      </div>

      <div class="notice-bar" style="background:#f1f5f9;border-left:3.5px solid var(--navy);padding:6px 12px;margin:8px 0;font-size:10px;color:var(--navy);">
        A Notice of Cancellation may be sent to Rise Up Roofing and Construction, Inc. at the business address listed above or by email at ${ctx.cancellationEmail}
      </div>

      <div class="p1-content">
        <h1 class="title">HOME IMPROVEMENT CONTRACT</h1>
        <div class="rule"></div>

        <p class="parties">This contract <b>(“Contract”)</b> is between <b>${ctx.clientName}</b> <b>(the “Client”)</b> and <b>Rise Up Roofing and Construction, Inc.</b> <b>${ctx.contractorName}</b> <b>(the “Contractor”)</b>.</p>

        <div class="card">
          <b>Project Address:</b><span>${ctx.projectAddress}</span>
          <b>Contract Date:</b><span>The contract is signed and dated ${ctx.contractDate}.</span>
          <b>Salesperson:</b><span>${ctx.salespersonName}</span>
        </div>

        <p class="entitle">You are entitled to a completely filled in copy of this agreement, signed by both you and the Contractor, before any work may be started.</p>

        <h2 class="section-hdr">AGREEMENT</h2>

        <h3 class="sub-hdr">A. Licensing:</h3>
        <p class="legal-p">The Contractor warrants that the Contractor currently holds a valid license, <b>${ctx.contractorLicense}</b>, under the laws of the State of California to perform the work. The work performed will be done so in compliance with all applicable local, state, or federal statutes and regulations.</p>

        <h3 class="sub-hdr">B. Scope of Work &amp; Project Specifications:</h3>
        <p class="legal-p">The Client is hiring the Contractor to do the following: <b>${ctx.scopeTitle}</b></p>
        <p class="legal-p" style="margin-bottom:6px;"><b>a. Description of the Project and description of the significant materials to be used and equipment to be installed:</b></p>

        <div class="scope-box">
          <p style="margin:0 0 8px 0;font:italic 11px Georgia,serif;color:#334155;">${ctx.scopeIntro}</p>
          <div class="scope-grid">
            ${ctx.scopeSections
              .map(
                (sec) => `
              <div class="scope-item">
                <h4>${ctx.escapeHtml(sec.heading)}</h4>
                <p>${ctx.escapeHtml(sec.text)}</p>
              </div>`
              )
              .join('')}
          </div>
        </div>

        <div style="margin-top:10px;padding:8px 12px;background:#f8fafc;border:1px solid var(--line);border-radius:4px;font-size:10.5px;line-height:1.4;color:var(--navy);">
          <b>Jobsite Protection &amp; Standards Note:</b> Contractor warrants that all jobsite safety protocols, property protection tarps, landscape barriers, and magnetic sweeps of driveways and walkways are conducted daily. All roofing work adheres strictly to manufacturer specifications and California Building Standards Code (Title 24).
        </div>
      </div>

      ${renderFooter(ctx, 1)}
    </main>
  `;
}

export function renderPage2(ctx: ContractRenderContext): string {
  return `
    <main class="sheet">
      <div class="mini-mast">
        <div style="display:flex;align-items:center;gap:8px;">
          ${RISEUP_EMBLEM_SVG}
          <span>Rise Up Roofing and Construction, Inc. &bull; License ${ctx.contractorLicense}</span>
        </div>
        <div>Project: <span>${ctx.projectAddress}</span></div>
      </div>

      <div class="page-content">
        <h2 class="section-hdr" style="margin-top:0;">PROJECT TIMETABLE &bull; CHANGE ORDERS &bull; CONTRACT PRICING</h2>

        <div class="dates-grid">
          <div class="date-card"><b>b. Approximate Start Date</b><span>${ctx.approxStartDate}</span></div>
          <div class="date-card"><b>c. Substantial Commencement</b><span>${ctx.substantialCommencementDate}</span></div>
          <div class="date-card"><b>d. Approximate Completion</b><span>${ctx.approxCompletionDate}</span></div>
        </div>

        <p class="legal-p" style="font-size:10.5px;margin-bottom:3px;"><b>e. Documents Incorporated Into This Agreement:</b> (i) Exhibit A – Notice of Cancellation Form &nbsp;&bull;&nbsp; (ii) Exhibit B – Extra Work or Change Order Form (if applicable).</p>
        <p class="legal-p" style="font-size:10.5px;margin-bottom:3px;"><b>f. Note About Extra Work and Change Orders:</b> Extra Work and Change Orders become part of the contract once prepared in writing and signed by the parties prior to commencement of work covered by the new change order.</p>
        <p class="legal-p" style="font-size:10.5px;margin-bottom:8px;"><b>g. Form of Change Order:</b> The order must describe the scope of extra work, cost added or subtracted, and effect on progress payments or completion date prior to commencement.</p>

        <div class="price-grid">
          <div class="price-box"><b>h. Contract Price</b><span>${ctx.contractPrice}</span></div>
          <div class="price-box alt"><b>j. Downpayment</b><span>${ctx.downpayment}</span></div>
          <div class="price-box alt"><b>i. Finance Charge</b><span>${ctx.financeCharge}</span></div>
        </div>

        <div class="alert-banner">THE DOWNPAYMENT MAY NOT EXCEED $1,000 OR 10 PERCENT OF THE CONTRACT PRICE, WHICHEVER IS LESS.</div>

        <div style="background:#f8fafc;border:1px solid var(--line);border-left:3.5px solid var(--navy);padding:8px 14px;border-radius:0 4px 4px 0;margin:6px 0 8px;font-size:11px;line-height:1.45;color:var(--navy);">
          <b>STATUTORY PAYMENT LAW:</b> IT IS AGAINST THE LAW FOR A CONTRACTOR TO COLLECT PAYMENT FOR WORK NOT YET COMPLETED, OR FOR MATERIALS NOT YET DELIVERED. HOWEVER, A CONTRACTOR MAY REQUIRE A DOWNPAYMENT.
        </div>

        <h3 class="sub-hdr" style="margin-top:6px;">k. Schedule of Progress Payments:</h3>
        <p class="legal-p" style="font-size:10.5px;line-height:1.4;margin-bottom:4px;">The schedule of progress payments must specifically describe each phase of work, including the type and amount of work or services scheduled to be supplied in each phase, along with the amount of each proposed progress payment. Client will pay Contractor upon completion of specified milestones:</p>

        <table class="sched-table">
          <thead>
            <tr>
              <th style="width:120px;">Payment Milestone</th>
              <th>Phase of Work / Materials Supplied</th>
              <th style="width:120px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${ctx.paymentRows
              .map(
                (r) => `
              <tr>
                <td><b>${ctx.escapeHtml(r.number)}</b></td>
                <td>${ctx.escapeHtml(r.description)}</td>
                <td class="amt">${ctx.fmt(r.amount)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align:right;font-weight:700;">Total Contract Price:</td>
              <td class="amt" style="color:var(--navy);font-size:13.5px;">${ctx.contractPrice}</td>
            </tr>
          </tfoot>
        </table>

        <div class="initial-box">
          <span class="lbl">CLIENT INITIAL: I HAVE READ AND AGREE TO THE PAYMENT MILESTONES SCHEDULE</span>
          <div class="initial-slot">${ctx.clientInitials ? `<span class="ink med">${ctx.clientInitials}</span>` : `<span style="color:#cbd5e1;font-family:sans-serif;letter-spacing:2px;font-size:11px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>`}</div>
        </div>

        <h3 class="sub-hdr" style="margin-top:8px;">Payment Terms, Invoicing Provisions &amp; Refund Policy:</h3>
        <p class="legal-p" style="font-size:10.5px;line-height:1.45;margin-bottom:4px;">Payment shall be made to the Contractor via cash, cashier’s check, or money order. Invoices are due <b>UPON COMPLETION</b> of each milestone phase. Accounts unpaid after 4 business days incur a $25.00 late fee or 1.5% monthly finance charge. Necessary extra materials expenses reimbursed within 2 days of receipt. Upon each payment, Contractor furnishes full and unconditional statutory lien releases pursuant to California Civil Code Sections 8400 &amp; 8404.</p>
        <p class="legal-p" style="font-size:10.5px;line-height:1.45;margin-bottom:6px;"><b>Refund Policy: 1.6.2(a) No Refunds:</b> Services completed and materials procured as described in this contract are not subject to refunds. The Client will not be reimbursed for services cancelled once work has begun. All sales are final upon substantial commencement.</p>

        <div class="initial-box">
          <span class="lbl">CLIENT INITIAL: I HAVE READ AND UNDERSTOOD THE PAYMENT TERMS &amp; REFUND POLICY</span>
          <div class="initial-slot">${ctx.clientInitials ? `<span class="ink med">${ctx.clientInitials}</span>` : `<span style="color:#cbd5e1;font-family:sans-serif;letter-spacing:2px;font-size:11px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>`}</div>
        </div>
      </div>

      ${renderFooter(ctx, 2)}
    </main>
  `;
}

export function renderPage3(ctx: ContractRenderContext): string {
  return `
    <main class="sheet">
      <div class="mini-mast">
        <div style="display:flex;align-items:center;gap:8px;">
          ${RISEUP_EMBLEM_SVG}
          <span>Rise Up Roofing and Construction, Inc. &bull; License ${ctx.contractorLicense}</span>
        </div>
        <div>Project: <span>${ctx.projectAddress}</span></div>
      </div>

      <div class="page-content">
        <h2 class="section-hdr" style="margin-top:0;">INSURANCE COVERAGE &bull; MECHANICS LIEN WARNING &bull; CSLB DISCLOSURE</h2>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0 10px;">
          <div style="background:#f8fafc;border:1px solid var(--line);border-left:3.5px solid var(--navy);padding:8px 12px;border-radius:0 4px 4px 0;">
            <h3 class="sub-hdr" style="margin:0 0 3px 0;">C. Commercial General Liability Insurance:</h3>
            <p class="legal-p" style="margin:0;font-size:10.5px;line-height:1.45;">Rise Up Roofing and Construction, Inc. carries commercial general liability, excess umbrella, and commercial vehicle insurance written by <b>${ctx.insuranceCarrier}</b>. You may contact them directly at <b>${ctx.insurancePhone}</b> to request an official certificate of insurance.</p>
          </div>
          <div style="background:#f8fafc;border:1px solid var(--line);border-left:3.5px solid var(--navy);padding:8px 12px;border-radius:0 4px 4px 0;">
            <h3 class="sub-hdr" style="margin:0 0 3px 0;">D. Workers’ Compensation Insurance:</h3>
            <p class="legal-p" style="margin:0;font-size:10.5px;line-height:1.45;">Rise Up Roofing and Construction, Inc. carries workers’ compensation insurance for all jobsite employees and roofing crew members written by <b>${ctx.workersCompCarrier}</b>. You may call <b>${ctx.workersCompPhone}</b> to verify active policy status.</p>
          </div>
        </div>

        <h3 class="sub-hdr">E. MECHANICS LIEN WARNING:</h3>
        <p class="legal-p" style="font-size:11px;line-height:1.45;margin-bottom:6px;">Anyone who helps improve your property, but who is not paid, may record what is called a mechanics lien on your property. A mechanics lien is a claim, like a mortgage or home equity loan, made against your property and recorded with the county recorder. Even if you pay your contractor in full, unpaid subcontractors, suppliers, and laborers who helped to improve your property may record mechanics liens and sue you in court to foreclose the lien. If a court finds the lien is valid, you could be forced to pay twice or have a court officer sell your home to pay the lien. Liens can also affect your credit.</p>

        <div style="border:1.5px solid #fed7aa;background:#fffaf0;padding:10px 14px;border-radius:4px;margin-bottom:8px;">
          <p class="legal-p" style="font-size:10.5px;line-height:1.4;margin-bottom:5px;"><b>BE CAREFUL.</b> The Preliminary Notice can be sent up to 20 days after the subcontractor starts work or the supplier provides material. This can be a big problem if you pay your contractor before you have received the Preliminary Notices. You will not get Preliminary Notices from your prime contractor or from laborers who work on your project. The law assumes that you already know they are improving your property.</p>
          <p class="legal-p" style="font-size:10.5px;line-height:1.4;margin-bottom:5px;"><b>PROTECT YOURSELF FROM LIENS.</b> You can protect yourself from liens by getting a list from your contractor of all the subcontractors and material suppliers that work on your project. Find out from your contractor when these subcontractors started work and when these suppliers delivered goods or materials. Then wait 20 days, paying attention to the Preliminary Notices you receive.</p>
          <p class="legal-p" style="font-size:10.5px;line-height:1.4;margin-bottom:0;"><b>PAY WITH JOINT CHECKS.</b> One way to protect yourself is to pay with a joint check. When your contractor tells you it is time to pay for the work of a subcontractor or supplier who has provided you with a Preliminary Notice, write a joint check payable to both the contractor and the subcontractor or material supplier. Visit CSLB at <b>www.cslb.ca.gov</b> or call <b>800-321-CSLB (2752)</b>. <b>REMEMBER, IF YOU DO NOTHING, YOU RISK HAVING A LIEN PLACED ON YOUR HOME.</b></p>
        </div>

        <div class="initial-box" style="margin-bottom:10px;">
          <span class="lbl">CLIENT INITIAL: I HAVE READ AND UNDERSTOOD THE MECHANICS LIEN WARNING</span>
          <div class="initial-slot">${ctx.clientInitials ? `<span class="ink med">${ctx.clientInitials}</span>` : `<span style="color:#cbd5e1;font-family:sans-serif;letter-spacing:2px;font-size:11px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>`}</div>
        </div>

        <h3 class="sub-hdr">F. Information about the Contractors’ State License Board (CSLB):</h3>
        <p class="legal-p" style="font-size:11px;line-height:1.45;margin-bottom:5px;">CSLB is the state consumer protection agency that licenses and regulates construction contractors. Contact CSLB for information about the licensed contractor you are considering, including information about disclosable complaints, disciplinary actions, and civil judgments that are reported to CSLB.</p>
        <p class="legal-p" style="font-size:11px;line-height:1.45;margin-bottom:6px;">Use only licensed contractors. If you file a complaint against a licensed contractor within the legal deadline (usually four years), CSLB has authority to investigate the complaint. If you use an unlicensed contractor, CSLB may not be able to help you resolve your complaint. Your only remedy may be in civil court, and you may be liable for damages arising out of any injuries to the unlicensed contractor or the unlicensed contractor’s employees.</p>

        <div style="background:#f1f5f9;border:1px solid var(--line);border-radius:4px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--navy);margin-bottom:12px;">
          <span><b>Visit Online:</b> www.cslb.ca.gov</span>
          <span><b>Call CSLB:</b> 800-321-CSLB (2752)</span>
          <span><b>Write CSLB:</b> P.O. Box 26000, Sacramento, CA 95826</span>
        </div>

        <h2 class="section-hdr" style="margin-top:0;">REPRESENTATIONS &amp; GENERAL CONTRACT PROVISIONS</h2>
        <div class="terms-grid" style="margin-bottom:0;">
          <div class="term-card">
            <h4>G. Representations &amp; Authority</h4>
            <p><b>Authority to Sign:</b> Each party warrants and represents that it has full authority to enter into and perform this Contract. <b>Client Review:</b> Client agrees to review work, be reasonably available, provide timely decisions, and ensure uninterrupted access to worksite water and electrical utilities.</p>
          </div>
          <div class="term-card">
            <h4>H. General Provisions &amp; Code Compliance</h4>
            <p><b>Signatures:</b> Electronic and hardcopy signatures count as legal originals for all purposes. <b>Compliance with Laws:</b> Contractor warrants all work complies with California Building Standards Code (Title 24) and local ordinances. <b>Severability:</b> Unenforceability of any term shall not impair remainder.</p>
          </div>
        </div>
      </div>

      ${renderFooter(ctx, 3)}
    </main>
  `;
}
