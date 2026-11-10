import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// Install prompt + "new version" banner. Both are opt-in and dismissible.
export function PwaBridge() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem('careercode-install-dismissed') || 0);
    if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;

    const onPrompt = (event: any) => {
      event.preventDefault();
      setInstallEvent(event);
      setShowInstall(true);
    };
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('careercode:update-available', onUpdate);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('careercode:update-available', onUpdate);
    };
  }, []);

  const dismissInstall = () => {
    localStorage.setItem('careercode-install-dismissed', String(Date.now()));
    setShowInstall(false);
  };

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const choice = await installEvent.userChoice.catch(() => null);
    if (choice?.outcome !== 'accepted') dismissInstall();
    setShowInstall(false);
  };

  return (
    <>
      {showInstall && (
        <div className="fixed left-3 right-3 bottom-20 lg:left-auto lg:right-4 lg:bottom-4 lg:w-80 z-[70] rounded-2xl border border-primary-500/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Install CareerCode</p>
              <p className="text-xs text-gray-500 mt-0.5">Add the app to your home screen for faster access and offline support.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={install} className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold">Install</button>
                <button onClick={dismissInstall} className="px-3 py-1.5 rounded-lg text-xs text-gray-500">Not now</button>
              </div>
            </div>
            <button onClick={dismissInstall} aria-label="Dismiss install prompt"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
        </div>
      )}

      {updateReady && (
        <div className="fixed left-3 right-3 bottom-20 lg:left-auto lg:right-4 lg:bottom-4 lg:w-80 z-[70] rounded-2xl border border-emerald-500/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl p-4">
          <p className="text-sm font-semibold">A new version is ready</p>
          <p className="text-xs text-gray-500 mt-0.5">Refresh to get the latest improvements.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold">Refresh</button>
            <button onClick={() => setUpdateReady(false)} className="px-3 py-1.5 rounded-lg text-xs text-gray-500">Later</button>
          </div>
        </div>
      )}
    </>
  );
}
