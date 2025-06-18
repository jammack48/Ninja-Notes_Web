
import React, { useState } from 'react';
import { Lock, Backspace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = '2000';

  const handlePinChange = (value: string) => {
    setPin(value);
    setError(false);
    
    if (value.length === 4) {
      if (value === correctPin) {
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
    if (pin.length < 4) {
      handlePinChange(pin + digit);
    }
  };

  const handleBackspace = () => {
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Lock className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Enter PIN</h1>
              <p className="text-slate-300 text-sm">Enter your 4-digit PIN to access the app</p>
            </div>

            {/* PIN Input */}
            <div className="space-y-4">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                className="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot 
                    index={0} 
                    className={`w-12 h-12 text-lg font-bold ${
                      error ? 'border-red-500 bg-red-500/10' : 'border-cyan-500/30 bg-slate-700/50'
                    }`}
                  />
                  <InputOTPSlot 
                    index={1} 
                    className={`w-12 h-12 text-lg font-bold ${
                      error ? 'border-red-500 bg-red-500/10' : 'border-cyan-500/30 bg-slate-700/50'
                    }`}
                  />
                  <InputOTPSlot 
                    index={2} 
                    className={`w-12 h-12 text-lg font-bold ${
                      error ? 'border-red-500 bg-red-500/10' : 'border-cyan-500/30 bg-slate-700/50'
                    }`}
                  />
                  <InputOTPSlot 
                    index={3} 
                    className={`w-12 h-12 text-lg font-bold ${
                      error ? 'border-red-500 bg-red-500/10' : 'border-cyan-500/30 bg-slate-700/50'
                    }`}
                  />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <p className="text-red-400 text-sm animate-pulse">Incorrect PIN. Try again.</p>
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
                        disabled={pin.length === 0}
                        className="h-14 bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-white"
                      >
                        <Backspace className="w-5 h-5" />
                      </Button>
                    );
                  }
                  
                  return (
                    <Button
                      key={`${rowIndex}-${colIndex}`}
                      variant="outline"
                      size="lg"
                      onClick={() => handleKeypadPress(item)}
                      disabled={pin.length >= 4}
                      className="h-14 text-xl font-semibold bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-white"
                    >
                      {item}
                    </Button>
                  );
                })
              )}
            </div>

            <p className="text-slate-400 text-xs mt-4">
              Hint: The PIN is 2000
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
