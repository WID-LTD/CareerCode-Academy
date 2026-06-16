import { useRef, useState, useEffect, ClipboardEvent, KeyboardEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function OtpInput({ length = 6, value, onChange, disabled, error }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const newValue = value.slice(0, index) + char + value.slice(index + 1);
    onChange(newValue.slice(0, length));
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        const newValue = value.slice(0, index - 1) + value.slice(index);
        onChange(newValue.slice(0, length));
        inputsRef.current[index - 1]?.focus();
      } else {
        const newValue = value.slice(0, index) + value.slice(index + 1);
        onChange(newValue.slice(0, length));
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, length - 1);
      inputsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2" role="group" aria-label={`Verification code, ${length} digits`}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={!!error}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(-1)}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`
              w-12 h-14 text-center text-xl font-bold rounded-xl border-2
              transition-all duration-150 outline-none
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-danger-500 bg-danger-500/5' : focusedIndex === i ? 'border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50'}
              text-gray-900 dark:text-gray-100
            `}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-danger-500 text-center" role="alert">{error}</p>
      )}
    </div>
  );
}
