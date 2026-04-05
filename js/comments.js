// js/comments.js
import { supabase } from './supabase-config.js';
import { renderCommentForm } from './comment-form.js';
import { renderReactionsBar } from './reactions.js';
import { renderAuthDialog } from './auth-ui.js';

const PAGE_SIZE = 10;

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return new Date(isoString).toLocaleDateString('de-DE');
}

function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sortQuery(q, sort) {
  if (sort === 'popular') return q.order('reaction_count', { ascending: false });
  if (sort === 'newest')  return q.order('created_at', { ascending: false });
  return q.order('created_at', { ascending: true });
}

async function loadReplies(paintingId, parentId, container, user, profile, isAdmin, maxDepth) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('painting_id', paintingId)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (!data?.length) return;
  const list = document.createElement('ul');
  list.className = 'comment-list';
  for (const row of data) {
    list.appendChild(renderCommentItem(row, user, profile, paintingId, isAdmin, maxDepth));
  }
  container.appendChild(list);
}

function renderCommentItem(row, user, profile, paintingId, isAdmin, maxDepth) {
  const li = document.createElement('li');
  li.className = 'comment';
  li.dataset.commentId = row.id;

  const isOwner = user && user.id === row.author_id;
  const canDelete = isOwner || isAdmin;
  const canReply = row.depth < maxDepth;

  li.innerHTML = `
    <div class="comment__avatar">
      ${row.author_avatar
        ? `<img src="${row.author_avatar}" alt="${escapeHtml(row.author_name)}">`
        : avatarInitials(row.author_name)}
    </div>
    <div class="comment__body">
      <div class="comment__header">
        <span class="comment__author">${escapeHtml(row.author_name)}</span>
        <span class="comment__time">${timeAgo(row.created_at)}</span>
        ${row.edited_at ? '<span class="comment__edited">(bearbeitet)</span>' : ''}
      </div>
      <p class="comment__text${row.deleted ? ' comment__text--deleted' : ''}">
        ${row.deleted ? 'Kommentar wurde gelöscht.' : escapeHtml(row.text)}
      </p>
      ${!row.deleted ? '<div data-reactions></div>' : ''}
      <div class="comment__actions">
        ${!row.deleted && canReply ? '<button class="comment__action-btn" data-action="reply">Antworten</button>' : ''}
        ${!row.deleted && isOwner ? '<button class="comment__action-btn" data-action="edit">Bearbeiten</button>' : ''}
        ${!row.deleted && canDelete ? '<button class="comment__action-btn comment__action-btn--danger" data-action="delete">Löschen</button>' : ''}
      </div>
      <div data-reply-form></div>
      <div data-replies class="comment__replies"></div>
    </div>
  `;

  if (!row.deleted) {
    renderReactionsBar(li.querySelector('[data-reactions]'), row.id, 'comment', user?.id ?? null);
  }

  if (row.child_count > 0) {
    loadReplies(paintingId, row.id, li.querySelector('[data-replies]'), user, profile, isAdmin, maxDepth);
  }

  li.querySelector('[data-action="reply"]')?.addEventListener('click', () => {
    const formEl = li.querySelector('[data-reply-form]');
    if (formEl.children.length) { formEl.innerHTML = ''; return; }
    renderCommentForm(formEl, {
      paintingId, parentId: row.id, depth: row.depth + 1, user, profile,
      onSuccess: () => {
        formEl.innerHTML = '';
        const repliesEl = li.querySelector('[data-replies]');
        repliesEl.innerHTML = '';
        loadReplies(paintingId, row.id, repliesEl, user, profile, isAdmin, maxDepth);
      },
      onCancel: () => { formEl.innerHTML = ''; }
    });
  });

  li.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    const textEl = li.querySelector('.comment__text');
    textEl.innerHTML = `
      <textarea class="comment-form__textarea" style="width:100%;min-height:80px;">${escapeHtml(row.text)}</textarea>
      <div style="display:flex;gap:0.5rem;margin-top:0.4rem;">
        <button class="btn" data-save>Speichern</button>
        <button style="background:none;border:none;cursor:pointer;color:#999;font-family:var(--font-body);" data-cancel>Abbrechen</button>
      </div>
      <p class="comment-form__error"></p>
    `;
    textEl.querySelector('[data-cancel]').addEventListener('click', () => {
      textEl.className = 'comment__text';
      textEl.textContent = row.text;
    });
    textEl.querySelector('[data-save]').addEventListener('click', async () => {
      const newText = textEl.querySelector('textarea').value.trim();
      const errEl = textEl.querySelector('.comment-form__error');
      if (!newText) return;
      const URL_PATTERN = /((https?:\/\/|www\.)\S+)|(\S+\.(de|com|net|org|io|at|ch|eu|info|biz|app|dev)\b)/gi;
      if (URL_PATTERN.test(newText)) { errEl.textContent = 'Links sind nicht erlaubt.'; return; }
      const { error } = await supabase.from('comments').update({ text: newText, edited_at: new Date().toISOString() }).eq('id', row.id);
      if (error) { errEl.textContent = 'Fehler beim Speichern.'; return; }
      row.text = newText;
      row.edited_at = new Date().toISOString();
      textEl.className = 'comment__text';
      textEl.textContent = newText;
      if (!li.querySelector('.comment__edited')) {
        const span = document.createElement('span');
        span.className = 'comment__edited';
        span.textContent = '(bearbeitet)';
        li.querySelector('.comment__header').appendChild(span);
      }
    });
  });

  li.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!confirm('Kommentar wirklich löschen?')) return;
    await supabase.from('comments').update({ deleted: true }).eq('id', row.id);
    li.querySelector('.comment__text').className = 'comment__text comment__text--deleted';
    li.querySelector('.comment__text').textContent = 'Kommentar wurde gelöscht.';
    li.querySelector('[data-reactions]')?.remove();
    li.querySelector('.comment__actions').innerHTML = '';
  });

  return li;
}

