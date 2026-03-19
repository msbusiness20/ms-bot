const fs = require('fs');
const path = require('path');

// On Railway, use /data (persistent volume) if available, otherwise local
const STATE_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(STATE_DIR, 'processed.json');

function loadState() {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    if (!fs.existsSync(STATE_FILE)) return { processedGuids: [], lastCheck: null };
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    console.warn('Could not load state file, starting fresh:', e.message);
    return { processedGuids: [], lastCheck: null };
  }
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Could not save state:', e.message);
  }
}

function hasBeenProcessed(guid) {
  const state = loadState();
  return state.processedGuids.includes(guid);
}

function markProcessed(guid) {
  const state = loadState();
  if (!state.processedGuids.includes(guid)) {
    state.processedGuids.push(guid);
    // Keep only last 100 GUIDs to avoid unbounded growth
    if (state.processedGuids.length > 100) {
      state.processedGuids = state.processedGuids.slice(-100);
    }
  }
  state.lastCheck = new Date().toISOString();
  saveState(state);
}

function getLastCheck() {
  return loadState().lastCheck;
}

module.exports = { hasBeenProcessed, markProcessed, getLastCheck };
