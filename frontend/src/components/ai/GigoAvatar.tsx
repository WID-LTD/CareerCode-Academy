import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type GigoState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy';

/**
 * GiGo's mascot. A self-contained animated SVG — no external image, no
 * provider branding. The eyes blink, the antenna pulses, and the mouth
 * animates while GiGo is speaking.
 */
export function GigoAvatar({
  state = 'idle',
  size = 40,
  className,
  showRing = false,
}: {
  state?: GigoState;
  size?: number;
  className?: string;
  showRing?: boolean;
}) {
  const speaking = state === 'speaking';
  const listening = state === 'listening';
  const thinking = state === 'thinking';
  const happy = state === 'happy';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {showRing && (
        <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
      )}
      <motion.svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        initial={false}
        animate={
          listening
            ? { scale: [1, 1.05, 1] }
            : thinking
              ? { rotate: [0, -3, 3, 0] }
              : { y: [0, -1.5, 0] }
        }
        transition={{
          duration: listening ? 1 : thinking ? 2.4 : 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="drop-shadow-[0_6px_18px_rgba(99,102,241,0.35)]"
      >
        <defs>
          <linearGradient id="gigoBody" x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818cf8" />
            <stop offset="0.55" stopColor="#6366f1" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="gigoVisor" x1="16" y1="18" x2="48" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="gigoGlow" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#a5b4fc" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        {/* antenna */}
        <motion.circle
          cx="32"
          cy="6"
          r="3"
          fill="url(#gigoGlow)"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: listening ? 0.8 : 2.2, repeat: Infinity }}
        />
        <rect x="30.5" y="8" width="3" height="7" rx="1.5" fill="#c7d2fe" />

        {/* head */}
        <rect x="8" y="13" width="48" height="40" rx="15" fill="url(#gigoBody)" />
        <rect x="8" y="13" width="48" height="40" rx="15" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />

        {/* ears */}
        <rect x="3" y="27" width="6" height="14" rx="3" fill="#a5b4fc" />
        <rect x="55" y="27" width="6" height="14" rx="3" fill="#a5b4fc" />

        {/* visor */}
        <rect x="15" y="20" width="34" height="22" rx="9" fill="url(#gigoVisor)" />

        {/* eyes */}
        <motion.g
          animate={happy ? { y: [0, -1, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <motion.ellipse
            cx="25"
            cy="30"
            rx="3.1"
            ry="4"
            fill="#e0e7ff"
            animate={{ scaleY: [1, 1, 0.12, 1] }}
            transition={{ duration: 4.2, times: [0, 0.9, 0.94, 1], repeat: Infinity }}
            style={{ transformOrigin: '25px 30px' }}
          />
          <motion.ellipse
            cx="39"
            cy="30"
            rx="3.1"
            ry="4"
            fill="#e0e7ff"
            animate={{ scaleY: [1, 1, 0.12, 1] }}
            transition={{ duration: 4.2, times: [0, 0.9, 0.94, 1], repeat: Infinity }}
            style={{ transformOrigin: '39px 30px' }}
          />
        </motion.g>

        {/* mouth */}
        {speaking ? (
          <motion.rect
            x="27"
            y="38"
            width="10"
            height="4"
            rx="2"
            fill="#67e8f9"
            animate={{ scaleY: [0.5, 1.6, 0.7, 1.4, 0.6], scaleX: [1, 0.85, 1.1, 0.9, 1] }}
            transition={{ duration: 0.55, repeat: Infinity }}
            style={{ transformOrigin: '32px 40px' }}
          />
        ) : (
          <path
            d={happy ? 'M26 38c2.5 4 9.5 4 12 0' : 'M28 39c2 1.6 6 1.6 8 0'}
            stroke="#67e8f9"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* cheeks */}
        <circle cx="20" cy="37" r="1.6" fill="#f0abfc" opacity="0.75" />
        <circle cx="44" cy="37" r="1.6" fill="#f0abfc" opacity="0.75" />
      </motion.svg>

      {listening && (
        <motion.span
          className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-gray-950"
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      )}
    </div>
  );
}
