const https = require('https');
const config = require('./config');

async function generateContent(episode, transcript) {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it as a Railway environment variable.');
  }

  console.log(`✍️  Generating content for: ${episode.title}`);

  const platforms = config.PLATFORMS;
  const prompt = `You are a social media and PR copywriter for The Murder Sheet true crime podcast.

Podcast context: ${config.PODCAST_CONTEXT}
Tone: ${config.TONE}
Fixed hashtags to always include: ${config.HASHTAGS}

Episode title: ${episode.title}
Published: ${episode.pubDate}

Full transcript:
${transcript}

Your job: Generate compelling, platform-specific copy. Pull the most gripping real quotes from the transcript, key revelations, emotional moments, and case details. Use ACTUAL quotes from the hosts — find them in the transcript. Do not invent quotes.

Respond ONLY with valid JSON — no markdown fences, no preamble, no explanation whatsoever.

JSON structure (include ONLY these keys: ${platforms.join(', ')}):
{
  "Instagram": "Strong hook opening line.\\n\\nKey moment or real host quote in quotes. Context sentence.\\n\\nListen now — link in bio.\\n\\n${config.HASHTAGS} #[2-3 case-specific hashtags]",
  "Facebook": "Compelling narrative hook (not a question). 1-2 sentences of case context. Real host quote or key revelation in quotes. What this episode uncovers. Why listeners need to hear this now. Link: [EPISODE LINK]\\n\\n${config.HASHTAGS}",
  "TikTok": "Ultra-punchy hook in first 5 words. One jaw-dropping fact or quote. Under 180 chars total. ${config.HASHTAGS} #TrueCrimeTok #[case hashtag]",
  "X": "Strong declarative statement or real quote. Key revelation or why this matters. Under 230 chars. ${config.HASHTAGS}",
  "Press Release": "FOR IMMEDIATE RELEASE\\n\\n[ALL CAPS HEADLINE — newsworthy angle]\\n\\n[CITY, STATE], [Date] — [Opening paragraph: what the episode covers and why it matters now, written as news]. [Second paragraph: background on the case and its significance]. [Third paragraph: direct quote from Kate or Kevin pulled from the transcript — must be a real quote]. [Fourth paragraph: episode availability and where to listen].\\n\\nABOUT THE MURDER SHEET\\nThe Murder Sheet is an investigative true crime podcast hosted by Kate and Kevin that covers cold cases and wrongful convictions across the United States. Known for its rigorous, evidence-based approach, the show has built a dedicated following among true crime listeners and criminal justice advocates.\\n\\nMEDIA CONTACT\\n[Name]\\n[Email]\\n[Phone]\\nwww.themurdersheet.com"
}`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = await httpsPost('api.anthropic.com', '/v1/messages', body, {
    'Content-Type': 'application/json',
    'x-api-key': config.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  });

  const raw = (response.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = raw.replace(/```json|```/g, '').trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude returned invalid JSON:\n' + raw.slice(0, 300));

  const content = JSON.parse(jsonMatch[0]);
  console.log(`✅ Generated content for ${Object.keys(content).length} platforms`);
  return content;
}

function httpsPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      timeout: 120000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`API error ${res.statusCode}: ${parsed.error?.message || data.slice(0, 200)}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`Could not parse response (HTTP ${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Claude API request timed out')); });
    req.write(body);
    req.end();
  });
}

module.exports = { generateContent };
