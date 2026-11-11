import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

/** Shows the admin-controlled maintenance notice to non-admin users. */
export function MaintenanceBanner() {
  const [active, setActive] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    let alive = true;
    api.get('/public/config')
      .then(({ data }) => { if (alive) setActive(!!data?.data?.flags?.maintenance_mode); })
      .catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, []);

  if (!active || role === 'admin' || role === 'super_admin') return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[70] bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <Wrench className="w-4 h-4" />
      CareerCode is under scheduled maintenance. Some features may be unavailable.
    </div>
  );
}
