const https = require('https');
const FormData = require('form-data');
const config = require('./config');

async function transcribeAudio(audioBuffer, filename = 'episode.mp3') {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it as a Railway environment variable.');
  }

  const MB = audioBuffer.length / 1024 / 1024;
  console.log(`🎤 Sending ${MB.toFixed(1)}MB to Whisper...`);

  // Whisper has a 25MB limit per request
  // For larger files, we chunk and transcribe in parts
  if (MB > 24) {
    console.log('⚠️  File over 24MB — transcribing in chunks...');
    return transcribeInChunks(audioBuffer, filename);
  }

  return transcribeBuffer(audioBuffer, filename);
}

async function transcribeBuffer(buffer, filename) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', buffer, {
      filename: filename,
      contentType: getMimeType(filename),
    });
    form.append('model', 'whisper-1');
    form.append('response_format', 'text');

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 300000, // 5 min timeout for long episodes
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Transcription complete (${data.split(' ').length.toLocaleString()} words)`);
          resolve(data.trim());
        } else {
          try {
            const err = JSON.parse(data);
            reject(new Error(`Whisper API error: ${err.error?.message || data}`));
          } catch {
            reject(new Error(`Whisper HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Whisper request timed out after 5 minutes')); });
    form.pipe(req);
  });
}

async function transcribeInChunks(buffer, filename) {
  // Split buffer into ~20MB chunks (by bytes, not by time — good enough for text output)
  const CHUNK_SIZE = 20 * 1024 * 1024;
  const chunks = [];
  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    chunks.push(buffer.slice(i, i + CHUNK_SIZE));
  }

  console.log(`📦 Splitting into ${chunks.length} chunks...`);
  const transcripts = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🎤 Transcribing chunk ${i + 1}/${chunks.length}...`);
    const ext = filename.split('.').pop() || 'mp3';
    const chunkName = `chunk_${i + 1}.${ext}`;
    const text = await transcribeBuffer(chunks[i], chunkName);
    transcripts.push(text);
    // Small delay between chunks to avoid rate limits
    if (i < chunks.length - 1) await sleep(2000);
  }

  return transcripts.join(' ');
}

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', webm: 'audio/webm' };
  return types[ext] || 'audio/mpeg';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { transcribeAudio };
