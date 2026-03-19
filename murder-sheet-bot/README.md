# The Murder Sheet — Content Engine

Automated pipeline that watches your RSS feed, transcribes new episodes with Whisper, generates social media posts and press releases with Claude, and emails everything to your inbox.

## What it does

Every hour (configurable), the bot:
1. Checks your RSS feed for new episodes
2. Downloads the audio and transcribes it with OpenAI Whisper
3. Sends the full transcript to Claude to generate:
   - Instagram post (with hashtags)
   - Facebook post
   - TikTok caption
   - X / Twitter post
   - Full press release (local, regional, national)
4. Emails everything to your inbox via SendGrid

---

## Deploy to Railway (10 minutes)

### Step 1 — Push to GitHub

1. Create a new repo at github.com (call it `murder-sheet-bot`)
2. In your terminal, from this folder:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/murder-sheet-bot.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) and sign up (free)
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub account and select `murder-sheet-bot`
4. Railway will detect the Node.js app and start building

### Step 3 — Set environment variables

In Railway, click your service → **Variables** tab → add these:

| Variable | Value |
|----------|-------|
| `RSS_URL` | Your podcast RSS feed URL |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (sk-ant-...) |
| `OPENAI_API_KEY` | Your OpenAI API key (sk-proj-...) |
| `SENDGRID_API_KEY` | Your SendGrid API key (SG...) |
| `EMAIL_TO` | Your email address |
| `EMAIL_FROM` | A verified sender email (see SendGrid note below) |

**Optional variables** (have defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `CRON_SCHEDULE` | `0 * * * *` | Cron expression for check frequency |
| `TONE` | `Serious & investigative` | Content tone |
| `HASHTAGS` | `#TheMurderSheet #TrueCrime...` | Fixed hashtags |
| `PLATFORMS` | `Instagram,Facebook,TikTok,X,Press Release` | Which platforms to generate |
| `PODCAST_CONTEXT` | (default description) | Context fed to Claude |

### Step 4 — Deploy

After setting variables, Railway will automatically redeploy. Check the **Logs** tab to see it running.

You'll see output like:
```
🎙️  Murder Sheet Content Engine starting...
📡 RSS feed: https://...
⏰ Check interval: 0 * * * *
▶ Running initial feed check...
📡 Fetching RSS feed...
✅ Found 1 episode(s) in feed
🆕 Found 1 new episode(s) to process
[1/3] Transcribing audio...
[2/3] Generating social content...
[3/3] Sending email...
✅ Email sent to you@gmail.com
```

---

## SendGrid setup (free)

1. Sign up at [sendgrid.com](https://sendgrid.com) — free tier allows 100 emails/day
2. Go to **Settings** → **API Keys** → Create API key (Full Access)
3. Go to **Settings** → **Sender Authentication** → verify a single sender email
4. Use that verified email as `EMAIL_FROM`

---

## Changing the check frequency

Edit `CRON_SCHEDULE` in Railway variables:

| Value | Meaning |
|-------|---------|
| `0 * * * *` | Every hour (default) |
| `*/30 * * * *` | Every 30 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 8 * * 2` | Every Tuesday at 8am UTC |
| `0 9 * * *` | Daily at 9am UTC |

---

## Cost estimate

For ~4 episodes/month (weekly podcast):
- Railway: ~$5/month (Hobby plan)
- OpenAI Whisper: ~$0.36/hour of audio × 4 = ~$1.50/month
- Anthropic Claude: ~$0.05/episode × 4 = ~$0.20/month
- SendGrid: Free (under 100 emails/day)

**Total: ~$7/month**

---

## Troubleshooting

**No email received:** Check Railway logs. If SendGrid isn't configured, content is logged to the console (Logs tab in Railway).

**Transcription failed:** The bot falls back to show notes. Check that `OPENAI_API_KEY` is set correctly.

**"Already processed" for all episodes:** Normal — the bot only runs on NEW episodes after the first run.

**Feed not found:** Make sure `RSS_URL` is a direct RSS/XML feed URL, not a webpage.
