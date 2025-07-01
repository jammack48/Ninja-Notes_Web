import { useState, useCallback, useEffect } from 'react';
import { APP_CONFIG } from '@/config/app.config';

interface UsSecurePinOptions {
  correctPin?: string;
  maxAttempts?: number;
  lockoutDuration?: number;
}

export const useSecurePin = (options: UsSecurePinOptions = {}) => {
  const {
    correctPin = import.meta.env.VITE_REACT_APP_PIN || '2000', // Environment variable fallback
    maxAttempts = APP_CONFIG.PIN_ATTEMPTS_LIMIT,
    lockoutDuration = APP_CONFIG.PIN_LOCKOUT_DURATION,
  } = options;

  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Check if currently in lockout period
  useEffect(() => {
    const checkLockout = () => {
      if (lockoutEndTime) {
        const now = Date.now();
        if (now < lockoutEndTime) {
          setIsLocked(true);
          setTimeRemaining(Math.ceil((lockoutEndTime - now) / 1000));
        } else {
          setIsLocked(false);
          setLockoutEndTime(null);
          setAttempts(0);
          setTimeRemaining(0);
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutEndTime]);

  const validatePin = useCallback((inputPin: string): boolean => {
    if (isLocked) {
      return false;
    }

    if (inputPin === correctPin) {
      // Reset on successful authentication
      setAttempts(0);
      setIsLocked(false);
      setLockoutEndTime(null);
      return true;
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        // Trigger lockout
        const lockoutEnd = Date.now() + lockoutDuration;
        setLockoutEndTime(lockoutEnd);
        setIsLocked(true);
      }

      return false;
    }
  }, [correctPin, attempts, maxAttempts, lockoutDuration, isLocked]);

  const resetLockout = useCallback(() => {
    setAttempts(0);
    setIsLocked(false);
    setLockoutEndTime(null);
    setTimeRemaining(0);
  }, []);

  const formatTimeRemaining = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    validatePin,
    isLocked,
    attempts,
    maxAttempts,
    timeRemaining,
    formatTimeRemaining: formatTimeRemaining(timeRemaining),
    resetLockout,
    attemptsRemaining: Math.max(0, maxAttempts - attempts),
  };
};