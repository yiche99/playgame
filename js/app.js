// ===== 游戏数据 =====
const games = [
  {
    id: 'cooking-simulator',
    title: '做饭模拟器',
    tags: ['模拟', '休闲'],
    category: '模拟',
    cover: 'assets/images/covers/cooking-simulator.png',
    desc: '体验从备料到上菜的全过程烹饪乐趣，打造你的虚拟厨房！',
    gameUrl: 'games/cooking-simulator/cooking-simulator.html',
    status: 'ready'
  },
  {
    id: 'judge-simulator',
    title: '法官模拟器',
    tags: ['模拟', '策略'],
    category: '模拟',
    cover: 'assets/images/covers/judge-simulator.png',
    desc: '坐上审判席，聆听案件，做出公正裁决，体验法官的日常。',
    gameUrl: 'games/judge-simulator/法官模拟器打包/法官模拟器.html',
    status: 'ready'
  },
  {
    id: 'one-line-drawing',
    title: '疯狂一笔画',
    tags: ['益智', '休闲'],
    category: '益智',
    cover: 'assets/images/covers/one-line-drawing.png',
    desc: '一笔到底不抬笔，用最少的笔画完成所有关卡的挑战！',
    gameUrl: 'games/one-line-drawing/one-line-drawing.html',
    status: 'ready'
  },
  {
    id: 'pet-simulator',
    title: '宠物模拟器',
    tags: ['模拟', '休闲'],
    category: '模拟',
    cover: 'assets/images/covers/pet-simulator.png',
    desc: '领养、喂养、陪伴你的虚拟宠物，和它一起成长互动。',
    gameUrl: 'games/pet-simulator/yiche-pet-game/pet-simulator.html',
    status: 'ready'
  },
  {
    id: 'airline-company',
    title: '一家航空公司',
    tags: ['模拟', '经营'],
    category: '模拟',
    cover: 'assets/images/covers/airline-company.png',
    desc: '从一架小飞机起步，经营你的航空帝国，征服蓝天！',
    gameUrl: 'games/airline-tycoon/airline-tycoon.html',
    status: 'ready'
  },
  {
    id: 'gta',
    title: 'GTA',
    tags: ['动作', '开放世界'],
    category: '动作',
    cover: 'assets/images/covers/gta.png',
    desc: '自由探索开放城市，完成任务，体验极致的动作冒险。',
    gameUrl: 'games/gta/GTA/gta.html',
    status: 'ready'
  },
  {
    id: 'raft-survival',
    title: '木筏求生',
    tags: ['生存', '冒险'],
    category: '生存',
    cover: 'assets/images/covers/raft-survival.png',
    desc: '漂流在无尽海洋上，收集资源，扩建木筏，努力活下去。',
    gameUrl: 'games/raft-survival/raft-survival.html',
    status: 'ready'
  },
  {
    id: 'hostage-simulator',
    title: '人质模拟器',
    tags: ['模拟', '策略'],
    category: '模拟',
    cover: 'assets/images/covers/hostage-simulator.png',
    desc: '在紧张的人质场景中做出关键决策，考验你的智慧与胆量。',
    status: 'coming-soon'
  },
  {
    id: 'shadow-legend',
    title: '暗影传说2D跑酷',
    tags: ['跑酷', '动作'],
    category: '动作',
    cover: 'assets/images/covers/shadow-legend.png',
    desc: '化身暗影忍者，在2D世界中飞檐走壁，极速跑酷闯关。',
    gameUrl: 'games/shadow-legend/platform-runner.html',
    status: 'ready'
  },
  {
    id: 'split-arena',
    title: '裂土擂台',
    tags: ['对战', '动作'],
    category: '动作',
    cover: 'assets/images/covers/split-arena.png',
    desc: '在裂土擂台中与对手一决高下，展现你的战斗技巧！',
    gameUrl: 'games/split-arena/split-arena.html',
    status: 'ready'
  }
];

// ===== 分类列表 =====
const categories = ['全部', '动作', '模拟', '益智', '生存'];

