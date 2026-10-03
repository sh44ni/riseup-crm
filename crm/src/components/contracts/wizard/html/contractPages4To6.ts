import type { ContractRenderContext } from './types';
import { RISEUP_EMBLEM_SVG } from './contractStyles';
import { renderFooter } from './contractPages1To3';

export function renderPage4(ctx: ContractRenderContext): string {
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
        <h2 class="section-hdr" style="margin-top:0;">CONTRACT PROVISIONS &bull; EXECUTION OF AGREEMENT</h2>

        <div class="terms-grid">
          <div class="term-card">
            <h4>I. Term &amp; Termination</h4>
            <p>This contract ends upon final completion and payment. If terminated earlier per contract terms, Client is responsible for paying for all work completed and material expenses incurred up to that date.</p>
          </div>
          <div class="term-card">
            <h4>J. Performance &amp; Payment Bond</h4>
            <p>The Client has the legal right to require the Contractor to have a performance and payment bond, the expense of which may be borne by the Client as provided by California law.</p>
          </div>
        </div>

        <p class="legal-p" style="font-size:12px;font-weight:700;margin:6px 0 8px;">The Parties hereto agree to the foregoing terms, specifications, and conditions as evidenced by their signatures below.</p>

        <div class="sigs-grid">
          <div class="sig-card">
            <span style="font:700 11px system-ui, sans-serif;color:var(--navy);display:block;margin-bottom:2px;text-transform:uppercase;">Contractor Authorized Signature:</span>
            <div class="sig-line-area">
              ${
                ctx.isCounterSigned && (ctx.contractorSignatureName || ctx.contractorSignatureData)
                  ? ctx.contractorSignatureData
                    ? `<img src="${ctx.contractorSignatureData}" alt="Contractor Signature" style="max-height:42px;max-width:240px;display:inline-block;object-fit:contain;" />`
                    : `<span class="ink big">${ctx.contractorSignatureName || ctx.contractorName}</span>`
                  : `<div style="height:32px;border-bottom:1.5px solid #0f172a;width:80%;margin:0 auto 4px;"></div>`
              }
            </div>
            <div class="sig-meta">
              <strong>Rise Up Roofing and Construction, Inc.</strong><br>
              By: ${ctx.contractorName} &bull; Title: Project Manager<br>
              License: ${ctx.contractorLicense} B/C39/C46<br>
              Date: ${ctx.isCounterSigned ? ctx.escapeHtml(ctx.counterSignedAt || ctx.contractDate) : '____________________'}
            </div>
          </div>

          <div class="sig-card">
            <span style="font:700 11px system-ui, sans-serif;color:var(--navy);display:block;margin-bottom:2px;text-transform:uppercase;">Client Signature:</span>
            <div class="sig-line-area">
              ${
                ctx.isSigned && (ctx.clientSignatureName || ctx.clientSignatureData)
                  ? ctx.clientSignatureData && ctx.clientSignatureData.startsWith('data:image')
                    ? `<img src="${ctx.clientSignatureData}" alt="Client Signature" style="max-height:42px;max-width:240px;display:inline-block;object-fit:contain;" />`
                    : `<span class="ink big">${ctx.clientSignatureName || ctx.clientName}</span>`
                  : `<div style="height:32px;border-bottom:1.5px solid #0f172a;width:80%;margin:0 auto 4px;"></div>`
              }
            </div>
            <div class="sig-meta">
              <strong>${ctx.clientName}</strong> (Signature of Client)<br>
              Project: ${ctx.projectAddress}<br>
              Date: ${ctx.isSigned ? ctx.escapeHtml(ctx.signedAt || ctx.contractDate) : '____________________'}
            </div>
          </div>
        </div>

        <h2 class="section-hdr" style="margin-top:6px;">RIGHT TO CANCEL ADDENDUM</h2>

        <div class="cancel-addendum-box">
          <h3>Three-Day Right to Cancel Notice Acknowledgement</h3>
          <p>The law requires that the contractor give you a notice explaining your right to cancel. Initial the checkbox if the contractor has given you a “Notice of the Three-day Right to Cancel”.</p>
          <div class="initial-box" style="background:#fff;padding:7px 16px;">
            <span class="lbl">CLIENT INITIAL: I ACKNOWLEDGE RECEIPT OF THE THREE-DAY RIGHT TO CANCEL NOTICE</span>
            <div class="initial-slot">${ctx.clientInitials ? `<span class="ink med">${ctx.clientInitials}</span>` : `<span style="color:#cbd5e1;font-family:sans-serif;letter-spacing:2px;font-size:11px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>`}</div>
          </div>
        </div>

        <div class="cancel-addendum-box">
          <h3>Five-Day Right to Cancel (For Senior Citizens Aged 65 and Older)</h3>
          <p>California Civil Code § 1689.6(a)(2) grants senior citizens aged 65 and older five business days to cancel this contract. Initial the checkbox if the contractor has given you a “Notice of the Five-day Right to Cancel”.</p>
          <div class="initial-box" style="background:#fff;padding:7px 16px;">
            <span class="lbl">CLIENT INITIAL: I ACKNOWLEDGE RECEIPT OF THE FIVE-DAY RIGHT TO CANCEL NOTICE (IF APPLICABLE)</span>
            <div class="initial-slot">${ctx.clientInitials ? `<span class="ink med">${ctx.clientInitials}</span>` : `<span style="color:#cbd5e1;font-family:sans-serif;letter-spacing:2px;font-size:11px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>`}</div>
          </div>
        </div>

        <div style="margin-top:10px;padding:8px 14px;background:#f8fafc;border:1px solid var(--line);border-radius:4px;display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--mute);">
          <span><b>Contractor Registration:</b> Licensed &amp; bonded pursuant to CA Contractors' State License Law.</span>
          <span><b>Official Seal:</b> Rise Up Roofing &amp; Construction, Inc. (CA ${ctx.contractorLicense})</span>
        </div>

        <p class="entitle" style="margin-top:8px;font-size:10.5px;padding:6px 10px;">You are entitled to a completely filled in copy of this agreement, signed by both you and the Contractor, before any work may be started.</p>
      </div>

      ${renderFooter(ctx, 4)}
    </main>
  `;
}

export function renderPage5(ctx: ContractRenderContext): string {
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
        <h1 class="title" style="margin-top:2px;font-size:18px;">Notice of the Three-day Right to Cancel</h1>
        <div style="text-align:center;font:700 11px system-ui, sans-serif;color:var(--navy);letter-spacing:0.04em;margin-bottom:2px;text-transform:uppercase;">California Civil Code § 1689.7 Statutory Notice</div>
        <div class="rule" style="margin-bottom:10px;"></div>

        <h3 class="sub-hdr">I. Statutory Three-Day Cancellation Rights:</h3>
        <p class="legal-p" style="font-size:11.5px;line-height:1.55;margin-bottom:8px;">The Client has the right to cancel this contract within three business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the Contractor at the Contractor’s place of business by midnight of the third business day after you receive a signed and dated copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice.</p>
        <p class="legal-p" style="font-size:11.5px;line-height:1.55;margin-bottom:8px;">If you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk.</p>
        <p class="legal-p" style="font-size:11.5px;line-height:1.55;margin-bottom:12px;">If you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.</p>

        <div style="display:grid;grid-template-columns:130px 1fr 140px 1fr;gap:10px 16px;align-items:center;background:#f8fafc;border:1.5px solid var(--line);border-radius:4px;padding:12px 16px;margin:8px 0 16px;font-size:11.5px;">
          <b>Date of Notice:</b><span>${ctx.contractDate}</span>
          <b>Signature of Client:</b>
          ${
            ctx.isSigned
              ? ctx.clientSignatureData && ctx.clientSignatureData.startsWith('data:image')
                ? `<img src="${ctx.clientSignatureData}" alt="Client Signature" style="max-height:24px;max-width:140px;display:inline-block;object-fit:contain;" />`
                : `<span class="ink med">${ctx.clientSignatureName || ctx.clientName}</span>`
              : `<span style="display:inline-block;border-bottom:1px solid #334155;width:140px;height:14px;"></span>`
          }
          <b>Printed Name:</b><span>${ctx.clientName}</span>
          <b>Project Address:</b><span>${ctx.projectAddress}</span>
        </div>

        <div class="cut-line">
          <span>✂ &nbsp; DETACH HERE AND DELIVER TO CANCEL TRANSACTION &nbsp; ✂</span>
        </div>

        <div class="detachable-form">
          <div class="detachable-title">Exhibit A &bull; Notice of Cancellation (Three Days)</div>
          <p class="legal-p" style="font-size:11.5px;margin-bottom:6px;"><b>Date of original contract or transaction:</b> ${ctx.contractDate}</p>
          <p class="legal-p" style="font-size:11px;line-height:1.5;margin-bottom:6px;">You may cancel this transaction, without any penalty or obligation, within three business days from the above date. If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within 10 days following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be canceled.</p>
          <p class="legal-p" style="font-size:11px;line-height:1.5;margin-bottom:10px;">To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice, or send an email to <b>Rise Up Roofing and Construction, Inc.</b>, 2182 S El Camino Real #202, Oceanside, CA 92054, email <b>${ctx.cancellationEmail}</b>, not later than midnight of the third business day after signing.</p>

          <div style="border:1.5px dashed var(--line);padding:14px 18px;background:#fff;border-radius:4px;margin:10px 0 12px;">
            <p style="margin:0 0 10px 0;font:700 11.5px system-ui, sans-serif;color:var(--navy);text-transform:uppercase;">I HEREBY CANCEL THIS TRANSACTION.</p>
            <div style="display:grid;grid-template-columns:180px 1fr;gap:12px 16px;font-size:11px;align-items:center;">
              <span>(Enter Date of Cancellation):</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;"></span>
              <span>Signature of Client:</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;"></span>
              <span>Printed Name &amp; Phone:</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;"></span>
              <span>Property Address:</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;font-weight:600;color:#334155;">${ctx.projectAddress}</span>
              <span>Delivery Method:</span><span style="font-size:10.5px;color:#475569;">[&nbsp; ] Delivered In Person &nbsp;&nbsp;&nbsp;&nbsp; [&nbsp; ] Certified Mail &nbsp;&nbsp;&nbsp;&nbsp; [&nbsp; ] Email to ${ctx.cancellationEmail}</span>
            </div>
          </div>

          <div style="border:1px solid var(--line-subtle);background:#f8fafc;padding:9px 14px;border-radius:4px;display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--navy);margin-bottom:10px;">
            <span><b>Contractor Acknowledgment of Receipt:</b> Signature: ________________________________</span>
            <span>Date Received: ____________________</span>
          </div>

          <div style="text-align:center;font-size:10px;color:var(--mute);">
            Rise Up Roofing and Construction, Inc. &bull; CA License ${ctx.contractorLicense} &bull; 2182 S El Camino Real, Suite 202, Oceanside, CA 92054 &bull; Tel. (442) 266-2443 ext. 2
          </div>
        </div>
      </div>

      ${renderFooter(ctx, 5)}
    </main>
  `;
}

