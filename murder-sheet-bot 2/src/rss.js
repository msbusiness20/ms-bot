const https = require('https');
const http = require('http');
const { parseStringPromise } = require('xml2js');
const config = require('./config');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'MurderSheetBot/1.0' } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function fetchFeedEpisodes(limit = 5) {
  console.log(`📡 Fetching RSS feed: ${config.RSS_URL}`);
  const buffer = await fetchUrl(config.RSS_URL);
  const xml = buffer.toString('utf8');
  const parsed = await parseStringPromise(xml, { explicitArray: false });

  const channel = parsed?.rss?.channel;
  if (!channel) throw new Error('Invalid RSS feed — no channel found');

  const rawItems = channel.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  if (!items.length) throw new Error('No episodes found in feed');

  const episodes = items.slice(0, limit).map(item => {
    // Extract audio URL from enclosure
    const enclosure = item.enclosure;
    const audioUrl = enclosure?.$?.url || enclosure?.url || '';

    // Extract description — try multiple fields
    const desc = item['content:encoded'] || item.description || item.summary || '';
    const cleanDesc = stripHtml(desc).slice(0, 2000);

    // Generate a stable GUID
    const guid = item.guid?._ || item.guid || item.link || item.title || '';

    return {
      guid: String(guid).trim(),
      title: String(item.title || '').trim(),
      pubDate: String(item.pubDate || item['dc:date'] || '').trim(),
      description: cleanDesc,
      audioUrl: String(audioUrl).trim(),
      duration: item['itunes:duration'] || '',
      link: item.link || '',
    };
  });

  console.log(`✅ Found ${episodes.length} episode(s) in feed`);
  return episodes;
}

function stripHtml(str) {
  return String(str || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function downloadAudio(audioUrl) {
  console.log(`⬇️  Downloading audio: ${audioUrl}`);
  const buffer = await fetchUrl(audioUrl);
  console.log(`✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  return buffer;
}

module.exports = { fetchFeedEpisodes, downloadAudio };
