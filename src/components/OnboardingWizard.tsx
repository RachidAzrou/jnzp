import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWizardProps {
  organizationId: string;
  onComplete?: () => void;
}

export default function OnboardingWizard({ organizationId, onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnboarding();
  }, [organizationId]);

  const fetchOnboarding = async () => {
    const { data, error } = await supabase
      .from('organization_onboarding' as any)
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching onboarding:', error);
    } else {
      setOnboarding(data);
    }
    setLoading(false);
  };

  const updateStep = async (step: string, completed: boolean) => {
    const { error } = await supabase
      .from('organization_onboarding' as any)
      .update({ [step]: completed })
      .eq('organization_id', organizationId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Check if all steps are completed
    const allCompleted = 
      step === 'step_basic_info' || onboarding?.step_basic_info &&
      step === 'step_team_setup' || onboarding?.step_team_setup &&
      step === 'step_integrations' || onboarding?.step_integrations &&
      step === 'step_preferences' || onboarding?.step_preferences;

    if (allCompleted && !onboarding?.completed) {
      await supabase
        .from('organization_onboarding' as any)
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      toast({
        title: t('common.success'),
        description: t('onboarding.onboardingComplete'),
      });

      if (onComplete) {
        onComplete();
      }
    }

    fetchOnboarding();
  };

  if (loading) return <div>{t('common.loading')}</div>;

  const steps = [
    {
      key: 'step_basic_info',
      title: t('onboarding.basicInfo'),
      description: t('onboarding.basicInfoDesc'),
      completed: onboarding?.step_basic_info,
    },
    {
      key: 'step_team_setup',
      title: t('onboarding.teamSetup'),
      description: t('onboarding.teamSetupDesc'),
      completed: onboarding?.step_team_setup,
    },
    {
      key: 'step_integrations',
      title: t('onboarding.integrations'),
      description: t('onboarding.integrationsDesc'),
      completed: onboarding?.step_integrations,
    },
    {
      key: 'step_preferences',
      title: t('onboarding.preferences'),
      description: t('onboarding.preferencesDesc'),
      completed: onboarding?.step_preferences,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  if (onboarding?.completed) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {t('onboarding.onboardingComplete')}
          </CardTitle>
          <CardDescription>
            {t('onboarding.fullySetup')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.welcomeTitle')}</CardTitle>
        <CardDescription>
          {t('onboarding.completeSteps')}
        </CardDescription>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-muted-foreground mt-2">
          {completedSteps} {t('common.of')} {steps.length} {t('onboarding.stepsCompleted')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.key}
            className="flex items-start justify-between p-4 border rounded-lg"
          >
            <div className="flex items-start gap-3">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            <Button
              variant={step.completed ? "outline" : "default"}
              size="sm"
              onClick={() => updateStep(step.key, !step.completed)}
            >
              {step.completed ? t('onboarding.undo') : t('onboarding.complete')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
