// js/reactions.js
import { supabase } from './supabase-config.js';

export async function loadReactions(targetId) {
  const { data } = await supabase
    .from('reactions')
    .select('emoji, user_id')
    .eq('target_id', targetId);

  const map = {};
  for (const row of data ?? []) {
    if (!map[row.emoji]) map[row.emoji] = { count: 0, users: [] };
    map[row.emoji].count++;
    map[row.emoji].users.push(row.user_id);
  }
  return map;
}

export async function setReaction(userId, targetId, targetType, emoji) {
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, emoji')
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    await updateReactionCount(targetId, targetType, existing.emoji, -1);
    if (existing.emoji === emoji) return;
  }

  await supabase.from('reactions').insert({ user_id: userId, target_id: targetId, target_type: targetType, emoji });
  await updateReactionCount(targetId, targetType, emoji, 1);
}

async function updateReactionCount(targetId, targetType, emoji, delta) {
  if (targetType === 'painting') {
    const { data } = await supabase.from('paintings').select('reaction_counts').eq('id', targetId).single();
    const counts = data?.reaction_counts ?? {};
    counts[emoji] = Math.max(0, (counts[emoji] ?? 0) + delta);
    if (counts[emoji] === 0) delete counts[emoji];
    await supabase.from('paintings').update({ reaction_counts: counts }).eq('id', targetId);
  } else {
    const { data } = await supabase.from('comments').select('reaction_count').eq('id', targetId).single();
    const newCount = Math.max(0, (data?.reaction_count ?? 0) + delta);
    await supabase.from('comments').update({ reaction_count: newCount }).eq('id', targetId);
  }
}

export function renderReactionsBar(container, targetId, targetType, currentUserId) {
  container.innerHTML = '<div class="reactions-bar" data-reactions-bar></div>';
  const bar = container.querySelector('[data-reactions-bar]');

  async function refresh() {
    const reactions = await loadReactions(targetId);
    bar.innerHTML = '';

    for (const [emoji, { count, users }] of Object.entries(reactions)) {
      if (count === 0) continue;
      const isMine = currentUserId && users.includes(currentUserId);
      const pill = document.createElement('button');
      pill.className = 'reaction-pill' + (isMine ? ' is-mine' : '');
      pill.title = users.join(', ');
      pill.innerHTML = `${emoji} <span class="reaction-pill__count">${count}</span>`;
      if (currentUserId) {
        pill.addEventListener('click', async () => {
          await setReaction(currentUserId, targetId, targetType, emoji);
          await refresh();
        });
      }
      bar.appendChild(pill);
    }

    if (currentUserId) {
      const addBtn = document.createElement('button');
      addBtn.className = 'reaction-add-btn';
      addBtn.title = 'Reaktion hinzufügen';
      addBtn.textContent = '😊';
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        openEmojiPicker(addBtn, async emoji => {
          await setReaction(currentUserId, targetId, targetType, emoji);
          await refresh();
        });
      });
      bar.appendChild(addBtn);
    }
  }

  refresh();
}

let pickerEl = null;

function openEmojiPicker(anchor, onSelect) {
  if (pickerEl) { pickerEl.remove(); pickerEl = null; }

  const doShow = () => {
    pickerEl = document.createElement('em-emoji-picker');
    pickerEl.setAttribute('locale', 'de');
    pickerEl.setAttribute('theme', 'light');

    const rect = anchor.getBoundingClientRect();
    pickerEl.style.top = (rect.bottom + 4) + 'px';
    pickerEl.style.left = rect.left + 'px';

    pickerEl.addEventListener('emoji-click', e => {
      onSelect(e.detail.unicode);
      pickerEl.remove(); pickerEl = null;
    });

    setTimeout(() => {
      document.addEventListener('click', () => {
        if (pickerEl) { pickerEl.remove(); pickerEl = null; }
      }, { once: true });
    }, 0);

    document.body.appendChild(pickerEl);
  };

  if (!customElements.get('em-emoji-picker')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/npm/emoji-mart@5/dist/browser.js';
    script.onload = doShow;
    document.head.appendChild(script);
  } else {
    doShow();
  }
}
