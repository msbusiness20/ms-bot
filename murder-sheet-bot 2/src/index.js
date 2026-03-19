const cron = require('node-cron');
const { checkFeed } = require('./pipeline');
const config = require('./config');

console.log('🎙️  Murder Sheet Content Engine starting...');
console.log(`📡 RSS feed: ${config.RSS_URL}`);
console.log(`⏰ Check interval: ${config.CRON_SCHEDULE}`);
console.log(`📬 Delivering to: ${config.EMAIL_TO}`);

// Run immediately on startup so you don't wait for first cron tick
(async () => {
  console.log('\n▶ Running initial feed check...');
  await checkFeed();
})();

// Then run on schedule
cron.schedule(config.CRON_SCHEDULE, async () => {
  console.log(`\n⏰ [${new Date().toISOString()}] Scheduled check triggered`);
  await checkFeed();
});

console.log('\n✅ Scheduler running. Waiting for next check...\n');
