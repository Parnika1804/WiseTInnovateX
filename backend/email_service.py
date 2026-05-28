import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ---------------------------------------------------------------------------
# SMTP Configuration — set these as environment variables, or fill defaults:
#
#   For Gmail:
#     SMTP_HOST=smtp.gmail.com
#     SMTP_PORT=587
#     SMTP_USER=yourname@gmail.com
#     SMTP_PASSWORD=your_app_password   <-- use an App Password, not your real password
#     FROM_EMAIL=yourname@gmail.com
#
#   For Outlook/Hotmail:
#     SMTP_HOST=smtp.office365.com
#     SMTP_PORT=587
#     SMTP_USER=yourname@outlook.com
#     SMTP_PASSWORD=your_password
#
#   NOTE for Gmail: enable 2FA on your Google account, then generate an
#   "App Password" at https://myaccount.google.com/apppasswords
#   Use that 16-char password as SMTP_PASSWORD — not your Gmail login password.
# ---------------------------------------------------------------------------

SMTP_HOST     = os.environ.get("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER     = os.environ.get("SMTP_USER",     "wisetinnovatex@gmail.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "dioa ejij jdqo zwiy")        # <-- fill this in
FROM_EMAIL    = os.environ.get("FROM_EMAIL",    SMTP_USER)
FROM_NAME     = os.environ.get("FROM_NAME",     "WiseTInnovateX Team")


def send_email(to_email: str, subject: str, body: str) -> dict:
    """
    Sends an email via SMTP (TLS).
    Falls back to console logging if SMTP_PASSWORD is not set (safe for dev).
    Returns {"success": True} or {"success": False, "error": "..."}.
    """
    if not SMTP_PASSWORD:
        print(f"\n[EMAIL LOG — no SMTP password set]\nTo: {to_email}\nSubject: {subject}\n{body}\n{'-'*60}")
        return {"success": False, "error": "SMTP_PASSWORD not set — email logged to console only"}

    # Build HTML body from plain text
    html_body = (
        "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;"
        "padding:24px;border:1px solid #e0e0e0;border-radius:8px;color:#333'>"
        + body.replace("\n", "<br>")
        + "<hr style='margin-top:32px;border:none;border-top:1px solid #eee'>"
        "<p style='font-size:12px;color:#999'>Sent by WiseTInnovateX Event Platform</p></div>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(body,      "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL SENT ✓] To: {to_email} | Subject: {subject}")
        return {"success": True}
    except smtplib.SMTPAuthenticationError:
        error_msg = "SMTP authentication failed — check SMTP_USER and SMTP_PASSWORD (Gmail needs an App Password)"
        print(f"[EMAIL FAILED ✗] {error_msg}")
        return {"success": False, "error": error_msg}
    except Exception as exc:
        print(f"[EMAIL ERROR] {exc}")
        return {"success": False, "error": str(exc)}


def send_bulk_emails(recipients: list[dict], subject: str, body: str) -> dict:
    """
    Send the same email to multiple recipients.
    `recipients` is a list of {"email": "...", "name": "..."} dicts.
    Returns {"sent": N, "failed": M, "errors": [...]}.
    """
    sent, failed, errors = 0, 0, []
    for r in recipients:
        result = send_email(r["email"], subject, body)
        if result["success"]:
            sent += 1
        else:
            failed += 1
            errors.append({"email": r["email"], "error": result.get("error")})
    return {"sent": sent, "failed": failed, "errors": errors}