import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, ExternalLink } from "lucide-react";
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

  const getPipelineBadgeColor = (type: string) => {
    return type === 'REP' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getStageIcon = (stageKey: string, currentKey?: string) => {
    if (!currentKey) return <Circle className="w-3 h-3 text-muted-foreground" />;
    
    const stages = pipelineType === 'REP' 
      ? ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'REPATRIERING']
      : ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'BEGRAFENIS'];
    
    const currentIndex = stages.indexOf(currentKey);
    const stageIndex = stages.indexOf(stageKey);
    
    if (stageIndex < currentIndex || progressPct === 100) {
      return <Check className="w-4 h-4 text-primary" />;
    } else if (stageIndex === currentIndex) {
      return <div className="w-3 h-3 rounded-full bg-primary" />;
    } else {
      return <Circle className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStageLabel = (stageKey: string) => {
    const labels: Record<string, string> = {
      'INTAKE': 'Intake',
      'RITUELE_WASSPLAATS': 'Rituele wassplaats',
      'JANAZA_GEBED': 'Janaza gebed',
      'REPATRIERING': 'Repatriëring',
      'BEGRAFENIS': 'Begrafenis',
    };
    return labels[stageKey] || stageKey;
  };

  const mainStages = pipelineType === 'REP'
    ? ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'REPATRIERING']
    : ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'BEGRAFENIS'];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{deceasedName}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Ref: {displayId}</span>
              <Badge className={getPipelineBadgeColor(pipelineType)}>
                {pipelineType === 'REP' ? 'Repatriëring' : 'Lokaal'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dossiers/${dossierId}`)}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Voortgang</span>
            <span className="font-semibold text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Main stages */}
        <div className="space-y-3">
          {mainStages.map((stageKey, index) => (
            <div key={stageKey} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getStageIcon(stageKey, currentMainKey)}
              </div>
              <div className="flex-1">
                <div className={`text-sm ${
                  currentMainKey === stageKey 
                    ? 'font-semibold text-foreground' 
                    : 'text-muted-foreground'
                }`}>
                  {getStageLabel(stageKey)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Next step */}
        {nextStepLabel && progressPct < 100 && (
          <div className="pt-3 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Volgende stap: </span>
              <span className="font-semibold text-foreground">{nextStepLabel}</span>
            </div>
          </div>
        )}

        {progressPct === 100 && (
          <div className="pt-3 border-t">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              ✓ Afgerond
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
