import { Check, Circle } from "lucide-react";

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
  pipelineType,
  progressPct,
  currentMainKey,
}: DossierProgressCardProps) {

  const getStageStatus = (stageKey: string, currentKey?: string) => {
    if (!currentKey) return 'todo';
    
    const stages = pipelineType === 'REP' 
      ? ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'REPATRIERING']
      : ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'BEGRAFENIS'];
    
    const currentIndex = stages.indexOf(currentKey);
    const stageIndex = stages.indexOf(stageKey);
    
    if (stageIndex < currentIndex || progressPct === 100) {
      return 'done';
    } else if (stageIndex === currentIndex) {
      return 'current';
    } else {
      return 'todo';
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
    <div className="space-y-3">
      {/* Progress percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Voortgang dossier</span>
        <span className="text-muted-foreground">{progressPct}%</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />

        {/* Stages */}
        <div className="relative flex justify-between">
          {mainStages.map((stageKey, index) => {
            const status = getStageStatus(stageKey, currentMainKey);
            return (
              <div key={stageKey} className="flex flex-col items-center gap-2" style={{ flex: 1 }}>
                {/* Stage indicator */}
                <div className={`
                  relative z-10 flex items-center justify-center rounded-full transition-all duration-300
                  ${status === 'done' ? 'w-10 h-10 bg-primary' : ''}
                  ${status === 'current' ? 'w-10 h-10 bg-primary ring-4 ring-primary/20' : ''}
                  ${status === 'todo' ? 'w-10 h-10 bg-muted border-2 border-border' : ''}
                `}>
                  {status === 'done' && <Check className="w-5 h-5 text-primary-foreground" />}
                  {status === 'current' && <Circle className="w-4 h-4 text-primary-foreground fill-primary-foreground" />}
                  {status === 'todo' && <Circle className="w-4 h-4 text-muted-foreground" />}
                </div>

                {/* Stage label */}
                <div className={`
                  text-xs text-center max-w-[80px] transition-colors
                  ${status === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                `}>
                  {getStageLabel(stageKey)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion badge */}
      {progressPct === 100 && (
        <div className="flex justify-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Check className="w-3.5 h-3.5" />
            Dossier afgerond
          </div>
        </div>
      )}
    </div>
  );
}
