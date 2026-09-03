import smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

gmail="certichainofficial.noreply@gmail.com"
app_pw=open("certichain-backend/.env").read().split("GMAIL_APP_PASSWORD=")[1].split("\n")[0].strip().replace(" ","")
to="sunandmoon8484984@gmail.com"
frontend="http://192.168.8.155:3000"
logo=frontend+"/certichain-shield.svg"
link=frontend+"/reset-password?token=demo-decorated"
html=f"""<!DOCTYPE html><html><body style="margin:0;background:#f0f3f8;font-family:Arial,sans-serif"><center><table width="100%" style="background:#f0f3f8;padding:24px 12px"><tr><td align="center"><table width="600" style="max-width:600px"><tr><td style="background:#02275A;border-radius:12px 12px 0 0;padding:16px 24px"><a href="{frontend}" style="text-decoration:none;color:#fff;font-weight:800">CertiChain</a></td></tr><tr><td style="background:#fff;border:1px solid #e6e8ec;padding:32px 28px;border-radius:0 0 12px 12px"><h1 style="color:#02275A">Reset your password</h1><p style="color:#44474e">You requested a password reset. Click below — expires in <b>30 minutes</b>.</p><p><a href="{link}" style="display:inline-block;background:#0462BA;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700">Reset password</a></p><p style="color:#75777f;font-size:12px;word-break:break-all">Or copy: <a href="{link}" style="color:#0462BA">{link}</a></p><p style="color:#02275A"><img src="{logo}" width="32" height="32" alt="CertiChain"/></p></td></tr><tr><td style="text-align:center;color:#75777f;font-size:11px;padding:16px">CertiChain · noreply — do not reply<br/><a href="{frontend}" style="color:#0462BA">{frontend}</a></td></tr></table></td></tr></table></center></body></html>"""
msg=MIMEMultipart("alternative")
msg["From"]=f"CertiChain <{gmail}>"; msg["To"]=to; msg["Subject"]="CertiChain — Decorated test (Thymeleaf layout + shield)"
msg.attach(MIMEText("Reset your password — link: "+link, "plain"))
msg.attach(MIMEText(html, "html"))
import smtplib as _s
with _s.SMTP("smtp.gmail.com",587,timeout=15) as s:
 s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo(); s.login(gmail, app_pw); s.sendmail(gmail,[to],msg.as_string())
print("OK decorated sent")
