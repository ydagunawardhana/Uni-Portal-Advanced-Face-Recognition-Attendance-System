import smtplib
import ssl
from email.message import EmailMessage

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USER = "ydmaxx43@gmail.com" 
SMTP_PASSWORD = "zucytjngeujifxgl"


def send_rejection_email(student_email: str, student_name: str, reason: str):
    """
    Sends a professional HTML rejection email to the student.
    This should be called as a BackgroundTask to avoid blocking.
    """
    header = "Uni Portal Admin"
    subject = "Rejection of Your Pre-Registration Application"
    
    from datetime import datetime
    current_year = datetime.now().year

    # HTML Content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 10px;
                background-color: #ffffff;
            }}
            .header {{
                background-color: #f44336;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .content {{
                padding: 30px;
                color: #333333;
                line-height: 1.6;
            }}
            .reason-box {{
                background-color: #fff9f9;
                border-left: 4px solid #f44336;
                padding: 15px;
                margin: 20px 0;
                font-style: italic;
                color: #555555;
            }}
            .footer {{
                text-align: center;
                font-size: 12px;
                color: #777777;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Rejection of Your Pre-Registration Application</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{student_name}</strong>,</p>
                <p>Thank you for your interest in our university and for submitting your pre-registration application.</p>
                <p>After careful review of your submission, we regret to inform you that your application has been <strong>rejected</strong> for the following reason:</p>
                
                <div class="reason-box">
                    "{reason}"
                </div>
                
                <p>If you believe this was in error or have further documentation to provide, please feel free to submit a new application with the corrected information.</p>
                <p>Best regards,<br>
                <strong>Academic Admissions Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message, please do not reply directly to this email.</p>
                <p>&copy; {current_year} University Management System</p>
            </div>
        </div>
    </body>
    </html>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = header 
    msg["To"] = student_email
    msg.set_content(f"Dear {student_name}, your application was rejected for the following reason: {reason}")
    msg.add_alternative(html_content, subtype="html")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)