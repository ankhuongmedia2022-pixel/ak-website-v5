(() => {
  const root = document.querySelector('.ak-portfolio');
  if (!root) return;
  root.classList.add('is-interactive');
  const cards = [...root.querySelectorAll('[data-portfolio-category]')];
  const filters = [...root.querySelectorAll('[data-portfolio-filter]')];
  const status = root.querySelector('.ak-filter-status');
  function filter(category) {
    let count = 0;
    cards.forEach(card => { card.hidden = category !== 'all' && card.dataset.portfolioCategory !== category; if (!card.hidden) count++; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.portfolioFilter === category)));
    status.textContent = `${count} video dự án`;
    const reels = root.querySelector('.royal-reels');
    if (reels) reels.hidden = category !== 'all' && category !== 'team';
  }
  filters.forEach(button => button.addEventListener('click', () => filter(button.dataset.portfolioFilter)));
  root.querySelectorAll('[data-drive-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.driveId;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://drive.google.com/file/d/${id}/preview`;
    iframe.title = button.dataset.videoTitle;
    iframe.allow = 'fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    button.closest('[data-video-slot]').replaceChildren(iframe);
  }));
  function showLinkedProject() {
    const id = location.hash.slice(1);
    if (cards.some(card => card.id === id)) filter('all');
  }
  window.addEventListener('hashchange', showLinkedProject);
  showLinkedProject();
})();
