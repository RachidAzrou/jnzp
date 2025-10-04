import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DossierProgressCardProps {
  dossierId: string;
  displayId: string;
  deceasedName: string;
  pipelineType: string;
  progressPct: number;
  nextStepLabel?: string;
  currentMainKey?: string;
}

export function DossierProgressCard({
  dossierId,
  displayId,
  deceasedName,
  pipelineType,
  progressPct,
  nextStepLabel,
  currentMainKey,
}: DossierProgressCardProps) {
  const navigate = useNavigate();

  const mainStages = pipelineType === 'REP'
    ? [
        { key: 'INTAKE', label: 'Intake' },
        { key: 'RITUELE_WASSPLAATS', label: 'Rituele wassplaats' },
        { key: 'JANAZA_GEBED', label: 'Janaza gebed' },
        { key: 'REPATRIERING', label: 'Repatriëring' }
      ]
    : [
        { key: 'INTAKE', label: 'Intake' },
        { key: 'RITUELE_WASSPLAATS', label: 'Rituele wassplaats' },
        { key: 'JANAZA_GEBED', label: 'Janaza gebed' },
        { key: 'BEGRAFENIS', label: 'Begrafenis' }
      ];

  const getCurrentStageIndex = () => {
    return mainStages.findIndex(stage => stage.key === currentMainKey);
  };

  const currentIndex = getCurrentStageIndex();

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{deceasedName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Ref: {displayId}</span>
              <Badge variant="secondary" className="text-xs">
                {pipelineType === 'REP' ? 'Repatriëring' : 'Lokaal'}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{progressPct}%</div>
            <div className="text-xs text-muted-foreground">Voortgang</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Horizontal Progress Bar */}
        <div className="relative pt-8 pb-4">
          {/* Background line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
          
          {/* Progress line */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
          
          {/* Stage indicators */}
          <div className="relative flex justify-between">
            {mainStages.map((stage, index) => {
              const isCompleted = index < currentIndex || progressPct === 100;
              const isCurrent = index === currentIndex;
              const isPending = index > currentIndex && progressPct !== 100;
              
              return (
                <div key={stage.key} className="flex flex-col items-center gap-2">
                  {/* Circle indicator */}
                  <div className={`
                    relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${isCompleted ? 'bg-primary border-primary' : ''}
                    ${isCurrent ? 'bg-primary border-primary scale-125 shadow-lg shadow-primary/30' : ''}
                    ${isPending ? 'bg-background border-border' : ''}
                  `}>
                    {isCompleted && !isCurrent && (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    )}
                    {isCurrent && (
                      <div className="w-3 h-3 bg-primary-foreground rounded-full" />
                    )}
                  </div>
                  
                  {/* Stage label */}
                  <div className="text-center max-w-[80px]">
                    <div className={`text-xs font-medium ${
                      isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {stage.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next step info */}
        {nextStepLabel && progressPct < 100 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Volgende stap: </span>
              <span className="font-semibold text-foreground">{nextStepLabel}</span>
            </div>
          </div>
        )}

        {progressPct === 100 && (
          <div className="flex items-center justify-center pt-4 border-t">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Check className="w-3 h-3 mr-1" />
              Afgerond
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
