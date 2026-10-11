import type { ContractRenderContext } from './types';
import { RISEUP_LOGO_SVG, RISEUP_WHITE_LOGO_SVG, RISEUP_EMBLEM_SVG } from './contractStyles';

export const TOTAL_PAGES = 7;

export function renderContinuationBar(ctx: ContractRenderContext): string {
  return `
  <div class="bar">
    <span style="display:inline-flex;align-items:center;">
      ${RISEUP_EMBLEM_SVG}
      <span>Rise Up Roofing and Construction, Inc. • CA Lic. #${ctx.contractorLicense || '1096492'}</span>
    </span>
    <span>Project: <i>${ctx.projectAddress}</i></span>
  </div>`;
}

export function renderFooter(ctx: ContractRenderContext, pageNum: number): string {
  return `
  <div class="foot">
    <span class="tag ${ctx.executionStatusSlug}">${ctx.executionStatusLabel}</span>
    <span>Page ${pageNum} of ${TOTAL_PAGES} • ${ctx.contractTitle || 'Home Improvement Contract'}</span>
  </div>`;
}

function formatCoverTitle(title: string): string {
  const clean = (title || 'HOME IMPROVEMENT CONTRACT').trim();
  const words = clean.split(/\s+/);
  if (words.length <= 1) return `<em>${clean}</em>`;
  const lastWord = words.pop();
  return `${words.join('<br/>')}<br/><em>${lastWord}</em>`;
}

export function renderPage1(ctx: ContractRenderContext): string {
  const coverTitleHtml = formatCoverTitle(ctx.contractTitle);
  const photoHtml = ctx.propertyPhotoUrl
    ? `<image clip-path="url(#pc)" height="360" href="${ctx.propertyPhotoUrl}" preserveAspectRatio="xMidYMid slice" width="794" x="0" y="215"/>`
    : `<rect clip-path="url(#pc)" width="794" height="360" x="0" y="215" fill="#e8f1fd"/>`;

  return `
<section class="page cover">
  <svg aria-hidden="true" viewBox="0 0 794 1123">
    <defs>
      <clipPath id="pc">
        <polygon points="0,300 794,217 794,500 0,575"></polygon>
      </clipPath>
      <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
        <stop offset=".55" stop-color="#0b1a33" stop-opacity="0"></stop>
        <stop offset="1" stop-color="#0b1a33" stop-opacity=".45"></stop>
      </linearGradient>
    </defs>
    <polygon fill="#0b1a33" points="560,0 794,0 794,118 520,118"></polygon>
    <polygon fill="#2f7de1" points="546,0 560,0 520,118 506,118"></polygon>
    ${photoHtml}
    <polygon fill="url(#fade)" points="0,300 794,217 794,500 0,575"></polygon>
    <polygon fill="#2f7de1" points="0,575 794,500 794,528 0,606"></polygon>
    <polygon fill="#f08a24" points="0,606 794,528 794,535 0,613"></polygon>
    <polygon fill="#d6e6fb" points="794,640 794,810 430,868 560,770"></polygon>
    <polygon fill="#2f7de1" points="794,700 794,812 610,842"></polygon>
    <polygon fill="#0b1a33" points="0,880 794,800 794,1123 0,1123"></polygon>
    <polygon fill="#2f7de1" opacity=".5" points="794,930 794,1123 560,1123"></polygon>
    <polygon fill="#2f7de1" points="794,1010 794,1123 690,1123"></polygon>
  </svg>
  <div class="a brand-wrap" style="left:44px;top:32px;">
    ${RISEUP_LOGO_SVG}
    <div style="font-family:'Archivo',sans-serif;font-size:10.5px;font-weight:700;color:var(--mute);margin-top:5px;letter-spacing:0.02em;">
      CA Contractor License #${ctx.contractorLicense || '1096492'} • B / C39 / C46
    </div>
  </div>
  <div class="a cd">
    CONTRACT DATE
    <b>${ctx.contractDate || 'OCTOBER 1, 2026'}</b>
    <span class="cover-status-badge ${ctx.executionStatusSlug}"><span class="cover-status-dot"></span>${ctx.executionStatusLabel}</span>
  </div>
  <h1 class="a">
    ${coverTitleHtml}
  </h1>
  <div class="a pc" style="left:48px">
    <small>Prepared by</small>
    <b>${ctx.contractorName || 'Rise Up Roofing and Construction, Inc.'}</b>
    <span>${ctx.preparedByName || 'Project Manager'}${ctx.preparedByTitle ? ` • ${ctx.preparedByTitle}` : ''}</span>
  </div>
  <div class="a pc" style="left:416px">
    <small>Prepared for</small>
    <b>${ctx.clientName}</b>
    <span>${ctx.projectAddress}</span>
  </div>
  <div class="a lf">
    CA License #${ctx.contractorLicense || '1096492'} • 2182 S El Camino Real, Suite 202, Oceanside, CA 92054
  </div>
</section>`;
}

