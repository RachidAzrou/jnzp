import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskTemplate {
  task_type: string;
  title: string;
  description?: string;
  auto_complete: boolean;
  auto_complete_trigger?: string;
  priority: number;
}

// Task templates for LOC flow
const LOC_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  'CREATED': [
    { task_type: 'INTAKE_WELCOME', title: '1️⃣ Welkom & casechat opstarten', auto_complete: false, priority: 1 },
    { task_type: 'INTAKE_FAMILY_CONTACT', title: '2️⃣ Primair familiecontact bevestigen', auto_complete: false, priority: 2 },
    { task_type: 'INTAKE_GDPR', title: '3️⃣ Toestemming / GDPR registreren', auto_complete: false, priority: 3 }
  ],
  'INTAKE': [
    { task_type: 'INTAKE_DEATH_CERTIFICATE', title: '4️⃣ Overlijdensakte verzamelen & controleren', auto_complete: true, auto_complete_trigger: 'documents.status=APPROVED AND doc_type=OVERLIJDENSAKTE', priority: 4 },
    { task_type: 'INTAKE_ID_DOCUMENT', title: '5️⃣ Identiteitsdocument vastleggen', auto_complete: true, auto_complete_trigger: 'documents.status=APPROVED AND doc_type=ID_PASPOORT', priority: 5 },
    { task_type: 'INTAKE_FLOW_CONFIRM', title: '6️⃣ Flow bevestigen: Lokaal', auto_complete: false, priority: 6 },
    { task_type: 'INTAKE_INSURANCE_INFO', title: '7️⃣ Verzekeringsgegevens toevoegen', auto_complete: false, priority: 7 }
  ],
  'VERIFY': [
    { task_type: 'VERIFY_INSURANCE', title: '8️⃣ Verzekering verifiëren', auto_complete: true, auto_complete_trigger: 'claims.status IN (APPROVED, MANUAL_OVERRIDE)', priority: 8 },
    { task_type: 'VERIFY_OFFER', title: '9️⃣ Offerte laten tekenen', auto_complete: false, priority: 9 }
  ],
  'PREP': [
    { task_type: 'PREP_MORTUARY', title: '🔟 Mortuarium plannen (koeling + wassing)', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=MORTUARY_SERVICE', priority: 10 },
    { task_type: 'PREP_MOSQUE', title: '1️⃣1️⃣ Moskee & janazagebed plannen', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=MOSQUE_SERVICE', priority: 11 },
    { task_type: 'PREP_BURIAL', title: '1️⃣2️⃣ Begrafenis & concessie bevestigen', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=BURIAL', priority: 12 },
    { task_type: 'PREP_TRANSPORT', title: '1️⃣3️⃣ Vervoer regelen', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=PICKUP', priority: 13 },
    { task_type: 'PREP_DOCUMENTS', title: '1️⃣4️⃣ Documentenpakket voorbereiden', auto_complete: false, priority: 14 }
  ],
  'EXECUTE': [
    { task_type: 'EXECUTE_PICKUP', title: '1️⃣5️⃣ Ophalen & overbrenging', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=PICKUP', priority: 15 },
    { task_type: 'EXECUTE_MORTUARY', title: '1️⃣6️⃣ Mortuariumdienst uitvoeren', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=MORTUARY_SERVICE', priority: 16 },
    { task_type: 'EXECUTE_MOSQUE', title: '1️⃣7️⃣ Janazagebed uitvoeren', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=MOSQUE_SERVICE', priority: 17 },
    { task_type: 'EXECUTE_BURIAL', title: '1️⃣8️⃣ Begrafenis uitvoeren & rapporteren', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=BURIAL', priority: 18 }
  ],
  'SETTLE': [
    { task_type: 'SETTLE_BURIAL_CERTIFICATE', title: '1️⃣9️⃣ Begraafakte uploaden', auto_complete: true, auto_complete_trigger: 'documents.status=APPROVED AND doc_type=BEGRAAFAKTE', priority: 19 },
    { task_type: 'SETTLE_FD_INVOICE', title: '2️⃣0️⃣ Eindfactuur FD verzenden', auto_complete: true, auto_complete_trigger: 'invoices.status=SENT AND invoice_type=FD', priority: 20 },
    { task_type: 'SETTLE_MORTUARY_INVOICE', title: '2️⃣1️⃣ Mortuarium-factuur verwerken', auto_complete: true, auto_complete_trigger: 'invoices.status=SENT AND invoice_type=WASPLAATS', priority: 21 },
    { task_type: 'SETTLE_FEEDBACK', title: '2️⃣2️⃣ Feedbackverzoek versturen', auto_complete: false, priority: 22 }
  ]
};

// Task templates for REP (Repatriëring) flow
const REP_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  'CREATED': [
    { task_type: 'INTAKE_WELCOME', title: '1️⃣ Welkom & casechat opstarten', auto_complete: false, priority: 1 },
    { task_type: 'INTAKE_FAMILY_CONTACT', title: '2️⃣ Primair familiecontact bevestigen', auto_complete: false, priority: 2 },
    { task_type: 'INTAKE_GDPR', title: '3️⃣ GDPR / Toestemming registreren', auto_complete: false, priority: 3 }
  ],
  'INTAKE': [
    { task_type: 'INTAKE_DEATH_CERTIFICATE', title: '4️⃣ Overlijdensakte controleren', auto_complete: true, auto_complete_trigger: 'documents.status=APPROVED AND doc_type=OVERLIJDENSAKTE', priority: 4 },
    { task_type: 'INTAKE_PASSPORT_DECEASED', title: '5️⃣ Paspoort overledene controleren', auto_complete: true, auto_complete_trigger: 'documents.status=APPROVED AND doc_type=PASPOORT_OVERLEDENE', priority: 5 },
    { task_type: 'INTAKE_FLOW_CONFIRM', title: '6️⃣ Flow bevestigen: repatriëring', auto_complete: false, priority: 6 },
    { task_type: 'INTAKE_INSURANCE_CHECK', title: '7️⃣ Verzekeringsgegevens controleren/aanvullen', auto_complete: false, priority: 7 },
    { task_type: 'INTAKE_DATA_CHECK', title: '8️⃣ Intakegegevens familie nakijken', description: 'Vluchtinfo, reizigers, voorkeuren', auto_complete: false, priority: 8 }
  ],
  'VERIFY': [
    { task_type: 'VERIFY_INSURANCE', title: '9️⃣ Verzekering verifiëren', auto_complete: true, auto_complete_trigger: 'claims.status IN (APPROVED, MANUAL_OVERRIDE)', priority: 9 },
    { task_type: 'VERIFY_OFFER', title: '🔟 Offerte laten tekenen', auto_complete: false, priority: 10 }
  ],
  'PREP': [
    { task_type: 'PREP_MORTUARY', title: '1️⃣1️⃣ Mortuarium plannen (koeling + wassing)', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=MORTUARY_SERVICE', priority: 11 },
    { task_type: 'PREP_CONSULAR_DOCS', title: '1️⃣2️⃣ Consulaire documenten regelen', auto_complete: false, priority: 12 },
    { task_type: 'PREP_FLIGHT_PROPOSAL', title: '1️⃣3️⃣ Vluchtvoorstel voorbereiden', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=FLIGHT', priority: 13 },
    { task_type: 'PREP_EXPORT_CLEARANCE', title: '1️⃣4️⃣ Douane/exportafhandeling organiseren', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=EXPORT_CLEARANCE', priority: 14 },
    { task_type: 'PREP_RECEIVING_PARTNER', title: '1️⃣5️⃣ Partner in bestemmingsland bevestigen', auto_complete: true, auto_complete_trigger: 'case_events.status=PLANNED AND event_type=PARTNER_RECEIVING', priority: 15 },
    { task_type: 'PREP_DOCUMENT_PACKAGE', title: '1️⃣6️⃣ Documentenpakket voorbereiden', description: 'AWB, toestemmingen, verklaringen', auto_complete: false, priority: 16 }
  ],
  'EXECUTE': [
    { task_type: 'EXECUTE_FLIGHT_BOOKING', title: '1️⃣7️⃣ Vlucht boeken & AWB vastleggen', auto_complete: true, auto_complete_trigger: 'flights.air_waybill IS NOT NULL', priority: 17 },
    { task_type: 'EXECUTE_EXPORT', title: '1️⃣8️⃣ Exportafhandeling & luchthavenoverdracht uitvoeren', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=EXPORT_CLEARANCE', priority: 18 },
    { task_type: 'EXECUTE_FLIGHT_TRACKING', title: '1️⃣9️⃣ Vlucht opvolgen (vertrek/landing)', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=FLIGHT', priority: 19 },
    { task_type: 'EXECUTE_PARTNER_HANDOVER', title: '2️⃣0️⃣ Overdracht partner bevestigen', description: 'Bewijsdocument uploaden', auto_complete: true, auto_complete_trigger: 'case_events.status=DONE AND event_type=PARTNER_RECEIVING', priority: 20 }
  ],
  'SETTLE': [
    { task_type: 'SETTLE_REPATRIATION_DOCS', title: '2️⃣1️⃣ Alle repatriëringsdocumenten uploaden & valideren', auto_complete: false, priority: 21 },
    { task_type: 'SETTLE_FD_INVOICE', title: '2️⃣2️⃣ FD-factuur opstellen & versturen', auto_complete: true, auto_complete_trigger: 'invoices.status=SENT AND invoice_type=FD', priority: 22 },
    { task_type: 'SETTLE_MORTUARY_INVOICE', title: '2️⃣3️⃣ Mortuariumfactuur verwerken', auto_complete: true, auto_complete_trigger: 'invoices.status=SENT AND invoice_type=WASPLAATS', priority: 23 },
    { task_type: 'SETTLE_CLAIM_SETTLEMENT', title: '2️⃣4️⃣ Verzekeringsafrekening opvolgen', auto_complete: false, priority: 24 },
    { task_type: 'SETTLE_FEEDBACK', title: '2️⃣5️⃣ Feedbackverzoek sturen', auto_complete: false, priority: 25 }
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

    // Get the dossier to find the organization
    const { data: dossier, error: dossierError } = await supabaseClient
      .from('dossiers')
      .select('assigned_fd_org_id')
      .eq('id', dossierId)
      .single();

    if (dossierError || !dossier?.assigned_fd_org_id) {
      console.error('[seed-dossier-tasks] Could not find dossier organization:', dossierError);
      throw new Error('Dossier organization not found');
    }

    const orgId = dossier.assigned_fd_org_id;

    // Get or create board for this organization
    let { data: board, error: boardError } = await supabaseClient
      .from('task_boards')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle();

    if (boardError) {
      console.error('[seed-dossier-tasks] Error fetching board:', boardError);
      throw boardError;
    }

    // Create board if it doesn't exist
    if (!board) {
      const { data: newBoard, error: createBoardError } = await supabaseClient
        .from('task_boards')
        .insert({ org_id: orgId, name: 'Taken' })
        .select('id')
        .single();

      if (createBoardError) {
        console.error('[seed-dossier-tasks] Error creating board:', createBoardError);
        throw createBoardError;
      }

      board = newBoard;
    }

    // Get or create the TODO column
    let { data: columns, error: columnsError } = await supabaseClient
      .from('task_board_columns')
      .select('id, key')
      .eq('board_id', board.id);

    if (columnsError) {
      console.error('[seed-dossier-tasks] Error fetching columns:', columnsError);
      throw columnsError;
    }

    let todoColumn = columns?.find(c => c.key === 'todo');

    // Create columns if they don't exist
    if (!todoColumn) {
      const requiredColumns = [
        { key: 'todo', label: 'Te doen', order_idx: 1, is_done: false },
        { key: 'doing', label: 'Bezig', order_idx: 2, is_done: false },
        { key: 'done', label: 'Afgerond', order_idx: 3, is_done: true }
      ];

      const { data: newColumns, error: createColumnsError } = await supabaseClient
        .from('task_board_columns')
        .insert(requiredColumns.map(col => ({ board_id: board.id, ...col })))
        .select('id, key');

      if (createColumnsError) {
        console.error('[seed-dossier-tasks] Error creating columns:', createColumnsError);
        throw createColumnsError;
      }

      todoColumn = newColumns?.find(c => c.key === 'todo');
    }

    if (!todoColumn) {
      throw new Error('Could not create or find TODO column');
    }

    // Map dossier status to template key
    const statusToTemplateKey: Record<string, string> = {
      'CREATED': 'CREATED',
      'INTAKE_IN_PROGRESS': 'INTAKE',
      'INTAKE_COMPLETE': 'INTAKE',
      'VERIFICATION_PENDING': 'VERIFY',
      'VERIFICATION_COMPLETE': 'VERIFY',
      'PLANNING': 'PREP',
      'PREP_COMPLETE': 'PREP',
      'EXECUTION': 'EXECUTE',
      'EXECUTION_COMPLETE': 'EXECUTE',
      'SETTLEMENT': 'SETTLE',
      'COMPLETED': 'SETTLE',
      'ON_HOLD': 'PREP',
      'CANCELLED': 'SETTLE'
    };

    const templateKey = statusToTemplateKey[status];

    // Select the right template based on flow
    const templates = flow === 'LOC' ? LOC_TASK_TEMPLATES : flow === 'REP' ? REP_TASK_TEMPLATES : null;

    if (!templates) {
      console.log(`[seed-dossier-tasks] Flow ${flow} not supported yet, skipping task seeding`);
      return new Response(
        JSON.stringify({ success: true, message: 'Flow not supported yet', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tasks that should exist for this status
    const tasksToCreate = templateKey ? (templates[templateKey] || []) : [];

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

    // Create new tasks with board_id, column_id, and status
    const tasksWithDossierId = newTasks.map((task, index) => ({
      board_id: board.id,
      column_id: todoColumn.id,
      org_id: orgId,
      dossier_id: dossierId,
      title: task.title,
      description: task.description || '',
      priority: 'MEDIUM' as const,
      status: 'TE_DOEN', // Must match check constraint: TE_DOEN, BEZIG, or AFGEROND
      position: index,
      labels: [task.task_type],
      reporter_id: null
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
