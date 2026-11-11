import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export type PublicStats = {
  students: number;
  courses: number;
  certificates: number;
  alumni: number;
};

const EMPTY: PublicStats = { students: 0, courses: 0, certificates: 0, alumni: 0 };

/** Real platform counts from /api/v1/public/stats. No hardcoded social proof. */
export function usePublicStats(): PublicStats {
  const [stats, setStats] = useState<PublicStats>(EMPTY);
  useEffect(() => {
    let alive = true;
    api.get('/public/stats')
      .then(({ data }) => { if (alive && data?.data) setStats({ ...EMPTY, ...data.data }); })
      .catch(() => { /* keep zeros */ });
    return () => { alive = false; };
  }, []);
  return stats;
}
