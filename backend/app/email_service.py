import os

from dotenv import load_dotenv

load_dotenv()


def send_password_reset_email(email: str, reset_token: str) -> None:
    sender = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    api_key = os.getenv("RESEND_API_KEY", "")

    html_content = f"""
    <p>Hello,</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="{reset_link}">{reset_link}</a></p>
    <p>If you did not request this, please ignore this email.</p>
    """

    if not api_key:
        print(f"RESEND API KEY NOT SET. Mock email sent to {email}. Reset link: {reset_link}")
        return

    try:
        import resend

        resend.api_key = api_key
        resend.Emails.send(
            {
                "from": sender,
                "to": email,
                "subject": "Pitchground - Password Reset",
                "html": html_content,
            }
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
        print(f"Reset link for {email}: {reset_link}")
