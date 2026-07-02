-- UniConnect chat fixes
-- Run this in the Supabase SQL Editor.
--
-- Diagnosis (from live policy dump):
--   * messages SELECT/INSERT policies are ALREADY correct (both participants can
--     read and send) -- so replying is permitted; no change needed there.
--   * messages is NOT in the realtime publication -> new messages don't arrive live.
--   * conversations has NO delete policy -> deleting a conversation is denied by RLS.
--   * messages delete is limited to sender_id = auth.uid() -> can't clear the other
--     party's messages when deleting a whole conversation.
--
-- This script only fills those gaps. It is safe to re-run.

-- ============================================================
-- 1) REALTIME: deliver new messages live to the other party.
--    (This is the main fix.)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- ============================================================
-- 2) CONVERSATIONS: allow either participant to delete (policy was missing).
-- ============================================================
drop policy if exists "Participants can delete conversations" on public.conversations;
create policy "Participants can delete conversations"
on public.conversations
for delete
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid());

-- ============================================================
-- 3) MESSAGES: let a participant delete any message in their own conversation,
--    so deleting a conversation can clear the whole thread (not just own messages).
--    This is added ALONGSIDE the existing sender-only policy (they OR together).
-- ============================================================
drop policy if exists "Participants can delete conversation messages" on public.messages;
create policy "Participants can delete conversation messages"
on public.messages
for delete
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

-- ============================================================
-- 4) Helpful index for loading a thread in order.
-- ============================================================
create index if not exists messages_conversation_created_idx
on public.messages (conversation_id, created_at);
