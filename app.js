const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const KEYS = { favorites: 'kotoba-favorites-v1', hidden: 'kotoba-hidden-v1' };

let words = [];
let query = '';
let activeTab = 'all';
let favorites = loadSet(KEYS.favorites);
let hidden = loadSet(KEYS.hidden);
let toastTimer;

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}

function saveSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); }
  catch { showToast('浏览器无法保存设置'); }
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function visibleWords() { return words.filter((word) => !hidden.has(word.id)); }

function filteredWords() {
  const normalized = query.trim().toLowerCase();
  return visibleWords().filter((word) => {
    if (activeTab === 'favorites' && !favorites.has(word.id)) return false;
    if (!normalized) return true;
    return `${word.word} ${word.reading} ${word.core} ${word.senses.map((sense) => sense.meaning).join(' ')}`.toLowerCase().includes(normalized);
  });
}

function currentWordId() {
  const match = location.hash.match(/^#word\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateHome() { location.hash = '#list'; }
function navigateWord(id) { location.hash = `#word/${encodeURIComponent(id)}`; }

function render() {
  const id = currentWordId();
  if (id) {
    const word = visibleWords().find((item) => item.id === id);
    if (word) return renderDetail(word);
    return navigateHome();
  }
  renderList();
}

function renderList() {
  const results = filteredWords();
  const visibleCount = visibleWords().length;
  app.innerHTML = `
    <header class="topbar">
      <div class="brand-row">
        <div class="brand"><span class="brand-mark">こ</span><div><h1>言葉帖</h1><small>KOTOBA NOTE</small></div></div>
        <span class="count-pill">${visibleCount} 语</span>
      </div>
      <label class="search"><span aria-hidden="true">⌕</span><input id="searchInput" type="search" placeholder="搜索单词、读音或释义" value="${escapeHTML(query)}" autocomplete="off" /></label>
    </header>
    <nav class="tabs" aria-label="词库筛选">
      <button class="tab ${activeTab === 'all' ? 'active' : ''}" data-tab="all">全部 ${visibleCount}</button>
      <button class="tab ${activeTab === 'favorites' ? 'active' : ''}" data-tab="favorites">收藏 ${visibleWords().filter((word) => favorites.has(word.id)).length}</button>
    </nav>
    ${results.length ? `<ul class="word-list">${results.map((word) => `
      <li class="word-row">
        <button class="word-link" data-open="${escapeHTML(word.id)}">
          <div class="word-primary"><div class="word-title-line"><h2 class="word-title">${escapeHTML(word.word)}</h2><span class="word-reading">${escapeHTML(word.reading)}${escapeHTML(word.accent)}</span></div><p class="word-summary">${escapeHTML(word.core)}</p></div>
          <div class="row-side">${favorites.has(word.id) ? '<span class="favorite-dot" aria-label="已收藏">★</span>' : ''}<span class="level">${escapeHTML(word.level)}</span><span class="chevron">›</span></div>
        </button>
      </li>`).join('')}</ul>` : `<section class="empty"><b>${activeTab === 'favorites' ? '还没有收藏' : '没有找到单词'}</b><p>${activeTab === 'favorites' ? '进入单词详情，轻触收藏按钮。' : '换一个关键词再试试。'}</p></section>`}
  `;
  const input = document.querySelector('#searchInput');
  input?.addEventListener('input', (event) => { query = event.target.value; renderList(); document.querySelector('#searchInput')?.focus(); });
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { activeTab = button.dataset.tab; renderList(); }));
  document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => navigateWord(button.dataset.open)));
}

