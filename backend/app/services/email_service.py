import base64
import html
import os
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings

RESEND_API_URL = "https://api.resend.com/emails"

async def send_estimate_proposal_email(
    to_email: str,
    customer_name: str,
    estimate_number: str,
    pdf_bytes: bytes,
    pdf_filename: Optional[str] = None,
    subject: Optional[str] = None,
    custom_message: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends an estimate proposal email with the official PDF attached using the Resend API.
    """
    key = api_key or getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if not key:
        return {
            "success": False,
            "missing_key": True,
            "error": "Resend API key is not configured in server environment (RESEND_API_KEY).",
            "recipient": to_email,
        }

    customer_name = html.escape(str(customer_name or "Valued Homeowner"))
    clean_custom_msg = html.escape(str(custom_message.strip())) if custom_message and custom_message.strip() else ""
    estimate_number = html.escape(str(estimate_number or ""))
    if not pdf_filename:
        pdf_filename = f"RiseUp_Roofing_Proposal_{estimate_number}.pdf"
    else:
        pdf_filename = html.escape(str(pdf_filename))

    if not subject:
        subject = f"Your Official Roofing Estimate & Proposal - Rise Up Roofing ({estimate_number})"

    # Encode PDF to base64 for Resend attachment
    encoded_pdf = base64.b64encode(pdf_bytes).decode("utf-8")

    # Email HTML body
    message_paragraphs = ""
    if clean_custom_msg:
        message_paragraphs = f"<div style='background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 16px 0; font-style: italic; color: #334155;'>{clean_custom_msg}</div>"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 24px; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <!-- Header Banner -->
        <div style="background-color: #091b36; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
            Rise Up Roofing &amp; Construction
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
            Roofing | Solar | General Construction • Lic #1096492
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>{customer_name}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">
            Thank you for considering <strong>Rise Up Roofing &amp; Construction</strong> for your roofing project. We have finalized your tailored, 2-page proposal detailing full project specifications, high-grade underlayment options, and our 20-day Lock-In savings.
          </p>

          {message_paragraphs}

          <div style="margin: 24px 0; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <div style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">
              Proposal Attachment Included
            </div>
            <div style="font-size: 13px; color: #15803d; margin-top: 4px;">
              Your official 2-page proposal document (<strong>{pdf_filename}</strong>) is attached to this email for your records and review.
            </div>
          </div>

          <p style="font-size: 14px; color: #334155;">
            Please review the attached PDF at your convenience. Should you have any questions or wish to secure your scheduling window, simply reply directly to this email or call our team at <strong>(760) 622 - 1230</strong>.
          </p>

          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <strong>Rise Up Roofing &amp; Construction</strong><br>
            2182 S El Camino Real, Ste 202, Oceanside, CA 92054<br>
            Phone: (760) 622 - 1230 • Email: marc@riseuprac.com<br>
            Website: <a href="https://riseuprac.com" style="color: #0284c7; text-decoration: none;">https://riseuprac.com</a>
          </div>
        </div>

        <!-- Trust Badges Strip -->
        <div style="background-color: #f8fafc; padding: 12px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em;">
          Owens Corning Preferred Contractor &bull; Veteran Owned &bull; BBB A+ Accredited
        </div>
      </div>
    </body>
    </html>
    """

    # From address: Resend verified custom domain
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "Rise Up Roofing <estimates@riseuprac.com>")

    resend_payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "attachments": [
            {
                "filename": pdf_filename,
                "content": encoded_pdf,
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(RESEND_API_URL, json=resend_payload, headers=headers)
        if resp.status_code in (200, 201):
            return {
                "success": True,
                "data": resp.json(),
                "recipient": to_email,
                "filename": pdf_filename,
            }
        else:
            error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"error": resp.text}
            return {
                "success": False,
                "status_code": resp.status_code,
                "error": error_data,
                "recipient": to_email,
            }


async def send_customer_welcome_inquiry_email(
    to_email: str,
    customer_name: str,
    service_type: Optional[str] = "Roofing Inquiry",
    city_or_address: Optional[str] = "San Diego County, CA",
    custom_message: Optional[str] = None,
    estimate_range: Optional[str] = None,
    form_type: Optional[str] = "contact",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends an immediate, branded Welcome & Confirmation email to a homeowner
    who submitted a contact query or estimate request on the website.
    """
    key = api_key or getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if not key or not to_email:
        return {"success": False, "missing_key": True, "error": "Missing key or email"}

    customer_name = html.escape(str(customer_name or "Valued Homeowner"))
    service_type = html.escape(str(service_type or "Roofing Inquiry"))
    city_or_address = html.escape(str(city_or_address or "San Diego County, CA"))
    clean_custom_msg = html.escape(str(custom_message.strip())) if custom_message and custom_message.strip() else ""
    clean_estimate_range = html.escape(str(estimate_range)) if estimate_range else None

    subject = f"Thank you for contacting Rise Up Roofing - Project Inquiry Received"
    if form_type in ("estimator", "estimator_full", "calculator"):
        subject = f"Your Instant Roofing Estimate Details - Rise Up Roofing & Construction"

    range_banner = ""
    if clean_estimate_range:
        range_banner = f"""
        <div style="margin: 20px 0; padding: 16px; background-color: #f0f9ff; border-radius: 10px; border: 1px solid #bae6fd; text-align: center;">
          <span style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.08em; display: block;">Preliminary Estimate Range</span>
          <span style="font-size: 20px; font-weight: 900; color: #0c4a6e; display: block; margin-top: 4px;">{clean_estimate_range}</span>
          <span style="font-size: 11px; color: #0284c7; display: block; margin-top: 2px;">Subject to on-site roof inspection &amp; scope verification</span>
        </div>
        """

    notes_section = ""
    if clean_custom_msg:
        notes_section = f"""
        <div style="margin: 16px 0; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px;">
          <strong style="font-size: 11px; text-transform: uppercase; color: #64748b; display: block; letter-spacing: 0.05em;">Your Project Notes:</strong>
          <span style="font-size: 13px; color: #334155; font-style: italic;">{clean_custom_msg}</span>
        </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 24px; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background-color: #091b36; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
            Rise Up Roofing &amp; Construction
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
            Roofing | Solar | General Construction • Lic #1096492
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px;">
          <h2 style="font-size: 18px; font-weight: 800; color: #091b36; margin-top: 0;">We've Received Your Inquiry!</h2>
          <p style="font-size: 14px; color: #334155; margin-top: 0;">
            Hello <strong>{customer_name}</strong>,
          </p>
          <p style="font-size: 14px; color: #334155;">
            Thank you for reaching out to <strong>Rise Up Roofing &amp; Construction</strong>. We have received your project details for <strong>{service_type}</strong> in <strong>{city_or_address}</strong>.
          </p>

          {range_banner}
          {notes_section}

          <div style="margin: 24px 0; padding: 18px; background-color: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
            <div style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">
              What Happens Next?
            </div>
            <ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: #15803d; line-height: 1.6;">
              <li>Our licensed roofing specialist is reviewing your project requirements.</li>
              <li>We will follow up with you directly within <strong>1 business hour</strong> (or during business hours: Mon–Sat, 7am–6pm).</li>
              <li>We will arrange a free, no-obligation on-site roof inspection with photo diagnostics if required.</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #334155;">
            Need immediate assistance or emergency leak repair? Feel free to call our direct dispatch line anytime at <strong>(760) 622 - 1230</strong>.
          </p>

          <!-- Contact Footer -->
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <strong>Rise Up Roofing &amp; Construction</strong><br>
            2182 S El Camino Real, Ste 202, Oceanside, CA 92054<br>
            Phone: <a href="tel:7606221230" style="color: #0284c7; text-decoration: none;">(760) 622 - 1230</a> • Email: <a href="mailto:estimates@riseuprac.com" style="color: #0284c7; text-decoration: none;">estimates@riseuprac.com</a><br>
            Website: <a href="https://riseuprac.com" style="color: #0284c7; text-decoration: none;">https://riseuprac.com</a>
          </div>
        </div>

        <!-- Trust Strip -->
        <div style="background-color: #f8fafc; padding: 12px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em;">
          Owens Corning Preferred Contractor &bull; Veteran Owned &bull; BBB A+ Accredited
        </div>
      </div>
    </body>
    </html>
    """

    from_email = getattr(settings, "RESEND_FROM_EMAIL", "Rise Up Roofing <estimates@riseuprac.com>")
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return {"success": True, "data": resp.json(), "recipient": to_email}
            return {"success": False, "status_code": resp.status_code, "error": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_contract_email(
    to_email: str,
    customer_name: str,
    contract_number: str,
    pdf_bytes: bytes,
    pdf_filename: Optional[str] = None,
    subject: Optional[str] = None,
    custom_message: Optional[str] = None,
    signing_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends a Home Improvement Contract email with the PDF attached via the Resend API,
    and a direct link to the digital contract signing wizard.
    """
    key = api_key or getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if not key:
        return {
            "success": False,
            "missing_key": True,
            "error": "Resend API key is not configured in server environment (RESEND_API_KEY).",
            "recipient": to_email,
        }

    customer_name = html.escape(str(customer_name or "Valued Homeowner"))
    contract_number = html.escape(str(contract_number or ""))
    clean_custom_msg = html.escape(str(custom_message.strip())) if custom_message and custom_message.strip() else ""

    if not pdf_filename:
        pdf_filename = f"RiseUp_Contract_{contract_number}.pdf"
    else:
        pdf_filename = html.escape(str(pdf_filename))

    if not subject:
        subject = f"Your Home Improvement Contract – Rise Up Roofing ({contract_number})"

    encoded_pdf = base64.b64encode(pdf_bytes).decode("utf-8")

    message_paragraphs = ""
    if clean_custom_msg:
        message_paragraphs = (
            f"<div style='background-color:#f8fafc;border-left:4px solid #0284c7;"
            f"padding:12px 16px;margin:16px 0;font-style:italic;color:#334155;'>"
            f"{clean_custom_msg}</div>"
        )

    signing_cta_html = ""
    if signing_url:
        signing_cta_html = f"""
          <div style="margin:28px 0 24px;text-align:center;">
            <a href="{signing_url}" target="_blank" style="background-color:#1a5ba5;color:#ffffff;padding:15px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;display:inline-block;box-shadow:0 4px 12px rgba(26,91,165,0.25);">
              Review &amp; Sign Contract Online &rarr;
            </a>
            <div style="margin-top:8px;font-size:12px;color:#64748b;">
              California UETA &amp; ESIGN compliant electronic signature portal
            </div>
          </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a;margin:0;padding:24px;background-color:#f1f5f9;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
        <div style="background-color:#091b36;padding:24px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Rise Up Roofing &amp; Construction</h1>
          <p style="margin:4px 0 0 0;font-size:11px;color:#38bdf8;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;">Roofing | Solar | General Construction &bull; Lic #1096492</p>
        </div>
        <div style="padding:28px 24px;">
          <p style="font-size:15px;margin-top:0;">Dear <strong>{customer_name}</strong>,</p>
          <p style="font-size:14px;color:#334155;">
            Please find attached your official <strong>Home Improvement Contract</strong> from
            <strong>Rise Up Roofing &amp; Construction</strong>. You may review the complete contract specifications,
            progress payment milestones, and statutory cancellation notices step-by-step and sign securely online:
          </p>
          {signing_cta_html}
          {message_paragraphs}
          <div style="margin:24px 0;padding:16px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Contract Attachment Included</div>
            <div style="font-size:13px;color:#15803d;margin-top:4px;">
              Your official copy (<strong>{pdf_filename}</strong>) is attached to this email for your offline records.
            </div>
          </div>
          <div style="margin:20px 0;padding:14px 16px;background-color:#fff7ed;border-radius:8px;border:1px solid #fed7aa;">
            <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">Three-Day Right to Cancel</div>
            <div style="font-size:13px;color:#7c2d12;margin-top:4px;">
              Under California law, you have the right to cancel this contract within
              <strong>three business days</strong> of signing. A Notice of Cancellation form is
              included as Exhibit A at the end of the contract document.
            </div>
          </div>
          <p style="font-size:14px;color:#334155;">
            If you have any questions, please reply to this email or call us at <strong>(760) 622 - 1230</strong>.
          </p>
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            <strong>Rise Up Roofing &amp; Construction</strong><br>
            2182 S El Camino Real, Ste 202, Oceanside, CA 92054<br>
            Phone: (760) 622 - 1230 &bull; Email: marc@riseuprac.com<br>
            Website: <a href="https://riseuprac.com" style="color:#0284c7;text-decoration:none;">https://riseuprac.com</a>
          </div>
        </div>
        <div style="background-color:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;">
          Owens Corning Preferred Contractor &bull; Veteran Owned &bull; BBB A+ Accredited
        </div>
      </div>
    </body>
    </html>
    """

    from_email = getattr(settings, "RESEND_FROM_EMAIL", "Rise Up Roofing <estimates@riseuprac.com>")
    resend_payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "attachments": [{"filename": pdf_filename, "content": encoded_pdf}],
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(RESEND_API_URL, json=resend_payload, headers=headers)
        if resp.status_code in (200, 201):
            return {
                "success": True,
                "data": resp.json(),
                "recipient": to_email,
                "filename": pdf_filename,
            }
        else:
            error_data = (
                resp.json()
                if resp.headers.get("content-type", "").startswith("application/json")
                else {"error": resp.text}
            )
            return {
                "success": False,
                "status_code": resp.status_code,
                "error": error_data,
                "recipient": to_email,
            }


async def send_internal_lead_alert_email(
    lead_id: int | str,
    customer_name: str,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    service_type: Optional[str] = "Roofing Project",
    estimated_value: Optional[float] = None,
    notes: Optional[str] = None,
    source_detail: Optional[str] = "Website Form",
    priority: Optional[str] = "high",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends an immediate, high-priority alert to the internal sales/estimating team
    when a new inquiry or estimate request is submitted from the website.
    """
    key = api_key or getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if not key:
        return {"success": False, "missing_key": True, "error": "Missing key"}

    to_emails = ["estimates@riseuprac.com", "marc@riseuprac.com", "imzeeshankhann@gmail.com"]
    # Filter unique valid recipients
    to_emails = list(dict.fromkeys(to_emails))

    safe_name = html.escape(str(customer_name or "New Lead"))
    safe_phone = html.escape(str(phone or "Not provided"))
    safe_email = html.escape(str(email or "Not provided"))
    safe_service = html.escape(str(service_type or "Roofing Project"))
    safe_notes = html.escape(str(notes.strip())) if notes and notes.strip() else "None provided"
    safe_source = html.escape(str(source_detail or "Website Form"))

    val_str = f"${estimated_value:,.0f}" if estimated_value and estimated_value > 0 else "Pending Inspection"
    subject = f"🚨 New Lead Alert: {safe_name} – {safe_service} ({val_str})"

    location_str = html.escape(f"{address or ''}, {city or 'Oceanside'}".strip(", "))
    crm_pipeline_url = f"https://crm.riseuprac.com/pipeline"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 0; padding: 20px; background-color: #0b1329;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
        
        <!-- Urgent Alert Banner -->
        <div style="background-color: #0284c7; padding: 18px 24px; color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #bae6fd; display: block;">
              ⚡ Instant Lead Dispatch Alert
            </span>
            <h1 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900; color: #ffffff;">
              New Website Inquiry Received
            </h1>
          </div>
        </div>

        <div style="padding: 24px;">
          <!-- Lead Primary Info Box -->
          <div style="padding: 16px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700; width: 130px;">Customer Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 800; font-size: 15px;">{customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700;">Phone Number:</td>
                <td style="padding: 6px 0; color: #0284c7; font-weight: 800;">
                  <a href="tel:{phone}" style="color: #0284c7; text-decoration: none; font-size: 14px;">{phone or 'Not provided'}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700;">Email Address:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">
                  <a href="mailto:{email}" style="color: #0284c7; text-decoration: none;">{email or 'Not provided'}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700;">Property Location:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{location_str or 'Oceanside / North County'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700;">Service Requested:</td>
                <td style="padding: 6px 0; color: #091b36; font-weight: 800;">{service_type}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700;">Estimated Value:</td>
                <td style="padding: 6px 0; color: #16a34a; font-weight: 900; font-size: 14px;">{val_str}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 700;">Lead Source:</td>
                <td style="padding: 6px 0; color: #475569; font-weight: 600;">{source_detail}</td>
              </tr>
            </table>
          </div>

          <!-- Notes / Inquiry Message -->
          {f'''
          <div style="margin-bottom: 20px;">
            <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Customer Notes / Inquiry:</span>
            <div style="padding: 12px 16px; background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 6px; font-size: 13px; color: #1e293b; font-style: italic;">
              {notes.strip()}
            </div>
          </div>
          ''' if notes and notes.strip() else ''}

          <!-- Action CTA Button -->
          <div style="text-align: center; margin: 28px 0 10px 0;">
            <a href="{crm_pipeline_url}" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(22,163,74,0.35); text-transform: uppercase; letter-spacing: 0.05em;">
              👉 Open in CRM &amp; Claim Lead
            </a>
          </div>
          <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px;">
            Lead ID: #{lead_id} • Unclaimed • Follow-up SLA: 1 Hour
          </p>
        </div>

        <div style="background-color: #f8fafc; padding: 12px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
          Rise Up Roofing CRM Dispatch Engine • <a href="https://crm.riseuprac.com" style="color: #0284c7; text-decoration: none;">crm.riseuprac.com</a>
        </div>
      </div>
    </body>
    </html>
    """

    from_email = getattr(settings, "RESEND_FROM_EMAIL", "Rise Up Roofing <estimates@riseuprac.com>")
    payload = {
        "from": from_email,
        "to": to_emails,
        "subject": subject,
        "html": html_body,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return {"success": True, "data": resp.json(), "recipients": to_emails}
            return {"success": False, "status_code": resp.status_code, "error": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def send_team_invitation_email(
    to_email: str,
    inviter_name: str,
    role_name: str,
    accept_url: str,
    expires_at: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends a branded team invitation email via Resend to a newly invited user.
    From: verification@riseuprac.com
    """
    key = api_key or getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if not key:
        return {"success": False, "missing_key": True, "error": "Missing Resend API key"}

    inviter_name = html.escape(str(inviter_name or "A team administrator"))
    role_name = html.escape(str(role_name or "Team Member"))
    expires_at = html.escape(str(expires_at or "48 hours"))

    subject = "You've been invited to join Rise Up Roofing"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 24px; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">

        <!-- Header with Logo -->
        <div style="background-color: #091b36; padding: 28px 24px; text-align: center; color: #ffffff;">
          <img src="https://riseuprac.com/logo-white.svg" alt="Rise Up Roofing" style="height: 42px; margin-bottom: 10px; display: inline-block;">
          <p style="margin: 0; font-size: 11px; color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
            Roofing | Solar | General Construction &bull; Lic #1096492
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 28px;">
          <h2 style="font-size: 22px; font-weight: 800; color: #091b36; margin: 0 0 16px 0;">You're Invited to Join the Team!</h2>

          <p style="font-size: 14px; color: #334155; margin: 0 0 12px 0;">
            <strong>{inviter_name}</strong> has invited you to join <strong>Rise Up Roofing &amp; Construction</strong> on our team management platform.
          </p>

          <!-- Role Assignment Card -->
          <div style="margin: 20px 0; padding: 16px; background-color: #f0f9ff; border-radius: 10px; border: 1px solid #bae6fd;">
            <div style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.08em;">Your Assigned Role</div>
            <div style="font-size: 18px; font-weight: 900; color: #0c4a6e; margin-top: 4px;">{role_name}</div>
            <div style="font-size: 11px; color: #0284c7; margin-top: 2px;">You'll inherit this role's permissions immediately upon joining.</div>
          </div>

          <p style="font-size: 14px; color: #334155; margin: 16px 0;">
            Click the button below to set up your name, profile photo, and password. It only takes a minute.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="{accept_url}" style="display: inline-block; background: linear-gradient(135deg, #E06800, #FF8A00); color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; padding: 16px 36px; border-radius: 10px; box-shadow: 0 4px 16px rgba(224,104,0,0.35); text-transform: uppercase; letter-spacing: 0.05em;">
              Accept Invitation &amp; Join Team
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 8px 0 0 0;">
            This invitation link will expire on <strong style="color: #64748b;">{expires_at}</strong>.
          </p>

          <!-- Footer Contact -->
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <strong>Rise Up Roofing &amp; Construction</strong><br>
            2182 S El Camino Real, Ste 202, Oceanside, CA 92054<br>
            Phone: <a href="tel:7606221230" style="color: #0284c7; text-decoration: none;">(760) 622 - 1230</a> &bull; Email: <a href="mailto:marc@riseuprac.com" style="color: #0284c7; text-decoration: none;">marc@riseuprac.com</a><br>
            Website: <a href="https://riseuprac.com" style="color: #0284c7; text-decoration: none;">https://riseuprac.com</a>
          </div>
        </div>

        <!-- Trust Badges Strip -->
        <div style="background-color: #f8fafc; padding: 12px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em;">
          Owens Corning Preferred Contractor &bull; Veteran Owned &bull; BBB A+ Accredited
        </div>
      </div>
    </body>
    </html>
    """

    from_email = getattr(settings, "RESEND_VERIFICATION_EMAIL", "Rise Up Roofing <verification@riseuprac.com>")
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return {"success": True, "data": resp.json(), "recipient": to_email}
            return {"success": False, "status_code": resp.status_code, "error": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_otp_verification_email(
    to_email: str,
    otp: str,
    recipient_name: Optional[str] = "Team Member",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends a branded 6-digit OTP verification code via Resend to verify an invited
    user's identity during initial login / setup.
    """
    key = api_key or getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    recipient_name = html.escape(str(recipient_name or "Team Member"))
    clean_otp = html.escape(str(otp or "").strip())
    # Format OTP with spaced digits for aesthetic readability
    spaced_otp = " ".join(list(clean_otp))

    subject = f"Your Rise Up Verification Code: {clean_otp}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 24px; background-color: #f1f5f9;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">

        <!-- Header with Logo -->
        <div style="background-color: #091b36; padding: 26px 24px; text-align: center; color: #ffffff;">
          <img src="https://riseuprac.com/logo-white.svg" alt="Rise Up Roofing" style="height: 38px; margin-bottom: 8px; display: inline-block;">
          <p style="margin: 0; font-size: 11px; color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
            Identity Verification &bull; Lic #1096492
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 28px; text-align: center;">
          <h2 style="font-size: 20px; font-weight: 800; color: #091b36; margin: 0 0 12px 0;">Confirm Your Identity</h2>

          <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0; text-align: left;">
            Hello <strong>{recipient_name}</strong>,<br><br>
            A first-time sign in was initiated for your Rise Up CRM account. Please enter the following 6-digit confirmation code on the login screen to verify it's you and complete your account setup:
          </p>

          <!-- OTP Box -->
          <div style="margin: 28px auto; padding: 18px 24px; background: #f0f9ff; border-radius: 12px; border: 2px dashed #0284c7; max-width: 320px;">
            <div style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">One-Time Verification Code</div>
            <div style="font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #0c4a6e;">
              {spaced_otp}
            </div>
            <div style="font-size: 11px; color: #0284c7; margin-top: 6px; font-weight: 600;">Valid for 10 minutes</div>
          </div>

          <p style="font-size: 12px; color: #64748b; margin: 20px 0 0 0; text-align: left;">
            If you did not request this verification code, please ignore this email or notify your system administrator immediately.
          </p>

          <!-- Footer Contact -->
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: left;">
            <strong>Rise Up Roofing &amp; Construction</strong><br>
            2182 S El Camino Real, Ste 202, Oceanside, CA 92054<br>
            Phone: (760) 622 - 1230 &bull; Email: marc@riseuprac.com
          </div>
        </div>
      </div>
    </body>
    </html>
    """

    if not key:
        return {"success": False, "missing_key": True, "error": "Missing Resend API key", "otp": clean_otp}

    from_email = getattr(settings, "RESEND_VERIFICATION_EMAIL", "Rise Up Roofing <verification@riseuprac.com>")
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return {"success": True, "data": resp.json(), "recipient": to_email}
            return {"success": False, "status_code": resp.status_code, "error": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

