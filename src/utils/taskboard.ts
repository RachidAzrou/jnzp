import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateBoardForOrg(orgId: string) {
  // 1) Bestaat er al een board?
  const { data: existing, error: qErr } = await supabase
    .from("task_boards")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  
  if (qErr) throw qErr;
  if (existing?.id) return existing;

  // 2) Maak board aan
  const { data: created, error: cErr } = await supabase
    .from("task_boards")
    .insert({ org_id: orgId, name: "Taken" })
    .select("id")
    .single();
  
  if (cErr) throw cErr;

  // 3) Zorg dat kolommen bestaan (todo/doing/done)
  const { data: cols, error: colErr } = await supabase
    .from("task_board_columns")
    .select("id, key")
    .eq("board_id", created.id);

  if (colErr) throw colErr;
  
  const existingKeys = new Set(cols?.map(c => c.key) ?? []);
  const requiredColumns = [
    { key: "todo", label: "Te doen", order_idx: 1, is_done: false },
    { key: "doing", label: "Bezig", order_idx: 2, is_done: false },
    { key: "done", label: "Afgerond", order_idx: 3, is_done: true }
  ];
  
  const missingColumns = requiredColumns.filter(col => !existingKeys.has(col.key));
  
  if (missingColumns.length > 0) {
    const payload = missingColumns.map(col => ({
      board_id: created.id,
      ...col
    }));
    
    const { error: icErr } = await supabase
      .from("task_board_columns")
      .insert(payload);
    
    if (icErr) throw icErr;
  }

  return created;
}
