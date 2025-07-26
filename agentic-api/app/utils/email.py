import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")

def send_email(to_email: str, subject: str, body: str):
    # Always print for dev/test
    print(f"Send to: {to_email}\nSubject: {subject}\n\n{body}\n")
    if not SENDGRID_API_KEY:
        print("SENDGRID_API_KEY not set, not sending real email.")
        return
    message = Mail(
        from_email='your_verified_sender@yourdomain.com',
        to_emails=to_email,
        subject=subject,
        html_content=body,
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print("SendGrid status code:", response.status_code)
    except Exception as e:
        print("SendGrid error:", e)
