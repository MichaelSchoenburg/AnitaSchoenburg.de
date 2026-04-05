-- ── Trigger: reaction_count (comments) + reaction_counts (paintings) ─────────
-- Die Zähler werden serverseitig per SECURITY DEFINER-Trigger gepflegt,
-- damit kein Client-seitiges UPDATE-Recht auf paintings/comments benötigt wird.

create or replace function handle_reaction_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.target_type = 'painting' then
      update public.paintings
      set reaction_counts = jsonb_set(
        coalesce(reaction_counts, '{}'::jsonb),
        array[NEW.emoji],
        to_jsonb(coalesce((reaction_counts->>NEW.emoji)::int, 0) + 1)
      )
      where id = NEW.target_id;
    elsif NEW.target_type = 'comment' then
      update public.comments
      set reaction_count = reaction_count + 1
      where id = NEW.target_id::uuid;
    end if;
    return NEW;

  elsif TG_OP = 'DELETE' then
    if OLD.target_type = 'painting' then
      update public.paintings
      set reaction_counts = case
        when coalesce((reaction_counts->>OLD.emoji)::int, 0) <= 1
          then reaction_counts - OLD.emoji
        else jsonb_set(
          reaction_counts,
          array[OLD.emoji],
          to_jsonb(coalesce((reaction_counts->>OLD.emoji)::int, 0) - 1)
        )
      end
      where id = OLD.target_id;
    elsif OLD.target_type = 'comment' then
      update public.comments
      set reaction_count = greatest(reaction_count - 1, 0)
      where id = OLD.target_id::uuid;
    end if;
    return OLD;
  end if;
end;
$$;

create trigger trg_reaction_count
after insert or delete on public.reactions
for each row execute function handle_reaction_count();
