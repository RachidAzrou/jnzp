import { Check, Circle } from "lucide-react";

interface DossierProgressCardProps {
  dossierId: string;
  displayId: string;
  deceasedName: string;
  pipelineType: string;
  progressPct: number;
  nextStepLabel?: string;
  currentMainKey?: string;
  events?: any[]; // Array of dossier events
}

export function DossierProgressCard({
  pipelineType,
  progressPct,
  currentMainKey,
  events = [],
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

  // Map events to main stages based on event_type or metadata
  const getEventsForStage = (stageKey: string, nextStageKey?: string) => {
    // Filter events that belong between this stage and the next
    // For now, we'll use simple mapping based on event_type
    const stageEventMapping: Record<string, string[]> = {
      'INTAKE': ['intake_started', 'intake_completed', 'documents_requested', 'documents_received'],
      'RITUELE_WASSPLAATS': ['wash_scheduled', 'wash_in_progress', 'wash_completed'],
      'JANAZA_GEBED': ['janaza_scheduled', 'janaza_in_progress', 'janaza_completed'],
      'REPATRIERING': ['repatriation_started', 'flight_booked', 'documents_prepared', 'repatriation_completed'],
      'BEGRAFENIS': ['burial_scheduled', 'burial_in_progress', 'burial_completed'],
    };

    const relevantEventTypes = stageEventMapping[stageKey] || [];
    return events.filter(event => relevantEventTypes.includes(event.event_type));
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
        <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-3.5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />

        {/* Stages */}
        <div className="relative flex justify-between">
          {mainStages.map((stageKey, index) => {
            const status = getStageStatus(stageKey, currentMainKey);
            const stageEvents = getEventsForStage(stageKey, mainStages[index + 1]);
            
            return (
              <div key={stageKey} className="flex flex-col items-start gap-2 flex-1">
                {/* Stage indicator */}
                <div className="flex flex-col items-center w-full gap-2">
                  <div className={`
                    relative z-10 flex items-center justify-center rounded-full transition-all duration-300
                    ${status === 'done' ? 'w-7 h-7 bg-primary' : ''}
                    ${status === 'current' ? 'w-7 h-7 bg-primary ring-4 ring-primary/20' : ''}
                    ${status === 'todo' ? 'w-7 h-7 bg-muted border-2 border-border' : ''}
                  `}>
                    {status === 'done' && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    {status === 'current' && <Circle className="w-3 h-3 text-primary-foreground fill-primary-foreground" />}
                    {status === 'todo' && <Circle className="w-3 h-3 text-muted-foreground" />}
                  </div>

                  {/* Stage label */}
                  <div className={`
                    text-xs text-center max-w-[80px] transition-colors
                    ${status === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                  `}>
                    {getStageLabel(stageKey)}
                  </div>

                  {/* Sub-events for this stage */}
                  {stageEvents.length > 0 && (
                    <div className="flex flex-col items-center gap-1.5 mt-2">
                      {stageEvents.map((event, eventIndex) => (
                        <div key={event.id} className="flex items-center gap-1">
                          <Circle className="w-2 h-2 text-muted-foreground/50 fill-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground">
                            {event.event_description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
