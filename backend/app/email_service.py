import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")

def send_password_reset_email(email: str, reset_token: str) -> None:
    # In production, use your actual verified domain
    sender = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    html_content = f"""
    <p>Hello,</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="{reset_link}">{reset_link}</a></p>
    <p>If you did not request this, please ignore this email.</p>
    """
    
    try:
        if resend.api_key:
            resend.Emails.send({
                "from": sender,
                "to": email,
                "subject": "Pitchground - Password Reset",
                "html": html_content
            })
        else:
            print(f"RESEND API KEY NOT SET. Mock email sent to {email}. Reset link: {reset_link}")
    except Exception as e:
        print(f"Failed to send email: {e}")
