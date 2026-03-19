// ============================================================
//  MURDER SHEET CONTENT ENGINE — CONFIGURATION
//  All settings live here. Edit and redeploy to change them.
// ============================================================

module.exports = {

  // --- Your podcast RSS feed ---
  RSS_URL: process.env.RSS_URL || 'https://feeds.buzzsprout.com/your-show.rss',

  // --- How often to check for new episodes ---
  // Examples:
  //   '0 * * * *'     = every hour (recommended)
  //   '*/30 * * * *'  = every 30 minutes
  //   '0 */6 * * *'   = every 6 hours
  //   '0 8 * * *'     = daily at 8am UTC
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || '0 * * * *',

  // --- API Keys (set these as Railway environment variables) ---
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  OPENAI_API_KEY:    process.env.OPENAI_API_KEY    || '',
  SENDGRID_API_KEY:  process.env.SENDGRID_API_KEY  || '',

  // --- Email delivery ---
  EMAIL_TO:   process.env.EMAIL_TO   || 'you@gmail.com',
  EMAIL_FROM: process.env.EMAIL_FROM || 'murdersheet@yourdomain.com',

  // --- Podcast context (helps Claude write better copy) ---
  PODCAST_CONTEXT: process.env.PODCAST_CONTEXT ||
    'The Murder Sheet is an investigative true crime podcast hosted by Kate and Kevin, ' +
    'covering cold cases and wrongful convictions in the US. ' +
    'Tone: serious, empathetic, evidence-based.',

  // --- Content settings ---
  TONE: process.env.TONE || 'Serious & investigative',
  HASHTAGS: process.env.HASHTAGS || '#TheMurderSheet #TrueCrime #ColdCase #TrueCrimeCommunity',

  // --- Platforms to generate (comma-separated) ---
  PLATFORMS: (process.env.PLATFORMS || 'Instagram,Facebook,TikTok,X,Press Release').split(','),

  // --- How many recent episodes to check on first run ---
  // After first run, only NEW episodes are processed
  INITIAL_EPISODE_COUNT: parseInt(process.env.INITIAL_EPISODE_COUNT || '1'),

};
