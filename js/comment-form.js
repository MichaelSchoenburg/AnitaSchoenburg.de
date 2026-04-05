// js/comment-form.js
import { supabase } from './supabase-config.js';

const URL_PATTERN = /((https?:\/\/|www\.)\S+)|(\S+\.(de|com|net|org|io|at|ch|eu|info|biz|app|dev)\b)/gi;

function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function renderCommentForm(container, { paintingId, parentId = null, depth = 0, user, profile, onSuccess, onCancel = null }) {
  const isReply = parentId !== null;

  container.innerHTML = `
    <form class="comment-form" data-comment-form>
      <div class="comment-form__user">
        <div class="comment-form__avatar">
          ${profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="${profile.display_name}">`
            : avatarInitials(profile?.display_name)}
        </div>
        <span class="comment-form__name">${profile?.display_name ?? ''}</span>
      </div>
      <textarea
        class="comment-form__textarea"
        placeholder="${isReply ? 'Deine Antwort …' : 'Dein Kommentar …'}"
        maxlength="10000"
        rows="${isReply ? 3 : 4}"
      ></textarea>
      <div class="comment-form__footer">
        <span class="comment-form__chars">0 / 10.000</span>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          ${onCancel ? '<button type="button" class="comment-form__cancel" style="background:none;border:none;cursor:pointer;color:#999;font-family:var(--font-body);">Abbrechen</button>' : ''}
          <button class="btn" type="submit">${isReply ? 'Antworten' : 'Kommentieren'}</button>
        </div>
      </div>
      <p class="comment-form__error"></p>
    </form>
  `;

  const form = container.querySelector('[data-comment-form]');
  const textarea = form.querySelector('textarea');
  const charsEl = form.querySelector('.comment-form__chars');
  const errorEl = form.querySelector('.comment-form__error');

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charsEl.textContent = `${len.toLocaleString('de')} / 10.000`;
    charsEl.classList.toggle('is-warning', len > 9500);
  });

  form.querySelector('.comment-form__cancel')?.addEventListener('click', onCancel);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;

    URL_PATTERN.lastIndex = 0;
    if (URL_PATTERN.test(text)) {
      errorEl.textContent = 'Links sind in Kommentaren nicht erlaubt.';
      return;
    }

    errorEl.textContent = '';
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;

    const { error } = await supabase.from('comments').insert({
      painting_id: paintingId,
      parent_id: parentId,
      depth,
      author_id: user.id,
      author_name: profile?.display_name ?? 'Anonym',
      author_avatar: profile?.avatar_url ?? null,
      text
    });

    btn.disabled = false;

    if (error) {
      errorEl.textContent = 'Fehler beim Speichern. Bitte versuche es erneut.';
      return;
    }

    textarea.value = '';
    charsEl.textContent = '0 / 10.000';
    onSuccess();
  });
}