// ===== 占位封面生成 =====
function generatePlaceholder(game) {
  const colors = [
    ['#7c3aed', '#5b21b6'],
    ['#f59e0b', '#d97706'],
    ['#06b6d4', '#0891b2'],
    ['#ec4899', '#be185d'],
    ['#10b981', '#059669'],
    ['#ef4444', '#b91c1c'],
    ['#8b5cf6', '#6d28d9'],
    ['#f97316', '#c2410c'],
    ['#3b82f6', '#1d4ed8'],
    ['#14b8a6', '#0f766e']
  ];
  const idx = games.findIndex(g => g.id === game.id);
  const [c1, c2] = colors[idx % colors.length];
  const initials = game.title.substring(0, 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
    <defs>
      <linearGradient id="g${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c1}"/>
        <stop offset="100%" style="stop-color:${c2}"/>
      </linearGradient>
      <pattern id="p${idx}" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/>
      </pattern>
    </defs>
    <rect width="400" height="250" fill="url(#g${idx})"/>
    <rect width="400" height="250" fill="url(#p${idx})"/>
    <text x="200" y="125" font-size="72" font-weight="bold" fill="rgba(255,255,255,0.9)" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">${initials}</text>
    <text x="200" y="180" font-size="16" fill="rgba(255,255,255,0.6)" text-anchor="middle" font-family="sans-serif">${game.title}</text>
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ===== 渲染游戏卡片 =====
function renderGames(filterCategory = '全部', searchTerm = '') {
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';

  let filtered = games;

  if (filterCategory !== '全部') {
    filtered = filtered.filter(g => g.category === filterCategory);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(g =>
      g.title.toLowerCase().includes(term) ||
      g.tags.some(t => t.toLowerCase().includes(term))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:60px;font-size:18px;">没有找到匹配的游戏 😢</p>';
    return;
  }

  filtered.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.onclick = () => openGameModal(game);

    card.innerHTML = `
      <div class="cover-wrapper">
        <img class="cover" src="${game.cover}" alt="${game.title}" loading="lazy"
             onerror="this.src='${generatePlaceholder(game).replace(/'/g, "\\'")}'">
        <div class="play-overlay">
          <div class="play-icon"></div>
        </div>
      </div>
      <div class="info">
        <div class="title">${game.title}</div>
        <div class="tags">
          ${game.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ===== 渲染分类标签 =====
function renderCategories() {
  const container = document.getElementById('categories');
  container.innerHTML = '';

  categories.forEach(cat => {
    const tag = document.createElement('div');
    tag.className = 'category-tag' + (cat === '全部' ? ' active' : '');
    tag.textContent = cat;
    tag.onclick = () => {
      document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      const searchTerm = document.getElementById('searchInput').value;
      renderGames(cat, searchTerm);
    };
    container.appendChild(tag);
  });
}

// ===== 游戏模态框 =====
function openGameModal(game) {
  const modal = document.getElementById('gameModal');
  const titleEl = document.getElementById('modalTitle');
  const frameWrapper = document.getElementById('gameFrameWrapper');

  titleEl.textContent = game.title;

  if (game.status === 'coming-soon' || !game.gameUrl) {
    frameWrapper.innerHTML = `
      <div class="coming-soon">
        <div class="icon">🎮</div>
        <h2>${game.title}</h2>
        <p>${game.desc}</p>
        <p style="color:var(--accent-light);font-size:14px;">🚀 游戏即将上线，敬请期待！</p>
        <button class="play-now-btn" onclick="alert('游戏即将上线，敬请期待！')">即将上线</button>
      </div>
    `;
  } else {
    frameWrapper.innerHTML = `<iframe src="${game.gameUrl}" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>`;
  }

  // 渲染底部标签
  const footer = document.getElementById('modalFooter');
  footer.innerHTML = game.tags.map(t => `<span class="tag">${t}</span>`).join('');

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('gameModal');
  modal.classList.remove('active');
  document.getElementById('gameFrameWrapper').innerHTML = '';
  document.body.style.overflow = '';
}

// ===== 搜索 =====
function setupSearch() {
  const input = document.getElementById('searchInput');
  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const activeCat = document.querySelector('.category-tag.active')?.textContent || '全部';
      renderGames(activeCat, e.target.value);
    }, 200);
  });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderGames();
  setupSearch();

  // 关闭模态框
  document.getElementById('gameModal').addEventListener('click', (e) => {
    if (e.target.id === 'gameModal') closeModal();
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Logo 点击回到顶部
  document.querySelector('.logo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
