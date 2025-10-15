import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SimpleCaptchaProps {
  onVerify: (token: string) => void;
  className?: string;
}

export const SimpleCaptcha = ({ onVerify, className }: SimpleCaptchaProps) => {
  const { t } = useTranslation();
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState('');

  const generateChallenge = () => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setUserAnswer('');
    setError('');
  };

  useEffect(() => {
    generateChallenge();
  }, []);

  const handleVerify = () => {
    const correctAnswer = num1 + num2;
    const answer = parseInt(userAnswer);

    if (isNaN(answer) || answer !== correctAnswer) {
      setError('Onjuist antwoord. Probeer opnieuw.');
      generateChallenge();
      return;
    }

    // Generate a simple token (in production, this would be server-validated)
    const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setError('');
    onVerify(token);
  };

  return (
    <div className={cn("space-y-3 p-4 border rounded-lg bg-muted/30", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Verificatie</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={generateChallenge}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-lg font-mono bg-background px-4 py-2 rounded border">
          <span className="font-bold">{num1}</span>
          <span>+</span>
          <span className="font-bold">{num2}</span>
          <span>=</span>
          <span>?</span>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          type="number"
          placeholder={t("placeholders.captchaAnswer")}
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          className={cn(error && "border-destructive")}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <Button
        type="button"
        onClick={handleVerify}
        disabled={!userAnswer}
        className="w-full"
        size="sm"
      >
        Verifiëren
      </Button>
    </div>
  );
};
