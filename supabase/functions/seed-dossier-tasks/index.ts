import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskTemplate {
  task_type: string;
  title: string;
  description: string;
  auto_complete: boolean;
  auto_complete_trigger?: string;
  priority: number;
}

// Task templates for LOC flow
const LOC_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  'CREATED': [
    {
      task_type: 'INTAKE_WELCOME',
      title: 'Welkom & casechat opstarten',
      description: 'Start een gesprek met de familie en leg eerste contact',
      auto_complete: false,
      priority: 1
    },
    {
      task_type: 'INTAKE_FAMILY_CONTACT',
      title: 'Primair familiecontact bevestigen',
      description: 'Controleer en bevestig de contactgegevens van de familie',
      auto_complete: false,
      priority: 2
    },
    {
      task_type: 'INTAKE_GDPR',
      title: 'Toestemming / GDPR registreren',
      description: 'Verkrijg GDPR toestemming van de familie',
      auto_complete: false,
      priority: 3
    }
  ],
  'INTAKE': [
    {
      task_type: 'INTAKE_DEATH_CERTIFICATE',
      title: 'Overlijdensakte verzamelen & controleren',
      description: 'Upload en controleer de overlijdensakte',
      auto_complete: true,
      auto_complete_trigger: 'DOCUMENT_OVERLIJDENSAKTE',
      priority: 4
    },
    {
      task_type: 'INTAKE_ID_DOCUMENT',
      title: 'Identiteitsdocument vastleggen',
      description: 'Upload ID of paspoort van de overledene',
      auto_complete: true,
      auto_complete_trigger: 'DOCUMENT_ID_PASPOORT',
      priority: 5
    },
    {
      task_type: 'INTAKE_FLOW_CONFIRM',
      title: 'Flow bevestigen: Lokaal',
      description: 'Bevestig dat dit een lokale begrafenis is',
      auto_complete: false,
      priority: 6
    },
    {
      task_type: 'INTAKE_INSURANCE_INFO',
      title: 'Verzekeringsgegevens toevoegen',
      description: 'Verzamel en registreer verzekeringsgegevens indien van toepassing',
      auto_complete: false,
      priority: 7
    }
  ],
  'VERIFY': [
    {
      task_type: 'VERIFY_INSURANCE',
      title: 'Verzekering verifiëren',
      description: 'Verifieer dekking via API of handmatig',
      auto_complete: true,
      auto_complete_trigger: 'CLAIM_APPROVED',
      priority: 8
    },
    {
      task_type: 'VERIFY_OFFER',
      title: 'Offerte laten tekenen',
      description: 'Laat familie de offerte goedkeuren indien geen verzekering',
      auto_complete: true,
      auto_complete_trigger: 'INVOICE_SENT_FD',
      priority: 9
    }
  ],
  'PREP': [
    {
      task_type: 'PREP_MORTUARY',
      title: 'Mortuarium plannen (koeling + wassing)',
      description: 'Plan mortuarium dienst en reserveer koelcel',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_PLANNED_MORTUARY_SERVICE',
      priority: 10
    },
    {
      task_type: 'PREP_MOSQUE',
      title: 'Moskee & janazagebed plannen',
      description: 'Plan het janazagebed in de moskee',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_PLANNED_MOSQUE_SERVICE',
      priority: 11
    },
    {
      task_type: 'PREP_BURIAL',
      title: 'Begrafenis & concessie bevestigen',
      description: 'Reserveer grafplaats en bevestig begrafenis',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_PLANNED_BURIAL',
      priority: 12
    },
    {
      task_type: 'PREP_TRANSPORT',
      title: 'Vervoer regelen',
      description: 'Organiseer het vervoer van de overledene',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_PLANNED_PICKUP',
      priority: 13
    },
    {
      task_type: 'PREP_DOCUMENTS',
      title: 'Documentenpakket voorbereiden (dag zelf)',
      description: 'Bereid alle benodigde documenten voor',
      auto_complete: false,
      priority: 14
    }
  ],
  'EXECUTE': [
    {
      task_type: 'EXECUTE_PICKUP',
      title: 'Ophalen & overbrenging',
      description: 'Haal de overledene op en breng over naar mortuarium',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_DONE_PICKUP',
      priority: 15
    },
    {
      task_type: 'EXECUTE_MORTUARY',
      title: 'Mortuariumdienst (wassing + koeling) uitvoeren',
      description: 'Voer de wassing uit en plaats in koelcel',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_DONE_MORTUARY_SERVICE',
      priority: 16
    },
    {
      task_type: 'EXECUTE_MOSQUE',
      title: 'Janazagebed uitvoeren',
      description: 'Voer het janazagebed uit in de moskee',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_DONE_MOSQUE_SERVICE',
      priority: 17
    },
    {
      task_type: 'EXECUTE_BURIAL',
      title: 'Begrafenis uitvoeren & rapporteren',
      description: 'Voer de begrafenis uit en documenteer',
      auto_complete: true,
      auto_complete_trigger: 'EVENT_DONE_BURIAL',
      priority: 18
    }
  ],
  'SETTLE': [
    {
      task_type: 'SETTLE_BURIAL_CERTIFICATE',
      title: 'Begraafakte uploaden',
      description: 'Upload de ondertekende begraafakte',
      auto_complete: true,
      auto_complete_trigger: 'DOCUMENT_BEGRAAFAKTE',
      priority: 19
    },
    {
      task_type: 'SETTLE_FD_INVOICE',
      title: 'Eindfactuur FD verzenden',
      description: 'Verstuur de factuur naar de verzekeraar of familie',
      auto_complete: true,
      auto_complete_trigger: 'INVOICE_SENT_FD',
      priority: 20
    },
    {
      task_type: 'SETTLE_MORTUARY_INVOICE',
      title: 'Mortuarium-factuur verwerken',
      description: 'Verwerk de factuur van het mortuarium',
      auto_complete: true,
      auto_complete_trigger: 'INVOICE_SENT_MORTUARIUM',
      priority: 21
    },
    {
      task_type: 'SETTLE_FEEDBACK',
      title: 'Feedbackverzoek versturen',
      description: 'Vraag feedback aan de familie',
      auto_complete: false,
      priority: 22
    }
  ]
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dossierId, status, flow } = await req.json();

    console.log(`[seed-dossier-tasks] Seeding tasks for dossier ${dossierId}, flow: ${flow}, status: ${status}`);

    if (flow !== 'LOC') {
      console.log(`[seed-dossier-tasks] Flow ${flow} not supported yet, skipping task seeding`);
      return new Response(
        JSON.stringify({ success: true, message: 'Flow not supported yet', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tasks that should exist for this status
    const tasksToCreate = LOC_TASK_TEMPLATES[status] || [];

    if (tasksToCreate.length === 0) {
      console.log(`[seed-dossier-tasks] No tasks to create for status ${status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'No tasks to create', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which tasks already exist
    const { data: existingTasks } = await supabaseClient
      .from('kanban_tasks')
      .select('task_type')
      .eq('dossier_id', dossierId);

    const existingTaskTypes = new Set(existingTasks?.map(t => t.task_type) || []);

    // Filter out tasks that already exist
    const newTasks = tasksToCreate.filter(t => !existingTaskTypes.has(t.task_type));

    if (newTasks.length === 0) {
      console.log(`[seed-dossier-tasks] All tasks already exist`);
      return new Response(
        JSON.stringify({ success: true, message: 'All tasks already exist', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new tasks
    const tasksWithDossierId = newTasks.map(task => ({
      ...task,
      dossier_id: dossierId
    }));

    const { error: insertError } = await supabaseClient
      .from('kanban_tasks')
      .insert(tasksWithDossierId);

    if (insertError) {
      console.error('[seed-dossier-tasks] Error inserting tasks:', insertError);
      throw insertError;
    }

    console.log(`[seed-dossier-tasks] Created ${newTasks.length} tasks for dossier ${dossierId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasksCreated: newTasks.length,
        tasks: newTasks.map(t => t.task_type)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[seed-dossier-tasks] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});