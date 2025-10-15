import { Check } from "lucide-react";
import { LuFilePen } from "react-icons/lu";
import { MdOutlineShower } from "react-icons/md";
import { PiMosque, PiFlowerTulip } from "react-icons/pi";
import { TbPlaneDeparture } from "react-icons/tb";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
      'INTAKE': t("progress.stageIntake"),
      'RITUELE_WASSPLAATS': t("progress.stageWash"),
      'JANAZA_GEBED': t("progress.stageJanazah"),
      'REPATRIERING': t("progress.stageRepatriation"),
      'BEGRAFENIS': t("progress.stageBurial"),
    };
    return labels[stageKey] || stageKey;
  };

  // Map events to main stages based on event_type or metadata
  const getEventsForStage = (stageKey: string, nextStageKey?: string) => {
    // Filter events that belong between this stage and the next
    const stageEventMapping: Record<string, string[]> = {
      'INTAKE': pipelineType === 'REP' 
        ? ['VALIDATIE_POLIS', 'DOCS_OK', 'LAND_BESTEMMING_BEKEND']
        : ['VALIDATIE_POLIS', 'DOCS_OK', 'BEGRAAFPLAATS_GEKOZEN'],
      'RITUELE_WASSPLAATS': ['KOELCEL_GEBOEKT', 'WASSING_GEPLAND', 'WASSING_AFGEROND'],
      'JANAZA_GEBED': ['MOSKEE_BEVESTIGD', 'GEBEDSTIJD_GEPLAND', 'ROUWCIRCULAIRE_VERZONDEN'],
      'REPATRIERING': ['DOCUMENTEN_OK', 'TICKETS_GEBOEKT', 'TRANSPORT_REGELD', 'LUCHTHAVEN_OK', 'REPATRIERING_AFGEROND'],
      'BEGRAFENIS': ['PERK_GEBOEKT', 'BEGRAFENIS_AFGEROND', 'NAZORG_AFGESLOTEN'],
    };

    const relevantEventTypes = stageEventMapping[stageKey] || [];
    return events.filter(event => relevantEventTypes.includes(event.event_type));
  };

  const mainStages = pipelineType === 'REP'
    ? ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'REPATRIERING']
    : ['INTAKE', 'RITUELE_WASSPLAATS', 'JANAZA_GEBED', 'BEGRAFENIS'];

  const getStageIcon = (stageKey: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'INTAKE': <LuFilePen className="w-4 h-4" />,
      'RITUELE_WASSPLAATS': <MdOutlineShower className="w-4 h-4" />,
      'JANAZA_GEBED': <PiMosque className="w-4 h-4" />,
      'REPATRIERING': <TbPlaneDeparture className="w-4 h-4" />,
      'BEGRAFENIS': <PiFlowerTulip className="w-4 h-4" />,
    };
    return iconMap[stageKey];
  };

  return (
    <div className="space-y-3">
      {/* Progress percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t("progress.title")}</span>
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
                    ${status === 'done' ? 'w-10 h-10 bg-primary text-primary-foreground' : ''}
                    ${status === 'current' ? 'w-10 h-10 bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${status === 'todo' ? 'w-10 h-10 bg-muted text-muted-foreground border-2 border-border' : ''}
                  `}>
                    {getStageIcon(stageKey)}
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
                    <div className="flex flex-col items-start gap-1 mt-3 ml-2">
                      {stageEvents.map((event) => (
                        <div key={event.id} className="flex items-center gap-1.5">
                          <Check className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[11px] text-muted-foreground">
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
            {t("progress.completed")}
          </div>
        </div>
      )}
    </div>
  );
}
