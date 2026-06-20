import { deleteExpiredRecordings } from '../models/examProctoring';

export function startProctoringCleanupWorker() {
  const runCleanup = async () => {
    try {
      const deleted = await deleteExpiredRecordings();
      if (deleted > 0) {
        console.log(`Proctoring cleanup: deleted ${deleted} expired recording(s)`);
      }
    } catch (err) {
      console.error('Proctoring cleanup error:', err);
    }
  };

  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000);
  console.log('Proctoring cleanup worker started (runs every 60 min)');
}
