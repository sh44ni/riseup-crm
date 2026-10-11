import type { ContractRenderContext } from './types';
import { renderContinuationBar, renderFooter } from './contractPages1To3';

export function renderPage4(ctx: ContractRenderContext): string {
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
      PAYMENT TERMS • INSURANCE COVERAGE • LIENS &amp; CONSUMER DISCLOSURES
    </h2>
    <p>
      <b>Payment Terms, Invoicing Provisions &amp; Refund Policy:</b>
    </p>
    <p class="sm">
      ${ctx.paymentTermsText}
    </p>
    <p class="sm">
      <b>Refund Policy: 1.6.2(a) No Refunds:</b> ${ctx.refundPolicyText}
    </p>
    ${initialsBox('CLIENT INITIAL: I HAVE READ AND UNDERSTOOD THE PAYMENT TERMS &amp; REFUND POLICY')}
    <div class="cols" style="margin-top:10px;">
      <div>
        <p class="sm">
          <b>C. Commercial General Liability Insurance:</b><br/>
          ${ctx.liabilityInsuranceText}
        </p>
      </div>
      <div>
        <p class="sm">
          <b>D. Workers’ Compensation Insurance:</b><br/>
          ${ctx.workersCompText}
        </p>
      </div>
    </div>
    <div class="law" style="border-left-color:var(--org);margin-top:8px">
      <p class="sm">
        <b>E. MECHANICS LIEN WARNING:</b><br/>
        ${ctx.mechanicsLienWarningText}
      </p>
    </div>
    ${initialsBox('CLIENT INITIAL: I HAVE READ AND UNDERSTOOD THE MECHANICS LIEN WARNING')}
    <p class="sm">
      <b>F. Information about the Contractors’ State License Board (CSLB):</b><br/>
      ${ctx.cslbDisclosureText}
    </p>
    <div class="cols three sm" style="font-family:'Archivo',sans-serif">
      <div>
        <b>Visit Online:</b>
        www.cslb.ca.gov
      </div>
      <div>
        <b>Call CSLB:</b>
        800-321-CSLB (2752)
      </div>
      <div>
        <b>Write CSLB:</b>
        P.O. Box 26000, Sacramento, CA 95826
      </div>
    </div>
  </div>
  ${renderFooter(ctx, 4)}
</section>`;
}

export function renderPage5(ctx: ContractRenderContext): string {
  const initialsBox = (label: string) => `
    <div class="init">
      <span>${label}</span>
      <u>${ctx.clientInitials || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</u>
    </div>`;

  const contractorSigHtml = ctx.isCounterSigned && (ctx.contractorSignatureData || ctx.contractorSignatureName)
    ? ctx.contractorSignatureData && ctx.contractorSignatureData.startsWith('data:image')
      ? `<img src="${ctx.contractorSignatureData}" alt="Contractor Signature" style="max-height:36px;max-width:220px;display:inline-block;object-fit:contain;" />`
      : `<span class="sig">${ctx.contractorSignatureName || ctx.contractorName}</span>`
    : `<div style="height:26px;border-bottom:1px solid var(--navy);width:85%;margin:4px 0;"></div>`;

  let contractorSignatoryLine = '<span>By: ____________________ • Title: ____________________</span>';
  const signatoryName = ctx.contractorSignatoryName || (ctx.isCounterSigned ? ctx.contractorSignatureName : '');
  if (signatoryName) {
    const signatoryTitle =
      ctx.contractorSignatoryTitle || (ctx.isCounterSigned ? ctx.contractorSignatureTitle : '') || 'Authorized Signatory';
    contractorSignatoryLine = `<span>By: ${signatoryName} • Title: ${signatoryTitle}</span>`;
  }

  const clientSigHtml = ctx.isClientSigned && (ctx.clientSignatureData || ctx.clientSignatureName)
    ? ctx.clientSignatureData && ctx.clientSignatureData.startsWith('data:image')
      ? `<img src="${ctx.clientSignatureData}" alt="Client Signature" style="max-height:36px;max-width:220px;display:inline-block;object-fit:contain;" />`
      : `<span class="sig">${ctx.clientSignatureName || ctx.clientName}</span>`
    : `<div style="height:26px;border-bottom:1px solid var(--navy);width:85%;margin:4px 0;"></div>`;

  return `
<section class="page">
  ${renderContinuationBar(ctx)}
  <div class="body">
    <h2 class="t">
      REPRESENTATIONS &amp; GENERAL CONTRACT PROVISIONS
    </h2>
    <div class="cols">
      <div>
        <h3>G. Representations &amp; Authority</h3>
        <p class="sm">
          ${ctx.representationsText}
        </p>
      </div>
      <div>
        <h3>H. General Provisions &amp; Code Compliance</h3>
        <p class="sm">
          ${ctx.generalProvisionsText}
        </p>
      </div>
    </div>
    <div class="cols" style="margin-top:4px">
      <div>
        <h3>I. Term &amp; Termination</h3>
        <p class="sm">
          ${ctx.termTerminationText}
        </p>
      </div>
      <div>
        <h3>J. Performance &amp; Payment Bond</h3>
        <p class="sm">
          ${ctx.bondText}
        </p>
      </div>
    </div>
    <h2 class="t" style="margin-top:14px">
      EXECUTION OF AGREEMENT
    </h2>
    <p style="margin-top:0">
      The Parties hereto agree to the foregoing terms, specifications, and conditions as evidenced by their signatures below.
    </p>
    <div class="cols" style="margin:14px 0">
      <div class="info" style="grid-template-columns:1fr;margin:0">
        <b>CONTRACTOR AUTHORIZED SIGNATURE:</b>
        ${contractorSigHtml}
        <span><b>Rise Up Roofing and Construction, Inc.</b></span>
        ${contractorSignatoryLine}
        <span>License: ${ctx.contractorLicense || 'B/C39/C46'}</span>
        <span>Date: ${ctx.isCounterSigned ? ctx.counterSignedAt || ctx.contractDate : '____________________'}</span>
      </div>
      <div class="info" style="grid-template-columns:1fr;margin:0">
        <b>CLIENT SIGNATURE:</b>
        ${clientSigHtml}
        <span><b>${ctx.clientName}</b> (Signature of Client)</span>
        <span>Project: ${ctx.projectAddress}</span>
        <span>Date: ${ctx.isClientSigned ? ctx.signedAt || ctx.contractDate : '____________________'}</span>
      </div>
    </div>
    <h2 class="t" style="margin-top:16px">
      RIGHT TO CANCEL ADDENDUM
    </h2>
    <h3>Three-Day Right to Cancel Notice Acknowledgement</h3>
    <p class="sm">
      The law requires that the contractor give you a notice explaining your right to cancel. Initial the checkbox if the contractor has given you a “Notice of the Three-day Right to Cancel”.
    </p>
    ${initialsBox('CLIENT INITIAL: I ACKNOWLEDGE RECEIPT OF THE THREE-DAY RIGHT TO CANCEL NOTICE')}
    <h3>Five-Day Right to Cancel (For Senior Citizens Aged 65 and Older)</h3>
    <p class="sm">
      California Civil Code § 1689.6(a)(2) grants senior citizens aged 65 and older five business days to cancel this contract. Initial the checkbox if the contractor has given you a “Notice of the Five-day Right to Cancel”.
    </p>
    ${initialsBox('CLIENT INITIAL: I ACKNOWLEDGE RECEIPT OF THE FIVE-DAY RIGHT TO CANCEL NOTICE (IF APPLICABLE)')}
    <p class="sm" style="margin-top:8px">
      <b>Contractor Registration:</b> Licensed &amp; bonded pursuant to CA Contractors' State License Law.
      <b>Official Seal:</b> Rise Up Roofing &amp; Construction, Inc. (CA #${ctx.contractorLicense || '1096492'})
    </p>
    <p class="sm">
      <i>You are entitled to a completely filled in copy of this agreement, signed by both you and the Contractor, before any work may be started.</i>
    </p>
  </div>
  ${renderFooter(ctx, 5)}
</section>`;
}

export function renderPage6(ctx: ContractRenderContext): string {
  const clientSigHtml = ctx.isClientSigned && (ctx.clientSignatureData || ctx.clientSignatureName)
    ? ctx.clientSignatureData && ctx.clientSignatureData.startsWith('data:image')
      ? `<img src="${ctx.clientSignatureData}" alt="Client Signature" style="max-height:28px;max-width:180px;display:inline-block;object-fit:contain;" />`
      : `<span class="sig">${ctx.clientSignatureName || ctx.clientName}</span>`
    : `<span>____________________</span>`;

  return `
<section class="page">
  ${renderContinuationBar(ctx)}
  <div class="body">
    <div class="ctr">
      <h2>Notice of the Three-day Right to Cancel</h2>
      <p>CALIFORNIA CIVIL CODE § 1689.7 STATUTORY NOTICE</p>
    </div>
    <p class="sm">
      <b>I. Statutory Three-Day Cancellation Rights:</b><br/>
      ${ctx.threeDayNoticeText}
    </p>
    <p class="sm">
      If you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk.
    </p>
    <p class="sm">
      If you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.
    </p>
    <div class="info">
      <span><b>Date of Notice:</b> ${ctx.contractDate}</span>
      <span><b>Signature of Client:</b> ${clientSigHtml}</span>
      <span><b>Printed Name:</b> ${ctx.clientName}</span>
      <span><b>Project Address:</b> ${ctx.projectAddress}</span>
    </div>
    <div class="cut">
      ✂ DETACH HERE AND DELIVER TO CANCEL TRANSACTION ✂
    </div>
    <div class="cancel">
      <h3>EXHIBIT A • NOTICE OF CANCELLATION (THREE DAYS)</h3>
      <p class="sm">
        <b>Date of original contract or transaction:</b> ${ctx.contractDate}
      </p>
      <p class="sm">
        You may cancel this transaction, without any penalty or obligation, within three business days from the above date. If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within 10 days following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be canceled.
      </p>
      <p class="sm">
        To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice, or send an email to <b>${ctx.contractorName}</b>, 2182 S El Camino Real #202, Oceanside, CA 92054, email <b>${ctx.cancellationEmail || 'accountant@riseuprac.com'}</b>, not later than midnight of the third business day after signing.
      </p>
      <p><b>I HEREBY CANCEL THIS TRANSACTION.</b></p>
      <div class="ln">
        <span>(Enter Date of Cancellation):</span>
        <span></span>
      </div>
      <div class="ln">
        <span>Signature of Client:</span>
        <span></span>
      </div>
      <div class="ln">
        <span>Printed Name &amp; Phone:</span>
        <span></span>
      </div>
      <div class="ln">
        <span>Property Address:</span>
        <span><b>${ctx.projectAddress}</b></span>
      </div>
      <p class="sm">
        Delivery Method: [ &nbsp; ] Delivered In Person &nbsp; [ &nbsp; ] Certified Mail &nbsp; [ &nbsp; ] Email to ${ctx.cancellationEmail || 'accountant@riseuprac.com'}
      </p>
      <p class="sm">
        <b>Contractor Acknowledgment of Receipt:</b> Signature: ________________________________ &nbsp; Date Received: ____________________
      </p>
      <p class="sm ctr" style="color:var(--mute);margin:0">
        Rise Up Roofing and Construction, Inc. • CA License #${ctx.contractorLicense || '1096492'} • 2182 S El Camino Real, Suite 202, Oceanside, CA 92054 • Tel. (442) 266-2443 ext. 2
      </p>
    </div>
  </div>
  ${renderFooter(ctx, 6)}
</section>`;
}

export function renderPage7(ctx: ContractRenderContext): string {
  const clientSigHtml = ctx.isClientSigned && (ctx.clientSignatureData || ctx.clientSignatureName)
    ? ctx.clientSignatureData && ctx.clientSignatureData.startsWith('data:image')
      ? `<img src="${ctx.clientSignatureData}" alt="Client Signature" style="max-height:28px;max-width:180px;display:inline-block;object-fit:contain;" />`
      : `<span class="sig">${ctx.clientSignatureName || ctx.clientName}</span>`
    : `<span>____________________</span>`;

  return `
<section class="page">
  ${renderContinuationBar(ctx)}
  <div class="body">
    <div class="ctr">
      <h2>Notice of the Five-day Right to Cancel</h2>
      <p style="color:var(--org);font-weight:700">
        (For Senior Citizens Aged 65 and Older • California Civil Code § 1689.6(a)(2))
      </p>
    </div>
    <p class="sm">
      <b>I. Five-Day Right to Cancel (for senior citizens aged 65+):</b><br/>
      ${ctx.fiveDayNoticeText}
    </p>
    <p class="sm">
      If you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk.
    </p>
    <p class="sm">
      If you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.
    </p>
    <div class="info">
      <span><b>Date of Notice:</b> ${ctx.contractDate}</span>
      <span><b>Signature of Client:</b> ${clientSigHtml}</span>
      <span><b>Printed Name:</b> ${ctx.clientName}</span>
      <span><b>Project Address:</b> ${ctx.projectAddress}</span>
    </div>
    <div class="cut">
      ✂ DETACH HERE AND DELIVER TO CANCEL (SENIOR CITIZENS 65+) ✂
    </div>
    <div class="cancel">
      <h3>EXHIBIT A (2) • NOTICE OF CANCELLATION (FIVE DAYS)</h3>
      <p class="sm">
        <b>Date of original contract or transaction:</b> ${ctx.contractDate}
      </p>
      <p class="sm">
        You may cancel this transaction, without any penalty or obligation, within five business days from the above date. If you cancel, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within 10 days following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be canceled.
      </p>
      <p class="sm">
        To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice, or send an email to <b>${ctx.contractorName}</b>, 2182 S El Camino Real #202, Oceanside, CA 92054, email <b>${ctx.cancellationEmail || 'accountant@riseuprac.com'}</b>, not later than midnight of the fifth business day after signing.
      </p>
      <p><b>I HEREBY CANCEL THIS TRANSACTION.</b></p>
      <div class="ln">
        <span>(Enter Date of Cancellation):</span>
        <span></span>
      </div>
      <div class="ln">
        <span>Signature of Client:</span>
        <span></span>
      </div>
      <div class="ln">
        <span>Printed Name &amp; Phone:</span>
        <span></span>
      </div>
      <div class="ln">
        <span>Property Address:</span>
        <span><b>${ctx.projectAddress}</b></span>
      </div>
      <p class="sm">
        Delivery Method: [ &nbsp; ] Delivered In Person &nbsp; [ &nbsp; ] Certified Mail &nbsp; [ &nbsp; ] Email to ${ctx.cancellationEmail || 'accountant@riseuprac.com'}
      </p>
      <p class="sm">
        <b>Contractor Acknowledgment of Receipt:</b> Signature: ________________________________ &nbsp; Date Received: ____________________
      </p>
      <p class="sm ctr" style="color:var(--mute);margin:0">
        Rise Up Roofing and Construction, Inc. • CA License #${ctx.contractorLicense || '1096492'} • 2182 S El Camino Real, Suite 202, Oceanside, CA 92054 • Tel. (442) 266-2443 ext. 2
      </p>
    </div>
  </div>
  ${renderFooter(ctx, 7)}
</section>`;
}