export function renderPage2(ctx: ContractRenderContext): string {
  const midpoint = Math.ceil((ctx.scopeSections.length || 0) / 2);
  const leftSections = ctx.scopeSections.slice(0, midpoint);
  const rightSections = ctx.scopeSections.slice(midpoint);

  const leftSectionsHtml = leftSections
    .map(
      (sec) => `
      <h3>${ctx.escapeHtml(sec.heading)}</h3>
      <p class="sm">${ctx.escapeHtml(sec.text)}</p>`
    )
    .join('');

  const rightSectionsHtml = rightSections
    .map(
      (sec) => `
      <h3>${ctx.escapeHtml(sec.heading)}</h3>
      <p class="sm">${ctx.escapeHtml(sec.text)}</p>`
    )
    .join('');

  return `
<section class="page">
  <div class="letter">
    <div class="lh">
      <div style="display:flex;align-items:center;gap:18px;">
        ${RISEUP_WHITE_LOGO_SVG}
        <div style="border-left:1px solid rgba(255,255,255,0.22);padding-left:16px;">
          2182 S El Camino Real, Suite 202 • Oceanside, CA 92054<br/>
          Tel. (442) 266-2443 ext. 2 | Fax. (442) 266-2422 | www.riseuprac.com
        </div>
      </div>
      <div class="lic">
        CONTRACTOR LICENSE
        <b>${ctx.contractorLicense || 'B/C39/C46'}</b>
      </div>
    </div>
  </div>
  <div class="body">
    <p class="sm" style="color:var(--mute)">
      A Notice of Cancellation may be sent to Rise Up Roofing and Construction, Inc. at the business address listed above or by email at ${ctx.cancellationEmail || 'accountant@riseuprac.com'}
    </p>
    <h1 class="doch">
      ${ctx.contractTitle || 'HOME IMPROVEMENT CONTRACT'}
    </h1>
    <p>
      This contract (“Contract”) is between ${ctx.clientName} (the “Client”) and Rise Up Roofing and Construction, Inc.${ctx.contractorSignatoryName ? ` ${ctx.contractorSignatoryName}` : ''} (the “Contractor”).
    </p>
    <div class="facts">
      <div>
        <b>Project Address:</b>
        ${ctx.projectAddress}
      </div>
      <div>
        <b>Contract Date:</b>
        The contract is signed and dated ${ctx.contractDate}.
      </div>
      <div>
        <b>Salesperson:</b>
        ${ctx.salespersonName || 'Rise Up Representative'}
      </div>
    </div>
    <p class="sm">
      <i>You are entitled to a completely filled in copy of this agreement, signed by both you and the Contractor, before any work may be started.</i>
    </p>
    <h2 class="t" style="margin-top:14px">
      AGREEMENT
    </h2>
    <p>
      <b>A. Licensing:</b><br/>
      ${ctx.licensingClause}
    </p>
    <p>
      <b>B. Scope of Work &amp; Project Specifications:</b><br/>
      The Client is hiring the Contractor to do the following: <b>${ctx.scopeTitle}</b>
    </p>
    <p>
      <b>a. Description of the Project and description of the significant materials to be used and equipment to be installed:</b><br/>
      ${ctx.scopeIntro}
    </p>
    <div class="cols">
      <div>
        ${leftSectionsHtml}
      </div>
      <div>
        ${rightSectionsHtml}
      </div>
    </div>
    <p class="sm" style="margin-top:14px;border-top:1px solid var(--line);padding-top:10px">
      <b>Jobsite Protection &amp; Standards Note:</b>
      ${ctx.jobsiteStandardsText}
    </p>
  </div>
  ${renderFooter(ctx, 2)}
</section>`;
}