function renderDetail(word) {
  const list = visibleWords();
  const index = list.findIndex((item) => item.id === word.id);
  const previous = list[index - 1];
  const next = list[index + 1];
  const isFavorite = favorites.has(word.id);
  app.innerHTML = `
    <main class="detail">
      <header class="detail-nav"><button class="icon-button" id="backButton" aria-label="返回词库">‹</button><span class="detail-nav-label">言葉の詳細</span><button class="icon-button" id="topFavorite" aria-label="${isFavorite ? '移除收藏' : '收藏'}">${isFavorite ? '★' : '☆'}</button></header>
      <section class="hero-word">
        <div class="meta-line"><span class="meta-tag">${escapeHTML(word.level)}</span><span>${escapeHTML(word.partOfSpeech)}</span></div>
        <h1>${escapeHTML(word.word)}</h1>
        <div class="reading-line"><span>${escapeHTML(word.reading)}${escapeHTML(word.accent)}</span><button class="speak" id="speakButton" aria-label="朗读">♩</button></div>
      </section>
      <section class="core"><small>基本解释</small><p>${escapeHTML(word.core)}</p></section>
      <section class="senses">${word.senses.map((sense, senseIndex) => `
        <article class="sense"><div class="sense-head"><span class="sense-num">${String(senseIndex + 1).padStart(2, '0')}</span><h2>${escapeHTML(sense.meaning)}</h2></div><p class="sense-note">${escapeHTML(sense.note)}</p>${sense.examples.map((example) => `<div class="example"><p class="example-ja" lang="ja">${escapeHTML(example.ja)}</p><p class="example-zh">${escapeHTML(example.zh)}</p></div>`).join('')}</article>`).join('')}
      </section>
      <div class="more-actions"><button class="remove" id="removeButton">从本机移除这个单词</button></div>
      <nav class="detail-actions" aria-label="单词导航">
        <button class="action" id="previousButton" ${previous ? '' : 'disabled'}>← 上一个</button>
        <button class="action ${isFavorite ? 'favorite' : ''}" id="favoriteButton">${isFavorite ? '★ 移除收藏' : '☆ 收藏'}</button>
        <button class="action" id="nextButton" ${next ? '' : 'disabled'}>下一个 →</button>
      </nav>
    </main>`;

  document.querySelector('#backButton').addEventListener('click', navigateHome);
  document.querySelector('#previousButton').addEventListener('click', () => previous && navigateWord(previous.id));
  document.querySelector('#nextButton').addEventListener('click', () => next && navigateWord(next.id));
  document.querySelector('#favoriteButton').addEventListener('click', () => toggleFavorite(word.id));
  document.querySelector('#topFavorite').addEventListener('click', () => toggleFavorite(word.id));
  document.querySelector('#speakButton').addEventListener('click', () => speak(word.word));
  document.querySelector('#removeButton').addEventListener('click', () => removeWord(word));
  scrollTo({ top: 0, behavior: 'auto' });
}

function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveSet(KEYS.favorites, favorites);
  render();
}

function speak(text) {
  if (!('speechSynthesis' in window)) return showToast('当前浏览器不支持朗读');
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  speechSynthesis.speak(utterance);
}

function removeWord(word) {
  if (!confirm(`从这部手机移除「${word.word}」？`)) return;
  hidden.add(word.id);
  saveSet(KEYS.hidden, hidden);
  navigateHome();
  showToast(`已移除「${word.word}」`, '撤销', () => { hidden.delete(word.id); saveSet(KEYS.hidden, hidden); render(); });
}

function showToast(message, actionLabel, action) {
  clearTimeout(toastTimer);
  toast.innerHTML = `<span>${escapeHTML(message)}</span>${actionLabel ? `<button>${escapeHTML(actionLabel)}</button>` : ''}`;
  toast.classList.add('show');
  if (actionLabel) toast.querySelector('button').addEventListener('click', () => { action?.(); toast.classList.remove('show'); });
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

window.addEventListener('hashchange', render);

fetch('./words.json', { cache: 'no-cache' })
  .then((response) => { if (!response.ok) throw new Error('词库读取失败'); return response.json(); })
  .then((data) => { words = data; render(); })
  .catch(() => { app.innerHTML = '<section class="empty"><b>词库加载失败</b><p>请检查网络后刷新页面。</p></section>'; });