export function renderPage6(ctx: ContractRenderContext): string {
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
        <h1 class="title" style="margin-top:2px;font-size:18px;">Notice of the Five-day Right to Cancel</h1>
        <div style="text-align:center;font:700 11.5px system-ui, sans-serif;color:#9a3412;margin-bottom:2px;">(For Senior Citizens Aged 65 and Older &bull; California Civil Code § 1689.6(a)(2))</div>
        <div class="rule" style="margin-bottom:10px;"></div>

        <h3 class="sub-hdr">I. Five-Day Right to Cancel (for senior citizens aged 65+):</h3>
        <p class="legal-p" style="font-size:11.5px;line-height:1.55;margin-bottom:8px;">The Client has the right to cancel this contract within five business days. You may cancel by e-mailing, mailing, faxing, or delivering a written notice to the Contractor at the Contractor’s place of business by midnight of the fifth business day after you received a signed and dated copy of the contract that includes this notice. Include your name, your address, and the date you received the signed copy of the contract and this notice.</p>
        <p class="legal-p" style="font-size:11.5px;line-height:1.55;margin-bottom:8px;">If you cancel, the contractor must return to you anything you paid within 10 days of receiving the notice of cancellation. For your part, you must make available to the contractor at your residence, in substantially as good condition as you received them, goods delivered to you under this contract or sale. Or you may, if you wish, comply with the contractor’s instructions on how to return the goods at the contractor’s expense and risk.</p>
        <p class="legal-p" style="font-size:11.5px;line-height:1.55;margin-bottom:12px;">If you do make the goods available to the contractor and the contractor does not pick them up within 20 days of the date of your notice of cancellation, you may keep them without any further obligation. If you fail to make the goods available to the contractor, or if you agree to return the goods to the contractor and fail to do so, then you remain liable for performance of all obligations under the contract.</p>

        <div style="display:grid;grid-template-columns:130px 1fr 140px 1fr;gap:10px 16px;align-items:center;background:#f8fafc;border:1.5px solid var(--line);border-radius:4px;padding:12px 16px;margin:8px 0 16px;font-size:11.5px;">
          <b>Date of Notice:</b><span>${ctx.contractDate}</span>
          <b>Signature of Client:</b>
          ${
            ctx.isSigned
              ? ctx.clientSignatureData && ctx.clientSignatureData.startsWith('data:image')
                ? `<img src="${ctx.clientSignatureData}" alt="Client Signature" style="max-height:24px;max-width:140px;display:inline-block;object-fit:contain;" />`
                : `<span class="ink med">${ctx.clientSignatureName || ctx.clientName}</span>`
              : `<span style="display:inline-block;border-bottom:1px solid #334155;width:140px;height:14px;"></span>`
          }
          <b>Printed Name:</b><span>${ctx.clientName}</span>
          <b>Project Address:</b><span>${ctx.projectAddress}</span>
        </div>

        <div class="cut-line">
          <span>✂ &nbsp; DETACH HERE AND DELIVER TO CANCEL (SENIOR CITIZENS 65+) &nbsp; ✂</span>
        </div>

        <div class="detachable-form">
          <div class="detachable-title">Exhibit A (2) &bull; Notice of Cancellation (Five Days)</div>
          <p class="legal-p" style="font-size:11.5px;margin-bottom:6px;"><b>Date of original contract or transaction:</b> ${ctx.contractDate}</p>
          <p class="legal-p" style="font-size:11px;line-height:1.5;margin-bottom:6px;">You may cancel this transaction, without any penalty or obligation, within five business days from the above date. If you cancel, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within 10 days following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be canceled.</p>
          <p class="legal-p" style="font-size:11px;line-height:1.5;margin-bottom:10px;">To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice, or send an email to <b>Rise Up Roofing and Construction, Inc.</b>, 2182 S El Camino Real #202, Oceanside, CA 92054, email <b>${ctx.cancellationEmail}</b>, not later than midnight of the fifth business day after signing.</p>

          <div style="border:1.5px dashed var(--line);padding:14px 18px;background:#fff;border-radius:4px;margin:10px 0 12px;">
            <p style="margin:0 0 10px 0;font:700 11.5px system-ui, sans-serif;color:var(--navy);text-transform:uppercase;">I HEREBY CANCEL THIS TRANSACTION.</p>
            <div style="display:grid;grid-template-columns:180px 1fr;gap:12px 16px;font-size:11px;align-items:center;">
              <span>(Enter Date of Cancellation):</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;"></span>
              <span>Signature of Client:</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;"></span>
              <span>Printed Name &amp; Phone:</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;"></span>
              <span>Property Address:</span><span style="border-bottom:1.5px solid #94a3b8;min-height:24px;font-weight:600;color:#334155;">${ctx.projectAddress}</span>
              <span>Delivery Method:</span><span style="font-size:10.5px;color:#475569;">[&nbsp; ] Delivered In Person &nbsp;&nbsp;&nbsp;&nbsp; [&nbsp; ] Certified Mail &nbsp;&nbsp;&nbsp;&nbsp; [&nbsp; ] Email to ${ctx.cancellationEmail}</span>
            </div>
          </div>

          <div style="border:1px solid var(--line-subtle);background:#f8fafc;padding:9px 14px;border-radius:4px;display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--navy);margin-bottom:10px;">
            <span><b>Contractor Acknowledgment of Receipt:</b> Signature: ________________________________</span>
            <span>Date Received: ____________________</span>
          </div>

          <div style="text-align:center;font-size:10px;color:var(--mute);">
            Rise Up Roofing and Construction, Inc. &bull; CA License ${ctx.contractorLicense} &bull; 2182 S El Camino Real, Suite 202, Oceanside, CA 92054 &bull; Tel. (442) 266-2443 ext. 2
          </div>
        </div>
      </div>

      ${renderFooter(ctx, 6)}
    </main>
  `;
}
