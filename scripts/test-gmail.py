import os, smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def load_env(path="certichain-backend/.env"):
    env={}
    try:
        for line in open(path, encoding="utf-8"):
            if "=" in line and not line.strip().startswith("#"):
                k,v=line.split("=",1); env[k.strip()]=v.strip()
    except FileNotFoundError: pass
    for k in ["GMAIL_ADDRESS","GMAIL_APP_PASSWORD","MAIL_FROM"]:
        if os.getenv(k): env[k]=os.getenv(k).strip()
    return env

env=load_env()
gmail = env.get("GMAIL_ADDRESS","").strip()
app_pw = (env.get("GMAIL_APP_PASSWORD") or "").replace(" ","")
to = "sunandmoon8484984@gmail.com"
from_addr = env.get("MAIL_FROM") or f"CertiChain <{gmail}>"
msg = MIMEMultipart("alternative")
msg["From"]=from_addr; msg["To"]=to; msg["Subject"]="CertiChain Gmail SMTP test — HTML"
text="CertiChain test — if you see this, plain-text works."
html="""<html><body style="font-family:sans-serif">
<h2 style="color:#02275A">CertiChain — Gmail test &#10003;</h2>
<p>This is an <b>HTML</b> test from the new Gmail SMTP (STARTTLS 587).</p>
<p><a href="http://localhost:3000/reset-password?token=demo">Reset link example</a> (30 min expiry in prod)</p>
<hr><p style="color:#888;font-size:12px">Sent via smtplib / smtp.gmail.com:587 — same creds the backend will use.</p>
</body></html>"""
msg.attach(MIMEText(text,"plain")); msg.attach(MIMEText(html,"html"))
print(f"From: {from_addr}\nTo: {to}\nUser: {gmail}\nApp-PW len: {len(app_pw)}")
try:
    with smtplib.SMTP("smtp.gmail.com",587,timeout=15) as s:
        s.ehlo(); s.starttls(context=ssl.create_default_context()); s.ehlo()
        s.login(gmail, app_pw)
        s.sendmail(gmail, [to], msg.as_string())
    print("OK Sent — check inbox/spam for sunandmoon8484984@gmail.com")
except Exception as e:
    print(f"FAIL: {e}"); raise SystemExit(1)
