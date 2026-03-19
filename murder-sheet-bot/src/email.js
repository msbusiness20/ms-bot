const https = require('https');
const config = require('./config');

async function sendContentEmail(episode, content, transcript) {
  if (!config.SENDGRID_API_KEY) {
    console.warn('⚠️  SENDGRID_API_KEY not set — skipping email. Content logged below.');
    logContentToConsole(episode, content);
    return;
  }

  console.log(`📬 Sending email to ${config.EMAIL_TO}...`);

  const subject = `🎙️ Murder Sheet Content Ready: ${episode.title}`;
  const textBody = buildTextBody(episode, content, transcript);
  const htmlBody = buildHtmlBody(episode, content);

  const payload = {
    personalizations: [{ to: [{ email: config.EMAIL_TO }] }],
    from: { email: config.EMAIL_FROM, name: 'Murder Sheet Content Engine' },
    reply_to: { email: config.EMAIL_TO },
    subject,
    content: [
      { type: 'text/plain', value: textBody },
      { type: 'text/html', value: htmlBody },
    ],
  };

  const body = JSON.stringify(payload);

  await new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 202) {
          console.log(`✅ Email sent to ${config.EMAIL_TO}`);
          resolve();
        } else {
          try {
            const err = JSON.parse(data);
            reject(new Error(`SendGrid error ${res.statusCode}: ${err.errors?.[0]?.message || data}`));
          } catch {
            reject(new Error(`SendGrid HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('SendGrid request timed out')); });
    req.write(body);
    req.end();
  });
}

function buildTextBody(episode, content, transcript) {
  const hr = '─'.repeat(60);
  let body = `THE MURDER SHEET — CONTENT PACKAGE\n`;
  body += `${hr}\n`;
  body += `Episode: ${episode.title}\n`;
  body += `Published: ${episode.pubDate}\n`;
  body += `Generated: ${new Date().toLocaleString()}\n\n`;

  for (const [platform, text] of Object.entries(content)) {
    body += `${hr}\n${platform.toUpperCase()}\n${hr}\n${text}\n\n`;
  }

  if (transcript) {
    body += `${hr}\nFULL TRANSCRIPT\n${hr}\n${transcript}\n`;
  }

  return body;
}

function buildHtmlBody(episode, content) {
  const platformColors = {
    Instagram: '#3B6D11',
    Facebook: '#185FA5',
    TikTok: '#000000',
    X: '#444444',
    'Press Release': '#854F0B',
  };

  const platformSections = Object.entries(content).map(([platform, text]) => {
    const color = platformColors[platform] || '#444';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    return `
      <div style="margin-bottom:32px;">
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
                    color:${color};border-bottom:2px solid ${color};padding-bottom:6px;margin-bottom:12px;">
          ${platform}
        </div>
        <div style="font-size:14px;line-height:1.75;color:#1a1a18;font-family:Georgia,serif;">
          ${escaped}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0ede6;">
<div style="max-width:660px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Header -->
  <div style="background:#1a1a18;padding:28px 32px;">
    <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#f5f4f1;letter-spacing:-0.02em;">
      The Murder Sheet
    </div>
    <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#888780;margin-top:4px;">
      Content Package
    </div>
  </div>

  <!-- Episode info -->
  <div style="padding:20px 32px;background:#f5f4f1;border-bottom:1px solid #e0ddd6;">
    <div style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#1a1a18;line-height:1.4;">
      ${episode.title.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    </div>
    <div style="font-size:12px;color:#888780;margin-top:4px;font-family:monospace;letter-spacing:0.05em;">
      ${episode.pubDate} &nbsp;·&nbsp; Generated ${new Date().toLocaleString()}
    </div>
  </div>

  <!-- Content sections -->
  <div style="padding:28px 32px;">
    ${platformSections}
  </div>

  <!-- Footer -->
  <div style="padding:16px 32px;background:#f5f4f1;border-top:1px solid #e0ddd6;">
    <div style="font-size:11px;color:#888780;text-align:center;font-family:monospace;">
      Generated automatically by Murder Sheet Content Engine
    </div>
  </div>

</div>
</body>
</html>`;
}

function logContentToConsole(episode, content) {
  console.log('\n' + '═'.repeat(60));
  console.log(`CONTENT FOR: ${episode.title}`);
  console.log('═'.repeat(60));
  for (const [platform, text] of Object.entries(content)) {
    console.log(`\n--- ${platform.toUpperCase()} ---`);
    console.log(text);
  }
  console.log('\n' + '═'.repeat(60));
}

module.exports = { sendContentEmail };
