import React, { useState } from 'react';
import { Lock, Delete, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useSecurePin } from '@/hooks/useSecurePin';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  
  const {
    validatePin,
    isLocked,
    attempts,
    attemptsRemaining,
    timeRemaining,
    formatTimeRemaining,
  } = useSecurePin();

  const handlePinChange = (value: string) => {
    if (isLocked) return;
    
    setPin(value);
    setError(false);
    
    if (value.length === 4) {
      const isValid = validatePin(value);
      
      if (isValid) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 1000);
      }
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (isLocked || pin.length >= 4) return;
    handlePinChange(pin + digit);
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const keypadNumbers = [
    ['1', '2', '3'], 
    ['4', '5', '6'], 
    ['7', '8', '9'], 
    ['', '0', 'backspace']
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border-cyan-500/20 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Lock Icon */}
            <div className="flex justify-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isLocked 
                  ? 'bg-gradient-to-br from-red-500 to-red-600' 
                  : 'bg-gradient-to-br from-cyan-500 to-purple-600'
              }`}>
                <Lock className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {isLocked ? 'Account Locked' : 'Enter PIN'}
              </h1>
              <p className="text-slate-300 text-sm">
                {isLocked 
                  ? `Too many failed attempts. Try again in ${formatTimeRemaining}`
                  : 'Enter your 4-digit PIN to access the app'
                }
              </p>
            </div>

            {/* Security Warning */}
            {isLocked && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Security lockout active</span>
                </div>
              </div>
            )}

            {/* Attempts Warning */}
            {!isLocked && attempts > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                <p className="text-amber-400 text-sm">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                </p>
              </div>
            )}

            {/* PIN Input */}
            <div className="space-y-4">
              <InputOTP 
                maxLength={4} 
                value={pin} 
                onChange={handlePinChange} 
                className="justify-center"
                disabled={isLocked}
              >
                <InputOTPGroup>
                  <InputOTPSlot 
                    index={0} 
                    className={`w-12 h-12 text-lg font-bold transition-all duration-300 ${
                      error 
                        ? 'border-red-500 bg-red-500/10' 
                        : isLocked
                        ? 'border-slate-600 bg-slate-700/30 opacity-50'
                        : 'border-cyan-500/30 bg-slate-700/50'
                    }`} 
                  />
                  <InputOTPSlot 
                    index={1} 
                    className={`w-12 h-12 text-lg font-bold transition-all duration-300 ${
                      error 
                        ? 'border-red-500 bg-red-500/10' 
                        : isLocked
                        ? 'border-slate-600 bg-slate-700/30 opacity-50'
                        : 'border-cyan-500/30 bg-slate-700/50'
                    }`} 
                  />
                  <InputOTPSlot 
                    index={2} 
                    className={`w-12 h-12 text-lg font-bold transition-all duration-300 ${
                      error 
                        ? 'border-red-500 bg-red-500/10' 
                        : isLocked
                        ? 'border-slate-600 bg-slate-700/30 opacity-50'
                        : 'border-cyan-500/30 bg-slate-700/50'
                    }`} 
                  />
                  <InputOTPSlot 
                    index={3} 
                    className={`w-12 h-12 text-lg font-bold transition-all duration-300 ${
                      error 
                        ? 'border-red-500 bg-red-500/10' 
                        : isLocked
                        ? 'border-slate-600 bg-slate-700/30 opacity-50'
                        : 'border-cyan-500/30 bg-slate-700/50'
                    }`} 
                  />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <p className="text-red-400 text-sm animate-pulse">
                  Incorrect PIN. Try again.
                </p>
              )}
            </div>

            {/* Virtual Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {keypadNumbers.map((row, rowIndex) => 
                row.map((item, colIndex) => {
                  if (item === '') {
                    return <div key={`${rowIndex}-${colIndex}`} />;
                  }
                  
                  if (item === 'backspace') {
                    return (
                      <Button 
                        key={`${rowIndex}-${colIndex}`} 
                        variant="outline" 
                        size="lg" 
                        onClick={handleBackspace} 
                        disabled={pin.length === 0 || isLocked}
                        className="h-14 bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-white disabled:opacity-30"
                      >
                        <Delete className="w-5 h-5" />
                      </Button>
                    );
                  }
                  
                  return (
                    <Button 
                      key={`${rowIndex}-${colIndex}`} 
                      variant="outline" 
                      size="lg" 
                      onClick={() => handleKeypadPress(item)} 
                      disabled={pin.length >= 4 || isLocked}
                      className="h-14 text-xl font-semibold bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-white disabled:opacity-30"
                    >
                      {item}
                    </Button>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};