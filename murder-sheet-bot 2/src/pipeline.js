const { fetchFeedEpisodes, downloadAudio } = require('./rss');
const { transcribeAudio } = require('./transcribe');
const { generateContent } = require('./generate');
const { sendContentEmail } = require('./email');
const { hasBeenProcessed, markProcessed, getLastCheck } = require('./state');
const config = require('./config');

async function checkFeed() {
  const startTime = Date.now();
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔍 Checking feed at ${new Date().toISOString()}`);
  const lastCheck = getLastCheck();
  if (lastCheck) console.log(`   Last check: ${lastCheck}`);

  let episodes;
  try {
    episodes = await fetchFeedEpisodes(config.INITIAL_EPISODE_COUNT);
  } catch (err) {
    console.error(`❌ Failed to fetch RSS feed: ${err.message}`);
    return;
  }

  // Filter to only unprocessed episodes
  const newEpisodes = episodes.filter(ep => {
    if (!ep.guid) {
      console.warn(`⚠️  Episode "${ep.title}" has no GUID — skipping`);
      return false;
    }
    if (hasBeenProcessed(ep.guid)) {
      console.log(`⏭️  Already processed: ${ep.title}`);
      return false;
    }
    return true;
  });

  if (!newEpisodes.length) {
    console.log(`✅ No new episodes. Next check in ~1 hour.`);
    return;
  }

  console.log(`🆕 Found ${newEpisodes.length} new episode(s) to process`);

  for (const episode of newEpisodes) {
    await processEpisode(episode);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Pipeline complete in ${elapsed} minutes`);
}

async function processEpisode(episode) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📺 Processing: ${episode.title}`);
  console.log(`   Published:  ${episode.pubDate}`);
  console.log(`   Audio URL:  ${episode.audioUrl || '(none)'}`);
  console.log(`${'═'.repeat(50)}`);

  let transcript = '';

  // Step 1: Transcribe
  if (episode.audioUrl && config.OPENAI_API_KEY) {
    try {
      console.log('\n[1/3] Transcribing audio...');
      const audioBuffer = await downloadAudio(episode.audioUrl);
      const filename = episode.audioUrl.split('/').pop().split('?')[0] || 'episode.mp3';
      transcript = await transcribeAudio(audioBuffer, filename);
    } catch (err) {
      console.error(`⚠️  Transcription failed: ${err.message}`);
      console.log('   Falling back to show notes/description for content generation.');
      transcript = episode.description;
    }
  } else {
    if (!episode.audioUrl) console.log('\n[1/3] No audio URL in feed — using show notes');
    if (!config.OPENAI_API_KEY) console.log('\n[1/3] No OPENAI_API_KEY set — using show notes');
    transcript = episode.description;
  }

  if (!transcript || transcript.trim().length < 50) {
    console.error('❌ No usable content for this episode — skipping');
    markProcessed(episode.guid);
    return;
  }

  // Step 2: Generate content
  let content;
  try {
    console.log('\n[2/3] Generating social content...');
    content = await generateContent(episode, transcript);
  } catch (err) {
    console.error(`❌ Content generation failed: ${err.message}`);
    return; // Don't mark processed — will retry next run
  }

  // Step 3: Send email
  try {
    console.log('\n[3/3] Sending email...');
    await sendContentEmail(episode, content, transcript);
  } catch (err) {
    console.error(`❌ Email failed: ${err.message}`);
    // Still mark processed so we don't retry endlessly
    // (content was generated, just email failed)
    console.log('   Content was generated — marking processed to avoid duplicate runs.');
    console.log('   Check your SendGrid configuration.');
  }

  // Mark as processed so we don't run it again
  markProcessed(episode.guid);
  console.log(`\n✅ Done: ${episode.title}`);
}

module.exports = { checkFeed };
