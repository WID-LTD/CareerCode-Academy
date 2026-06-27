import { deleteExpiredRecordings } from '../models/examProctoring';

export function startProctoringCleanupWorker() {
  const runCleanup = async () => {
    try {
      await deleteExpiredRecordings();
    } catch (err) {
    }
  };

  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000);
}