export function renderPage3(ctx: ContractRenderContext): string {
  const milestoneRowsHtml = ctx.paymentRows
    .map(
      (m, idx) => `
      <tr>
        <td>${m.number || `${idx + 1}.`}</td>
        <td>${ctx.escapeHtml(m.description)}</td>
        <td>${ctx.fmt(m.amount)}</td>
      </tr>`
    )
    .join('');

  const initialsBox = (label: string) => `
    <div class="init">
      <span>${label}</span>
      <u>${ctx.clientInitials || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</u>
    </div>`;

  return `
<section class="page">
  ${renderContinuationBar(ctx)}
  <div class="body">
    <h2 class="t">
      PROJECT TIMETABLE • CHANGE ORDERS • CONTRACT PRICING
    </h2>
    <div class="boxes">
      <div>
        <b>B. APPROXIMATE START DATE</b><br/>
        <span>${ctx.approxStartDate}</span>
      </div>
      <div>
        <b>C. SUBSTANTIAL COMMENCEMENT</b><br/>
        <span>${ctx.substantialCommencementDate}</span>
      </div>
      <div>
        <b>D. APPROXIMATE COMPLETION</b><br/>
        <span>${ctx.approxCompletionDate}</span>
      </div>
    </div>
    <p class="sm">
      <b>e. Documents Incorporated Into This Agreement:</b> (i) Exhibit A – Notice of Cancellation Form • (ii) Exhibit B – Extra Work or Change Order Form (if applicable).
    </p>
    <p class="sm">
      <b>f. Note About Extra Work and Change Orders:</b> Extra Work and Change Orders become part of the contract once prepared in writing and signed by the parties prior to commencement of work covered by the new change order.
    </p>
    <p class="sm">
      <b>g. Form of Change Order:</b> ${ctx.changeOrderClause}
    </p>
    <div class="price">
      <div>
        H. CONTRACT PRICE
        <strong>${ctx.contractPrice}</strong>
      </div>
      <div>
        J. DOWNPAYMENT
        <strong>${ctx.downpayment}</strong>
      </div>
      <div>
        I. FINANCE CHARGE
        <strong>${ctx.financeCharge || 'N/A'}</strong>
      </div>
    </div>
    <div class="warn">
      THE DOWNPAYMENT MAY NOT EXCEED $1,000 OR 10 PERCENT OF THE CONTRACT PRICE, WHICHEVER IS LESS.
    </div>
    <div class="law">
      <b>STATUTORY PAYMENT LAW:</b> IT IS AGAINST THE LAW FOR A CONTRACTOR TO COLLECT PAYMENT FOR WORK NOT YET COMPLETED, OR FOR MATERIALS NOT YET DELIVERED. HOWEVER, A CONTRACTOR MAY REQUIRE A DOWNPAYMENT.
    </div>
    <p>
      <b>k. Schedule of Progress Payments:</b>
    </p>
    <p class="sm">
      The schedule of progress payments must specifically describe each phase of work, including the type and amount of work or services scheduled to be supplied in each phase, along with the amount of each proposed progress payment. Client will pay Contractor upon completion of specified milestones:
    </p>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Payment Milestone</th>
            <th>Phase of Work / Materials Supplied</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${milestoneRowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td></td>
            <td style="text-align:right">Total Contract Price:</td>
            <td>${ctx.contractPrice}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ${initialsBox('CLIENT INITIAL: I HAVE READ AND AGREE TO THE PAYMENT MILESTONES SCHEDULE')}
  </div>
  ${renderFooter(ctx, 3)}
</section>`;
}
