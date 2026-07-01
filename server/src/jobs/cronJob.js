const cron = require('node-cron');
const { runSchedulerTick } = require('../services/schedulerService');

// Run the scheduler tick every minute
console.log('⏰ Starting local cron scheduler job (running every minute)...');

cron.schedule('* * * * *', async () => {
  console.log(`⏰ Cron Job execution started at ${new Date().toISOString()}`);
  try {
    await runSchedulerTick();
    console.log(`✅ Cron Job execution completed at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`❌ Cron Job execution failed:`, err);
  }
});
