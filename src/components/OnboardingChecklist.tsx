import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  role: "funeral_director" | "mosque" | "wasplaats" | "family";
}

const roleLabels = {
  funeral_director: "Funeral Director",
  mosque: "Moskee",
  wasplaats: "Wasplaats",
  family: "Familie",
};

export function OnboardingChecklist({ steps, role }: OnboardingChecklistProps) {
  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Welkom bij JanazApp</CardTitle>
            <CardDescription>
              Voltooi deze stappen om aan de slag te gaan als {roleLabels[role]}
            </CardDescription>
          </div>
          <Badge variant={progress === 100 ? "default" : "secondary"} className="text-lg px-4 py-2">
            {progress}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-3" role="list" aria-label="Onboarding stappen">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              role="listitem"
            >
              <div className="mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Voltooid" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" aria-label="Nog te doen" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Stap {index + 1}
                  </span>
                  {step.completed && (
                    <Badge variant="outline" className="text-xs">
                      Voltooid
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {!step.completed && step.action && (
                  <button
                    onClick={step.action}
                    className="text-sm text-primary hover:underline font-medium"
                    aria-label={`Start: ${step.title}`}
                  >
                    Start →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {progress === 100 && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              🎉 Gefeliciteerd! Je hebt alle onboarding stappen voltooid. Je bent klaar om te beginnen!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
