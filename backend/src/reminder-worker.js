import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/database.js';
import './models/index.js';
import { runReminderWorkerOnce } from './lib/reminderWorker.js';

const REMINDER_WORKER_POLL_MS = parseInt(process.env.REMINDER_WORKER_POLL_MS || '60000', 10);
const WORKER_RUN_ONCE = process.env.WORKER_RUN_ONCE === 'true';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start() {
  await sequelize.authenticate();
  console.log('Reminder worker connected to database.');

  do {
    try {
      await runReminderWorkerOnce();
    } catch (err) {
      console.error('Reminder worker iteration failed:', err);
    }

    if (!WORKER_RUN_ONCE) {
      await sleep(REMINDER_WORKER_POLL_MS);
    }
  } while (!WORKER_RUN_ONCE);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  start().catch((err) => {
    console.error('Reminder worker failed to start:', err);
    process.exit(1);
  });
}

export { start };
