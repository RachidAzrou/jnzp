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
  
  const have = new Set(cols?.map(c => c.key) ?? []);
  const missing = ["todo", "doing", "done"].filter(k => !have.has(k));
  
  if (missing.length) {
    const payload = missing.map((k) => ({
      board_id: created.id,
      key: k,
      label: k === "todo" ? "Te doen" : k === "doing" ? "Bezig" : "Afgerond",
      order_idx: k === "todo" ? 1 : k === "doing" ? 2 : 3,
      is_done: k === "done"
    }));
    
    const { error: icErr } = await supabase
      .from("task_board_columns")
      .insert(payload);
    
    if (icErr) throw icErr;
  }

  return created;
}