export function renderCommentsSection(container, { paintingId, user, profile, isAdmin }) {
  const maxDepth = 9;
  let currentSort = 'popular';
  let currentPage = 0;
  let loading = false;
  let allLoaded = false;

  container.innerHTML = `
    <section class="comments-section">
      <div class="comments-header">
        <h2 class="comments-title">Kommentare</h2>
        <div class="comments-sort">
          <button class="comments-sort-btn is-active" data-sort="popular">Beliebt</button>
          <button class="comments-sort-btn" data-sort="newest">Neueste</button>
          <button class="comments-sort-btn" data-sort="oldest">Älteste</button>
        </div>
      </div>
      <div id="commentFormArea"></div>
      <ul class="comment-list" id="commentList"></ul>
      <div class="comments-load-more" id="loadMoreSentinel"></div>
    </section>
  `;

  const formArea = container.querySelector('#commentFormArea');
  const list = container.querySelector('#commentList');
  const sentinel = container.querySelector('#loadMoreSentinel');

  if (user) {
    renderCommentForm(formArea, {
      paintingId, parentId: null, depth: 0, user, profile,
      onSuccess: () => reload()
    });
  } else {
    formArea.innerHTML = `
      <div class="comments-login-prompt">
        <p>Möchtest du einen Kommentar hinterlassen?</p>
        <button class="btn" id="commentLoginBtn">Jetzt anmelden</button>
      </div>
    `;
    formArea.querySelector('#commentLoginBtn').addEventListener('click', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      renderAuthDialog(div);
    });
  }

  container.querySelectorAll('.comments-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.comments-sort-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentSort = btn.dataset.sort;
      reload();
    });
  });

  async function reload() {
    list.innerHTML = '';
    currentPage = 0;
    allLoaded = false;
    await loadPage();
  }

  async function loadPage() {
    if (loading || allLoaded) return;
    loading = true;
    sentinel.textContent = 'Lade …';

    let q = supabase
      .from('comments')
      .select('*')
      .eq('painting_id', paintingId)
      .is('parent_id', null)
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    q = sortQuery(q, currentSort);
    const { data } = await q;

    if (!data?.length || data.length < PAGE_SIZE) allLoaded = true;
    currentPage++;

    for (const row of data ?? []) {
      list.appendChild(renderCommentItem(row, user, profile, paintingId, isAdmin, maxDepth));
    }

    sentinel.textContent = '';
    loading = false;
  }

  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadPage();
  }, { threshold: 0.1 }).observe(sentinel);

  reload();
}
