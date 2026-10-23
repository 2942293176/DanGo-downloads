(() => {
  const repository = '2942293176/DanGo-downloads';
  const latestPage = `https://github.com/${repository}/releases/latest`;
  const $ = (selector) => document.querySelector(selector);
  const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  function trustedAsset(asset) {
    if (!asset || typeof asset.url !== 'string') return false;
    try {
      const url = new URL(asset.url);
      return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password
        && url.pathname.startsWith(`/${repository}/releases/download/`);
    } catch { return false; }
  }
  function normalizeRelease(value) {
    if (!value || value.published !== true || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value.version)) throw new Error('No published release');
    if (!trustedAsset(value.assets?.installer) || !trustedAsset(value.assets?.portable)) throw new Error('Missing download assets');
    return value;
  }
  function renderRelease(release) {
    const { version, assets } = release;
    document.querySelectorAll('[data-release-version]').forEach((element) => { element.textContent = `v${version}`; });
    document.querySelectorAll('[data-version]').forEach((element) => { element.textContent = `v${version} · Windows 10 / 11`; });
    for (const [kind, asset] of Object.entries(assets)) {
      if (!trustedAsset(asset)) continue;
      document.querySelectorAll(`[data-download="${kind}"]`).forEach((link) => {
        link.href = asset.url;
        link.dataset.fileName = asset.name;
        link.setAttribute('aria-label', kind === 'installer' ? `下载 Windows 安装版 v${version}` : kind === 'portable' ? `下载免安装版 v${version}` : '下载 SHA-256 文件校验值');
      });
    }
    $('#installer-detail').textContent = `${Number.isFinite(assets.installer.size) ? `${formatBytes(assets.installer.size)} · ` : ''}安装向导 · 可选择安装位置`;
    $('#portable-detail').textContent = `${Number.isFinite(assets.portable.size) ? `${formatBytes(assets.portable.size)} · ` : ''}下载后双击运行，不需要安装。`;
    const date = new Date(release.publishedAt);
    $('#release-date').textContent = Number.isNaN(date.valueOf()) ? '通过 GitHub Releases 提供下载' : `更新于 ${new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).format(date)}`;
    $('#checksum-values').replaceChildren();
    for (const kind of ['installer', 'portable']) {
      const asset = assets[kind];
      if (!/^[a-f\d]{64}$/i.test(asset.sha256 || '')) continue;
      const label = document.createElement('small');
      label.textContent = asset.name;
      const code = document.createElement('code');
      code.textContent = asset.sha256;
      $('#checksum-values').append(label, code);
    }
    $('#release-status').textContent = '';
  }
  function fromGitHub(release) {
    const version = release?.tag_name?.replace(/^v/, '');
    const assets = {};
    for (const [kind, name] of Object.entries({ installer: `Dango-Setup-${version}-x64.exe`, portable: `Dango-Portable-${version}-x64.exe`, checksums: 'SHA256SUMS.txt' })) {
      const asset = release.assets?.find((item) => item.name === name && item.state === 'uploaded');
      if (asset) assets[kind] = { name, url: asset.browser_download_url, size: asset.size, sha256: asset.digest?.replace(/^sha256:/, '') };
    }
    return normalizeRelease({ published: !release.draft && !release.prerelease, version, publishedAt: release.published_at, assets });
  }
  async function json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(6500), cache: 'no-cache', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  async function loadRelease() {
    let local;
    try { local = normalizeRelease(await json('release.json')); renderRelease(local); } catch { /* Static fallback links remain useful without a release or network. */ }
    try {
      const latest = fromGitHub(await json(`https://api.github.com/repos/${repository}/releases/latest`));
      renderRelease(local?.version === latest.version ? local : latest);
    } catch {
      if (!local) {
        $('#release-status').textContent = '暂时无法读取版本信息。下载按钮会带你前往 GitHub 最新发布页。';
        document.querySelectorAll('[data-download]').forEach((link) => { link.href = latestPage; });
      }
    }
  }
  loadRelease();

  const lines = ['日子慢一点，小小的快乐就看得见。', '风吹过树梢，故事还在继续。', '工作告一段落，记得伸个懒腰。', '今天没读完的，留给下一次相遇。'];
  let lineIndex = 0;
  for (const [id, direction] of [['#demo-prev', -1], ['#demo-next', 1]]) $(id).addEventListener('click', () => { lineIndex = (lineIndex + direction + lines.length) % lines.length; $('#demo-line').textContent = lines[lineIndex]; });
  const pet = $('#demo-pet');
  const surface = $('.desktop-surface');
  let gesture;
  let offset = { x: 0, y: 0 };
  let replyTimer;
  let replyIndex = 0;
  const replies = ['摸摸，今天辛苦啦。', '在呢，陪你一小会儿。', '休息一下也很好。'];
  function greet() {
    pet.classList.remove('is-tapped');
    void pet.offsetWidth;
    pet.classList.add('is-tapped');
    $('#pet-greeting').textContent = replies[replyIndex++ % replies.length];
    $('#pet-greeting').classList.add('is-visible');
    clearTimeout(replyTimer);
    replyTimer = setTimeout(() => $('#pet-greeting').classList.remove('is-visible'), 1800);
  }
  pet.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, offset: { ...offset }, moved: false };
    pet.setPointerCapture(event.pointerId);
  });
  pet.addEventListener('pointermove', (event) => {
    if (!gesture) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) > 5) gesture.moved = true;
    const bounds = surface.getBoundingClientRect();
    const spot = $('.pet-spot').getBoundingClientRect();
    offset.x = Math.max(bounds.left - spot.left + 12, Math.min(gesture.offset.x + dx, bounds.right - spot.right - 12));
    offset.y = Math.max(-45, Math.min(gesture.offset.y + dy, 10));
    pet.style.setProperty('--pet-x', `${Math.round(offset.x)}px`);
    pet.style.setProperty('--pet-y', `${Math.round(offset.y)}px`);
  });
  function finishGesture(event) {
    if (!gesture) return;
    const tap = !gesture.moved && event.type === 'pointerup';
    const id = gesture.id;
    gesture = null;
    if (pet.hasPointerCapture(id)) pet.releasePointerCapture(id);
    if (tap) greet();
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) pet.addEventListener(event, finishGesture);
  pet.addEventListener('click', (event) => { if (event.detail === 0) greet(); });
  window.addEventListener('resize', () => { offset = { x: 0, y: 0 }; pet.style.removeProperty('--pet-x'); pet.style.removeProperty('--pet-y'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(replyTimer); $('#pet-greeting').classList.remove('is-visible'); pet.classList.remove('is-tapped'); } });
  $('#copy-qq').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('1131636850'); $('#copy-status').textContent = '群号已复制，打开 QQ 搜索即可。'; }
    catch { $('#copy-status').textContent = 'QQ 群号：1131636850'; }
  });
})();
