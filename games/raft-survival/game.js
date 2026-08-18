// ============================================================
// 木筏求生 (Raft Survival) - 2D 生存游戏 v3.6
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1200, H = 750;
canvas.width = W; canvas.height = H;

// ==================== 音效系统（Web Audio API） ====================
let audioCtx = null;
function initAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } }
function playHurtSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch(e) {}
}
function playHitSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch(e) {}
}
function playCollectSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {}
}
// 用户首次交互时初始化音频上下文
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

// ==================== 测试模式密码 ====================
const TEST_PASSWORD = 'yiche2024';
let TEST_MODE = false;

// ==================== 全局状态 ====================
const STATE = {
  SCENE: 'title',
  KEYS: {}, MOUSE: { x: 0, y: 0, down: false, clicked: false, held: false },
  CLICK_X: 0, CLICK_Y: 0,
  DAY_TIMER: 0, DAY_LENGTH: 36000, DAY_NIGHT_THRESHOLD: 21600, // 10分钟=36000帧，60%=21600→6分钟白天/4分钟黑夜
  DAY_COUNT: 1, IS_NIGHT: false,
  CAMERA: { x: 0, y: 0 }, INTRO_TIMER: 0,
  PARTICLES: [], MESSAGES: [],
  expandMode: false, placeBuildingId: null,
  _lastClickSlot: -1, _lastClickTime: 0,
  _titleButtons: null, _pauseButtons: null, _craftButtons: null,
  _chestCollectBtn: null, _chestCloseBtn: null, _structureChestBtns: null,
  combatActive: false, combatBoss: null,
  combatPlayerHP: 0, combatBossHP: 0, combatBossMaxHP: 0,
  combatTimer: 0, combatLog: [], combatBossDef: null, _defending: false,
  inStructure: null, structureChests: [],
  structPlayerX: 0, structPlayerY: 0, structGroundItems: [], structNPCs: [],
  structChatNPC: null,
  structChatIndex: 0, structChatTimer: 0, structChatTyped: '', // NPC对话系统
  lootedStructures: {}, // 记录已搜刮的结构 {key: {looted, groundItemsPicked, chestsOpened}}
  treasureMapActive: false, treasureX: 0, treasureY: 0, // 远古地图宝藏标记
  attackCooldown: 0, playerAttackAnim: 0,
  _saveSlotButtons: null, _saveBackBtn: null,
  _combatButtons: null, drivingRaft: false,
  backpackOpen: false, furnaceOpen: null,
  hooksUsedToday: 0,
  leftClickAttack: false, rightClickAttack: false,
  passwordInput: '', passwordError: false,
  mapOpen: false, exploredCells: new Set(),
  _mapButton: null,
  dragSource: null, dragGhost: null,
  marketOpen: false, marketItems: [],
  _marketButton: null,
  sellMode: false, sellItemIndex: -1,
  companions: [],
  messageBottles: [],
  craftScrollOffset: 0,
  companionOpen: false,
  gameMode: 'endless', // 'survival' 生存模式 | 'endless' 无尽模式
  gameWon: false, // 是否已获胜
  mainlandReached: false, // 是否已找到大陆
  mainlandX: 0, mainlandY: 0, // 大陆位置
  modeSelectOpen: false, // 模式选择界面
};

// ==================== 输入处理 ====================
window.addEventListener('keydown', e => {
  STATE.KEYS[e.key] = true;

  // 密码输入模式
  if (STATE.SCENE === 'password') {
    if (e.key === 'Escape') { STATE.SCENE = 'title'; STATE.passwordInput = ''; STATE.passwordError = false; return; }
    if (e.key === 'Enter') {
      if (STATE.passwordInput === TEST_PASSWORD) {
        TEST_MODE = true;
        STATE.SCENE = 'title';
        STATE.passwordInput = '';
        STATE.passwordError = false;
        addMessage('✅ 测试模式已激活！所有物品无限', '#0f0');
      } else {
        STATE.passwordError = true;
        STATE.passwordInput = '';
      }
      return;
    }
    if (e.key === 'Backspace') { STATE.passwordInput = STATE.passwordInput.slice(0, -1); return; }
    if (e.key.length === 1) { STATE.passwordInput += e.key; return; }
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    if (STATE.combatActive) return;
    if (STATE.mapOpen) { STATE.mapOpen = false; return; }
    if (STATE.marketOpen) { STATE.marketOpen = false; return; }
    if (STATE.drivingRaft) { STATE.drivingRaft = false; addMessage('离开驾驶台', '#888'); return; }
    if (STATE.backpackOpen) { STATE.backpackOpen = false; return; }
    if (STATE.furnaceOpen) { STATE.furnaceOpen = null; STATE.SCENE = 'game'; return; }
    if (STATE.SCENE === 'game') STATE.SCENE = 'pause';
    else if (STATE.SCENE === 'pause') STATE.SCENE = 'game';
    else if (['recipe', 'craft', 'structure'].includes(STATE.SCENE)) STATE.SCENE = 'game';
    else if (STATE.SCENE === 'win') STATE.SCENE = 'title';
    else if (STATE.SCENE === 'mode') STATE.SCENE = 'title';
    else if (STATE.SCENE === 'saves') STATE.SCENE = 'title';
  }
  if (STATE.combatActive) {
    if (e.key === '1' || e.key === '!') doCombatAction('attack');
    if (e.key === '2' || e.key === '@') doCombatAction('defend');
    if (e.key === '3' || e.key === '#') doCombatAction('heal');
    return;
  }
  // NPC对话回复（数字键）
  if (STATE.structChatNPC && (e.key === '1' || e.key === '2' || e.key === '3')) {
    handleChatReply(e.key);
    return;
  }
  if (e.key === 'e' || e.key === 'E') {
    if (STATE.SCENE === 'game') tryInteract();
    else if (STATE.SCENE === 'structure') structureInteract();
  }
  if (e.key === 'r' || e.key === 'R') {
    if (STATE.SCENE === 'game') STATE.SCENE = 'recipe';
    else if (STATE.SCENE === 'recipe') STATE.SCENE = 'game';
  }
  if (e.key === 'c' || e.key === 'C') {
    if (STATE.SCENE === 'game') STATE.SCENE = 'craft';
    else if (STATE.SCENE === 'craft') STATE.SCENE = 'game';
  }
  if (e.key === 'b' || e.key === 'B') {
    if (STATE.SCENE === 'game') STATE.backpackOpen = !STATE.backpackOpen;
    else if (STATE.backpackOpen) STATE.backpackOpen = false;
  }
  if (e.key === 'k' || e.key === 'K') {
    if (STATE.SCENE === 'game') STATE.marketOpen = !STATE.marketOpen;
    else if (STATE.marketOpen) STATE.marketOpen = false;
  }
  if (e.key === 'y' || e.key === 'Y') {
    if (STATE.SCENE === 'game') STATE.companionOpen = !STATE.companionOpen;
    else if (STATE.companionOpen) STATE.companionOpen = false;
  }
  if (e.key === 'f' || e.key === 'F') {
    if (STATE.SCENE === 'game' && !STATE.backpackOpen) {
      const selSlot = PLAYER.inventory[PLAYER.selectedSlot];
      const isHoldingBottle = selSlot && selSlot.id === 'water_bottle';
      // 优先喝净化水（只有手持水瓶时）
      if (PLAYER.waterBottle > 0 && isHoldingBottle) { drinkWater(); return; }
      // 驾驶模式不能装水
      if (STATE.drivingRaft) {
        if (PLAYER.selectedSlot < PLAYER.inventory.length) useItem(PLAYER.selectedSlot);
        return;
      }
      // 空水瓶灌海水：只有手持水瓶时才能装
      if (isHoldingBottle && !STATE.drivingRaft) {
        removeItem('water_bottle', 1);
        PLAYER.seaWater = 5;
        addMessage('🧴 水瓶装满了海水！按F饮用', '#6cf');
        addParticle(PLAYER.x, PLAYER.y, '#6cf', 8);
        return;
      }
      // 海水可以喝（只有手持水瓶时）
      if (PLAYER.seaWater > 0 && isHoldingBottle) { drinkWater(); return; }
      if (PLAYER.selectedSlot < PLAYER.inventory.length) useItem(PLAYER.selectedSlot);
    }
  }
  if (e.key === 'p' || e.key === 'P') {
    if (STATE.SCENE === 'game' && !STATE.backpackOpen) {
      // P键：如果选中了建筑物品，直接进入放置模式
      const slot = PLAYER.inventory[PLAYER.selectedSlot];
      if (slot) {
        const buildingTypes = ['farm_plot', 'net', 'purifier', 'wall', 'driving_station', 'bed', 'chest_storage'];
        if (buildingTypes.includes(slot.id)) {
          STATE.placeBuildingId = slot.id;
          addMessage(`点击木筏空地放置 ${ITEMS[slot.id]?.name || '建筑'}！（右键取消）`, '#ff0');
        } else {
          addMessage('选中的不是建筑物品！请选择农田/渔网/净水器/围墙/驾驶台/床/储物箱', '#f84');
        }
      } else {
        addMessage('请先选中要放置的建筑物品', '#f84');
      }
    }
  }
  // 钩爪 - G键
  if (e.key === 'g' || e.key === 'G') {
    if (STATE.SCENE === 'game' && !STATE.backpackOpen) {
      if (!TEST_MODE && STATE.hooksUsedToday >= 5) {
        addMessage('今日钩爪次数已用完！（每天5次）', '#f44');
      } else {
        fireHook();
      }
    }
  }
  // 驾驶台 - T键
  if (e.key === 't' || e.key === 'T') {
    if (STATE.SCENE === 'game' && !STATE.backpackOpen) {
      STATE.drivingRaft = !STATE.drivingRaft;
      if (STATE.drivingRaft) {
        addMessage('🕹️ 驾驶模式 - WASD移动木筏 | T/ESC离开', '#0f0');
      } else {
        addMessage('离开驾驶台', '#888');
      }
    }
  }
  // 地图 - M键
  if (e.key === 'm' || e.key === 'M') {
    if (STATE.SCENE === 'game' && !STATE.backpackOpen) {
      STATE.mapOpen = !STATE.mapOpen;
    }
  }
  if (STATE.SCENE === 'game' && e.key >= '1' && e.key <= '9') {
    const idx = parseInt(e.key) - 1;
    if (idx < PLAYER.inventory.length) PLAYER.selectedSlot = idx;
  }
});
window.addEventListener('keyup', e => { STATE.KEYS[e.key] = false; });
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  STATE.MOUSE.x = (e.clientX - rect.left) * (W / rect.width);
  STATE.MOUSE.y = (e.clientY - rect.top) * (H / rect.height);
});
canvas.addEventListener('mousedown', e => {
  STATE.MOUSE.down = true; STATE.MOUSE.held = true;
  STATE.CLICK_X = STATE.MOUSE.x; STATE.CLICK_Y = STATE.MOUSE.y;
  if (e.button === 0) STATE.leftClickAttack = true;
  if (e.button === 2) STATE.rightClickAttack = true;

  // 拖拽检测 - 背包或快捷栏
  if (e.button === 0 && !STATE.mapOpen) {
    if (STATE.backpackOpen && STATE._backpackSlots) {
      for (const slot of STATE._backpackSlots) {
        if (STATE.MOUSE.x >= slot.x && STATE.MOUSE.x <= slot.x + slot.w && STATE.MOUSE.y >= slot.y && STATE.MOUSE.y <= slot.y + slot.h) {
          if (slot.index < PLAYER.inventory.length) {
            STATE.dragSource = { type: 'backpack', index: slot.index, item: { ...PLAYER.inventory[slot.index] } };
            STATE.dragGhost = { x: STATE.MOUSE.x, y: STATE.MOUSE.y, item: PLAYER.inventory[slot.index] };
            STATE._lastClickSlot = slot.index; STATE._lastClickTime = Date.now();
          }
          return;
        }
      }
    }
    if (STATE.SCENE === 'game' && !STATE.backpackOpen) {
      // 检测快捷栏拖拽
      const invY = H - 55, slotSize = 44;
      const maxShow = Math.min(PLAYER.inventory.length, 9);
      const startX = W / 2 - maxShow * slotSize / 2;
      for (let i = 0; i < maxShow; i++) {
        const sx = startX + i * slotSize, sy = invY;
        if (STATE.MOUSE.x >= sx && STATE.MOUSE.x <= sx + slotSize - 2 && STATE.MOUSE.y >= sy && STATE.MOUSE.y <= sy + slotSize - 2) {
          if (i < PLAYER.inventory.length) {
            STATE.dragSource = { type: 'hotbar', index: i, item: { ...PLAYER.inventory[i] } };
            STATE.dragGhost = { x: STATE.MOUSE.x, y: STATE.MOUSE.y, item: PLAYER.inventory[i] };
          }
          return;
        }
      }
    }
  }

  if (STATE.SCENE === 'game' && !STATE.drivingRaft && !STATE.backpackOpen && !STATE.dragSource && STATE.attackCooldown <= 0) {
    playerAttack(e.button);
  }
  // 结构内攻击NPC
  if (STATE.SCENE === 'structure' && !STATE.dragSource) {
    attackStructureNPC();
  }
});
canvas.addEventListener('mouseup', e => {
  STATE.MOUSE.down = false; STATE.MOUSE.held = false;
  STATE.CLICK_X = STATE.MOUSE.x; STATE.CLICK_Y = STATE.MOUSE.y;
  if (e.button === 0) STATE.leftClickAttack = false;
  if (e.button === 2) STATE.rightClickAttack = false;

  // 拖拽放下
  if (STATE.dragSource && STATE.dragGhost) {
    let dropped = false;
    // 检测背包槽位
    if (STATE.backpackOpen && STATE._backpackSlots) {
      for (const slot of STATE._backpackSlots) {
        if (STATE.MOUSE.x >= slot.x && STATE.MOUSE.x <= slot.x + slot.w && STATE.MOUSE.y >= slot.y && STATE.MOUSE.y <= slot.y + slot.h) {
          swapItems(STATE.dragSource.index, slot.index);
          dropped = true;
          break;
        }
      }
    }
    // 检测快捷栏槽位
    if (!dropped && STATE.SCENE === 'game') {
      const invY = H - 55, slotSize = 44;
      const maxShow = Math.min(PLAYER.inventory.length, 9);
      const startX = W / 2 - maxShow * slotSize / 2;
      for (let i = 0; i < maxShow; i++) {
        const sx = startX + i * slotSize, sy = invY;
        if (STATE.MOUSE.x >= sx && STATE.MOUSE.x <= sx + slotSize - 2 && STATE.MOUSE.y >= sy && STATE.MOUSE.y <= sy + slotSize - 2) {
          if (STATE.dragSource.type === 'hotbar' && STATE.dragSource.index === i) {
            // 拖到同一位置，不做交换
          } else {
            swapItems(STATE.dragSource.index, i);
          }
          dropped = true;
          break;
        }
      }
    }
    STATE.dragSource = null; STATE.dragGhost = null;
    STATE.MOUSE.clicked = false;
    return;
  }

  STATE.MOUSE.clicked = true;
});
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (STATE.expandMode) { STATE.expandMode = false; addMessage('已取消扩建', '#888'); }
  if (STATE.placeBuildingId) { STATE.placeBuildingId = null; addMessage('已取消放置', '#888'); }
  if (STATE.drivingRaft) { STATE.drivingRaft = false; addMessage('离开驾驶台', '#888'); }
  // 背包中右键出售物品
  if (STATE.backpackOpen && STATE._backpackSlots) {
    for (const slot of STATE._backpackSlots) {
      const mx = e.offsetX || (e.clientX - canvas.getBoundingClientRect().left);
      const my = e.offsetY || (e.clientY - canvas.getBoundingClientRect().top);
      if (mx >= slot.x && mx <= slot.x + slot.w && my >= slot.y && my <= slot.y + slot.h && slot.index < PLAYER.inventory.length) {
        sellItem(slot.index);
        return;
      }
    }
    return;
  }
  // 远古地图激活时，右键打开地图查看宝藏位置
  if (STATE.treasureMapActive && STATE.SCENE === 'game' && !STATE.backpackOpen) {
    STATE.mapOpen = true;
    return;
  }
  if (STATE.SCENE === 'game' && !STATE.drivingRaft && !STATE.backpackOpen && STATE.attackCooldown <= 0) {
    playerAttack(2);
  }
});

// ==================== 玩家数据 ====================
const PLAYER = {
  x: 0, y: 0, hp: 100, maxHp: 100,
  hunger: 100, maxHunger: 100,
  thirst: 100, maxThirst: 100,
  gold: 100,
  inventory: [],
  selectedSlot: 0,
  hookCooldown: 0, hookActive: false, hookTarget: null, hookReturn: false,
  hookProgress: 0, hookDirX: 1, hookDirY: 0, hookRange: 300,
  weaponEquipped: null, helmetEquipped: false, chestEquipped: false,
  waterBottle: 0, seaWater: 0,
};

// ==================== 木筏数据 ====================
let RAFT = { tiles: [], buildings: [], centerX: 0, centerY: 0 };

// ==================== 世界数据 ====================
let STRUCTURES = [];
let FLOATING_ITEMS = [];
let SHARKS = [];
let MONSTERS = [];
const WORLD_SIZE = 8000;
let FURNACE_DATA = {};

// ==================== 配方 ====================
const RECIPES = [
  { id: 'plank', name: '木板', icon: '🪵', craftAt: 'hand', inputs: [{ id: 'wood', count: 1 }], output: 2 },
  { id: 'rope', name: '绳子', icon: '🪢', craftAt: 'hand', inputs: [{ id: 'fiber', count: 3 }], output: 1 },
  { id: 'stick', name: '木棍', icon: '🥢', craftAt: 'hand', inputs: [{ id: 'wood', count: 1 }], output: 2 },
  { id: 'cloth_scrap', name: '碎布', icon: '🧵', craftAt: 'hand', inputs: [{ id: 'fiber', count: 2 }], output: 1 },
  { id: 'nail', name: '铁钉', icon: '🔩', craftAt: 'furnace', inputs: [{ id: 'scrap', count: 2 }], output: 3, smeltTime: 5 },
  { id: 'iron_ingot', name: '铁锭', icon: '🪨', craftAt: 'furnace', inputs: [{ id: 'scrap', count: 3 }], output: 1, smeltTime: 8 },
  { id: 'cooked_fish', name: '烤鱼', icon: '🍣', craftAt: 'furnace', inputs: [{ id: 'raw_fish', count: 1 }], output: 1, smeltTime: 3 },
  { id: 'cooked_meat', name: '熟肉', icon: '🍖', craftAt: 'furnace', inputs: [{ id: 'raw_meat', count: 1 }], output: 1, smeltTime: 4 },
  { id: 'glass', name: '玻璃', icon: '🪟', craftAt: 'furnace', inputs: [{ id: 'sand', count: 3 }], output: 1, smeltTime: 6 },
  { id: 'brick', name: '砖块', icon: '🧱', craftAt: 'furnace', inputs: [{ id: 'clay', count: 2 }], output: 1, smeltTime: 5 },
  { id: 'metal_plate', name: '金属板', icon: '🪨', craftAt: 'furnace', inputs: [{ id: 'iron_ingot', count: 2 }], output: 1, smeltTime: 10 },
  { id: 'net', name: '渔网', icon: '🕸️', craftAt: 'craft_table', inputs: [{ id: 'rope', count: 3 }, { id: 'plank', count: 2 }], output: 1 },
  { id: 'farm_plot', name: '农田', icon: '🌱', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 3 }, { id: 'rope', count: 1 }], output: 1 },
  { id: 'purifier', name: '净水器', icon: '💧', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 4 }, { id: 'scrap', count: 3 }, { id: 'rope', count: 2 }], output: 1 },
  { id: 'hook_upgrade', name: '强化钩爪', icon: '⚓', craftAt: 'craft_table', inputs: [{ id: 'iron_ingot', count: 2 }, { id: 'rope', count: 2 }], output: 1 },
  { id: 'raft_expand', name: '扩建模块', icon: '🟫', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 5 }, { id: 'rope', count: 2 }], output: 1 },
  { id: 'spear', name: '长矛', icon: '🗡️', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 2 }, { id: 'scrap', count: 1 }, { id: 'rope', count: 1 }], output: 1 },
  { id: 'sword', name: '铁剑', icon: '⚔️', craftAt: 'craft_table', inputs: [{ id: 'iron_ingot', count: 3 }, { id: 'stick', count: 1 }, { id: 'rope', count: 1 }], output: 1 },
  { id: 'fishing_rod', name: '鱼竿', icon: '🎣', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 2 }, { id: 'rope', count: 2 }], output: 1 },
  { id: 'wall', name: '围墙', icon: '🧱', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 3 }, { id: 'nail', count: 2 }], output: 1 },
  { id: 'helmet', name: '头盔', icon: '🪖', craftAt: 'craft_table', inputs: [{ id: 'metal_plate', count: 2 }, { id: 'rope', count: 1 }], output: 1 },
  { id: 'chest_armor', name: '胸甲', icon: '🛡️', craftAt: 'craft_table', inputs: [{ id: 'metal_plate', count: 3 }, { id: 'rope', count: 2 }], output: 1 },
  { id: 'bed', name: '床', icon: '🛏️', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 8 }, { id: 'cloth_scrap', count: 4 }, { id: 'rope', count: 2 }], output: 1 },
  { id: 'driving_station', name: '驾驶台', icon: '🕹️', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 6 }, { id: 'scrap', count: 4 }, { id: 'rope', count: 3 }], output: 1 },
  { id: 'chest_storage', name: '储物箱', icon: '📦', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 6 }, { id: 'nail', count: 3 }], output: 1 },
  { id: 'water_bottle_item', name: '水瓶', icon: '🧴', craftAt: 'craft_table', inputs: [{ id: 'plastic', count: 3 }, { id: 'glass', count: 1 }], output: 1 },
  { id: 'bandage', name: '绷带', icon: '🩹', craftAt: 'craft_table', inputs: [{ id: 'fiber', count: 2 }, { id: 'cloth', count: 1 }], output: 1 },
  { id: 'med_kit', name: '医疗包', icon: '💊', craftAt: 'craft_table', inputs: [{ id: 'bandage', count: 2 }, { id: 'cloth_scrap', count: 2 }], output: 1 },
  { id: 'clean_water', name: '净化水', icon: '💧', craftAt: 'purifier', inputs: [{ id: 'plastic', count: 1 }], output: 1, randomOutput: [2, 5] },
  { id: 'bow', name: '弓箭', icon: '🏹', craftAt: 'craft_table', inputs: [{ id: 'stick', count: 3 }, { id: 'rope', count: 2 }, { id: 'scrap', count: 1 }], output: 1 },
  { id: 'arrow', name: '箭矢', icon: '🏹', craftAt: 'craft_table', inputs: [{ id: 'stick', count: 1 }, { id: 'scrap', count: 1 }], output: 3 },
  { id: 'torch', name: '火把', icon: '🔦', craftAt: 'hand', inputs: [{ id: 'stick', count: 1 }, { id: 'cloth_scrap', count: 1 }], output: 1 },
  { id: 'bucket', name: '水桶', icon: '🪣', craftAt: 'craft_table', inputs: [{ id: 'metal_plate', count: 2 }, { id: 'nail', count: 3 }], output: 1 },
  { id: 'sail', name: '船帆', icon: '⛵', craftAt: 'craft_table', inputs: [{ id: 'cloth', count: 3 }, { id: 'rope', count: 4 }, { id: 'plank', count: 4 }], output: 1 },
  { id: 'lantern', name: '灯笼', icon: '🏮', craftAt: 'craft_table', inputs: [{ id: 'glass', count: 1 }, { id: 'scrap', count: 2 }, { id: 'fuel', count: 1 }], output: 1 },
  { id: 'fishing_net_plus', name: '高级渔网', icon: '🕸️', craftAt: 'craft_table', inputs: [{ id: 'rope', count: 5 }, { id: 'iron_ingot', count: 2 }, { id: 'net', count: 1 }], output: 1 },
  { id: 'compass', name: '指南针', icon: '🧭', craftAt: 'craft_table', inputs: [{ id: 'iron_ingot', count: 1 }, { id: 'gem', count: 1 }], output: 1 },
  { id: 'backpack_upgrade', name: '背包扩容', icon: '🎒', craftAt: 'craft_table', inputs: [{ id: 'cloth', count: 5 }, { id: 'rope', count: 3 }, { id: 'iron_ingot', count: 2 }], output: 1 },
  { id: 'wooden_shield', name: '木盾', icon: '🛡️', craftAt: 'craft_table', inputs: [{ id: 'plank', count: 5 }, { id: 'rope', count: 2 }], output: 1 },
];

// ==================== 物品定义 ====================
const ITEMS = {
  wood: { name: '木材', icon: '🪵', stack: 20, type: 'raw' },
  fiber: { name: '纤维', icon: '🌿', stack: 30, type: 'raw' },
  scrap: { name: '废铁', icon: '⚙️', stack: 15, type: 'raw' },
  plastic: { name: '塑料', icon: '🥤', stack: 20, type: 'raw' },
  cloth: { name: '布料', icon: '🧵', stack: 10, type: 'raw' },
  sand: { name: '沙子', icon: '🏖️', stack: 20, type: 'raw' },
  clay: { name: '黏土', icon: '🟤', stack: 20, type: 'raw' },
  raw_fish: { name: '生鱼', icon: '🐟', stack: 5, type: 'raw' },
  raw_meat: { name: '生肉', icon: '🥩', stack: 5, type: 'raw' },
  shark_fin: { name: '鲨鱼鳍', icon: '🦈', stack: 5, type: 'raw' },
  monster_essence: { name: '怪物精华', icon: '✨', stack: 10, type: 'raw' },
  gem: { name: '宝石', icon: '💎', stack: 5, type: 'raw' },
  battery: { name: '电池', icon: '🔋', stack: 5, type: 'raw' },
  circuit: { name: '电路板', icon: '🟢', stack: 5, type: 'raw' },
  fuel: { name: '燃料', icon: '⛽', stack: 10, type: 'raw' },
  plank: { name: '木板', icon: '🪵', stack: 20, type: 'processed' },
  rope: { name: '绳子', icon: '🪢', stack: 10, type: 'processed' },
  stick: { name: '木棍', icon: '🥢', stack: 30, type: 'processed' },
  cloth_scrap: { name: '碎布', icon: '🧵', stack: 20, type: 'processed' },
  nail: { name: '铁钉', icon: '🔩', stack: 30, type: 'processed' },
  iron_ingot: { name: '铁锭', icon: '🪨', stack: 10, type: 'processed' },
  cooked_fish: { name: '烤鱼', icon: '🍣', stack: 5, type: 'food' },
  cooked_meat: { name: '熟肉', icon: '🍖', stack: 5, type: 'food' },
  glass: { name: '玻璃', icon: '🪟', stack: 10, type: 'processed' },
  brick: { name: '砖块', icon: '🧱', stack: 20, type: 'processed' },
  metal_plate: { name: '金属板', icon: '🪨', stack: 10, type: 'processed' },
  water_bottle: { name: '水瓶(空)', icon: '🧴', stack: 1, type: 'tool' },
  clean_water: { name: '净化水', icon: '💧', stack: 1, type: 'consumable' },
  spear: { name: '长矛', icon: '🗡️', stack: 1, type: 'weapon' },
  sword: { name: '铁剑', icon: '⚔️', stack: 1, type: 'weapon' },
  fishing_rod: { name: '鱼竿', icon: '🎣', stack: 1, type: 'tool' },
  helmet: { name: '头盔', icon: '🪖', stack: 1, type: 'armor' },
  chest_armor: { name: '胸甲', icon: '🛡️', stack: 1, type: 'armor' },
  net: { name: '渔网', icon: '🕸️', stack: 5, type: 'building' },
  farm_plot: { name: '农田', icon: '🌱', stack: 5, type: 'building' },
  purifier: { name: '净水器', icon: '💧', stack: 3, type: 'building' },
  raft_expand: { name: '扩建模块', icon: '🟫', stack: 10, type: 'building' },
  wall: { name: '围墙', icon: '🧱', stack: 10, type: 'building' },
  bed: { name: '床', icon: '🛏️', stack: 3, type: 'building' },
  driving_station: { name: '驾驶台', icon: '🕹️', stack: 3, type: 'building' },
  chest_storage: { name: '储物箱', icon: '📦', stack: 5, type: 'building' },
  hook_upgrade: { name: '强化钩爪', icon: '⚓', stack: 1, type: 'consumable' },
  bandage: { name: '绷带', icon: '🩹', stack: 10, type: 'consumable' },
  med_kit: { name: '医疗包', icon: '💊', stack: 5, type: 'consumable' },
  gold: { name: '金币', icon: '🪙', stack: 999, type: 'special' },
  water_bottle_item: { name: '水瓶', icon: '🧴', stack: 3, type: 'tool' },
  bow: { name: '弓箭', icon: '🏹', stack: 1, type: 'weapon' },
  arrow: { name: '箭矢', icon: '🏹', stack: 30, type: 'consumable' },
  torch: { name: '火把', icon: '🔦', stack: 10, type: 'tool' },
  bucket: { name: '水桶', icon: '🪣', stack: 5, type: 'tool' },
  sail: { name: '船帆', icon: '⛵', stack: 3, type: 'building' },
  lantern: { name: '灯笼', icon: '🏮', stack: 5, type: 'building' },
  fishing_net_plus: { name: '高级渔网', icon: '🕸️', stack: 3, type: 'building' },
  compass: { name: '指南针', icon: '🧭', stack: 1, type: 'tool' },
  backpack_upgrade: { name: '背包扩容', icon: '🎒', stack: 1, type: 'consumable' },
  wooden_shield: { name: '木盾', icon: '🛡️', stack: 1, type: 'armor' },
  // 市场专属物品
  gold_bar: { name: '金条', icon: '🟨', stack: 10, type: 'special' },
  diamond: { name: '钻石', icon: '💎', stack: 5, type: 'special' },
  ancient_map: { name: '远古地图', icon: '🗺️', stack: 1, type: 'special' },
  speed_potion: { name: '速度药水', icon: '🧪', stack: 5, type: 'consumable' },
  shark_repellent: { name: '驱鲨剂', icon: '🦈', stack: 3, type: 'consumable' },
  night_vision: { name: '夜视镜', icon: '👓', stack: 1, type: 'tool' },
  treasure_key: { name: '宝箱钥匙', icon: '🔑', stack: 10, type: 'special' },
  storm_compass: { name: '风暴罗盘', icon: '⏱️', stack: 1, type: 'tool' },
  auto_fisher: { name: '自动钓鱼机', icon: '🎣', stack: 1, type: 'tool' },
  iron_sword_plus: { name: '精炼铁剑', icon: '⚔️', stack: 1, type: 'weapon' },
};


// ==================== 物品出售价格 ====================
const SELL_PRICES = {
  // 原料
  wood: 2, plastic: 3, fiber: 2, scrap: 4, clay: 3, stone: 3, gem: 30,
  // 加工品
  plank: 6, rope: 5, iron_ingot: 15, metal_plate: 20, circuit: 25,
  cloth: 8, cloth_scrap: 3, battery: 12, fuel: 10,
  // 食物
  raw_fish: 3, cooked_fish: 8, raw_meat: 5, cooked_meat: 15,
  // 武器/装备
  sword: 80, spear: 40, bow: 50, arrow: 5, helmet: 60, chest_armor: 70,
  wooden_shield: 25, iron_sword_plus: 180,
  // 工具/消耗品
  bandage: 10, med_kit: 30, hook_upgrade: 50, raft_expand: 40,
  torch: 5, compass: 25, water_bottle: 8, water_bottle_item: 5,
  fishing_rod: 20, fishing_net: 30, fishing_net_plus: 50,
  bucket: 10, sail: 25, lantern: 30, backpack_upgrade: 45,
  // 特殊物品
  gold_bar: 150, diamond: 350, gold: 1, monster_essence: 20,
  ancient_map: 80, treasure_key: 25, speed_potion: 30,
  shark_repellent: 35, night_vision: 100, storm_compass: 70,
  auto_fisher: 180,
};

// ==================== 市场物品定义 ====================
const MARKET_ITEMS = [
  { id: 'gold_bar', name: '金条', icon: '🟨', cost: 80, count: 1, desc: '贵重物品，可出售或收藏' },
  { id: 'diamond', name: '钻石', icon: '💎', cost: 200, count: 1, desc: '稀有的宝石' },
  { id: 'ancient_map', name: '远古地图', icon: '🗺️', cost: 150, count: 1, desc: '标记了隐藏宝藏的位置' },
  { id: 'speed_potion', name: '速度药水', icon: '🧪', cost: 50, count: 1, desc: '使用后短时间内移动速度翻倍' },
  { id: 'shark_repellent', name: '驱鲨剂', icon: '🦈', cost: 60, count: 1, desc: '使用后一段时间内鲨鱼不会靠近' },
  { id: 'night_vision', name: '夜视镜', icon: '👓', cost: 180, count: 1, desc: '装备后夜晚视野更清晰' },
  { id: 'treasure_key', name: '宝箱钥匙', icon: '🔑', cost: 40, count: 1, desc: '可以打开上锁的宝箱' },
  { id: 'storm_compass', name: '风暴罗盘', icon: '⏱️', cost: 120, count: 1, desc: '提前预警风暴，避免损失' },
  { id: 'auto_fisher', name: '自动钓鱼机', icon: '🎣', cost: 300, count: 1, desc: '放置在木筏上自动捕鱼' },
  { id: 'iron_sword_plus', name: '精炼铁剑', icon: '⚔️', cost: 250, count: 1, desc: '比普通铁剑伤害更高的武器' },
  { id: 'raft_expand', name: '扩建模块', icon: '🟫', cost: 100, count: 1, desc: '用于扩建木筏的模块' },
  { id: 'fuel', name: '燃料', icon: '⛽', cost: 35, count: 1, desc: '用于熔炉和引擎' },
  { id: 'plank', name: '木板', icon: '🪵', cost: 10, count: 5, desc: '基础建材，省去砍木头的麻烦' },
  { id: 'rope', name: '绳索', icon: '🪢', cost: 8, count: 3, desc: '纤维合成，直接购买更省事' },
  { id: 'iron_ingot', name: '铁锭', icon: '🔩', cost: 30, count: 2, desc: '废铁熔炼产物' },
  { id: 'cloth', name: '布料', icon: '🧶', cost: 15, count: 3, desc: '纤维编织而成' },
  { id: 'bandage', name: '绷带', icon: '🩹', cost: 20, count: 2, desc: '回复25HP' },
  { id: 'cooked_fish', name: '烤鱼', icon: '🐟', cost: 15, count: 2, desc: '回复25饱食度' },
  { id: 'cooked_meat', name: '熟肉', icon: '🍖', cost: 25, count: 2, desc: '回复40饱食度' },
  { id: 'sword', name: '铁剑', icon: '⚔️', cost: 120, count: 1, desc: '近战武器，伤害+20' },
  { id: 'helmet', name: '头盔', icon: '🪖', cost: 100, count: 1, desc: '头部防具' },
  { id: 'chest_armor', name: '胸甲', icon: '🛡️', cost: 120, count: 1, desc: '身体防具' },
  { id: 'med_kit', name: '医疗包', icon: '💊', cost: 50, count: 1, desc: '回复50HP' },
  { id: 'hook_upgrade', name: '钩爪升级', icon: '🪝', cost: 80, count: 1, desc: '钩爪范围+80px' },
];

const BUILDING_ITEM_MAP = {
  farm_plot: 'farm', net: 'net', purifier: 'purifier',
  wall: 'wall', driving_station: 'driving_station', bed: 'bed', chest_storage: 'chest_storage'
};

const BUILDING_NAMES = {
  farm: '农田', net: '渔网', purifier: '净水器', wall: '围墙',
  driving_station: '驾驶台', bed: '床', chest_storage: '储物箱'
};

// ==================== 结构定义 ====================
const STRUCTURE_DEFS = {
  plane_wreck: { name: '飞机残骸', danger: 1, icon: '✈️', color: '#888', radius: 45,
    lootTable: [{ id: 'scrap', min: 2, max: 5 }, { id: 'plastic', min: 1, max: 4 }, { id: 'cloth', min: 1, max: 3 }, { id: 'wood', min: 1, max: 3 }, { id: 'bandage', min: 0, max: 2 }],
    interiorChests: 2 },
  small_island: { name: '小型岛屿', danger: 2, icon: '🏝️', color: '#4a4', radius: 55,
    lootTable: [{ id: 'wood', min: 3, max: 8 }, { id: 'fiber', min: 2, max: 6 }, { id: 'raw_fish', min: 1, max: 3 }, { id: 'sand', min: 1, max: 4 }, { id: 'clay', min: 1, max: 3 }],
    interiorChests: 1 },
  shipwreck: { name: '沉船残骸', danger: 3, icon: '🚢', color: '#654', radius: 60, boss: 'shark_boss',
    lootTable: [{ id: 'scrap', min: 3, max: 8 }, { id: 'iron_ingot', min: 1, max: 3 }, { id: 'gold', min: 10, max: 50 }, { id: 'cloth', min: 1, max: 4 }, { id: 'spear', min: 0, max: 1 }],
    interiorChests: 3 },
  sunken_boat: { name: '沉船', danger: 2, icon: '⛵', color: '#876', radius: 50,
    lootTable: [{ id: 'plank', min: 2, max: 5 }, { id: 'scrap', min: 2, max: 4 }, { id: 'rope', min: 1, max: 3 }, { id: 'gold', min: 5, max: 25 }],
    interiorChests: 2 },
  radio_tower: { name: '信号塔遗迹', danger: 4, icon: '📡', color: '#c44', radius: 65, boss: 'guardian',
    lootTable: [{ id: 'iron_ingot', min: 2, max: 5 }, { id: 'gold', min: 30, max: 80 }, { id: 'circuit', min: 1, max: 3 }, { id: 'battery', min: 1, max: 2 }],
    interiorChests: 4 },
  abandoned_hut: { name: '废弃小屋', danger: 1, icon: '🛖', color: '#a86', radius: 42,
    lootTable: [{ id: 'wood', min: 2, max: 5 }, { id: 'plank', min: 1, max: 3 }, { id: 'cloth_scrap', min: 1, max: 3 }, { id: 'fiber', min: 2, max: 5 }],
    interiorChests: 2 },
  cargo_float: { name: '漂浮货箱', danger: 2, icon: '📦', color: '#c96', radius: 40,
    lootTable: [{ id: 'plastic', min: 2, max: 6 }, { id: 'scrap', min: 2, max: 5 }, { id: 'cloth', min: 1, max: 4 }, { id: 'fuel', min: 1, max: 3 }],
    interiorChests: 1 },
  reef: { name: '珊瑚礁', danger: 2, icon: '🪸', color: '#f87', radius: 55,
    lootTable: [{ id: 'raw_fish', min: 2, max: 6 }, { id: 'sand', min: 2, max: 5 }, { id: 'gem', min: 0, max: 2 }, { id: 'fiber', min: 1, max: 3 }],
    interiorChests: 1 },
  oil_rig: { name: '废弃钻井平台', danger: 4, icon: '🏗️', color: '#888', radius: 70, boss: 'guardian',
    lootTable: [{ id: 'scrap', min: 5, max: 12 }, { id: 'fuel', min: 3, max: 8 }, { id: 'iron_ingot', min: 2, max: 5 }, { id: 'circuit', min: 1, max: 4 }, { id: 'gold', min: 40, max: 100 }],
    interiorChests: 5 },
  underwater_cave: { name: '水下洞穴', danger: 3, icon: '🕳️', color: '#459', radius: 50,
    lootTable: [{ id: 'gem', min: 1, max: 4 }, { id: 'clay', min: 2, max: 5 }, { id: 'iron_ingot', min: 1, max: 3 }, { id: 'gold', min: 15, max: 40 }],
    interiorChests: 3 },
  floating_market: { name: '漂流市场', danger: 1, icon: '🏪', color: '#fa0', radius: 55,
    lootTable: [{ id: 'gold', min: 20, max: 60 }, { id: 'cloth', min: 2, max: 5 }, { id: 'plastic', min: 2, max: 4 }, { id: 'battery', min: 1, max: 3 }, { id: 'circuit', min: 0, max: 2 }],
    interiorChests: 2 },
  military_wreck: { name: '军用残骸', danger: 5, icon: '💣', color: '#484', radius: 75, boss: 'guardian',
    lootTable: [{ id: 'metal_plate', min: 2, max: 5 }, { id: 'scrap', min: 5, max: 15 }, { id: 'fuel', min: 2, max: 6 }, { id: 'sword', min: 0, max: 1 }, { id: 'helmet', min: 0, max: 1 }, { id: 'gold', min: 50, max: 120 }],
    interiorChests: 5 },
};

const MONSTER_DEFS = {
  zombie: { name: '溺尸', icon: '🧟', hp: 25, atk: 8, speed: 1.2, drops: [{ id: 'monster_essence', chance: 0.5 }, { id: 'cloth_scrap', chance: 0.3 }] },
  ghost: { name: '幽灵', icon: '👻', hp: 15, atk: 12, speed: 2.0, drops: [{ id: 'monster_essence', chance: 0.6 }, { id: 'gem', chance: 0.1 }] },
  sea_beast: { name: '海兽', icon: '🐙', hp: 50, atk: 15, speed: 0.8, drops: [{ id: 'monster_essence', chance: 0.8 }, { id: 'raw_meat', chance: 0.5 }, { id: 'scrap', chance: 0.3 }] },
};

const FLOAT_TYPES = {
  wood: { name: '木材', icon: '🪵', weight: 18, size: 18 },
  fiber: { name: '纤维', icon: '🌿', weight: 15, size: 16 },
  plastic: { name: '塑料', icon: '🥤', weight: 10, size: 17 },
  scrap: { name: '废铁', icon: '⚙️', weight: 8, size: 18 },
  cloth: { name: '布料', icon: '🧵', weight: 6, size: 16 },
  sand: { name: '沙子', icon: '🏖️', weight: 5, size: 15 },
  clay: { name: '黏土', icon: '🟤', weight: 4, size: 16 },
  raw_fish: { name: '生鱼', icon: '🐟', weight: 3, size: 20 },
  plank: { name: '木板', icon: '🪵', weight: 6, size: 18 },
  rope: { name: '绳子', icon: '🪢', weight: 4, size: 17 },
  nail: { name: '铁钉', icon: '🔩', weight: 3, size: 16 },
  cloth_scrap: { name: '碎布', icon: '🧵', weight: 3, size: 16 },
  stick: { name: '木棍', icon: '🥢', weight: 4, size: 16 },
  water_bottle_item: { name: '水瓶', icon: '🧴', weight: 2, size: 18 },
  trash_bag: { name: '垃圾袋', icon: '🗑️', weight: 5, size: 24, isSpecial: true, lootTable: [
    { id: 'plastic', min: 1, max: 3 }, { id: 'scrap', min: 0, max: 2 }, { id: 'cloth', min: 0, max: 2 }, { id: 'wood', min: 0, max: 2 }
  ] },
  supply_crate: { name: '补给箱', icon: '📦', weight: 3, size: 26, isSpecial: true, lootTable: [
    { id: 'cooked_fish', min: 1, max: 2 }, { id: 'bandage', min: 1, max: 2 }, { id: 'water_bottle_item', min: 0, max: 1 }
  ] },
  barrel: { name: '漂流桶', icon: '🛢️', weight: 4, size: 28, isSpecial: true, lootTable: [
    { id: 'fuel', min: 1, max: 2 }, { id: 'plank', min: 1, max: 3 }, { id: 'scrap', min: 1, max: 3 }, { id: 'raw_fish', min: 0, max: 2 }
  ] },
  treasure_chest: { name: '宝箱', icon: '💎', weight: 1, size: 30, isSpecial: true, lootTable: [
    { id: 'gold', min: 20, max: 80 }, { id: 'gem', min: 1, max: 3 }, { id: 'iron_ingot', min: 1, max: 2 }
  ] },
};

// ==================== 初始化 ====================
function initGame(mode) {
  STATE.gameMode = mode || 'endless';
  RAFT = {
    tiles: [],
    buildings: [
      { type: 'craft_table', x: 1, y: 0 },
      { type: 'furnace', x: -1, y: 0 },
    ],
    centerX: 0, centerY: 0,
  };
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) RAFT.tiles.push({ x: dx, y: dy });

  PLAYER.x = 0; PLAYER.y = 0;
  PLAYER.hp = 100; PLAYER.maxHp = 100;
  PLAYER.hunger = 100; PLAYER.maxHunger = 100;
  PLAYER.thirst = 100; PLAYER.maxThirst = 100;
  PLAYER.gold = TEST_MODE ? 99999 : 100;

  if (TEST_MODE) {
    // 测试模式：每种物品给999个
    PLAYER.inventory = [];
    for (const key of Object.keys(ITEMS)) {
      if (key === 'gold') continue;
      PLAYER.inventory.push({ id: key, count: 999 });
    }
  } else {
    PLAYER.inventory = [
      { id: 'wood', count: 5 }, { id: 'fiber', count: 5 }, { id: 'plastic', count: 3 },
      { id: 'scrap', count: 2 }, { id: 'rope', count: 2 }, { id: 'cooked_fish', count: 2 },
      { id: 'bandage', count: 1 }, { id: 'water_bottle_item', count: 1 },
    ];
  }

  PLAYER.selectedSlot = 0;
  PLAYER.hookCooldown = 0; PLAYER.hookActive = false; PLAYER.hookTarget = null;
  PLAYER.hookDirX = 1; PLAYER.hookDirY = 0; 
// 制造台滚轮滚动
canvas.addEventListener('wheel', function(e) {
  if (STATE.SCENE === 'craft') {
    e.preventDefault();
    STATE.craftScrollOffset += e.deltaY > 0 ? 60 : -60;
  }
}, { passive: false });

PLAYER.hookRange = 300;
  PLAYER.weaponEquipped = null; PLAYER.helmetEquipped = false; PLAYER.chestEquipped = false;
  PLAYER.waterBottle = 0; PLAYER.seaWater = 0;

  STATE.DAY_TIMER = 0; STATE.DAY_COUNT = 1; STATE.IS_NIGHT = false;
  STATE.SCENE = 'game';
  STATE.CAMERA.x = 0; STATE.CAMERA.y = 0;
  STATE.expandMode = false; STATE.placeBuildingId = null;
  STATE.CHEST_OPEN = null; STATE.STRUCTURE_LOOT = null;
  STATE.PARTICLES = []; STATE.MESSAGES = [];
  STATE.combatActive = false; STATE.inStructure = null; STATE.structureChests = [];
  STATE.structPlayerX = 300; STATE.structPlayerY = 200; STATE.structGroundItems = []; STATE.structNPCs = [];
  STATE.structChatNPC = null;
  STATE.attackCooldown = 0; STATE.playerAttackAnim = 0;
  STATE.drivingRaft = false; STATE.backpackOpen = false;
  STATE.furnaceOpen = null; STATE.hooksUsedToday = 0;
  STATE._structureChestBtns = null;
  STATE.exploredCells = new Set();
  STATE.mapOpen = false;
  STATE.dragSource = null; STATE.dragGhost = null;
  FURNACE_DATA = {};

  STRUCTURES = [generateStructure('plane_wreck', 200, -100)];
  const farTypes = ['small_island', 'shipwreck', 'sunken_boat', 'radio_tower', 'abandoned_hut',
    'cargo_float', 'reef', 'oil_rig', 'underwater_cave', 'floating_market', 'military_wreck'];
  // 结构均匀分布在整个世界（半径500~8000），使用环形均匀分布
  const totalStructures = 30;
  const minDist = 400, maxDist = WORLD_SIZE - 100;
  for (let i = 0; i < totalStructures; i++) {
    const t = farTypes[Math.floor(Math.random() * farTypes.length)];
    const angle = Math.random() * Math.PI * 2;
    // 用平方根确保面积均匀分布（不是偏向中心）
    const dist = minDist + Math.sqrt(Math.random()) * (maxDist - minDist);
    STRUCTURES.push(generateStructure(t, Math.cos(angle) * dist, Math.sin(angle) * dist));
  }

  // 生成大陆（生存模式的胜利目标）
  STATE.mainlandX = 0; STATE.mainlandY = 0;
  const contAngle = Math.random() * Math.PI * 2;
  const contDist = WORLD_SIZE * 0.85; // 大陆在很远的地方
  STATE.mainlandX = Math.cos(contAngle) * contDist;
  STATE.mainlandY = Math.sin(contAngle) * contDist;
  STATE.mainlandReached = false;
  STATE.gameWon = false;
  // 大陆在地图上显示为一个特殊标记（通过结构表示）
  STRUCTURES.push({
    type: 'mainland', name: '🌍 大陆', danger: 0, wx: STATE.mainlandX, wy: STATE.mainlandY,
    icon: '🌍', color: '#4a4', radius: 200,
    lootTable: [], looted: false, boss: null, bossDefeated: false,
    interiorChests: 0, chestLooted: [], isMainland: true
  });
  if (STATE.gameMode === 'survival') {
    addMessage('🎯 目标：找到大陆！使用地图查看方向', '#ff0');
  }
  FLOATING_ITEMS = []; SHARKS = []; MONSTERS = [];
  spawnFloatingItems(8);
  if (!TEST_MODE) addMessage('开局赠送了一个水瓶！按F可以喝水', '#6cf');
  if (TEST_MODE) addMessage('🧪 测试模式 - 所有物品无限！', '#0f0');
}

function generateStructure(type, wx, wy) {
  if (type === 'treasure_site') {
    return { type: 'treasure_site', name: '隐藏宝藏', danger: 0, wx, wy, icon: '💎', color: '#ff0',
      radius: 45, lootTable: [
        { id: 'gold', min: 60, max: 150 }, { id: 'diamond', min: 1, max: 3 },
        { id: 'gem', min: 2, max: 6 }, { id: 'iron_ingot', min: 3, max: 8 },
        { id: 'gold_bar', min: 1, max: 3 }, { id: 'treasure_key', min: 1, max: 2 },
        { id: 'sword', min: 0, max: 1 }, { id: 'circuit', min: 1, max: 3 }
      ],
      looted: false, boss: null, bossDefeated: false, interiorChests: 1, chestLooted: [], isTreasureSite: true };
  }
  const def = STRUCTURE_DEFS[type] || STRUCTURE_DEFS.plane_wreck;
  return { type, name: def.name, danger: def.danger, wx, wy, icon: def.icon, color: def.color,
    radius: def.radius, lootTable: def.lootTable, looted: false, boss: def.boss || null,
    bossDefeated: false, interiorChests: def.interiorChests || 2, chestLooted: [] };
}

function spawnFloatingItems(n) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2, dist = 150 + Math.random() * 400;
    const keys = Object.keys(FLOAT_TYPES);
    const totalW = keys.reduce((s, k) => s + FLOAT_TYPES[k].weight, 0);
    let r = Math.random() * totalW, acc = 0, tid = keys[0];
    for (const k of keys) { acc += FLOAT_TYPES[k].weight; if (r <= acc) { tid = k; break; } }
    FLOATING_ITEMS.push({ id: tid, x: RAFT.centerX + Math.cos(angle) * dist, y: RAFT.centerY + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: 600 + Math.random() * 600 });
  }
}

// ==================== 辅助函数 ====================
function hasItem(id, count = 1) { if (TEST_MODE) return true; const s = PLAYER.inventory.find(s => s.id === id); return s && s.count >= count; }
function addItem(id, count = 1) {
  if (TEST_MODE) return;
  if (id === 'gold') { PLAYER.gold += count; addMessage(`获得 ${count} 金币！`, '#ff0'); return; }
  const maxStack = Math.min(ITEMS[id]?.stack || 99, 64); // 单格上限64
  let slot = PLAYER.inventory.find(s => s.id === id && s.count < maxStack);
  if (slot) { const add = Math.min(count, maxStack - slot.count); slot.count += add; count -= add; }
  while (count > 0) { const add = Math.min(count, maxStack); PLAYER.inventory.push({ id, count: add }); count -= add; }
  if (PLAYER.inventory.length > 36) addMessage('背包已满！', '#f44');
}
function removeItem(id, count = 1) {
  if (TEST_MODE) return true;
  for (let i = PLAYER.inventory.length - 1; i >= 0; i--) {
    if (PLAYER.inventory[i].id === id) { const rem = Math.min(count, PLAYER.inventory[i].count); PLAYER.inventory[i].count -= rem; count -= rem; if (PLAYER.inventory[i].count <= 0) PLAYER.inventory.splice(i, 1); if (count <= 0) return true; }
  }
  return count <= 0;
}
function addMessage(text, color = '#fff') { STATE.MESSAGES.push({ text, color, life: 150 }); if (STATE.MESSAGES.length > 10) STATE.MESSAGES.shift(); }
function addParticle(x, y, color, count = 5) { for (let i = 0; i < count; i++) STATE.PARTICLES.push({ x, y, color, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 3, life: 25 + Math.random() * 35 }); }
function worldToScreen(wx, wy) { return { x: wx - STATE.CAMERA.x + W / 2, y: wy - STATE.CAMERA.y + H / 2 }; }
function screenToWorld(sx, sy) { return { x: sx - W / 2 + STATE.CAMERA.x, y: sy - H / 2 + STATE.CAMERA.y }; }

function swapItems(a, b) {
  if (a === b || a < 0 || b < 0) return;
  const MAX_STACK = 64;
  const itemA = a < PLAYER.inventory.length ? PLAYER.inventory[a] : undefined;
  const itemB = b < PLAYER.inventory.length ? PLAYER.inventory[b] : undefined;
  if (!itemA && !itemB) return;

  // 同类物品 → 合并
  if (itemA && itemB && itemA.id === itemB.id) {
    const total = itemA.count + itemB.count;
    if (total <= MAX_STACK) {
      // 全部合并到一个槽位
      itemA.count = total;
      PLAYER.inventory[b] = undefined;
      addMessage(`合并 ${ITEMS[itemA.id]?.name || itemA.id} x${total}`, '#ff0');
    } else {
      // 一个满，剩余放另一个
      itemA.count = MAX_STACK;
      itemB.count = total - MAX_STACK;
      addMessage(`合并到上限 ${ITEMS[itemA.id]?.name || itemA.id} x${MAX_STACK}，剩余 x${itemB.count}`, '#ff0');
    }
  } else {
    // 不同物品 → 交换
    if (itemB) PLAYER.inventory[a] = itemB; else { PLAYER.inventory[a] = undefined; }
    if (itemA) PLAYER.inventory[b] = itemA; else { PLAYER.inventory[b] = undefined; }
  }

  // 清理空槽
  PLAYER.inventory = PLAYER.inventory.filter(s => s !== null && s !== undefined);
  // 更新选中槽
  if (PLAYER.selectedSlot === a && itemA) PLAYER.selectedSlot = b;
  else if (PLAYER.selectedSlot === b && itemB) PLAYER.selectedSlot = a;
  if (PLAYER.selectedSlot >= PLAYER.inventory.length) PLAYER.selectedSlot = Math.max(0, PLAYER.inventory.length - 1);
}

// ==================== 钩爪 ====================
function fireHook() {
  if (PLAYER.hookActive || PLAYER.hookCooldown > 0) return;
  if (!TEST_MODE && STATE.hooksUsedToday >= 5) { addMessage('今日钩爪次数已用完！', '#f44'); return; }
  STATE.hooksUsedToday++;
  PLAYER.hookActive = true; PLAYER.hookProgress = 0; PLAYER.hookReturn = false; PLAYER.hookTarget = null;
  const dx = STATE.MOUSE.x - W / 2, dy = STATE.MOUSE.y - H / 2;
  const dist = Math.sqrt(dx * dx + dy * dy), range = PLAYER.hookRange || 300;
  if (dist > 0) { PLAYER.hookDirX = dx / dist; PLAYER.hookDirY = dy / dist; }
  else { PLAYER.hookDirX = 1; PLAYER.hookDirY = 0; }
  let bestTarget = null, bestDot = -2;
  for (const fi of FLOATING_ITEMS) {
    const fdx = fi.x - PLAYER.x, fdy = fi.y - PLAYER.y, fdist = Math.sqrt(fdx * fdx + fdy * fdy);
    if (fdist > range) continue;
    const dot = (fdx * PLAYER.hookDirX + fdy * PLAYER.hookDirY) / fdist;
    if (dot > bestDot) { bestDot = dot; bestTarget = fi; }
  }
  if (bestTarget && bestDot > 0.7) PLAYER.hookTarget = bestTarget;
  PLAYER.hookCooldown = 45;
  addMessage(`钩爪发射！（今日${TEST_MODE?'无限':`剩余 ${5-STATE.hooksUsedToday} 次`}）`, '#ff8');
}

// ==================== 喝水 ====================
function drinkWater() {
  if (PLAYER.waterBottle > 0) {
    PLAYER.waterBottle--;
    PLAYER.thirst = Math.min(PLAYER.maxThirst, PLAYER.thirst + 40);
    addMessage('喝了净化水！饥渴值+40', '#6cf');
    addParticle(PLAYER.x, PLAYER.y, '#6cf', 5);
  } else if (PLAYER.seaWater > 0) {
    PLAYER.seaWater--;
    PLAYER.thirst = Math.min(PLAYER.maxThirst, PLAYER.thirst + 5);
    addMessage('喝了海水...饥渴值+5', '#888');
    addParticle(PLAYER.x, PLAYER.y, '#888', 3);
    // 喝完后瓶子空了，归还空水瓶
    if (PLAYER.seaWater <= 0) {
      addItem('water_bottle', 1);
      addMessage('水瓶空了，可以再次装海水', '#888');
    }
  }
}

// ==================== 攻击 ====================
function playerAttack(button) {
  if (STATE.attackCooldown > 0) return;
  STATE.attackCooldown = button === 0 ? 20 : 30;
  STATE.playerAttackAnim = 8;
  const atkRange = PLAYER.weaponEquipped === 'sword' ? 70 : PLAYER.weaponEquipped === 'spear' ? 55 : 40;
  const baseDmg = PLAYER.weaponEquipped === 'sword' ? 20 : PLAYER.weaponEquipped === 'spear' ? 12 : 6;
  const atkDmg = button === 2 ? Math.floor(baseDmg * 1.5) : baseDmg;
  for (let i = SHARKS.length - 1; i >= 0; i--) { const sh = SHARKS[i]; if (Math.sqrt((PLAYER.x-sh.x)**2+(PLAYER.y-sh.y)**2) < atkRange) { sh.hp -= atkDmg; playHitSound(); addParticle(sh.x, sh.y, '#f44', 8); addMessage(`对鲨鱼造成 ${atkDmg} 伤害！`, '#ff8'); if (sh.hp <= 0) { addItem('shark_fin', 1 + Math.floor(Math.random() * 2)); addItem('raw_meat', 1 + Math.floor(Math.random() * 2)); addMessage('🦈 击杀了鲨鱼！', '#ff0'); SHARKS.splice(i, 1); } return; } }
  for (let i = MONSTERS.length - 1; i >= 0; i--) { const m = MONSTERS[i]; if (Math.sqrt((PLAYER.x-m.x)**2+(PLAYER.y-m.y)**2) < atkRange) { m.hp -= atkDmg; playHitSound(); addParticle(m.x, m.y, '#f44', 6); if (m.hp <= 0) { for (const drop of m.def.drops) { if (Math.random() < drop.chance) addItem(drop.id, 1); } addMessage(`击杀了 ${m.def.name}！`, '#ff0'); MONSTERS.splice(i, 1); } return; } }
}

// ==================== 交互 ====================
function tryInteract() {
  // 检查建筑
  for (const b of RAFT.buildings) {
    const bx = RAFT.centerX + b.x * 40, by = RAFT.centerY + b.y * 40;
    if (Math.sqrt((PLAYER.x-bx)**2+(PLAYER.y-by)**2) < 40) {
      if (b.type === 'driving_station') { STATE.drivingRaft = true; addMessage('🕹️ 驾驶模式！WASD移动木筏 | T/ESC离开', '#0f0'); return; }
      if (b.type === 'furnace') { openFurnace(b); return; }
      if (b.type === 'bed') { if (STATE.IS_NIGHT) { STATE.DAY_TIMER = STATE.DAY_LENGTH - 100; addMessage('🛏️ 跳过夜晚...', '#ccf'); addParticle(PLAYER.x, PLAYER.y, '#ccf', 15); } else addMessage('只能在夜晚睡觉', '#888'); return; }
      if (b.type === 'purifier') { usePurifier(); return; }
      if (b.type === 'farm' && b.harvestReady) { const crops = ['fiber','fiber','fiber','wood','cooked_fish','clay']; addItem(crops[Math.floor(Math.random()*crops.length)], 2+Math.floor(Math.random()*2)); b.harvestReady=false; b.growTimer=0; addMessage('收获作物！','#8f8'); addParticle(PLAYER.x,PLAYER.y,'#8f8',6); return; }
      if (b.type === 'net' && b.catchReady) { const ct=['raw_fish','raw_fish','raw_fish','plastic','wood','scrap']; addItem(ct[Math.floor(Math.random()*ct.length)],1); b.catchReady=false; b.catchTimer=0; addMessage('渔网捕获！','#ff8'); return; }
    }
  }
  // 检查结构
  for (const s of STRUCTURES) {
    if (Math.sqrt((PLAYER.x-s.wx)**2+(PLAYER.y-s.wy)**2) < s.radius + 60) {
      if (s.boss && !s.bossDefeated) { startCombat(s); return; }
      enterStructure(s); return;
    }
  }
}

function enterStructure(s) {
  STATE.inStructure = s; STATE.SCENE = 'structure';
  STATE.structPlayerX = 300; STATE.structPlayerY = 200; // 结构内部起始位置
  STATE.structChatNPC = null;
  STATE.structChatIndex = 0; STATE.structChatTimer = 0; STATE.structChatTyped = '';

  // 获取持久化的搜刮记录
  const key = `${s.type}_${Math.round(s.wx / 100)}_${Math.round(s.wy / 100)}`;
  if (!STATE.lootedStructures[key]) STATE.lootedStructures[key] = { looted: false, groundItemsPicked: [], chestsOpened: [] };
  const ls = STATE.lootedStructures[key];

  const def = STRUCTURE_DEFS[s.type] || { interiorChests: s.interiorChests || 1 };
  const chestCount = def?.interiorChests || s.interiorChests || 2;
  STATE.structureChests = [];
  STATE._structureChestBtns = [];

  // 生成散落宝箱（随机位置）
  for (let i = 0; i < chestCount; i++) {
    if (ls.chestsOpened[i]) continue;
    const loot = [];
    for (const entry of s.lootTable) {
      const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
      if (count > 0) loot.push({ id: entry.id, count });
    }
    STATE.structureChests.push({
      index: i, loot, opened: ls.chestsOpened[i] || false,
      x: 80 + Math.random() * 440, y: 60 + Math.random() * 320,
      locked: false
    });
  }

  // 上锁宝箱（仅在无boss的结构中，且未被打开过）
  if (!s.boss && !ls.lockedChestOpened) {
    const lcLoot = [];
    const lcTable = [
      { id: 'gold', min: 80, max: 200 }, { id: 'diamond', min: 1, max: 3 },
      { id: 'gem', min: 2, max: 5 }, { id: 'iron_ingot', min: 3, max: 8 },
      { id: 'sword', min: 0, max: 1 }, { id: 'helmet', min: 0, max: 1 },
      { id: 'chest_armor', min: 0, max: 1 }, { id: 'circuit', min: 1, max: 3 },
      { id: 'gold_bar', min: 1, max: 2 }, { id: 'fuel', min: 2, max: 5 },
      { id: 'treasure_key', min: 1, max: 2 }
    ];
    for (const entry of lcTable) {
      const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
      if (count > 0) lcLoot.push({ id: entry.id, count });
    }
    STATE.structureChests.push({
      index: 'locked', loot: lcLoot, opened: false,
      x: 80 + Math.random() * 440, y: 60 + Math.random() * 320,
      locked: true
    });
  }

  // 生成地面散落物资（已捡过的不会再生）
  STATE.structGroundItems = [];
  if (!ls.groundItemsGenerated) {
    const groundCount = 3 + Math.floor(Math.random() * 5);
    ls._groundItems = [];
    for (let i = 0; i < groundCount; i++) {
      const entry = s.lootTable[Math.floor(Math.random() * s.lootTable.length)];
      const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
      if (count > 0) {
        ls._groundItems.push({
          id: entry.id, count, picked: false,
          x: 40 + Math.random() * 520, y: 40 + Math.random() * 360
        });
      }
    }
    // 宝箱钥匙有15%概率出现在地面物资中
    if (!ls.lockedChestOpened && Math.random() < 0.15) {
      ls._groundItems.push({
        id: 'treasure_key', count: 1, picked: false,
        x: 40 + Math.random() * 520, y: 40 + Math.random() * 360
      });
    }
    ls.groundItemsGenerated = true;
  }
  // 只显示未被捡过的地面物资
  for (const gi of (ls._groundItems || [])) {
    if (!gi.picked) STATE.structGroundItems.push({ id: gi.id, count: gi.count, x: gi.x, y: gi.y, _ref: gi });
  }

  // 生成NPC（每次进入都重新随机，但保持对话新鲜感）
  STATE.structNPCs = [];
  if (s.type === 'small_island' || s.type === 'floating_market' || s.type === 'abandoned_hut') {
    const npcCount = 1 + Math.floor(Math.random() * 2);
    const npcNames = ['幸存者老王', '流浪商人', '渔民阿海', '拾荒者小刘', '神秘旅人', '研究员林'];
    const npcTypes = ['friendly', 'neutral', 'hostile'];
    for (let i = 0; i < npcCount; i++) {
      const npcType = npcTypes[Math.floor(Math.random() * npcTypes.length)];
      STATE.structNPCs.push({
        name: npcNames[Math.floor(Math.random() * npcNames.length)],
        type: npcType,
        x: 100 + Math.random() * 400, y: 60 + Math.random() * 320,
        hp: npcType === 'hostile' ? 40 : 30,
        maxHp: npcType === 'hostile' ? 40 : 30,
        dialogue: npcType === 'friendly'
          ? ['你好旅行者！最近海上风浪很大，你要小心。', '要交易吗？我这里有从沉船里捞到的好东西。', '听说东边有个废弃的钻井平台，但那里很危险。', '祝你平安！希望我们还能再见。']
          : npcType === 'neutral'
            ? ['...别靠太近，我不太信任陌生人。', '这里不太安全，你最好快点离开。', '你有什么事？我没时间闲聊。']
            : ['这是我的地盘！不想受伤就快滚！', '滚出去！这里不欢迎外人。', '找死吗？再靠近我就不客气了！'],
        tradeItems: npcType !== 'hostile' ? [
          { id: 'cooked_fish', count: 2, cost: 10 },
          { id: 'bandage', count: 1, cost: 15 },
          { id: 'scrap', count: 3, cost: 8 },
        ] : null,
      });
    }
  }

  if (!ls.looted) STATE.STRUCTURE_LOOT = generateLoot(s);
  else STATE.STRUCTURE_LOOT = null;
}

function generateLoot(structure) { const loot = []; for (const entry of structure.lootTable) { const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1)); if (count > 0) loot.push({ id: entry.id, count }); } return loot; }

function usePurifier() {
  if (!TEST_MODE && !hasItem('plastic', 1)) { addMessage('需要1个塑料', '#f84'); return; }
  removeItem('plastic', 1);
  const waterAmount = 2 + Math.floor(Math.random() * 4);
  PLAYER.waterBottle += waterAmount;
  addMessage(`净水器产出 ${waterAmount} 单位净化水！按F饮用`, '#6cf');
  addParticle(PLAYER.x, PLAYER.y, '#6cf', 10);
}

// ==================== 熔炉系统 ====================
function openFurnace(building) { const key = `${building.x},${building.y}`; if (!FURNACE_DATA[key]) FURNACE_DATA[key] = { fuel: 0, smelting: null, progress: 0, maxProgress: 0, output: null }; STATE.furnaceOpen = { building, key }; STATE.SCENE = 'furnace'; }
function startSmelting(recipe) { if (!STATE.furnaceOpen) return; const fd = FURNACE_DATA[STATE.furnaceOpen.key]; if (fd.smelting) { addMessage('熔炉工作中！', '#f84'); return; } if (fd.fuel <= 0) { addMessage('需要燃料！', '#f84'); return; } if (!canCraft(recipe)) { addMessage('材料不足！', '#f84'); return; } for (const inp of recipe.inputs) removeItem(inp.id, inp.count); fd.smelting = recipe.id; fd.output = recipe.id; fd.maxProgress = (recipe.smeltTime || 5) * 60; fd.progress = 0; addMessage(`开始烧制 ${recipe.name}...`, '#f80'); }
function addFuel() { if (!STATE.furnaceOpen) return; const fd = FURNACE_DATA[STATE.furnaceOpen.key]; if (hasItem('fuel', 1)) { removeItem('fuel', 1); fd.fuel += 30; addMessage('+30燃料值', '#f80'); } else if (hasItem('wood', 1)) { removeItem('wood', 1); fd.fuel += 5; addMessage('+5燃料值', '#f80'); } else { addMessage('没有燃料（需要木材或燃料）', '#f84'); } }

// ==================== 战斗系统 ====================
function startCombat(structure) { const bossDefs = { shark_boss: { name: '巨型鲨鱼', icon: '🦈', hp: 80, atk: 12, goldReward: 50 }, guardian: { name: '遗迹守护者', icon: '🤖', hp: 120, atk: 18, goldReward: 100 } }; const def = bossDefs[structure.boss] || bossDefs.shark_boss; STATE.combatActive = true; STATE.combatBoss = structure; STATE.combatPlayerHP = PLAYER.hp; STATE.combatBossHP = PLAYER.hp; STATE.combatBossMaxHP = PLAYER.hp; STATE.combatTimer = 0; STATE.combatLog = [`⚔️ ${def.icon} ${def.name} 出现了！`]; STATE.combatBossDef = def; STATE.SCENE = 'combat'; }
function doCombatAction(action) { if (!STATE.combatActive) return; const def = STATE.combatBossDef; STATE.combatTimer++; if (action === 'attack') { const dmg = 8 + Math.floor(Math.random() * 12) + (PLAYER.weaponEquipped === 'sword' ? 20 : PLAYER.weaponEquipped === 'spear' ? 15 : 0); STATE.combatBossHP = Math.max(0, STATE.combatBossHP - dmg); STATE.combatLog.push(`攻击BOSS，造成 ${dmg} 伤害！`); addParticle(PLAYER.x, PLAYER.y, '#ff0', 8); } else if (action === 'defend') { STATE.combatLog.push('🛡️ 防御！'); STATE._defending = true; } else if (action === 'heal') { if (hasItem('med_kit', 1)) { removeItem('med_kit', 1); STATE.combatPlayerHP = Math.min(PLAYER.maxHp, STATE.combatPlayerHP + 40); STATE.combatLog.push('医疗包 +40HP'); } else if (hasItem('bandage', 1)) { removeItem('bandage', 1); STATE.combatPlayerHP = Math.min(PLAYER.maxHp, STATE.combatPlayerHP + 25); STATE.combatLog.push('绷带 +25HP'); } else if (hasItem('cooked_fish', 1)) { removeItem('cooked_fish', 1); STATE.combatPlayerHP = Math.min(PLAYER.maxHp, STATE.combatPlayerHP + 15); STATE.combatLog.push('烤鱼 +15HP'); } else if (hasItem('cooked_meat', 1)) { removeItem('cooked_meat', 1); STATE.combatPlayerHP = Math.min(PLAYER.maxHp, STATE.combatPlayerHP + 25); STATE.combatLog.push('熟肉 +25HP'); } else { STATE.combatLog.push('没有回复物品！'); return; } } if (STATE.combatBossHP > 0) { let bossDmg = def.atk + Math.floor(Math.random() * 8); if (STATE._defending) { bossDmg = Math.floor(bossDmg * 0.3); STATE._defending = false; } STATE.combatPlayerHP -= bossDmg; STATE.combatLog.push(`BOSS造成 ${bossDmg} 伤害！`); addParticle(PLAYER.x, PLAYER.y, '#f44', 6); } if (STATE.combatLog.length > 6) STATE.combatLog.splice(0, STATE.combatLog.length - 6); if (STATE.combatPlayerHP < 10) { STATE.combatLog.push('⚠️ 血量过低，强制撤退！'); addMessage('血量过低，强制退出战斗！', '#f44'); endCombat(); return; } if (STATE.combatBossHP <= 0) { STATE.combatBossHP = 0; STATE.combatLog.push(`🎉 击败了 ${def.name}！`); STATE.combatBoss.bossDefeated = true; PLAYER.gold += def.goldReward; addMessage(`获得 ${def.goldReward} 金币！`, '#ff0'); const bonusLoot = generateLoot(STATE.combatBoss); for (const loot of bonusLoot) addItem(loot.id, loot.count); addMessage('获得额外物资！', '#ff0'); STATE.combatPlayerHP = Math.max(1, STATE.combatPlayerHP); setTimeout(() => { endCombat(); }, 1500); } else if (STATE.combatPlayerHP <= 0) { STATE.combatLog.push('💀 被击败...'); PLAYER.hp = 1; STATE.combatPlayerHP = 1; setTimeout(() => { endCombat(); }, 1500); } }
function endCombat() { PLAYER.hp = Math.max(1, Math.floor(STATE.combatPlayerHP)); STATE.combatActive = false; STATE.combatBoss = null; STATE._defending = false; STATE.SCENE = 'game'; }

// ==================== 合成 ====================
function canCraft(r) { if (TEST_MODE) return true; for (const inp of r.inputs) { if (!hasItem(inp.id, inp.count)) return false; } return true; }
function doCraft(r) { if (!canCraft(r)) return false; for (const inp of r.inputs) removeItem(inp.id, inp.count); const outCount = r.randomOutput ? r.randomOutput[0] + Math.floor(Math.random() * (r.randomOutput[1] - r.randomOutput[0] + 1)) : r.output; addItem(r.id, outCount); addMessage(`合成了 ${r.name} x${outCount}！`, '#ff0'); addParticle(PLAYER.x, PLAYER.y, '#ff0', 8); return true; }

// ==================== 使用物品 ====================
function useItem(slotIndex) {
  if (slotIndex >= PLAYER.inventory.length) return;
  const slot = PLAYER.inventory[slotIndex], id = slot.id;
  if (id === 'cooked_fish') { PLAYER.hunger = Math.min(PLAYER.maxHunger, PLAYER.hunger + 25); removeItem('cooked_fish', 1); addMessage('吃烤鱼，饱食度+25！', '#8f8'); addParticle(PLAYER.x, PLAYER.y, '#8f8', 5); }
  else if (id === 'cooked_meat') { PLAYER.hunger = Math.min(PLAYER.maxHunger, PLAYER.hunger + 40); removeItem('cooked_meat', 1); addMessage('吃熟肉，饱食度+40！', '#8f8'); addParticle(PLAYER.x, PLAYER.y, '#8f8', 6); }
  else if (id === 'raw_fish') { PLAYER.hunger = Math.min(PLAYER.maxHunger, PLAYER.hunger + 8); PLAYER.hp -= 3; removeItem('raw_fish', 1); addMessage('吃生鱼...不舒服，+8饱食度 -3HP', '#f84'); }
  else if (id === 'raw_meat') { PLAYER.hunger = Math.min(PLAYER.maxHunger, PLAYER.hunger + 10); PLAYER.hp -= 5; removeItem('raw_meat', 1); addMessage('吃生肉...肚子疼，+10饱食度 -5HP', '#f84'); }
  else if (id === 'water_bottle_item') { addMessage('用水瓶舀了海水...', '#888'); PLAYER.seaWater += 5; addMessage(`海水:${PLAYER.seaWater}（按F喝，回复极少）`, '#888'); removeItem('water_bottle_item', 1); addItem('water_bottle', 1); }
  else if (id === 'bandage') { PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 25); removeItem('bandage', 1); addMessage('绷带 +25HP！', '#f88'); addParticle(PLAYER.x, PLAYER.y, '#f88', 5); }
  else if (id === 'med_kit') { PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 50); removeItem('med_kit', 1); addMessage('医疗包 +50HP！', '#f88'); addParticle(PLAYER.x, PLAYER.y, '#f88', 8); }
  else if (id === 'raft_expand') { STATE.expandMode = true; addMessage('点击木筏周围空地扩建！（右键取消）', '#ff0'); }
  else if (BUILDING_ITEM_MAP[id]) { STATE.placeBuildingId = id; addMessage(`点击木筏空地放置 ${ITEMS[id]?.name || '建筑'}！（右键取消）`, '#ff0'); }
  else if (id === 'hook_upgrade') { PLAYER.hookRange = (PLAYER.hookRange || 300) + 80; removeItem('hook_upgrade', 1); addMessage('钩爪范围扩大！现在:' + PLAYER.hookRange, '#ff0'); }
  else if (id === 'spear') { PLAYER.weaponEquipped = 'spear'; addMessage('装备长矛！伤害+12', '#ff0'); }
  else if (id === 'sword') { PLAYER.weaponEquipped = 'sword'; addMessage('装备铁剑！伤害+20', '#ff0'); }
  else if (id === 'helmet') { PLAYER.helmetEquipped = true; addMessage('装备头盔！', '#ff0'); }
  else if (id === 'chest_armor') { PLAYER.chestEquipped = true; addMessage('装备胸甲！', '#ff0'); }
  else if (id === 'wooden_shield') { PLAYER.chestEquipped = true; addMessage('装备木盾！防御力提升', '#ff0'); }
  else if (id === 'fishing_rod') { if (Math.random() < 0.6) { addItem('raw_fish', 1); addMessage('钓到鱼！', '#8f8'); } else addMessage('鱼跑了...', '#888'); }
  else if (id === 'torch') { addMessage('火把照亮了周围', '#fa0'); addParticle(PLAYER.x, PLAYER.y, '#fa0', 3); }
  else if (id === 'compass') { addMessage(`当前坐标: (${Math.round(PLAYER.x)}, ${Math.round(PLAYER.y)})`, '#6cf'); }
  else if (id === 'backpack_upgrade') { removeItem('backpack_upgrade', 1); addMessage('背包已扩容！（暂无效果，敬请期待）', '#ff0'); }
  else if (id === 'bow') { addMessage('装备弓箭！远程攻击（暂无效果）', '#ff0'); PLAYER.weaponEquipped = 'bow'; }
  else if (id === 'ancient_map') {
    removeItem('ancient_map', 1);
    // 在玩家周围400-800px随机生成宝藏位置
    const ta = Math.random() * Math.PI * 2;
    const td = 400 + Math.random() * 400;
    STATE.treasureMapActive = true;
    STATE.treasureX = PLAYER.x + Math.cos(ta) * td;
    STATE.treasureY = PLAYER.y + Math.sin(ta) * td;
    // 在宝藏位置生成一个特殊结构标记
    STRUCTURES.push({
      type: 'treasure_site', name: '隐藏宝藏', danger: 0, wx: STATE.treasureX, wy: STATE.treasureY,
      icon: '💎', color: '#ff0', radius: 45,
      lootTable: [
        { id: 'gold', min: 60, max: 150 }, { id: 'diamond', min: 1, max: 3 },
        { id: 'gem', min: 2, max: 6 }, { id: 'iron_ingot', min: 3, max: 8 },
        { id: 'gold_bar', min: 1, max: 3 }, { id: 'treasure_key', min: 1, max: 2 },
        { id: 'sword', min: 0, max: 1 }, { id: 'circuit', min: 1, max: 3 }
      ],
      looted: false, boss: null, bossDefeated: false, interiorChests: 1, chestLooted: [],
      isTreasureSite: true
    });
    addMessage('🗺️ 远古地图揭示了隐藏宝藏的位置！右键打开地图查看', '#ff0');
    addParticle(PLAYER.x, PLAYER.y, '#ff0', 10);
  }
}

// ==================== 保存/加载 ====================
function saveGame(slotName) {
  const key = slotName || 'raft_survival_save';
  const data = {
    testMode: TEST_MODE,
    player: { x: PLAYER.x, y: PLAYER.y, hp: PLAYER.hp, maxHp: PLAYER.maxHp, hunger: PLAYER.hunger, maxHunger: PLAYER.maxHunger, thirst: PLAYER.thirst, maxThirst: PLAYER.maxThirst, gold: PLAYER.gold, inventory: PLAYER.inventory, hookRange: PLAYER.hookRange, weaponEquipped: PLAYER.weaponEquipped, helmetEquipped: PLAYER.helmetEquipped, chestEquipped: PLAYER.chestEquipped, waterBottle: PLAYER.waterBottle, seaWater: PLAYER.seaWater },
    raft: RAFT, dayCount: STATE.DAY_COUNT, dayTimer: STATE.DAY_TIMER, hooksUsedToday: STATE.hooksUsedToday,
    structures: STRUCTURES.map(s => ({ type: s.type, wx: s.wx, wy: s.wy, looted: s.looted, bossDefeated: s.bossDefeated, chestLooted: s.chestLooted, isTreasureSite: s.isTreasureSite || false })),
    floatingItems: FLOATING_ITEMS, furnaceData: FURNACE_DATA,
    lootedStructures: STATE.lootedStructures,
    treasureMapActive: STATE.treasureMapActive, treasureX: STATE.treasureX, treasureY: STATE.treasureY,
    companions: STATE.companions,
    gameMode: STATE.gameMode,
  };
  localStorage.setItem(key, JSON.stringify(data));
  const saves = JSON.parse(localStorage.getItem('raft_saves_list') || '[]');
  if (!saves.includes(key)) { saves.push(key); localStorage.setItem('raft_saves_list', JSON.stringify(saves)); }
  addMessage('游戏已保存！', '#8f8');
}
function loadGame(slotName) {
  const key = slotName || 'raft_survival_save'; const raw = localStorage.getItem(key); if (!raw) return false;
  try { const data = JSON.parse(raw);
    TEST_MODE = data.testMode || false;
    PLAYER.x = data.player.x; PLAYER.y = data.player.y; PLAYER.hp = data.player.hp; PLAYER.maxHp = data.player.maxHp; PLAYER.hunger = data.player.hunger; PLAYER.maxHunger = data.player.maxHunger; PLAYER.thirst = data.player.thirst; PLAYER.maxThirst = data.player.maxThirst; PLAYER.gold = data.player.gold; PLAYER.inventory = data.player.inventory || []; PLAYER.hookRange = data.player.hookRange || 300; PLAYER.weaponEquipped = data.player.weaponEquipped || null; PLAYER.helmetEquipped = data.player.helmetEquipped || false; PLAYER.chestEquipped = data.player.chestEquipped || false; PLAYER.waterBottle = data.player.waterBottle || 0; PLAYER.seaWater = data.player.seaWater || 0;
    RAFT = data.raft; STATE.DAY_COUNT = data.dayCount || 1; STATE.DAY_TIMER = data.dayTimer || 0; STATE.hooksUsedToday = data.hooksUsedToday || 0;
    STATE.SCENE = 'game'; STATE.drivingRaft = false; STATE.combatActive = false; STATE.expandMode = false; STATE.placeBuildingId = null; STATE.IS_NIGHT = false; STATE.backpackOpen = false; STATE.furnaceOpen = null;
    if (data.structures) { STRUCTURES = data.structures.map(s => generateStructure(s.type, s.wx, s.wy)); for (let i = 0; i < STRUCTURES.length; i++) { STRUCTURES[i].looted = data.structures[i].looted; STRUCTURES[i].bossDefeated = data.structures[i].bossDefeated; STRUCTURES[i].chestLooted = data.structures[i].chestLooted || []; STRUCTURES[i].isTreasureSite = data.structures[i].isTreasureSite || false; } }
    FLOATING_ITEMS = data.floatingItems || []; SHARKS = []; MONSTERS = []; FURNACE_DATA = data.furnaceData || {};
    STATE.lootedStructures = data.lootedStructures || {};
    STATE.treasureMapActive = data.treasureMapActive || false;
    STATE.treasureX = data.treasureX || 0; STATE.treasureY = data.treasureY || 0;
    STATE.companions = data.companions || [];
    STATE.gameMode = data.gameMode || 'endless';
    STATE.CAMERA.x = PLAYER.x; STATE.CAMERA.y = PLAYER.y;
    return true;
  } catch (e) { return false; }
}
function getSaveList() { const saves = JSON.parse(localStorage.getItem('raft_saves_list') || '[]'); return saves.map(key => { try { const data = JSON.parse(localStorage.getItem(key)); return { key, day: data.dayCount || 1, gold: data.player?.gold || 0, hp: data.player?.hp || 100, tiles: data.raft?.tiles?.length || 9, testMode: data.testMode || false }; } catch (e) { return null; } }).filter(Boolean); }
function hasAnySave() { const saves = JSON.parse(localStorage.getItem('raft_saves_list') || '[]'); return saves.length > 0 && saves.some(k => localStorage.getItem(k)); }

// ==================== 更新逻辑 ====================
function update() {
  if (['title', 'intro', 'pause', 'craft', 'recipe', 'saves', 'combat', 'furnace', 'password'].includes(STATE.SCENE)) return;
  if (STATE.SCENE === 'structure') { updateStructure(); updateSurvival(); return; }
  if (STATE.mapOpen) return;

  if (STATE.drivingRaft) {
    let mx = 0, my = 0;
    if (STATE.KEYS['w'] || STATE.KEYS['ArrowUp']) my = -1;
    if (STATE.KEYS['s'] || STATE.KEYS['ArrowDown']) my = 1;
    if (STATE.KEYS['a'] || STATE.KEYS['ArrowLeft']) mx = -1;
    if (STATE.KEYS['d'] || STATE.KEYS['ArrowRight']) mx = 1;
    if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707; }
    const speed = 2.5;
    RAFT.centerX += mx * speed; RAFT.centerY += my * speed;
    PLAYER.x += mx * speed; PLAYER.y += my * speed;
    for (const fi of FLOATING_ITEMS) { fi.x -= mx * speed; fi.y -= my * speed; }
    for (const s of STRUCTURES) { s.wx -= mx * speed; s.wy -= my * speed; }
    for (const sh of SHARKS) { sh.x -= mx * speed; sh.y -= my * speed; }
    for (const m of MONSTERS) { m.x -= mx * speed; m.y -= my * speed; }
    STATE.CAMERA.x = PLAYER.x; STATE.CAMERA.y = PLAYER.y;
    updateSurvival(); return;
  }

  STATE.CAMERA.x += (PLAYER.x - STATE.CAMERA.x) * 0.1;
  STATE.CAMERA.y += (PLAYER.y - STATE.CAMERA.y) * 0.1;

  let mx = 0, my = 0;
  if (STATE.KEYS['w'] || STATE.KEYS['ArrowUp']) my = -1;
  if (STATE.KEYS['s'] || STATE.KEYS['ArrowDown']) my = 1;
  if (STATE.KEYS['a'] || STATE.KEYS['ArrowLeft']) mx = -1;
  if (STATE.KEYS['d'] || STATE.KEYS['ArrowRight']) mx = 1;
  if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707; }
  PLAYER.x += mx * 2.5; PLAYER.y += my * 2.5;

  let onRaft = false;
  for (const t of RAFT.tiles) { if (Math.abs(PLAYER.x - (RAFT.centerX + t.x * 40)) < 20 && Math.abs(PLAYER.y - (RAFT.centerY + t.y * 40)) < 20) { onRaft = true; break; } }
  if (!onRaft) { PLAYER.x += (RAFT.centerX - PLAYER.x) * 0.05; PLAYER.y += (RAFT.centerY - PLAYER.y) * 0.05; if (!TEST_MODE && Math.random() < 0.008) { PLAYER.hp -= 1.5; playHurtSound(); if (Math.random() < 0.3) addMessage('你落水了！', '#f44'); } }

  if (STATE.attackCooldown > 0) STATE.attackCooldown--;
  if (STATE.playerAttackAnim > 0) STATE.playerAttackAnim--;
  if (STATE.MOUSE.held && STATE.SCENE === 'game' && !STATE.drivingRaft && !STATE.backpackOpen && STATE.attackCooldown <= 0) { if (STATE.leftClickAttack) playerAttack(0); if (STATE.rightClickAttack) playerAttack(2); }

  updateSurvival();
  // 追踪已探索区域（以玩家当前位置为中心，200px范围内的单元格标记为已探索）
  const exploreCellSize = 200;
  const cx = Math.floor(PLAYER.x / exploreCellSize);
  const cy = Math.floor(PLAYER.y / exploreCellSize);
  STATE.exploredCells.add(`${cx},${cy}`);
}

function updateSurvival() {
  STATE.DAY_TIMER++;
  STATE.IS_NIGHT = (STATE.DAY_TIMER / STATE.DAY_LENGTH) > 0.6;

  if (STATE.DAY_TIMER >= STATE.DAY_LENGTH) {
    STATE.DAY_TIMER = 0; STATE.DAY_COUNT++; STATE.IS_NIGHT = false;
    STATE.hooksUsedToday = 0;
    addMessage(`📅 第 ${STATE.DAY_COUNT} 天 黎明！钩爪重置`, '#ff0');
    spawnFloatingItems(3 + Math.floor(Math.random() * 4));
    if (MONSTERS.length > 0) { addMessage(`☀️ 阳光灼烧 ${MONSTERS.length} 只怪物！`, '#fc0'); MONSTERS = []; }
    for (const b of RAFT.buildings) { if (b.type === 'farm' && !b.harvestReady) { b.growTimer = (b.growTimer || 0) + 1; if (b.growTimer >= 3) b.harvestReady = true; } if (b.type === 'net' && !b.catchReady) { b.catchTimer = (b.catchTimer || 0) + 1; if (b.catchTimer >= 2) b.catchReady = true; } }
    if (Math.random() < 0.25) { const types = Object.keys(STRUCTURE_DEFS); STRUCTURES.push(generateStructure(types[Math.floor(Math.random() * types.length)], RAFT.centerX + (Math.random() - 0.5) * 1600, RAFT.centerY + (Math.random() - 0.5) * 1600)); }
    // 远处生成新结构（玩家走得越远，越有可能遇到新结构）
    if (Math.random() < 0.05) {
      const types = Object.keys(STRUCTURE_DEFS);
      const t = types[Math.floor(Math.random() * types.length)];
      const ang = Math.random() * Math.PI * 2;
      const d = 2000 + Math.random() * 5000; // 非常远的位置
      const nx = PLAYER.x + Math.cos(ang) * d;
      const ny = PLAYER.y + Math.sin(ang) * d;
      // 避免太靠近大陆
      if (Math.sqrt((nx - STATE.mainlandX) ** 2 + (ny - STATE.mainlandY) ** 2) > 300) {
        STRUCTURES.push(generateStructure(t, nx, ny));
      }
    }
  }

  // 熔炉
  for (const [key, fd] of Object.entries(FURNACE_DATA)) { if (fd.smelting && fd.fuel > 0) { fd.progress++; if (fd.progress >= fd.maxProgress) { addItem(fd.output, 1); fd.smelting = null; fd.progress = 0; fd.output = null; addMessage('🔥 熔炉烧制完成！', '#f80'); } if (fd.progress % 60 === 0) fd.fuel--; } }

  if (STATE.IS_NIGHT && STATE.DAY_TIMER % 300 === 0 && MONSTERS.length < 8) { const mtypes = ['zombie', 'ghost', 'sea_beast']; const mt = mtypes[Math.floor(Math.random() * mtypes.length)]; const mdef = MONSTER_DEFS[mt]; const angle = Math.random() * Math.PI * 2; MONSTERS.push({ def: mdef, x: RAFT.centerX + Math.cos(angle) * 250, y: RAFT.centerY + Math.sin(angle) * 250, hp: mdef.hp, maxHp: mdef.hp, attackCooldown: 0 }); }

  if (!TEST_MODE && STATE.DAY_TIMER % 120 === 0) { PLAYER.hunger -= 0.35; PLAYER.thirst -= 0.4; if (PLAYER.hunger <= 0) { PLAYER.hp -= 0.3; if (Math.random() < 0.05) addMessage('饿坏了！', '#f44'); } if (PLAYER.thirst <= 0) { PLAYER.hp -= 0.5; if (Math.random() < 0.05) addMessage('渴坏了！', '#f44'); } }

  if (SHARKS.length === 0 && Math.random() < 0.0008) { const a = Math.random() * Math.PI * 2; SHARKS.push({ x: RAFT.centerX + Math.cos(a) * 350, y: RAFT.centerY + Math.sin(a) * 350, hp: 30, maxHp: 30, attackCooldown: 0, wanderAngle: Math.random() * Math.PI * 2, wanderTimer: 0 }); }
  for (const sh of SHARKS) {
    const dx = RAFT.centerX - sh.x, dy = RAFT.centerY - sh.y, dist = Math.sqrt(dx * dx + dy * dy);
    const SHARK_CHASE_DIST = 200; // 10米=200px，超过此距离不追踪
    if (dist < SHARK_CHASE_DIST) {
      // 追踪模式：距离近时向木筏移动
      if (dist > 5) { sh.x += dx / dist * 0.8; sh.y += dy / dist * 0.8; }
      if (dist < 60) { sh.attackCooldown--; if (sh.attackCooldown <= 0) { sh.attackCooldown = 180; if (!RAFT.buildings.some(b => b.type === 'wall')) { const dmg = PLAYER.chestEquipped ? 3 : (PLAYER.helmetEquipped ? 4 : 6); if (!TEST_MODE) PLAYER.hp -= dmg; playHurtSound(); addMessage('🦈 鲨鱼攻击！', '#f44'); addParticle(PLAYER.x, PLAYER.y, '#f00', 10); } else addMessage('围墙挡住鲨鱼！', '#8f8'); } }
    } else {
      // 游荡模式：距离远时随机游泳
      sh.wanderTimer--;
      if (sh.wanderTimer <= 0 || Math.random() < 0.02) {
        sh.wanderAngle += (Math.random() - 0.5) * 1.5;
        sh.wanderTimer = 60 + Math.floor(Math.random() * 120);
      }
      const wanderSpeed = 0.5;
      sh.x += Math.cos(sh.wanderAngle) * wanderSpeed;
      sh.y += Math.sin(sh.wanderAngle) * wanderSpeed;
      // 保持在木筏周围一定范围内（不要太远）
      if (dist > 600) {
        sh.x += dx / dist * 0.3; sh.y += dy / dist * 0.3;
      }
    }
  }

  for (const m of MONSTERS) { const dx = PLAYER.x - m.x, dy = PLAYER.y - m.y, dist = Math.sqrt(dx * dx + dy * dy); if (dist > 5 && dist < 400) { m.x += dx / dist * m.def.speed; m.y += dy / dist * m.def.speed; } if (dist < 35) { m.attackCooldown--; if (m.attackCooldown <= 0) { m.attackCooldown = 120; const dmg = m.def.atk - (PLAYER.chestEquipped ? 5 : 0) - (PLAYER.helmetEquipped ? 3 : 0); if (!TEST_MODE) PLAYER.hp -= Math.max(1, dmg); playHurtSound(); addMessage(`${m.def.name} 攻击！`, '#f44'); addParticle(PLAYER.x, PLAYER.y, '#f44', 5); } } }

  if (PLAYER.hookCooldown > 0) PLAYER.hookCooldown--;
  if (PLAYER.hookActive) { if (PLAYER.hookReturn) { PLAYER.hookProgress -= 0.04; if (PLAYER.hookProgress <= 0) { PLAYER.hookActive = false; if (PLAYER.hookTarget) { collectHookTarget(); } } } else { PLAYER.hookProgress += 0.04; if (PLAYER.hookProgress >= 1) PLAYER.hookReturn = true; if (PLAYER.hookTarget) { const htx = PLAYER.x + PLAYER.hookDirX * PLAYER.hookRange * PLAYER.hookProgress, hty = PLAYER.y + PLAYER.hookDirY * PLAYER.hookRange * PLAYER.hookProgress; if (Math.sqrt((htx - PLAYER.hookTarget.x) ** 2 + (hty - PLAYER.hookTarget.y) ** 2) < 18) PLAYER.hookReturn = true; } } }

  for (const fi of FLOATING_ITEMS) { fi.x += fi.vx + (Math.random() - 0.5) * 0.2; fi.y += fi.vy + (Math.random() - 0.5) * 0.2; fi.life--; }
  FLOATING_ITEMS = FLOATING_ITEMS.filter(f => f.life > 0);
  if (FLOATING_ITEMS.length < 4) spawnFloatingItems(3);

  // 漂流瓶生成（海上偶尔出现）
  if (STATE.messageBottles.length < 3 && Math.random() < 0.0003) {
    const ba = Math.random() * Math.PI * 2;
    const bd = 200 + Math.random() * 400;
    const bottleMsgs = [
      { msg: '救命！我被困在东边的小岛上...如果有人看到这个瓶子，请来找我。- 幸存者阿明', npcName: '幸存者阿明', npcType: 'friendly' },
      { msg: '如果你看到这个瓶子，说明你离我不远了。我在西北方的一个废弃钻井平台附近。有重要情报。', npcName: '研究员老陈', npcType: 'neutral' },
      { msg: '漂流了30天了...食物快吃完了。如果你路过，请帮帮我。我会报答你的。', npcName: '渔民大海', npcType: 'friendly' },
      { msg: '警告：不要靠近南边的军用残骸！那里有可怕的东西...我已经失去了我的同伴。', npcName: '退伍兵老刘', npcType: 'neutral' },
      { msg: '我是一个商人，我的船沉了。如果你能帮我，我可以给你很好的折扣。', npcName: '流浪商人老赵', npcType: 'friendly' },
    ];
    const bm = bottleMsgs[Math.floor(Math.random() * bottleMsgs.length)];
    const bottleX = RAFT.centerX + Math.cos(ba) * bd;
    const bottleY = RAFT.centerY + Math.sin(ba) * bd;
    STATE.messageBottles.push({
      x: bottleX, y: bottleY, message: bm.msg,
      npcName: bm.npcName, npcType: bm.npcType,
      collected: false, life: 3600
    });
  }
  // 更新漂流瓶
  for (const mb of STATE.messageBottles) {
    mb.x += (Math.random() - 0.5) * 0.3;
    mb.y += (Math.random() - 0.5) * 0.3;
    mb.life--;
  }
  STATE.messageBottles = STATE.messageBottles.filter(mb => mb.life > 0);
  // 检测玩家靠近漂流瓶
  for (const mb of STATE.messageBottles) {
    if (!mb.collected && Math.sqrt((PLAYER.x - mb.x) ** 2 + (PLAYER.y - mb.y) ** 2) < 50) {
      mb.collected = true;
      addMessage(`🍾 捡到了一个漂流瓶！打开看看...`, '#ff0');
      addMessage(`📜 "${mb.message}"`, '#8cf');
      addMessage(`💡 也许可以去附近的结构找找 ${mb.npcName}`, '#ff0');
      // 在漂流瓶位置附近生成一个NPC所在的小岛结构
      const na = Math.random() * Math.PI * 2;
      const nd = 300 + Math.random() * 500;
      const nx = mb.x + Math.cos(na) * nd;
      const ny = mb.y + Math.sin(na) * nd;
      const islandTypes = ['small_island', 'abandoned_hut', 'floating_market'];
      const it = islandTypes[Math.floor(Math.random() * islandTypes.length)];
      STRUCTURES.push(generateStructure(it, nx, ny));
      // 标记这个结构为漂流瓶NPC所在地
      const s = STRUCTURES[STRUCTURES.length - 1];
      s.bottleNPC = { name: mb.npcName, type: mb.npcType, recruited: false };
      addMessage(`📍 地图上出现了一个新的结构标记`, '#ff0');
    }
  }
  STATE.messageBottles = STATE.messageBottles.filter(mb => !mb.collected);

  // 伙伴任务更新
  for (const c of STATE.companions) {
    if (c.task && c.taskTimer > 0) {
      c.taskTimer--;
      if (c.taskTimer <= 0) {
        // 任务完成
        const rewards = {
          '收集木材': [{ id: 'wood', count: 10 }],
          '收集废铁': [{ id: 'scrap', count: 8 }],
          '钓鱼': [{ id: 'raw_fish', count: 5 }],
          '收集纤维': [{ id: 'fiber', count: 8 }],
        };
        const reward = rewards[c.task] || [];
        for (const r of reward) addItem(r.id, r.count);
        addMessage(`✅ ${c.name} 完成了"${c.task}"！`, '#0f0');
        playCollectSound();
        c.task = null;
        c.taskData = null;
      }
    }
  }
  for (const p of STATE.PARTICLES) { p.x += p.vx; p.y += p.vy; p.life--; }
  STATE.PARTICLES = STATE.PARTICLES.filter(p => p.life > 0);
  for (const m of STATE.MESSAGES) m.life--;
  STATE.MESSAGES = STATE.MESSAGES.filter(m => m.life > 0);

  // 检测是否到达大陆（生存模式胜利条件）
  if (STATE.gameMode === 'survival' && !STATE.gameWon && !STATE.mainlandReached) {
    const contDist = Math.sqrt((PLAYER.x - STATE.mainlandX) ** 2 + (PLAYER.y - STATE.mainlandY) ** 2);
    if (contDist < 250) {
      STATE.mainlandReached = true;
      STATE.gameWon = true;
      addMessage('🌍 你找到了大陆！生存模式通关！', '#0f0');
      addMessage('🏆 恭喜你完成了漂流求生之旅！', '#ff0');
      STATE.SCENE = 'win';
    }
  }

  if (!TEST_MODE && PLAYER.hp <= 0) { addMessage('💀 你死了...游戏结束', '#f00'); STATE.SCENE = 'title'; }
  PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp);
  PLAYER.hunger = Math.max(0, Math.min(PLAYER.maxHunger, PLAYER.hunger));
  PLAYER.thirst = Math.max(0, Math.min(PLAYER.maxThirst, PLAYER.thirst));
}

function collectHookTarget() { const fi = PLAYER.hookTarget; const ft = FLOAT_TYPES[fi.id]; if (ft && ft.isSpecial && ft.lootTable) { addMessage(`打开了 ${ft.name}！`, '#ff0'); for (const entry of ft.lootTable) { const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1)); if (count > 0) addItem(entry.id, count); } } else { addItem(fi.id, 1); addMessage(`勾到 ${ITEMS[fi.id]?.name || ft?.name || '物品'}！`, '#ff0'); } addParticle(PLAYER.x, PLAYER.y, '#ff0', 5); const idx = FLOATING_ITEMS.indexOf(fi); if (idx >= 0) FLOATING_ITEMS.splice(idx, 1); PLAYER.hookTarget = null; }

// ==================== 渲染 ====================
function drawOcean() {
  const isNight = STATE.IS_NIGHT;
  let r1, g1, b1, r2, g2, b2, r3, g3, b3;
  if (isNight) { r1 = 5; g1 = 10; b1 = 30; r2 = 3; g2 = 8; b2 = 22; r3 = 1; g3 = 4; b3 = 15; }
  else { const t = STATE.DAY_TIMER / STATE.DAY_NIGHT_THRESHOLD; r1 = Math.floor(10 + t * 15); g1 = Math.floor(40 + t * 25); b1 = Math.floor(120 - t * 30); r2 = Math.floor(5 + t * 8); g2 = Math.floor(20 + t * 15); b2 = Math.floor(80 - t * 20); r3 = Math.floor(3 + t * 5); g3 = Math.floor(10 + t * 8); b3 = Math.floor(50 - t * 15); }
  ctx.fillStyle = `rgb(${r1},${g1},${b1})`; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
  grad.addColorStop(0, `rgb(${r2},${g2},${b2})`); grad.addColorStop(1, `rgb(${r3},${g3},${b3})`);
  ctx.fillStyle = grad; ctx.fillRect(0, H * 0.4, W, H * 0.6);
  ctx.strokeStyle = `rgba(255,255,255,${isNight ? 0.03 : 0.06})`; ctx.lineWidth = 1;
  for (let i = -1; i < H / 30 + 2; i++) { ctx.beginPath(); const baseY = i * 30 + (STATE.DAY_TIMER * 0.5 + i * 37) % 60 - 30; for (let x = 0; x < W; x += 5) { const y = baseY + Math.sin(x * 0.02 + STATE.DAY_TIMER * 0.02 + i) * 5; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  if (isNight) {
    // 多层暗色覆盖 - 大幅降低夜间亮度
    ctx.fillStyle = 'rgba(0,0,20,0.55)'; ctx.fillRect(0, 0, W, H);
    // 玩家周围视野光晕
    const ps = worldToScreen(PLAYER.x, PLAYER.y);
    const nightGrad = ctx.createRadialGradient(ps.x, ps.y, 60, ps.x, ps.y, 400);
    nightGrad.addColorStop(0, 'rgba(0,0,10,0)');
    nightGrad.addColorStop(0.4, 'rgba(0,0,10,0.15)');
    nightGrad.addColorStop(1, 'rgba(0,0,5,0.5)');
    ctx.fillStyle = nightGrad; ctx.fillRect(0, 0, W, H);
  }
}

function drawRaft() {
  for (const t of RAFT.tiles) { const s = worldToScreen(RAFT.centerX + t.x * 40, RAFT.centerY + t.y * 40); ctx.fillStyle = '#b08050'; ctx.fillRect(s.x - 18, s.y - 18, 36, 36); ctx.strokeStyle = '#8b6040'; ctx.lineWidth = 1.5; ctx.strokeRect(s.x - 18, s.y - 18, 36, 36); ctx.strokeStyle = '#9a7040'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(s.x - 18, s.y - 8); ctx.lineTo(s.x + 18, s.y - 8); ctx.moveTo(s.x - 18, s.y + 8); ctx.lineTo(s.x + 18, s.y + 8); ctx.moveTo(s.x - 8, s.y - 18); ctx.lineTo(s.x - 8, s.y + 18); ctx.moveTo(s.x + 8, s.y - 18); ctx.lineTo(s.x + 8, s.y + 18); ctx.stroke(); }
  for (const b of RAFT.buildings) { const s = worldToScreen(RAFT.centerX + b.x * 40, RAFT.centerY + b.y * 40); ctx.textAlign = 'center';
    if (b.type === 'craft_table') { ctx.fillStyle = '#654'; ctx.fillRect(s.x - 12, s.y - 12, 24, 24); ctx.font = '14px serif'; ctx.fillText('🔧', s.x, s.y + 5); }
    else if (b.type === 'furnace') { ctx.fillStyle = '#444'; ctx.fillRect(s.x - 12, s.y - 14, 24, 28); ctx.strokeStyle = '#f84'; ctx.lineWidth = 2; ctx.strokeRect(s.x - 12, s.y - 14, 24, 28); ctx.font = '14px serif'; ctx.fillText('🔥', s.x, s.y + 5); }
    else if (b.type === 'farm') { ctx.fillStyle = '#5a3'; ctx.fillRect(s.x - 14, s.y - 14, 28, 28); ctx.font = '16px serif'; ctx.fillText(b.harvestReady ? '🌾' : '🌱', s.x, s.y + 6); }
    else if (b.type === 'purifier') { ctx.fillStyle = '#468'; ctx.fillRect(s.x - 12, s.y - 12, 24, 24); ctx.strokeStyle = '#6cf'; ctx.lineWidth = 2; ctx.strokeRect(s.x - 12, s.y - 12, 24, 24); ctx.font = '14px serif'; ctx.fillText('💧', s.x, s.y + 5); }
    else if (b.type === 'net') { ctx.fillStyle = '#aaa'; ctx.fillRect(s.x - 16, s.y - 8, 32, 16); ctx.font = '12px serif'; ctx.fillText(b.catchReady ? '🐟' : '🕸️', s.x, s.y + 4); }
    else if (b.type === 'wall') { ctx.fillStyle = '#876'; ctx.fillRect(s.x - 16, s.y - 16, 32, 32); ctx.strokeStyle = '#543'; ctx.strokeRect(s.x - 16, s.y - 16, 32, 32); ctx.font = '16px serif'; ctx.fillText('🧱', s.x, s.y + 6); }
    else if (b.type === 'driving_station') { ctx.fillStyle = '#555'; ctx.fillRect(s.x - 15, s.y - 15, 30, 30); ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2; ctx.strokeRect(s.x - 15, s.y - 15, 30, 30); ctx.font = '18px serif'; ctx.fillText('🕹️', s.x, s.y + 6); }
    else if (b.type === 'bed') { ctx.fillStyle = '#a86'; ctx.fillRect(s.x - 16, s.y - 10, 32, 20); ctx.font = '14px serif'; ctx.fillText('🛏️', s.x, s.y + 5); }
    else if (b.type === 'chest_storage') { ctx.fillStyle = '#864'; ctx.fillRect(s.x - 12, s.y - 12, 24, 24); ctx.font = '14px serif'; ctx.fillText('📦', s.x, s.y + 5); }
  }
  if (STATE.expandMode) { const adj = getAdjacentPositions(); for (const pos of adj) { const s = worldToScreen(pos.x, pos.y); ctx.fillStyle = 'rgba(0,255,0,0.3)'; ctx.fillRect(s.x - 18, s.y - 18, 36, 36); ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2; ctx.strokeRect(s.x - 18, s.y - 18, 36, 36); } }
  if (STATE.placeBuildingId) { for (const t of RAFT.tiles) { if (RAFT.buildings.some(b => b.x === t.x && b.y === t.y)) continue; const s = worldToScreen(RAFT.centerX + t.x * 40, RAFT.centerY + t.y * 40); ctx.fillStyle = 'rgba(0,150,255,0.3)'; ctx.fillRect(s.x - 18, s.y - 18, 36, 36); ctx.strokeStyle = '#09f'; ctx.lineWidth = 2; ctx.strokeRect(s.x - 18, s.y - 18, 36, 36); } }
}
function getAdjacentPositions() { const existing = new Set(RAFT.tiles.map(t => `${t.x},${t.y}`)); const adj = []; for (const t of RAFT.tiles) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const key = `${t.x + dx},${t.y + dy}`; if (!existing.has(key) && !adj.some(a => a.tx === t.x + dx && a.ty === t.y + dy)) adj.push({ x: RAFT.centerX + (t.x + dx) * 40, y: RAFT.centerY + (t.y + dy) * 40, tx: t.x + dx, ty: t.y + dy }); } return adj; }

function drawPlayer() { const s = worldToScreen(PLAYER.x, PLAYER.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 12, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fdb'; ctx.beginPath(); ctx.arc(s.x, s.y - 8, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e74c3c'; ctx.fillRect(s.x - 7, s.y - 2, 14, 14); ctx.fillStyle = '#345'; ctx.fillRect(s.x - 5, s.y + 10, 5, 10); ctx.fillRect(s.x + 1, s.y + 10, 5, 10); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s.x - 3, s.y - 11, 1.5, 0, Math.PI * 2); ctx.arc(s.x + 3, s.y - 11, 1.5, 0, Math.PI * 2); ctx.fill(); if (PLAYER.weaponEquipped === 'sword') { ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 12, s.y - 8); ctx.lineTo(s.x + 24, s.y - 22); ctx.stroke(); ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(s.x + 24, s.y - 22, 2, 0, Math.PI * 2); ctx.fill(); } else if (PLAYER.weaponEquipped === 'spear') { ctx.strokeStyle = '#963'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 12, s.y - 5); ctx.lineTo(s.x + 22, s.y - 20); ctx.stroke(); } if (PLAYER.helmetEquipped) { ctx.fillStyle = '#aaa'; ctx.fillRect(s.x - 8, s.y - 18, 16, 6); } if (PLAYER.chestEquipped) { ctx.fillStyle = '#888'; ctx.fillRect(s.x - 8, s.y - 2, 16, 16); } if (STATE.playerAttackAnim > 0) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y - 5, 18, -0.5, 1.5); ctx.stroke(); } if (PLAYER.hookActive) { const prog = PLAYER.hookReturn ? (1 - PLAYER.hookProgress) : PLAYER.hookProgress; const hs = worldToScreen(PLAYER.x + PLAYER.hookDirX * PLAYER.hookRange * prog, PLAYER.y + PLAYER.hookDirY * PLAYER.hookRange * prog); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(s.x + 10, s.y); ctx.lineTo(hs.x, hs.y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(hs.x, hs.y, 5, 0, Math.PI * 2); ctx.fill(); } }

function drawStructures() { for (const s of STRUCTURES) { const pos = worldToScreen(s.wx, s.wy); if (pos.x < -120 || pos.x > W + 120 || pos.y < -120 || pos.y > H + 120) continue; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(pos.x, pos.y, s.radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); ctx.font = `${s.radius}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.icon, pos.x, pos.y); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.fillText(s.name, pos.x, pos.y - s.radius - 10); ctx.fillStyle = ['#0f0', '#ff0', '#f80', '#f40', '#800'][Math.min(s.danger - 1, 4)]; ctx.font = 'bold 10px "Microsoft YaHei"'; ctx.fillText('⚠'.repeat(s.danger), pos.x, pos.y + s.radius + 12); if (s.looted) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(pos.x, pos.y, s.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Microsoft YaHei"'; ctx.fillText('已搜索', pos.x, pos.y); } if (s.boss && !s.bossDefeated) { ctx.fillStyle = '#f00'; ctx.font = 'bold 11px "Microsoft YaHei"'; ctx.fillText('💀BOSS', pos.x, pos.y - s.radius - 24); } if (Math.sqrt((PLAYER.x - s.wx) ** 2 + (PLAYER.y - s.wy) ** 2) < s.radius + 80) { ctx.fillStyle = '#fff'; ctx.font = '11px "Microsoft YaHei"'; ctx.fillText('按E进入', pos.x, pos.y - s.radius - 24 - (s.boss && !s.bossDefeated ? 14 : 0)); } } }

function drawFloatingItems() { for (const fi of FLOATING_ITEMS) { const s = worldToScreen(fi.x, fi.y); if (s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) continue; const ft = FLOAT_TYPES[fi.id]; const size = ft ? ft.size : 16; ctx.globalAlpha = Math.min(1, fi.life / 60); if (ft && ft.isSpecial) { ctx.fillStyle = 'rgba(255,255,200,0.3)'; ctx.beginPath(); ctx.arc(s.x, s.y, size / 2 + 6, 0, Math.PI * 2); ctx.fill(); } ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ft ? ft.icon : '📦', s.x, s.y); if (ft) { ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Microsoft YaHei"'; ctx.fillText(ft.name, s.x, s.y - size / 2 - 6); } ctx.globalAlpha = 1; } }
function drawSharks() { for (const sh of SHARKS) { const s = worldToScreen(sh.x, sh.y); if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) continue; ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.fillText('🦈', s.x, s.y); ctx.fillStyle = '#333'; ctx.fillRect(s.x - 18, s.y - 26, 36, 5); ctx.fillStyle = '#f44'; ctx.fillRect(s.x - 18, s.y - 26, 36 * (sh.hp / sh.maxHp), 5); } }
function drawMessageBottles() { for (const mb of STATE.messageBottles) { const s = worldToScreen(mb.x, mb.y); if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) continue; const bob = Math.sin(Date.now() * 0.004 + mb.x * 0.01) * 3; ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('🍾', s.x, s.y + bob); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Microsoft YaHei"'; ctx.fillText('漂流瓶', s.x, s.y - 14 + bob); } }
function drawMonsters() { for (const m of MONSTERS) { const s = worldToScreen(m.x, m.y); if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) continue; ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.fillText(m.def.icon, s.x, s.y); ctx.fillStyle = '#333'; ctx.fillRect(s.x - 15, s.y - 26, 30, 4); ctx.fillStyle = '#f80'; ctx.fillRect(s.x - 15, s.y - 26, 30 * (m.hp / m.maxHp), 4); ctx.fillStyle = '#fff'; ctx.font = '9px "Microsoft YaHei"'; ctx.fillText(m.def.name, s.x, s.y - 30); } }
function drawParticles() { for (const p of STATE.PARTICLES) { const s = worldToScreen(p.x, p.y); ctx.globalAlpha = p.life / 60; ctx.fillStyle = p.color; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); } ctx.globalAlpha = 1; }
function drawMessages() { let y = 10; for (const m of STATE.MESSAGES) { ctx.globalAlpha = Math.min(1, m.life / 30); ctx.fillStyle = m.color; ctx.font = '13px "Microsoft YaHei"'; ctx.textAlign = 'left'; ctx.fillText(m.text, 10, y); y += 18; } ctx.globalAlpha = 1; }

function drawHUD() {
  // 左上角市场按钮
  const marketBtnX = 12, marketBtnY = 8;
  const marketHover = STATE.MOUSE.x >= marketBtnX && STATE.MOUSE.x <= marketBtnX + 48 && STATE.MOUSE.y >= marketBtnY && STATE.MOUSE.y <= marketBtnY + 48;
  ctx.fillStyle = marketHover ? '#6a4a00' : 'rgba(0,0,0,0.6)';
  ctx.fillRect(marketBtnX, marketBtnY, 48, 48);
  ctx.strokeStyle = '#fa0'; ctx.lineWidth = 2; ctx.strokeRect(marketBtnX, marketBtnY, 48, 48);
  ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.fillText('🏪', marketBtnX + 24, marketBtnY + 30);
  ctx.fillStyle = '#fa0'; ctx.font = 'bold 9px "Microsoft YaHei"'; ctx.fillText('市场', marketBtnX + 24, marketBtnY + 44);
  STATE._marketButton = { x: marketBtnX, y: marketBtnY, w: 48, h: 48 };

  const hudX = 12, hudY = H - 215;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(hudX - 3, hudY - 3, 195, 125);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.textAlign = 'left';
  ctx.fillText('❤️ 生命', hudX, hudY + 14); ctx.fillStyle = '#333'; ctx.fillRect(hudX, hudY + 17, 180, 12);
  ctx.fillStyle = PLAYER.hp / PLAYER.maxHp > 0.5 ? '#4c4' : PLAYER.hp / PLAYER.maxHp > 0.25 ? '#fc0' : '#f44';
  ctx.fillRect(hudX, hudY + 17, 180 * (PLAYER.hp / PLAYER.maxHp), 12);
  ctx.fillStyle = '#fff'; ctx.font = '10px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText(`${Math.ceil(PLAYER.hp)}/${PLAYER.maxHp}`, hudX + 90, hudY + 27);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.textAlign = 'left';
  ctx.fillText('🍖 饱食度', hudX, hudY + 42); ctx.fillStyle = '#333'; ctx.fillRect(hudX, hudY + 45, 180, 10); ctx.fillStyle = '#da5'; ctx.fillRect(hudX, hudY + 45, 180 * (PLAYER.hunger / PLAYER.maxHunger), 10);
  ctx.fillText('💧 饥渴值', hudX, hudY + 66); ctx.fillStyle = '#333'; ctx.fillRect(hudX, hudY + 69, 180, 10); ctx.fillStyle = '#5af'; ctx.fillRect(hudX, hudY + 69, 180 * (PLAYER.thirst / PLAYER.maxThirst), 10);
  const wi = []; if (PLAYER.waterBottle > 0) wi.push(`净化水:${PLAYER.waterBottle}`); if (PLAYER.seaWater > 0) wi.push(`海水:${PLAYER.seaWater}/5`);
  ctx.fillStyle = '#fff'; ctx.font = '10px "Microsoft YaHei"'; ctx.textAlign = 'left';
  const waterLabel = wi.length > 0 ? `🧴 ${wi.join(' | ')}` : '🧴 空水瓶→按F装海水';
  ctx.fillText(waterLabel + (PLAYER.seaWater > 0 ? ' (按F喝)' : ''), hudX, hudY + 90);
  ctx.fillText(`⚔️ ${PLAYER.weaponEquipped === 'sword' ? '铁剑' : PLAYER.weaponEquipped === 'spear' ? '长矛' : '空手'} | 🎣${TEST_MODE?'∞':STATE.hooksUsedToday+'/5'} | 🎯${PLAYER.hookRange}`, hudX, hudY + 104);

  const nightLabel = STATE.IS_NIGHT ? '🌙 夜晚' : '☀️ 白天';
  const timeLeft = STATE.IS_NIGHT ? Math.ceil((STATE.DAY_LENGTH - STATE.DAY_TIMER) / 3600) : Math.ceil((STATE.DAY_NIGHT_THRESHOLD - STATE.DAY_TIMER) / 3600);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W - 175, 5, 160, 80);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Microsoft YaHei"'; ctx.textAlign = 'right';
  ctx.fillText(`📅 第${STATE.DAY_COUNT}天 ${nightLabel}`, W - 15, 22);
  ctx.fillStyle = STATE.gameMode === 'survival' ? '#4a4' : '#a4a';
  ctx.font = 'bold 10px "Microsoft YaHei"';
  ctx.fillText(STATE.gameMode === 'survival' ? '🌊 生存模式' : '♾️ 无尽模式', W - 15, 34);
  ctx.fillText(`🪙 ${PLAYER.gold}金币 | 🟫 ${RAFT.tiles.length}㎡`, W - 15, 48);
  ctx.fillText(`⏰ 距切换约${timeLeft}分钟`, W - 15, 64);
  if (TEST_MODE) { ctx.fillStyle = '#0f0'; ctx.fillText('🧪 测试模式', W - 15, 78); }

  const invY = H - 55;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, invY - 5, W, 60);
  const slotSize = 44, maxShow = Math.min(PLAYER.inventory.length, 9);
  const startX = W / 2 - maxShow * slotSize / 2;
  for (let i = 0; i < maxShow; i++) { const sx = startX + i * slotSize, sy = invY; const slot = PLAYER.inventory[i]; ctx.fillStyle = i === PLAYER.selectedSlot ? '#ff8' : '#444'; ctx.fillRect(sx, sy, slotSize - 2, slotSize - 2); ctx.strokeStyle = i === PLAYER.selectedSlot ? '#ff0' : '#555'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, slotSize - 2, slotSize - 2); if (slot) { const item = ITEMS[slot.id]; if (item) { const typeColors = { raw: 'rgba(139,90,43,0.5)', processed: 'rgba(100,100,150,0.5)', food: 'rgba(200,100,50,0.5)', weapon: 'rgba(200,50,50,0.5)', armor: 'rgba(50,50,200,0.5)', building: 'rgba(50,150,50,0.5)', tool: 'rgba(100,150,150,0.5)', consumable: 'rgba(150,100,150,0.5)', special: 'rgba(200,200,50,0.5)' }; ctx.fillStyle = typeColors[item.type] || 'rgba(100,100,100,0.3)'; ctx.fillRect(sx + 2, sy + 2, slotSize - 6, slotSize - 6); } ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(item?.icon || '❓', sx + slotSize / 2 - 1, sy + 28); ctx.font = 'bold 10px "Microsoft YaHei"'; ctx.fillText(TEST_MODE ? '∞' : slot.count, sx + slotSize - 8, sy + slotSize - 6); } ctx.fillStyle = '#aaa'; ctx.font = '9px "Microsoft YaHei"'; ctx.textAlign = 'left'; ctx.fillText(i + 1, sx + 6, sy + 10); }
  ctx.fillStyle = '#ddd'; ctx.font = '11px "Microsoft YaHei"'; ctx.textAlign = 'left';
  ctx.fillText('WASD移动 | 左/右键攻击 | G钩爪 | T驾驶台 | F使用/喝水 | E交互 | P放置 | B背包(右键出售) | M地图 | K市场 | Y伙伴 | R配方 | C制造(滚轮) | ESC暂停', 10, H - 60);
  if (PLAYER.selectedSlot < PLAYER.inventory.length) { const slot = PLAYER.inventory[PLAYER.selectedSlot]; ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText(`选中: ${ITEMS[slot.id]?.icon || ''} ${ITEMS[slot.id]?.name || slot.id} x${TEST_MODE ? '∞' : slot.count}`, W / 2, invY - 10); }
  if (STATE.drivingRaft) { ctx.fillStyle = '#0f0'; ctx.font = 'bold 14px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('🕹️ 驾驶模式 - WASD移动木筏 | T/ESC离开', W / 2, invY - 25); }
  // 右下角地图按钮
  const mapBtnX = W - 55, mapBtnY = H - 100;
  const mapHover = STATE.MOUSE.x >= mapBtnX && STATE.MOUSE.x <= mapBtnX + 42 && STATE.MOUSE.y >= mapBtnY && STATE.MOUSE.y <= mapBtnY + 42;
  ctx.fillStyle = mapHover ? '#555' : '#333';
  ctx.fillRect(mapBtnX, mapBtnY, 42, 42);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(mapBtnX, mapBtnY, 42, 42);
  ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.fillText('🗺️', mapBtnX + 21, mapBtnY + 30);
  ctx.fillStyle = '#fff'; ctx.font = '9px "Microsoft YaHei"'; ctx.fillText('M', mapBtnX + 21, mapBtnY + 10);
  STATE._mapButton = { x: mapBtnX, y: mapBtnY, w: 42, h: 42 };
  // 拖拽幽灵图标
  if (STATE.dragGhost) {
    const dg = STATE.dragGhost;
    ctx.globalAlpha = 0.7;
    const item = ITEMS[dg.item?.id];
    ctx.fillStyle = '#888'; ctx.fillRect(STATE.MOUSE.x - 18, STATE.MOUSE.y - 18, 36, 36);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(STATE.MOUSE.x - 18, STATE.MOUSE.y - 18, 36, 36);
    if (item) {
      const tc = { raw: 'rgba(139,90,43,0.4)', processed: 'rgba(100,100,150,0.4)', food: 'rgba(200,100,50,0.4)', weapon: 'rgba(200,50,50,0.4)', armor: 'rgba(50,50,200,0.4)', building: 'rgba(50,150,50,0.4)', tool: 'rgba(100,150,150,0.3)', consumable: 'rgba(150,100,150,0.3)', special: 'rgba(200,200,50,0.3)' };
      ctx.fillStyle = tc[item.type] || 'rgba(100,100,100,0.3)';
      ctx.fillRect(STATE.MOUSE.x - 16, STATE.MOUSE.y - 16, 32, 32);
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(item.icon, STATE.MOUSE.x, STATE.MOUSE.y + 6);
      ctx.font = 'bold 10px "Microsoft YaHei"';
      ctx.fillText(TEST_MODE ? '∞' : dg.item.count, STATE.MOUSE.x + 8, STATE.MOUSE.y + 12);
    }
    ctx.globalAlpha = 1;
  }
}

// ==================== UI绘制 ====================
function drawBackpack() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H);
  const bx = W / 2 - 210, by = H / 2 - 200, bw = 420, bh = 400;
  ctx.fillStyle = '#c6c6c6'; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = '#8b8b8b'; ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6); ctx.fillStyle = '#373737'; ctx.fillRect(bx + 5, by + 5, bw - 10, bh - 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('📦 背包 (按B关闭)' + (TEST_MODE ? ' 🧪测试模式' : ''), W / 2, by + 25);
  const cols = 9, rows = 4, cellSize = 40, gap = 3, gridStartX = bx + 15, gridStartY = by + 40;
  STATE._backpackSlots = [];
  for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { const i = r * cols + c; const cx = gridStartX + c * (cellSize + gap), cy = gridStartY + r * (cellSize + gap); const slot = i < PLAYER.inventory.length ? PLAYER.inventory[i] : null; ctx.fillStyle = i === PLAYER.selectedSlot ? '#ff8' : '#8b8b8b'; ctx.fillRect(cx, cy, cellSize, cellSize); ctx.strokeStyle = i === PLAYER.selectedSlot ? '#fff' : '#555'; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, cellSize, cellSize); if (slot) { const item = ITEMS[slot.id]; if (item) { const tc = { raw: 'rgba(139,90,43,0.4)', processed: 'rgba(100,100,150,0.4)', food: 'rgba(200,100,50,0.4)', weapon: 'rgba(200,50,50,0.4)', armor: 'rgba(50,50,200,0.4)', building: 'rgba(50,150,50,0.4)', tool: 'rgba(100,150,150,0.3)', consumable: 'rgba(150,100,150,0.3)', special: 'rgba(200,200,50,0.3)' }; ctx.fillStyle = tc[item.type] || 'rgba(100,100,100,0.3)'; ctx.fillRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4); } ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(item?.icon || '❓', cx + cellSize / 2, cy + 26); ctx.font = 'bold 10px "Microsoft YaHei"'; ctx.fillText(TEST_MODE ? '∞' : slot.count, cx + cellSize - 8, cy + cellSize - 6); } STATE._backpackSlots.push({ x: cx, y: cy, w: cellSize, h: cellSize, index: i }); } }
  const eqX = bx + 15, eqY = gridStartY + rows * (cellSize + gap) + 15;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Microsoft YaHei"'; ctx.textAlign = 'left'; ctx.fillText('装备：', eqX, eqY + 15);
  const eqs = [{ l: '武器', v: PLAYER.weaponEquipped ? ITEMS[PLAYER.weaponEquipped]?.icon + ' ' + ITEMS[PLAYER.weaponEquipped]?.name : '空手' }, { l: '头盔', v: PLAYER.helmetEquipped ? '🪖 头盔' : '无' }, { l: '胸甲', v: PLAYER.chestEquipped ? '🛡️ 胸甲' : '无' }, { l: '钩爪', v: PLAYER.hookRange + 'px' }];
  for (let i = 0; i < eqs.length; i++) ctx.fillText(`${eqs[i].l}: ${eqs[i].v}`, eqX + i * 100, eqY + 35);
  ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('点击选中 | 双击使用 | 右键出售 | 拖拽交换 | B关闭 | 🟤原料 🔵加工 🟠食物 🔴武器 🔵防具 🟢建筑', W / 2, by + bh - 15);
}

// ==================== 地图系统 ====================
function drawMap() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  const mx = W / 2, my = H / 2, mw = 550, mh = 500;
  const mapX = mx - mw / 2, mapY = my - mh / 2;

  // 地图背景
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(mapX, mapY, mw, mh);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.strokeRect(mapX, mapY, mw, mh);

  // 标题
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('🗺️ 世界地图', mx, mapY + 35);

  // 地图参数：以玩家为中心，每个探索格子=200px，地图显示范围约4000px
  const cellWorldSize = 200;
  const mapViewRange = 2500; // 地图显示半径
  const mapScale = mw / (mapViewRange * 2); // px in world per px on map

  const centerWX = PLAYER.x, centerWY = PLAYER.y;

  // 绘制已探索区域
  for (const key of STATE.exploredCells) {
    const [gx, gy] = key.split(',').map(Number);
    const wx = gx * cellWorldSize + cellWorldSize / 2;
    const wy = gy * cellWorldSize + cellWorldSize / 2;
    const sx = mx + (wx - centerWX) * mapScale;
    const sy = my + (wy - centerWY) * mapScale;
    const cellSize = cellWorldSize * mapScale;
    if (sx > mapX - cellSize && sx < mapX + mw + cellSize && sy > mapY - cellSize && sy < mapY + mh + cellSize) {
      ctx.fillStyle = '#2a4a3a';
      ctx.fillRect(sx - cellSize / 2, sy - cellSize / 2, cellSize, cellSize);
    }
  }

  // 绘制未探索区域覆盖（所有非已探索区域显示黑色和"未探索"）
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  for (let gx = Math.floor((centerWX - mapViewRange) / cellWorldSize) - 1; gx <= Math.ceil((centerWX + mapViewRange) / cellWorldSize) + 1; gx++) {
    for (let gy = Math.floor((centerWY - mapViewRange) / cellWorldSize) - 1; gy <= Math.ceil((centerWY + mapViewRange) / cellWorldSize) + 1; gy++) {
      if (STATE.exploredCells.has(`${gx},${gy}`)) continue;
      const wx = gx * cellWorldSize + cellWorldSize / 2;
      const wy = gy * cellWorldSize + cellWorldSize / 2;
      const sx = mx + (wx - centerWX) * mapScale;
      const sy = my + (wy - centerWY) * mapScale;
      const cellSize = cellWorldSize * mapScale;
      if (sx > mapX - cellSize && sx < mapX + mw + cellSize && sy > mapY - cellSize && sy < mapY + mh + cellSize) {
        ctx.fillStyle = '#000';
        ctx.fillRect(sx - cellSize / 2, sy - cellSize / 2, cellSize, cellSize);
      }
    }
  }
  // 在几个未探索大区域上写"未探索"
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = 'bold 22px "Microsoft YaHei"'; ctx.textAlign = 'center';
  const unexploredLabels = [
    { x: mx - 140, y: my - 120 }, { x: mx + 160, y: my - 80 },
    { x: mx - 120, y: my + 140 }, { x: mx + 150, y: my + 100 }
  ];
  for (const lbl of unexploredLabels) {
    let isExplored = false;
    const wwx = centerWX + (lbl.x - mx) / mapScale;
    const wwy = centerWY + (lbl.y - my) / mapScale;
    const cgx = Math.floor(wwx / cellWorldSize);
    const cgy = Math.floor(wwy / cellWorldSize);
    if (!STATE.exploredCells.has(`${cgx},${cgy}`)) {
      ctx.fillText('未探索', lbl.x, lbl.y);
    }
  }

  // 绘制网格线
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
  const gridStep = 400 * mapScale;
  const offsetX = (centerWX % 400) * mapScale;
  const offsetY = (centerWY % 400) * mapScale;
  for (let x = mapX + (offsetX % gridStep); x < mapX + mw; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, mapY); ctx.lineTo(x, mapY + mh); ctx.stroke();
  }
  for (let y = mapY + (offsetY % gridStep); y < mapY + mh; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(mapX, y); ctx.lineTo(mapX + mw, y); ctx.stroke();
  }

  // 绘制结构标记
  for (const s of STRUCTURES) {
    const sx = mx + (s.wx - centerWX) * mapScale;
    const sy = my + (s.wy - centerWY) * mapScale;
    if (sx > mapX - 15 && sx < mapX + mw + 15 && sy > mapY - 15 && sy < mapY + mh + 15) {
      const scgx = Math.floor(s.wx / cellWorldSize);
      const scgy = Math.floor(s.wy / cellWorldSize);
      if (STATE.exploredCells.has(`${scgx},${scgy}`)) {
        // 结构图标
        ctx.font = '16px serif'; ctx.textAlign = 'center';
        ctx.fillText(s.icon, sx, sy);
        // 名称
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Microsoft YaHei"';
        ctx.fillText(s.name, sx, sy - 12);
        // 危险等级
        if (s.boss && !s.bossDefeated) {
          ctx.fillStyle = '#f44'; ctx.font = 'bold 8px "Microsoft YaHei"';
          ctx.fillText('💀', sx, sy + 12);
        }
        if (s.looted) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx - 8, sy - 4, 16, 8);
          ctx.fillStyle = '#888'; ctx.font = '7px "Microsoft YaHei"'; ctx.fillText('已搜', sx, sy + 3);
        }
      }
    }
  }

  // 绘制漂浮物（在已探索区域内）
  for (const fi of FLOATING_ITEMS) {
    const sx = mx + (fi.x - centerWX) * mapScale;
    const sy = my + (fi.y - centerWY) * mapScale;
    if (sx > mapX - 10 && sx < mapX + mw + 10 && sy > mapY - 10 && sy < mapY + mh + 10) {
      const fcgx = Math.floor(fi.x / cellWorldSize);
      const fcgy = Math.floor(fi.y / cellWorldSize);
      if (STATE.exploredCells.has(`${fcgx},${fcgy}`)) {
        const ft = FLOAT_TYPES[fi.id];
        ctx.font = '10px serif'; ctx.textAlign = 'center';
        ctx.fillText(ft?.icon || '📦', sx, sy);
      }
    }
  }

  // 绘制鲨鱼（在已探索区域内）
  for (const sh of SHARKS) {
    const sx = mx + (sh.x - centerWX) * mapScale;
    const sy = my + (sh.y - centerWY) * mapScale;
    if (sx > mapX - 12 && sx < mapX + mw + 12 && sy > mapY - 12 && sy < mapY + mh + 12) {
      const scgx = Math.floor(sh.x / cellWorldSize);
      const scgy = Math.floor(sh.y / cellWorldSize);
      if (STATE.exploredCells.has(`${scgx},${scgy}`)) {
        ctx.font = '14px serif'; ctx.textAlign = 'center';
        ctx.fillText('🦈', sx, sy);
        // 小血条
        ctx.fillStyle = '#333'; ctx.fillRect(sx - 6, sy - 10, 12, 2);
        ctx.fillStyle = '#f44'; ctx.fillRect(sx - 6, sy - 10, 12 * (sh.hp / sh.maxHp), 2);
      }
    }
  }

  // 绘制怪物（在已探索区域内）
  for (const m of MONSTERS) {
    const sx = mx + (m.x - centerWX) * mapScale;
    const sy = my + (m.y - centerWY) * mapScale;
    if (sx > mapX - 12 && sx < mapX + mw + 12 && sy > mapY - 12 && sy < mapY + mh + 12) {
      const mcgx = Math.floor(m.x / cellWorldSize);
      const mcgy = Math.floor(m.y / cellWorldSize);
      if (STATE.exploredCells.has(`${mcgx},${mcgy}`)) {
        ctx.font = '12px serif'; ctx.textAlign = 'center';
        ctx.fillText(m.def.icon, sx, sy);
        ctx.fillStyle = '#333'; ctx.fillRect(sx - 6, sy - 10, 12, 2);
        ctx.fillStyle = '#f80'; ctx.fillRect(sx - 6, sy - 10, 12 * (m.hp / m.maxHp), 2);
      }
    }
  }

  // 绘制玩家位置（闪烁圆点）
  const playerMapX = mx + (PLAYER.x - centerWX) * mapScale;
  const playerMapY = my + (PLAYER.y - centerWY) * mapScale;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
  ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(playerMapX, playerMapY, 6 + pulse * 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(playerMapX, playerMapY, 6 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('📍 你在这里', playerMapX, playerMapY - 14);

  // 显示玩家精确坐标
  ctx.fillStyle = '#0f0'; ctx.font = 'bold 11px "Microsoft YaHei"';
  ctx.fillText(`(${Math.round(PLAYER.x)}, ${Math.round(PLAYER.y)})`, playerMapX, playerMapY + 22);

  // 绘制宝藏标记（如果远古地图已激活）
  if (STATE.treasureMapActive) {
    const treasureMapX = mx + (STATE.treasureX - centerWX) * mapScale;
    const treasureMapY = my + (STATE.treasureY - centerWY) * mapScale;
    if (treasureMapX > mapX && treasureMapX < mapX + mw && treasureMapY > mapY && treasureMapY < mapY + mh) {
      const tpulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008 + 1);
      ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(treasureMapX, treasureMapY, 8 + tpulse * 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fa0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(treasureMapX, treasureMapY, 8 + tpulse * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff0'; ctx.font = 'bold 11px "Microsoft YaHei"';
      ctx.fillText('💎宝藏', treasureMapX, treasureMapY - 16);
      // 距离显示
      const tdist = Math.sqrt((PLAYER.x - STATE.treasureX) ** 2 + (PLAYER.y - STATE.treasureY) ** 2);
      ctx.fillStyle = '#ff0'; ctx.font = '9px "Microsoft YaHei"';
      ctx.fillText(`${Math.round(tdist / 20)}米`, treasureMapX, treasureMapY + 20);
    }
  }

  // 坐标显示
  ctx.fillStyle = '#ccc'; ctx.font = '12px "Microsoft YaHei"'; ctx.textAlign = 'right';
  ctx.fillText(`坐标: (${Math.round(PLAYER.x)}, ${Math.round(PLAYER.y)}) | 已探索: ${STATE.exploredCells.size} 区域`, mx + mw / 2 - 15, mapY + mh - 15);

  // 图例
  ctx.fillStyle = '#aaa'; ctx.font = '11px "Microsoft YaHei"'; ctx.textAlign = 'left';
  ctx.fillText('🟢 已探索 | ⬛ 未探索 | 📍 玩家 | 🏠 结构 | 📦 漂浮物 | 🦈 鲨鱼 | 👻 怪物' + (STATE.treasureMapActive ? ' | 💎宝藏' : ''), mapX + 15, mapY + mh - 15);

  // 生存模式显示大陆方向
  if (STATE.gameMode === 'survival' && !STATE.gameWon) {
    const contMapX = mx + (STATE.mainlandX - centerWX) * mapScale;
    const contMapY = my + (STATE.mainlandY - centerWY) * mapScale;
    if (contMapX >= mapX && contMapX <= mapX + mw && contMapY >= mapY && contMapY <= mapY + mh) {
      ctx.font = '28px serif'; ctx.textAlign = 'center';
      ctx.fillText('🌍', contMapX, contMapY);
      ctx.fillStyle = '#4a4'; ctx.font = 'bold 12px "Microsoft YaHei"';
      ctx.fillText('大陆', contMapX, contMapY - 12);
      ctx.font = '9px "Microsoft YaHei"'; ctx.fillStyle = '#8f8';
      ctx.fillText(`${Math.round(Math.sqrt((PLAYER.x - STATE.mainlandX) ** 2 + (PLAYER.y - STATE.mainlandY) ** 2) / 20)}米`, contMapX, contMapY + 15);
    } else {
      // 大陆不在当前视野内，显示方向箭头
      const ang = Math.atan2(STATE.mainlandY - PLAYER.y, STATE.mainlandX - PLAYER.x);
      const arrX = mx + Math.cos(ang) * (mw / 2 - 30);
      const arrY = my + Math.sin(ang) * (mh / 2 - 30);
      ctx.fillStyle = '#4a4'; ctx.font = 'bold 14px "Microsoft YaHei"';
      ctx.fillText(`🌍 大陆在${ang >= 0 ? '东南' : '西北'}方向`, mx, my + mh - 35);
      ctx.font = '16px serif';
      ctx.fillText(ang > 0 ? '↓' : '↑', mx + Math.cos(ang) * 40, my + Math.sin(ang) * 40);
    }
  }

  ctx.fillStyle = '#aaa'; ctx.font = '13px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('按M或ESC关闭地图', mx, mapY + mh + 30);
}


function drawCompanionUI() {
  if (!STATE.companionOpen) return;
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2 - 250, cy = H / 2 - 200, cw = 500, ch = 400;
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeStyle = '#8cf'; ctx.lineWidth = 3; ctx.strokeRect(cx, cy, cw, ch);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('👥 伙伴管理（按Y关闭）', W / 2, cy + 35);

  if (STATE.companions.length === 0) {
    ctx.fillStyle = '#888'; ctx.font = '16px "Microsoft YaHei"';
    ctx.fillText('还没有伙伴。去结构里找找友好的NPC吧！', W / 2, cy + 120);
    ctx.fillText('💡 捡到漂流瓶后，找到对应的NPC可以收编他们', W / 2, cy + 150);
  } else {
    STATE._companionButtons = [];
    for (let i = 0; i < STATE.companions.length; i++) {
      const c = STATE.companions[i];
      const cy2 = cy + 75 + i * 95;
      ctx.fillStyle = '#334'; ctx.fillRect(cx + 20, cy2, cw - 40, 80);
      ctx.strokeStyle = '#558'; ctx.lineWidth = 1.5; ctx.strokeRect(cx + 20, cy2, cw - 40, 80);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei"'; ctx.textAlign = 'left';
      ctx.fillText(`🧑 ${c.name}`, cx + 35, cy2 + 22);
      ctx.font = '12px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
      ctx.fillText(c.task ? `任务中: ${c.task} (${Math.ceil(c.taskTimer / 60)}秒)` : '空闲中 - 点击派发任务', cx + 35, cy2 + 42);

      // 任务按钮
      const tasks = [
        { id: 'gather_wood', name: '收集木材', icon: '🪵', time: 300, desc: '收集10个木材' },
        { id: 'gather_scrap', name: '收集废铁', icon: '🔩', time: 360, desc: '收集8个废铁' },
        { id: 'fish', name: '钓鱼', icon: '🎣', time: 240, desc: '钓5条鱼' },
        { id: 'gather_fiber', name: '收集纤维', icon: '🌿', time: 200, desc: '收集8个纤维' },
      ];
      STATE._companionButtons = STATE._companionButtons || [];
      for (let j = 0; j < tasks.length; j++) {
        const t = tasks[j];
        const tx = cx + 35 + j * 108, ty = cy2 + 50;
        const hover = STATE.MOUSE.x >= tx && STATE.MOUSE.x <= tx + 100 && STATE.MOUSE.y >= ty && STATE.MOUSE.y <= ty + 24;
        ctx.fillStyle = hover ? '#3a5' : '#243';
        ctx.fillRect(tx, ty, 100, 24);
        ctx.strokeStyle = hover ? '#5a5' : '#465'; ctx.lineWidth = 1; ctx.strokeRect(tx, ty, 100, 24);
        ctx.fillStyle = '#fff'; ctx.font = '10px "Microsoft YaHei"'; ctx.textAlign = 'center';
        ctx.fillText(`${t.icon} ${t.name}`, tx + 50, ty + 16);
        STATE._companionButtons.push({ x: tx, y: ty, w: 100, h: 24, companionIndex: i, task: t });
      }
    }
  }
  ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('点击任务派发给伙伴 | 伙伴完成任务后自动收集物资', W / 2, cy + ch - 10);
}

function drawFurnaceUI() { if (!STATE.furnaceOpen) return; const fd = FURNACE_DATA[STATE.furnaceOpen.key]; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H); const fx = W / 2 - 180, fy = H / 2 - 160, fw = 360, fh = 320; ctx.fillStyle = '#444'; ctx.fillRect(fx, fy, fw, fh); ctx.strokeStyle = '#f84'; ctx.lineWidth = 3; ctx.strokeRect(fx, fy, fw, fh); ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('🔥 熔炉', W / 2, fy + 35); ctx.fillStyle = '#fff'; ctx.font = '14px "Microsoft YaHei"'; ctx.textAlign = 'left'; ctx.fillText(`燃料: ${fd.fuel}`, fx + 30, fy + 70); ctx.fillStyle = '#333'; ctx.fillRect(fx + 30, fy + 78, 300, 16); ctx.fillStyle = '#f84'; ctx.fillRect(fx + 30, fy + 78, Math.min(300, fd.fuel * 5), 16); if (fd.smelting) { ctx.fillText(`烧制中: ${ITEMS[fd.smelting]?.name || fd.smelting}`, fx + 30, fy + 115); ctx.fillStyle = '#333'; ctx.fillRect(fx + 30, fy + 123, 300, 16); ctx.fillStyle = '#fc0'; ctx.fillRect(fx + 30, fy + 123, 300 * (fd.progress / fd.maxProgress), 16); ctx.fillStyle = '#fff'; ctx.font = '11px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText(`${Math.floor(fd.progress / fd.maxProgress * 100)}%`, W / 2, fy + 135); } else { ctx.fillStyle = '#888'; ctx.fillText('空闲中', fx + 30, fy + 115); } ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Microsoft YaHei"'; ctx.textAlign = 'left'; ctx.fillText('可烧制：', fx + 30, fy + 160); const sr = RECIPES.filter(r => r.craftAt === 'furnace'); STATE._furnaceButtons = []; for (let i = 0; i < sr.length; i++) { const r = sr[i]; const sx = fx + 30 + (i % 3) * 105, sy = fy + 180 + Math.floor(i / 3) * 45; const can = canCraft(r) && fd.fuel > 0; ctx.fillStyle = can ? '#352' : '#533'; ctx.fillRect(sx, sy, 95, 35); ctx.strokeStyle = can ? '#5a5' : '#855'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, 95, 35); ctx.fillStyle = '#fff'; ctx.font = '11px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText(`${r.icon} ${r.name}`, sx + 48, sy + 14); ctx.fillText(`需${r.smeltTime || 5}秒`, sx + 48, sy + 28); STATE._furnaceButtons.push({ x: sx, y: sy, w: 95, h: 35, recipe: r }); } const afx = fx + 30, afy = fy + 260; ctx.fillStyle = '#f84'; ctx.fillRect(afx, afy, 120, 30); ctx.fillStyle = '#fff'; ctx.font = '13px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('添加燃料', afx + 60, afy + 20); STATE._furnaceFuelBtn = { x: afx, y: afy, w: 120, h: 30 }; ctx.fillStyle = '#a44'; ctx.fillRect(afx + 140, afy, 80, 30); ctx.fillText('关闭', afx + 180, afy + 20); STATE._furnaceCloseBtn = { x: afx + 140, y: afy, w: 80, h: 30 }; }

function drawMarketUI() {
  if (!STATE.marketOpen) return;
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  const mx = W / 2 - 310, my = H / 2 - 240, mw = 620, mh = 480;
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#fa0'; ctx.lineWidth = 3; ctx.strokeRect(mx, my, mw, mh);

  // 标题
  ctx.fillStyle = '#fa0'; ctx.font = 'bold 28px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('🏪 漂流市场', W / 2, my + 40);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Microsoft YaHei"';
  ctx.fillText(`🪙 金币: ${PLAYER.gold}`, W / 2, my + 65);
  ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"';
  ctx.fillText('市场出售稀有物品，不可通过普通合成获取 | 按K或点击按钮关闭', W / 2, my + 85);

  // 物品列表 - 4列网格
  const cols = 4, rows = 3;
  const cellW = 130, cellH = 105, gap = 8;
  const gridStartX = mx + (mw - (cols * (cellW + gap) - gap)) / 2;
  const gridStartY = my + 100;

  STATE._marketButtons = [];
  for (let i = 0; i < MARKET_ITEMS.length; i++) {
    const mi = MARKET_ITEMS[i];
    const col = i % cols, row = Math.floor(i / cols);
    const cx = gridStartX + col * (cellW + gap);
    const cy = gridStartY + row * (cellH + gap);

    const canAfford = PLAYER.gold >= mi.cost;
    const hover = STATE.MOUSE.x >= cx && STATE.MOUSE.x <= cx + cellW && STATE.MOUSE.y >= cy && STATE.MOUSE.y <= cy + cellH;

    // 背景
    ctx.fillStyle = hover ? (canAfford ? '#3a5' : '#633') : (canAfford ? '#243' : '#422');
    ctx.fillRect(cx, cy, cellW, cellH);
    ctx.strokeStyle = hover ? '#fff' : (canAfford ? '#5a5' : '#855');
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.strokeRect(cx, cy, cellW, cellH);

    // 图标
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(mi.icon, cx + cellW / 2, cy + 32);

    // 名称
    ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.fillStyle = '#fff';
    ctx.fillText(mi.name, cx + cellW / 2, cy + 52);

    // 描述
    ctx.font = '9px "Microsoft YaHei"'; ctx.fillStyle = '#aaa';
    ctx.fillText(mi.desc, cx + cellW / 2, cy + 68);

    // 价格
    ctx.font = 'bold 11px "Microsoft YaHei"'; ctx.fillStyle = canAfford ? '#ff0' : '#f44';
    ctx.fillText(`🪙${mi.cost}`, cx + cellW / 2, cy + 86);

    // 数量
    ctx.fillStyle = '#ccc'; ctx.font = '9px "Microsoft YaHei"';
    ctx.fillText(`x${mi.count}`, cx + cellW - 18, cy + 14);

    STATE._marketButtons.push({ x: cx, y: cy, w: cellW, h: cellH, item: mi });
  }

  // 底部提示
  ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"';
  ctx.textAlign = 'center';
  ctx.fillText('绿色=可购买 | 红色=金币不足 | 点击购买 | 市场物品会不定期刷新', W / 2, my + mh - 15);
}

function drawStructureUI() {
  if (!STATE.inStructure) return;
  const s = STATE.inStructure;
  const roomX = W / 2 - 300, roomY = H / 2 - 220, roomW = 600, roomH = 440;
  const px = STATE.structPlayerX, py = STATE.structPlayerY;

  ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0, 0, W, H);

  // 内部房间背景（地板）
  ctx.fillStyle = s.color; ctx.fillRect(roomX, roomY, roomW, roomH);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(roomX, roomY, roomW, roomH);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(roomX, roomY, roomW, roomH);

  // 地板纹理
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let gx = roomX + 40; gx < roomX + roomW; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, roomY); ctx.lineTo(gx, roomY + roomH); ctx.stroke(); }
  for (let gy = roomY + 40; gy < roomY + roomH; gy += 40) { ctx.beginPath(); ctx.moveTo(roomX, gy); ctx.lineTo(roomX + roomW, gy); ctx.stroke(); }

  // 标题
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText(`${s.icon} ${s.name} 内部`, W / 2, roomY - 12);

  // 地面散落物资
  STATE._structGroundBtns = [];
  for (const gi of STATE.structGroundItems) {
    const gx = roomX + gi.x, gy = roomY + gi.y;
    const item = ITEMS[gi.id];
    const hover = STATE.MOUSE.x >= gx - 12 && STATE.MOUSE.x <= gx + 12 && STATE.MOUSE.y >= gy - 12 && STATE.MOUSE.y <= gy + 12;
    ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText(item?.icon || '📦', gx, gy);
    if (hover) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Microsoft YaHei"';
      ctx.fillText(`${item?.name}x${gi.count}`, gx, gy - 12);
      ctx.strokeStyle = '#ff0'; ctx.lineWidth = 1; ctx.strokeRect(gx - 12, gy - 12, 24, 24);
    }
    STATE._structGroundBtns.push({ x: gx - 14, y: gy - 14, w: 28, h: 28, item: gi });
  }

  // 散落宝箱
  STATE._structureChestBtns = [];
  for (const chest of STATE.structureChests) {
    const cx = roomX + chest.x, cy = roomY + chest.y;
    if (chest.opened) {
      ctx.fillStyle = '#555'; ctx.fillRect(cx - 18, cy - 14, 36, 28);
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('📭', cx, cy + 6);
    } else {
      const hover = STATE.MOUSE.x >= cx - 18 && STATE.MOUSE.x <= cx + 18 && STATE.MOUSE.y >= cy - 14 && STATE.MOUSE.y <= cy + 14;
      const distToPlayer = Math.sqrt((px - chest.x) ** 2 + (py - chest.y) ** 2);
      // 上锁宝箱用金色
      if (chest.locked) {
        ctx.fillStyle = hover ? '#da0' : '#b80';
        ctx.fillRect(cx - 18, cy - 14, 36, 28);
        ctx.strokeStyle = '#fa0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 18, cy - 14, 36, 28);
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('🔒', cx, cy + 7);
        if (distToPlayer < 50) {
          ctx.fillStyle = '#ff0'; ctx.font = 'bold 10px "Microsoft YaHei"';
          ctx.fillText('🔑需要钥匙', cx, cy - 18);
        }
      } else {
        ctx.fillStyle = hover ? '#c84' : '#a64';
        ctx.fillRect(cx - 18, cy - 14, 36, 28);
        ctx.strokeStyle = hover ? '#ff0' : '#fff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 18, cy - 14, 36, 28);
        ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('📦', cx, cy + 6);
        if (distToPlayer < 50) {
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Microsoft YaHei"';
          ctx.fillText('按E打开', cx, cy - 18);
        }
      }
      STATE._structureChestBtns.push({ x: cx - 18, y: cy - 14, w: 36, h: 28, chestIndex: chest.index, worldX: chest.x, worldY: chest.y });
    }
  }

  // NPC
  STATE._structNPCBtns = [];
  for (const npc of STATE.structNPCs) {
    const nx = roomX + npc.x, ny = roomY + npc.y;
    const distToPlayer = Math.sqrt((px - npc.x) ** 2 + (py - npc.y) ** 2);
    const hover = STATE.MOUSE.x >= nx - 14 && STATE.MOUSE.x <= nx + 14 && STATE.MOUSE.y >= ny - 14 && STATE.MOUSE.y <= ny + 14;
    const npcColors = { friendly: '#4c4', neutral: '#cc4', hostile: '#c44' };
    ctx.fillStyle = npcColors[npc.type] || '#888';
    ctx.beginPath(); ctx.arc(nx, ny, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '16px serif'; ctx.textAlign = 'center';
    ctx.fillText(npc.type === 'hostile' ? '👤' : '🧑', nx, ny + 6);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Microsoft YaHei"'; ctx.fillText(npc.name, nx, ny - 16);
    const typeLabel = npc.type === 'friendly' ? '友善' : npc.type === 'neutral' ? '中立' : '敌对';
    ctx.fillStyle = npcColors[npc.type]; ctx.font = '8px "Microsoft YaHei"'; ctx.fillText(typeLabel, nx, ny + 22);
    if (npc.hp < npc.maxHp) {
      ctx.fillStyle = '#333'; ctx.fillRect(nx - 10, ny - 10, 20, 3);
      ctx.fillStyle = '#f44'; ctx.fillRect(nx - 10, ny - 10, 20 * (npc.hp / npc.maxHp), 3);
    }
    if (distToPlayer < 55) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Microsoft YaHei"';
      ctx.fillText(npc.type === 'hostile' ? '按左键攻击' : '按E对话', nx, ny - 28);
    }
    STATE._structNPCBtns.push({ x: nx - 14, y: ny - 14, w: 28, h: 28, npc: npc, worldX: npc.x, worldY: npc.y });
  }

  // 玩家（在结构内部）
  const playerScreenX = roomX + px, playerScreenY = roomY + py;
  ctx.fillStyle = '#fdb'; ctx.beginPath(); ctx.arc(playerScreenX, playerScreenY - 3, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(playerScreenX - 5, playerScreenY, 10, 10);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(playerScreenX - 2, playerScreenY - 5, 1, 0, Math.PI * 2); ctx.arc(playerScreenX + 2, playerScreenY - 5, 1, 0, Math.PI * 2); ctx.fill();
  if (PLAYER.weaponEquipped === 'sword') { ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(playerScreenX + 10, playerScreenY - 3); ctx.lineTo(playerScreenX + 20, playerScreenY - 12); ctx.stroke(); }
  else if (PLAYER.weaponEquipped === 'spear') { ctx.strokeStyle = '#963'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(playerScreenX + 10, playerScreenY); ctx.lineTo(playerScreenX + 18, playerScreenY - 10); ctx.stroke(); }

  // NPC对话界面 - 打字效果 + 键盘回复
  if (STATE.structChatNPC) {
    const cnpc = STATE.structChatNPC;
    // 逐字显示计时
    STATE.structChatTimer++;
    const dialogue = cnpc.dialogue[STATE.structChatIndex % cnpc.dialogue.length];
    const charsPerTick = 2; // 每帧显示2个字（慢速打字效果）
    const visibleChars = Math.min(dialogue.length, Math.floor(STATE.structChatTimer * charsPerTick / 1));
    const typedText = dialogue.substring(0, visibleChars);
    const isTypingDone = visibleChars >= dialogue.length;

    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, H - 185, W, 185);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.fillText(`💬 ${cnpc.name} (${cnpc.type==='friendly'?'友善':cnpc.type==='neutral'?'中立':'敌对'})`, W / 2, H - 160);
    
    // 打字效果的对话文字
    ctx.fillStyle = '#ff0'; ctx.font = '15px "Microsoft YaHei"';
    ctx.fillText(`"${typedText}${!isTypingDone ? '▌' : ''}"`, W / 2, H - 135);

    // 回复选项（打字完成后显示）
    if (isTypingDone) {
      ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"';
      ctx.fillText('按数字键回复：', W / 2, H - 112);
      
      STATE._chatReplyOptions = [];
      const replies = [
        { key: '1', text: '好的，谢谢！', action: 'friendly' },
        { key: '2', text: '你有什么可以交易的？', action: 'trade' },
        { key: '3', text: '再见，我要走了。', action: 'bye' },
      ];
      
      for (let i = 0; i < replies.length; i++) {
        const r = replies[i];
        const rx = W / 2 - 210 + i * 150, ry = H - 95;
        const hover = STATE.MOUSE.x >= rx && STATE.MOUSE.x <= rx + 130 && STATE.MOUSE.y >= ry && STATE.MOUSE.y <= ry + 30;
        ctx.fillStyle = hover ? '#3a5' : '#243';
        ctx.fillRect(rx, ry, 130, 30);
        ctx.strokeStyle = hover ? '#5a5' : '#465'; ctx.lineWidth = 1.5; ctx.strokeRect(rx, ry, 130, 30);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Microsoft YaHei"';
        ctx.fillText(`[${r.key}] ${r.text}`, rx + 65, ry + 20);
        STATE._chatReplyOptions.push({ x: rx, y: ry, w: 130, h: 30, ...r });
      }
      
      // 如果NPC是友善或中立，且有交易物品，显示可交易
      if (cnpc.type !== 'hostile' && cnpc.tradeItems) {
        ctx.fillStyle = '#ff0'; ctx.font = 'bold 12px "Microsoft YaHei"';
        ctx.fillText('🛒 NPC交易物品:', W / 2, H - 62);
        STATE._tradeButtons = [];
        for (let i = 0; i < cnpc.tradeItems.length; i++) {
          const ti = cnpc.tradeItems[i];
          const tx = W / 2 - 120 + i * 100, ty = H - 45;
          const canBuy = PLAYER.gold >= ti.cost;
          ctx.fillStyle = canBuy ? '#352' : '#533'; ctx.fillRect(tx, ty, 85, 35);
          ctx.strokeStyle = canBuy ? '#5a5' : '#855'; ctx.lineWidth = 1; ctx.strokeRect(tx, ty, 85, 35);
          ctx.fillStyle = '#fff'; ctx.font = '11px "Microsoft YaHei"'; ctx.textAlign = 'center';
          ctx.fillText(`${ITEMS[ti.id]?.icon || ''}${ITEMS[ti.id]?.name}x${ti.count}`, tx + 42, ty + 14);
          ctx.fillText(`🪙${ti.cost}`, tx + 42, ty + 28);
          STATE._tradeButtons.push({ x: tx, y: ty, w: 85, h: 35, trade: ti, npc: cnpc });
        }
      }
    }

    ctx.fillStyle = '#888'; ctx.font = '11px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.fillText('按E关闭对话 | 点击选项或按数字键回复', W / 2, H - 3);
  }

  // 提示
  ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('WASD移动 | E交互(宝箱/NPC) | 左键攻击NPC | 按E离开结构', W / 2, roomY + roomH + 18);
}

// ==================== 结构内部更新 ====================
function updateStructure() {
  if (STATE.SCENE !== 'structure' || !STATE.inStructure) return;
  const speed = 2;
  let mx = 0, my = 0;
  if (STATE.KEYS['w'] || STATE.KEYS['ArrowUp']) my = -1;
  if (STATE.KEYS['s'] || STATE.KEYS['ArrowDown']) my = 1;
  if (STATE.KEYS['a'] || STATE.KEYS['ArrowLeft']) mx = -1;
  if (STATE.KEYS['d'] || STATE.KEYS['ArrowRight']) mx = 1;
  if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707; }
  STATE.structPlayerX = Math.max(15, Math.min(585, STATE.structPlayerX + mx * speed));
  STATE.structPlayerY = Math.max(15, Math.min(425, STATE.structPlayerY + my * speed));
}

function structureInteract() {
  if (!STATE.inStructure) return;
  const px = STATE.structPlayerX, py = STATE.structPlayerY;

  // 如果正在对话，关闭对话
  if (STATE.structChatNPC) { STATE.structChatNPC = null; STATE.structChatTimer = 0; return; }

  // 检测靠近宝箱
  for (const chest of STATE.structureChests) {
    if (!chest.opened && Math.sqrt((px - chest.x) ** 2 + (py - chest.y) ** 2) < 45) {
      openStructureChest(chest.index);
      return;
    }
  }

  // 检测靠近地面物资
  for (let i = STATE.structGroundItems.length - 1; i >= 0; i--) {
    const gi = STATE.structGroundItems[i];
    if (Math.sqrt((px - gi.x) ** 2 + (py - gi.y) ** 2) < 35) {
      addItem(gi.id, gi.count);
      addMessage(`捡起 ${ITEMS[gi.id]?.name || gi.id} x${gi.count}`, '#ff0');
      playCollectSound();
      if (gi._ref) gi._ref.picked = true;
      STATE.structGroundItems.splice(i, 1);
      return;
    }
  }

  // 检测靠近NPC
  for (const npc of STATE.structNPCs) {
    if (Math.sqrt((px - npc.x) ** 2 + (py - npc.y) ** 2) < 50) {
      if (npc.type === 'hostile') {
        addMessage(`${npc.name}: 滚开！`, '#f44');
      } else {
        STATE.structChatNPC = npc;
      }
      return;
    }
  }
}

// 结构内攻击NPC
function attackStructureNPC() {
  if (!STATE.inStructure) return;
  const px = STATE.structPlayerX, py = STATE.structPlayerY;
  for (const npc of STATE.structNPCs) {
    if (Math.sqrt((px - npc.x) ** 2 + (py - npc.y) ** 2) < 40) {
      const dmg = PLAYER.weaponEquipped === 'sword' ? 20 : PLAYER.weaponEquipped === 'spear' ? 12 : 6;
      npc.hp -= dmg;
      playHitSound();
      addMessage(`攻击 ${npc.name}！造成 ${dmg} 伤害`, '#ff8');
      if (npc.type !== 'hostile') npc.type = 'hostile'; // 攻击后变敌对
      if (npc.hp <= 0) {
        addMessage(`${npc.name} 被击败了`, '#ff0');
        if (npc.tradeItems) {
          for (const ti of npc.tradeItems) addItem(ti.id, ti.count);
          addMessage('获得了NPC的物品！', '#ff0');
        }
        STATE.structNPCs = STATE.structNPCs.filter(n => n !== npc);
      }
      return;
    }
  }
}

// NPC对话回复处理
function handleChatReply(key) {
  if (!STATE.structChatNPC) return;
  const cnpc = STATE.structChatNPC;
  if (key === '1') {
    addMessage(`${cnpc.name}: 不客气，祝你好运！`, '#8f8');
    // 如果NPC是友好类型且有漂流瓶标记，尝试收编
    if (cnpc.type === 'friendly' && STATE.inStructure?.bottleNPC && !STATE.inStructure.bottleNPC.recruited) {
      STATE.inStructure.bottleNPC.recruited = true;
      STATE.companions.push({
        name: cnpc.name,
        type: 'companion',
        task: null,
        taskTimer: 0,
        taskResult: null,
        x: PLAYER.x, y: PLAYER.y
      });
      addMessage(`🎉 ${cnpc.name} 加入了你的队伍！`, '#ff0');
      addMessage('💡 你可以在伙伴面板中给他们派发任务（按Y键）', '#8cf');
    }
    STATE.structChatNPC = null;
    STATE.structChatTimer = 0;
  } else if (key === '2') {
    addMessage(`${cnpc.name}: 当然，看看我的货吧。`, '#ff0');
    STATE.structChatTimer = 999;
  } else if (key === '3') {
    addMessage(`${cnpc.name}: 再见，一路顺风！`, '#8af');
    STATE.structChatNPC = null;
    STATE.structChatTimer = 0;
  }
}

function drawPauseMenu() { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('游戏暂停', W / 2, H / 2 - 80); const btns = [{ text: '继续游戏', y: H / 2, action: 'resume' }, { text: '保存并退出', y: H / 2 + 60, action: 'save_quit' }]; STATE._pauseButtons = []; for (const btn of btns) { const bw = 300, bh = 45, bx = W / 2 - bw / 2, by = btn.y - bh / 2; const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh; ctx.fillStyle = hover ? '#4a8' : '#3a7'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh); ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Microsoft YaHei"'; ctx.fillText(btn.text, W / 2, btn.y + 7); btn._bounds = { x: bx, y: by, w: bw, h: bh }; STATE._pauseButtons.push(btn); } }
function drawCraftMenu() { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('🔧 制造台（按C关闭 | 滚轮滚动）' + (TEST_MODE ? ' 🧪' : ''), W / 2, 35); const craftable = RECIPES.filter(r => ['craft_table', 'hand', 'furnace'].includes(r.craftAt)); const cols = 5, cellW = 155, cellH = 85, gap = 8, startX = W / 2 - (cols * (cellW + gap)) / 2; const totalRows = Math.ceil(craftable.length / cols); const maxVisibleRows = 6; const rowHeight = cellH + gap; const maxScroll = Math.max(0, (totalRows - maxVisibleRows) * rowHeight); STATE.craftScrollOffset = Math.max(0, Math.min(STATE.craftScrollOffset, maxScroll)); const startY = 60 - STATE.craftScrollOffset; STATE._craftButtons = []; const clipTop = 55, clipBottom = H - 60; ctx.save(); ctx.beginPath(); ctx.rect(0, clipTop, W, clipBottom - clipTop); ctx.clip(); for (let i = 0; i < craftable.length; i++) { const r = craftable[i]; const col = i % cols, row = Math.floor(i / cols); const cx = startX + col * (cellW + gap), cy = startY + row * rowHeight; if (cy + cellH < clipTop || cy > clipBottom) continue; const can = canCraft(r); ctx.fillStyle = can ? '#252' : '#422'; ctx.fillRect(cx, cy, cellW, cellH); ctx.strokeStyle = can ? '#5a5' : '#855'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cellW, cellH); ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(r.icon, cx + cellW / 2, cy + 22); ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.fillText(r.name, cx + cellW / 2, cy + 42); ctx.font = '9px "Microsoft YaHei"'; ctx.fillStyle = '#ccc'; const ct = r.inputs.map(inp => `${ITEMS[inp.id]?.icon || inp.id}x${inp.count}`).join(' '); ctx.fillText(ct, cx + cellW / 2, cy + 56); ctx.fillText(`产出:${r.output} | ${r.craftAt === 'hand' ? '手工' : r.craftAt === 'craft_table' ? '制造台' : '熔炉'}`, cx + cellW / 2, cy + 70); STATE._craftButtons.push({ x: cx, y: cy, w: cellW, h: cellH, recipe: r }); } ctx.restore(); if (maxScroll > 0) { const sbX = W - 20, sbY = clipTop, sbH = clipBottom - clipTop; ctx.fillStyle = '#333'; ctx.fillRect(sbX, sbY, 8, sbH); const thumbH = Math.max(30, sbH * maxVisibleRows / totalRows); const thumbY = sbY + (sbH - thumbH) * STATE.craftScrollOffset / maxScroll; ctx.fillStyle = '#888'; ctx.fillRect(sbX, thumbY, 8, thumbH); } ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText(TEST_MODE ? '🧪 测试模式 - 所有合成无限' : '绿色=可合成 | 红色=材料不足 | 点击合成 | 鼠标滚轮上下滚动', W / 2, H - 10); }
function drawRecipeBook() { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('📖 配方书（按R关闭）', W / 2, 35); const cols = 5, cellW = 155, cellH = 78, gap = 8, startX = W / 2 - (cols * (cellW + gap)) / 2, startY = 60; for (let i = 0; i < RECIPES.length; i++) { const r = RECIPES[i]; const col = i % cols, row = Math.floor(i / cols); const cx = startX + col * (cellW + gap), cy = startY + row * (cellH + gap); ctx.fillStyle = '#334'; ctx.fillRect(cx, cy, cellW, cellH); ctx.strokeStyle = '#558'; ctx.lineWidth = 1.5; ctx.strokeRect(cx, cy, cellW, cellH); ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(r.icon, cx + cellW / 2, cy + 20); ctx.fillStyle = '#ff0'; ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.fillText(r.name, cx + cellW / 2, cy + 38); ctx.fillStyle = '#ccc'; ctx.font = '9px "Microsoft YaHei"'; const ct = r.inputs.map(inp => `${ITEMS[inp.id]?.icon || inp.id}x${inp.count}`).join(' '); ctx.fillText(`材料:${ct}`, cx + cellW / 2, cy + 52); ctx.fillText(`产出:${r.output} | ${r.craftAt}`, cx + cellW / 2, cy + 66); } const rows = Math.ceil(RECIPES.length / cols); ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('按R关闭', W / 2, startY + rows * (cellH + gap) + 15); }
function drawCombatUI() { ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H); const def = STATE.combatBossDef; ctx.fillStyle = '#fff'; ctx.font = 'bold 30px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText(`${def?.icon || '👾'} ${def?.name || 'BOSS'}`, W / 2, 60); ctx.fillStyle = '#333'; ctx.fillRect(W / 2 - 200, 75, 400, 25); ctx.fillStyle = STATE.combatBossHP / STATE.combatBossMaxHP > 0.5 ? '#f44' : STATE.combatBossHP / STATE.combatBossMaxHP > 0.25 ? '#f80' : '#f00'; ctx.fillRect(W / 2 - 200, 75, 400 * (STATE.combatBossHP / STATE.combatBossMaxHP), 25); ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Microsoft YaHei"'; ctx.fillText(`${Math.ceil(STATE.combatBossHP)}/${STATE.combatBossMaxHP}`, W / 2, 92); ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Microsoft YaHei"'; ctx.fillText('🧑 你', W / 2, 130); ctx.fillStyle = '#333'; ctx.fillRect(W / 2 - 200, 140, 400, 20); ctx.fillStyle = STATE.combatPlayerHP / PLAYER.maxHp > 0.5 ? '#4c4' : STATE.combatPlayerHP / PLAYER.maxHp > 0.25 ? '#fc0' : '#f44'; ctx.fillRect(W / 2 - 200, 140, 400 * (STATE.combatPlayerHP / PLAYER.maxHp), 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.fillText(`${Math.ceil(STATE.combatPlayerHP)}/${PLAYER.maxHp}`, W / 2, 155); const actions = [{ text: '⚔️ 攻击 (1)', y: 200, action: 'attack' }, { text: '🛡️ 防御 (2)', y: 250, action: 'defend' }, { text: '💊 回复 (3)', y: 300, action: 'heal' }]; STATE._combatButtons = []; for (const a of actions) { const bw = 200, bh = 40, bx = W / 2 - bw / 2, by = a.y; const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh; ctx.fillStyle = hover ? '#5a8' : '#3a7'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei"'; ctx.fillText(a.text, W / 2, by + 28); STATE._combatButtons.push({ x: bx, y: by, w: bw, h: bh, action: a.action }); } ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('战斗日志', W / 2, 370); for (let i = 0; i < STATE.combatLog.length; i++) { ctx.fillStyle = '#ccc'; ctx.font = '12px "Microsoft YaHei"'; ctx.fillText(STATE.combatLog[i], W / 2, 390 + i * 18); } }
function drawSaveSlots() { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('📂 选择存档', W / 2, 50); const saves = getSaveList(); STATE._saveSlotButtons = []; if (saves.length === 0) { ctx.fillStyle = '#888'; ctx.font = '18px "Microsoft YaHei"'; ctx.fillText('没有存档记录', W / 2, H / 2); } else { for (let i = 0; i < saves.length; i++) { const sv = saves[i]; const sy = 110 + i * 70; const bw = 520, bh = 55, bx = W / 2 - bw / 2; const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= sy && STATE.MOUSE.y <= sy + bh; ctx.fillStyle = hover ? '#3a5' : '#243'; ctx.fillRect(bx, sy, bw, bh); ctx.strokeStyle = hover ? '#5a5' : '#465'; ctx.lineWidth = 2; ctx.strokeRect(bx, sy, bw, bh); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei"'; ctx.textAlign = 'left'; ctx.fillText(`存档${i + 1} | 第${sv.day}天 | 🪙${sv.gold}金币 | ❤️${sv.hp}HP | 🟫${sv.tiles}㎡` + (sv.testMode ? ' | 🧪测试' : ''), bx + 20, sy + 33); STATE._saveSlotButtons.push({ x: bx, y: sy, w: bw, h: bh, key: sv.key }); } } const by = H - 80, bw = 160, bh = 40, bbx = W / 2 - bw / 2; const bhover = STATE.MOUSE.x >= bbx && STATE.MOUSE.x <= bbx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh; ctx.fillStyle = bhover ? '#855' : '#644'; ctx.fillRect(bbx, by, bw, bh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(bbx, by, bw, bh); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei"'; ctx.fillText('返回标题', W / 2, by + 28); STATE._saveBackBtn = { x: bbx, y: by, w: bw, h: bh }; }
function drawPasswordUI() { ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('🔐 输入测试模式密码', W / 2, H / 2 - 60); ctx.fillText('（在标题界面直接输入）', W / 2, H / 2 - 20); ctx.fillStyle = '#333'; ctx.fillRect(W / 2 - 150, H / 2 + 20, 300, 40); ctx.strokeStyle = STATE.passwordError ? '#f44' : '#fff'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 150, H / 2 + 20, 300, 40); ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Microsoft YaHei"'; ctx.fillText(STATE.passwordInput + (Date.now() % 1000 < 500 ? '|' : ''), W / 2, H / 2 + 46); if (STATE.passwordError) { ctx.fillStyle = '#f44'; ctx.font = '16px "Microsoft YaHei"'; ctx.fillText('密码错误！请重试', W / 2, H / 2 + 80); } ctx.fillStyle = '#aaa'; ctx.font = '14px "Microsoft YaHei"'; ctx.fillText('按Enter确认 | ESC返回', W / 2, H / 2 + 110); }

function drawWinUI() {
  ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, W, H);
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.003);
  ctx.fillStyle = '#ff0'; ctx.font = 'bold 48px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('🏆 恭喜通关！', W / 2, H / 2 - 120);
  ctx.fillStyle = '#8f8'; ctx.font = 'bold 28px "Microsoft YaHei"';
  ctx.fillText('你成功找到了大陆！', W / 2, H / 2 - 60);
  ctx.fillStyle = '#fff'; ctx.font = '20px "Microsoft YaHei"';
  ctx.fillText(`共生存了 ${STATE.DAY_COUNT} 天`, W / 2, H / 2 - 15);
  ctx.fillText(`拥有 🪙${PLAYER.gold} 金币 | ❤️${Math.ceil(PLAYER.hp)}HP`, W / 2, H / 2 + 25);
  ctx.fillStyle = '#aaa'; ctx.font = '16px "Microsoft YaHei"';
  ctx.fillText('感谢游玩 木筏求生！', W / 2, H / 2 + 70);
  const bw = 260, bh = 50, bx = W / 2 - bw / 2, by = H / 2 + 110;
  const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh;
  ctx.fillStyle = hover ? '#4a8' : '#3a7';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Microsoft YaHei"';
  ctx.fillText('返回标题', W / 2, by + 33);
  STATE._winButton = { x: bx, y: by, w: bw, h: bh };
}


function drawModeSelect() {
  ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 32px "Microsoft YaHei"'; ctx.textAlign = 'center';
  ctx.fillText('选择游戏模式', W / 2, H / 2 - 140);

  // 生存模式
  const modes = [
    { title: '🌊 生存模式', desc: '在海上漂流，找到大陆即可胜利', color: '#4a8', action: 'survival', y: H / 2 - 50 },
    { title: '♾️ 无尽模式', desc: '无限期生存，挑战更高的天数', color: '#a4a', action: 'endless', y: H / 2 + 50 },
  ];
  STATE._modeButtons = [];
  for (const m of modes) {
    const bw = 400, bh = 90, bx = W / 2 - bw / 2, by = m.y - bh / 2;
    const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh;
    ctx.fillStyle = hover ? m.color : '#334';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = hover ? '#fff' : '#556'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Microsoft YaHei"';
    ctx.fillText(m.title, W / 2, by + 32);
    ctx.font = '14px "Microsoft YaHei"'; ctx.fillStyle = '#ccc';
    ctx.fillText(m.desc, W / 2, by + 60);
    STATE._modeButtons.push({ x: bx, y: by, w: bw, h: bh, mode: m.action });
  }

  const bw = 200, bh = 40, bx = W / 2 - bw / 2, by = H / 2 + 140;
  const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh;
  ctx.fillStyle = hover ? '#855' : '#644';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei"';
  ctx.fillText('返回', W / 2, by + 27);
  STATE._modeBackBtn = { x: bx, y: by, w: bw, h: bh };
}

function drawTitle() { const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, '#1a3a5c'); gradient.addColorStop(0.5, '#0d2a4a'); gradient.addColorStop(1, '#061a2a'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; for (let i = 0; i < H / 40 + 2; i++) { ctx.beginPath(); const baseY = i * 40 + (Date.now() * 0.05 + i * 47) % 80 - 40; for (let x = 0; x < W; x += 5) { const y = baseY + Math.sin(x * 0.015 + Date.now() * 0.002 + i) * 8; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.font = 'bold 64px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('木筏求生', W / 2, H / 2 - 110); ctx.fillStyle = '#8cf'; ctx.font = 'bold 20px "Microsoft YaHei"'; ctx.fillText('Raft Survival v3.6' + (TEST_MODE ? ' 🧪测试模式' : ''), W / 2, H / 2 - 65); const btns = [{ text: '🎮 开始游戏', y: H / 2 + 10, action: 'start' }, { text: '📂 继续游戏', y: H / 2 + 75, action: 'saves', disabled: !hasAnySave() }]; STATE._titleButtons = []; for (const btn of btns) { const bw = 260, bh = 50, bx = W / 2 - bw / 2, by = btn.y - bh / 2; const hover = STATE.MOUSE.x >= bx && STATE.MOUSE.x <= bx + bw && STATE.MOUSE.y >= by && STATE.MOUSE.y <= by + bh; ctx.fillStyle = btn.disabled ? '#444' : (hover ? '#4a8' : '#3a7'); ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = btn.disabled ? '#666' : '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh); ctx.fillStyle = btn.disabled ? '#888' : '#fff'; ctx.font = 'bold 22px "Microsoft YaHei"'; ctx.fillText(btn.text, W / 2, btn.y + 8); btn._bounds = { x: bx, y: by, w: bw, h: bh }; STATE._titleButtons.push(btn); } ctx.fillStyle = '#aaa'; ctx.font = '12px "Microsoft YaHei"'; ctx.fillText('在标题界面直接输入密码可进入测试模式 | WASD移动 | 左/右键攻击 | G钩爪 | T驾驶台 | F使用 | E交互 | P放置 | B背包', W / 2, H / 2 + 155); }
function drawIntro() { const t = STATE.INTRO_TIMER; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); if (t < 180) { ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('你坐在飞机上，眺望着窗外的海面...', W / 2, H / 2 - 40); ctx.strokeStyle = '#666'; ctx.lineWidth = 3; ctx.fillStyle = '#1a3a5c'; ctx.fillRect(W / 2 - 120, H / 2 - 10, 240, 120); ctx.strokeRect(W / 2 - 120, H / 2 - 10, 240, 120); ctx.fillStyle = '#87CEEB'; ctx.fillRect(W / 2 - 110, H / 2, 220, 100); ctx.fillStyle = '#1a5a9c'; ctx.fillRect(W / 2 - 110, H / 2 + 60, 220, 40); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2 - 40, H / 2 + 25, 15, 0, Math.PI * 2); ctx.arc(W / 2 - 20, H / 2 + 20, 20, 0, Math.PI * 2); ctx.arc(W / 2, H / 2 + 25, 15, 0, Math.PI * 2); ctx.fill(); } else if (t < 250) { const flash = t < 190 || (t > 210 && t < 220); ctx.fillStyle = flash ? '#fff' : '#ff0'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.font = 'bold 28px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('⚡ 闪电击中了飞机！⚡', W / 2, H / 2); if (t > 220) ctx.fillText('飞机开始剧烈摇晃...', W / 2, H / 2 + 50); } else if (t < 320) { const fp = (t - 250) / 70; ctx.fillStyle = '#f44'; ctx.fillRect(0, H * fp, W, H); ctx.fillStyle = '#000'; ctx.font = 'bold 26px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('飞机坠向海面！！', W / 2, H / 2); ctx.fillStyle = '#fff'; ctx.fillText('你失去了意识...', W / 2, H / 2 + 50); } else if (t < 400) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('...', W / 2, H / 2); } else { const fi = Math.min(1, (t - 400) / 60); ctx.fillStyle = `rgba(0,0,0,${1 - fi})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.fillText('你在一艘小木筏上醒来...', W / 2, H / 2 - 30); ctx.fillText('四周是无边无际的海洋', W / 2, H / 2 + 10); ctx.fillText('你必须想办法生存下去！', W / 2, H / 2 + 50); if (t > 500) { ctx.fillStyle = '#ff0'; ctx.fillText('按任意键开始游戏', W / 2, H / 2 + 100); } } }

// ==================== 主渲染 ====================
function draw() {
  ctx.clearRect(0, 0, W, H);
  if (STATE.SCENE === 'title') { drawTitle(); return; }
  if (STATE.SCENE === 'mode') { drawModeSelect(); return; }
  if (STATE.SCENE === 'win') { drawWinUI(); return; }
  if (STATE.SCENE === 'password') { drawPasswordUI(); return; }
  if (STATE.SCENE === 'intro') { drawIntro(); return; }
  if (STATE.SCENE === 'win') {
    if (STATE._winButton && x >= STATE._winButton.x && x <= STATE._winButton.x + STATE._winButton.w && y >= STATE._winButton.y && y <= STATE._winButton.y + STATE._winButton.h) {
      STATE.SCENE = 'title';
    }
    return;
  }
  if (STATE.SCENE === 'saves') { drawSaveSlots(); return; }
  if (STATE.SCENE === 'combat') { drawCombatUI(); return; }
  drawOcean(); drawStructures(); drawFloatingItems(); drawSharks(); drawMessageBottles(); drawMonsters();
  drawRaft(); drawPlayer(); drawParticles(); drawMessages(); drawHUD();
  if (STATE.marketOpen) { drawMarketUI(); return; }
  if (STATE.mapOpen) { drawMap(); return; }
  if (STATE.backpackOpen) drawBackpack();
  if (STATE.SCENE === 'pause') drawPauseMenu();
  if (STATE.SCENE === 'craft') drawCraftMenu();
  if (STATE.SCENE === 'recipe') drawRecipeBook();
  if (STATE.SCENE === 'structure') drawStructureUI();
  if (STATE.SCENE === 'furnace') drawFurnaceUI();
  if (STATE.companionOpen) drawCompanionUI();
}

// ==================== 点击处理 ====================
function handleClick(x, y) {
  if (STATE.SCENE === 'title') {
    if (STATE._titleButtons) {
      for (const btn of STATE._titleButtons) {
        if (x >= btn._bounds.x && x <= btn._bounds.x + btn._bounds.w && y >= btn._bounds.y && y <= btn._bounds.y + btn._bounds.h) {
          if (btn.action === 'start') {
            STATE.modeSelectOpen = true;
            STATE.SCENE = 'mode';
          } else if (btn.action === 'saves') {
            STATE.SCENE = 'saves';
          }
          return;
        }
      }
    }
    return;
  }
  if (STATE.SCENE === 'mode') {
    if (STATE._modeButtons) for (const btn of STATE._modeButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        STATE.gameMode = btn.mode;
        STATE.modeSelectOpen = false;
        STATE.SCENE = 'intro';
        STATE.INTRO_TIMER = 0;
        return;
      }
    }
    if (STATE._modeBackBtn && x >= STATE._modeBackBtn.x && x <= STATE._modeBackBtn.x + STATE._modeBackBtn.w && y >= STATE._modeBackBtn.y && y <= STATE._modeBackBtn.y + STATE._modeBackBtn.h) {
      STATE.SCENE = 'title';
      return;
    }
    return;
  }
  if (STATE.SCENE === 'intro') { if (STATE.INTRO_TIMER > 500) { initGame(STATE.gameMode); STATE.SCENE = 'game'; STATE.INTRO_TIMER = 0; } return; }
  if (STATE.SCENE === 'win') {
    if (STATE._winButton && x >= STATE._winButton.x && x <= STATE._winButton.x + STATE._winButton.w && y >= STATE._winButton.y && y <= STATE._winButton.y + STATE._winButton.h) {
      STATE.SCENE = 'title';
    }
    return;
  }
  if (STATE.SCENE === 'saves') { if (STATE._saveSlotButtons) for (const btn of STATE._saveSlotButtons) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { if (loadGame(btn.key)) STATE.SCENE = 'game'; } } if (STATE._saveBackBtn && x >= STATE._saveBackBtn.x && x <= STATE._saveBackBtn.x + STATE._saveBackBtn.w && y >= STATE._saveBackBtn.y && y <= STATE._saveBackBtn.y + STATE._saveBackBtn.h) STATE.SCENE = 'title'; return; }
  if (STATE.SCENE === 'combat') { if (STATE._combatButtons) for (const btn of STATE._combatButtons) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) doCombatAction(btn.action); } return; }
  if (STATE.SCENE === 'pause') { if (!STATE._pauseButtons) return; for (const btn of STATE._pauseButtons) { if (x >= btn._bounds.x && x <= btn._bounds.x + btn._bounds.w && y >= btn._bounds.y && y <= btn._bounds.y + btn._bounds.h) { if (btn.action === 'resume') STATE.SCENE = 'game'; else if (btn.action === 'save_quit') { saveGame(); STATE.SCENE = 'title'; } } } return; }
  if (STATE.SCENE === 'craft') { if (STATE._craftButtons) for (const btn of STATE._craftButtons) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) doCraft(btn.recipe); } return; }
  if (STATE.SCENE === 'structure') {
    // 地面物资点击拾取
    if (STATE._structGroundBtns) for (const btn of STATE._structGroundBtns) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { addItem(btn.item.id, btn.item.count); addMessage(`捡起 ${ITEMS[btn.item.id]?.name} x${btn.item.count}`, '#ff0'); playCollectSound(); STATE.structGroundItems = STATE.structGroundItems.filter(gi => gi !== btn.item); if (btn.item._ref) btn.item._ref.picked = true; return; } }
    // 宝箱点击
    if (STATE._structureChestBtns) for (const btn of STATE._structureChestBtns) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { openStructureChest(btn.chestIndex); return; } }
    // NPC点击
    if (STATE._structNPCBtns) for (const btn of STATE._structNPCBtns) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { if (btn.npc.type === 'hostile') { attackStructureNPC(); } else { STATE.structChatNPC = btn.npc; STATE.structChatTimer = 0; STATE.structChatIndex = Math.floor(Math.random() * btn.npc.dialogue.length); } return; } }
    // 对话回复选项点击
    if (STATE._chatReplyOptions) for (const btn of STATE._chatReplyOptions) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { handleChatReply(btn.key); return; } }
    // 交易按钮
    if (STATE._tradeButtons) for (const btn of STATE._tradeButtons) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { if (PLAYER.gold >= btn.trade.cost) { PLAYER.gold -= btn.trade.cost; addItem(btn.trade.id, btn.trade.count); addMessage(`购买 ${ITEMS[btn.trade.id]?.name} x${btn.trade.count}！`, '#ff0'); playCollectSound(); } else { addMessage('金币不足！', '#f44'); } return; } }
    return;
  }
  if (STATE.companionOpen && STATE._companionButtons) {
    for (const btn of STATE._companionButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        const c = STATE.companions[btn.companionIndex];
        if (c && !c.task) {
          c.task = btn.task.name;
          c.taskTimer = btn.task.time;
          c.taskData = btn.task;
          addMessage(`📋 ${c.name} 开始执行: ${btn.task.name}`, '#8cf');
        } else if (c && c.task) {
          addMessage(`${c.name} 正在忙碌中...`, '#888');
        }
        return;
      }
    }
    return;
  }
  if (STATE.SCENE === 'furnace') { if (STATE._furnaceButtons) for (const btn of STATE._furnaceButtons) { if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) { startSmelting(btn.recipe); } } if (STATE._furnaceFuelBtn && x >= STATE._furnaceFuelBtn.x && x <= STATE._furnaceFuelBtn.x + STATE._furnaceFuelBtn.w && y >= STATE._furnaceFuelBtn.y && y <= STATE._furnaceFuelBtn.y + STATE._furnaceFuelBtn.h) { addFuel(); } if (STATE._furnaceCloseBtn && x >= STATE._furnaceCloseBtn.x && x <= STATE._furnaceCloseBtn.x + STATE._furnaceCloseBtn.w && y >= STATE._furnaceCloseBtn.y && y <= STATE._furnaceCloseBtn.y + STATE._furnaceCloseBtn.h) { STATE.furnaceOpen = null; STATE.SCENE = 'game'; } return; }
  if (STATE.backpackOpen && STATE._backpackSlots) {
    // 拖拽处理在 mousedown/mousemove/mouseup 中
    if (STATE.dragSource) return; // 拖拽中，不处理点击
    for (const slot of STATE._backpackSlots) { if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) { if (slot.index < PLAYER.inventory.length) { PLAYER.selectedSlot = slot.index; if (STATE._lastClickSlot === slot.index && Date.now() - STATE._lastClickTime < 400) { useItem(slot.index); STATE._lastClickSlot = -1; } STATE._lastClickSlot = slot.index; STATE._lastClickTime = Date.now(); } return; } } return; }
  // 市场购买
  if (STATE.marketOpen && STATE._marketButtons) {
    for (const btn of STATE._marketButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        const mi = btn.item;
        if (PLAYER.gold >= mi.cost) {
          PLAYER.gold -= mi.cost;
          addItem(mi.id, mi.count);
          addMessage(`购买 ${mi.name} x${mi.count}！花费 🪙${mi.cost}`, '#ff0');
          playCollectSound();
        } else {
          addMessage('金币不足！', '#f44');
        }
        return;
      }
    }
    // 点击市场界面空白处关闭
    STATE.marketOpen = false;
    return;
  }
  // 地图点击
  if (STATE.mapOpen) { STATE.mapOpen = false; return; }
  if (STATE.SCENE === 'game') {
    // 市场按钮
    if (STATE._marketButton && x >= STATE._marketButton.x && x <= STATE._marketButton.x + STATE._marketButton.w && y >= STATE._marketButton.y && y <= STATE._marketButton.y + STATE._marketButton.h) {
      STATE.marketOpen = true; return;
    }
    // 地图按钮
    if (STATE._mapButton && x >= STATE._mapButton.x && x <= STATE._mapButton.x + STATE._mapButton.w && y >= STATE._mapButton.y && y <= STATE._mapButton.y + STATE._mapButton.h) {
      STATE.mapOpen = true; return;
    }
    if (STATE.expandMode) { const world = screenToWorld(x, y); const adj = getAdjacentPositions(); for (const pos of adj) { if (Math.abs(world.x - pos.x) < 20 && Math.abs(world.y - pos.y) < 20) { RAFT.tiles.push({ x: pos.tx, y: pos.ty }); removeItem('raft_expand', 1); addMessage(`木筏扩建！当前 ${RAFT.tiles.length}㎡`, '#0f0'); addParticle(pos.x, pos.y, '#0f0', 10); STATE.expandMode = false; return; } } STATE.expandMode = false; return; }
    if (STATE.placeBuildingId) { const world = screenToWorld(x, y); const buildingType = BUILDING_ITEM_MAP[STATE.placeBuildingId]; if (!buildingType) { STATE.placeBuildingId = null; return; } for (const t of RAFT.tiles) { if (Math.abs(world.x - (RAFT.centerX + t.x * 40)) < 20 && Math.abs(world.y - (RAFT.centerY + t.y * 40)) < 20) { if (RAFT.buildings.some(b => b.x === t.x && b.y === t.y)) continue; const nb = { type: buildingType, x: t.x, y: t.y }; if (buildingType === 'farm') { nb.growTimer = 0; nb.harvestReady = false; } if (buildingType === 'net') { nb.catchTimer = 0; nb.catchReady = false; } RAFT.buildings.push(nb); removeItem(STATE.placeBuildingId, 1); addMessage(`放置了${BUILDING_NAMES[buildingType] || '建筑'}！`, '#0f0'); STATE.placeBuildingId = null; return; } } STATE.placeBuildingId = null; return; }
  }
}

function openStructureChest(index) {
  if (!STATE.inStructure) return;
  const chest = STATE.structureChests.find(c => c.index === index);
  if (!chest || chest.opened) return;
  
  // 上锁宝箱：需要宝箱钥匙
  if (chest.locked) {
    if (!hasItem('treasure_key', 1)) {
      addMessage('🔒 这个宝箱上锁了！需要宝箱钥匙才能打开', '#f84');
      return;
    }
    removeItem('treasure_key', 1);
    addMessage('🔑 使用宝箱钥匙打开了上锁宝箱！', '#ff0');
  }
  
  chest.opened = true;
  for (const loot of chest.loot) addItem(loot.id, loot.count);
  addMessage(`打开宝箱！获得了物资`, '#ff0');
  // 持久化记录
  const s = STATE.inStructure;
  const key = `${s.type}_${Math.round(s.wx / 100)}_${Math.round(s.wy / 100)}`;
  if (STATE.lootedStructures[key]) {
    if (chest.locked) {
      STATE.lootedStructures[key].lockedChestOpened = true;
    } else {
      STATE.lootedStructures[key].chestsOpened[index] = true;
    }
  }
}


function sellItem(slotIndex) {
  if (slotIndex >= PLAYER.inventory.length) return;
  const slot = PLAYER.inventory[slotIndex];
  if (!slot || slot.count <= 0) return;
  const price = SELL_PRICES[slot.id] || Math.floor((ITEMS[slot.id]?.stack || 1) * 2);
  const totalPrice = price * slot.count;
  PLAYER.gold += totalPrice;
  addMessage(`出售 ${ITEMS[slot.id]?.name || slot.id} x${slot.count}，获得 🪙${totalPrice}`, '#ff0');
  playCollectSound();
  PLAYER.inventory.splice(slotIndex, 1);
}

function collectStructureLoot() {
  if (!STATE.inStructure || !STATE.STRUCTURE_LOOT) return;
  const s = STATE.inStructure;
  const key = `${s.type}_${Math.round(s.wx / 100)}_${Math.round(s.wy / 100)}`;
  if (STATE.lootedStructures[key]?.looted) return;
  for (const loot of STATE.STRUCTURE_LOOT) addItem(loot.id, loot.count);
  addMessage(`从${STATE.inStructure.name}收集了全部物资！`, '#ff0');
  if (STATE.lootedStructures[key]) STATE.lootedStructures[key].looted = true;
  STATE.STRUCTURE_LOOT = null;
}

// ==================== 游戏循环 ====================
function gameLoop() {
  // 标题界面检测密码输入
  if (STATE.SCENE === 'title') {
    // 检测密码输入序列
    if (!STATE._passwordBuffer) STATE._passwordBuffer = '';
    // 密码检测通过按键处理
  }

  if (STATE.SCENE === 'intro') { STATE.INTRO_TIMER++; if (STATE.INTRO_TIMER > 500) { const anyKey = Object.values(STATE.KEYS).some(v => v); if (anyKey || STATE.MOUSE.clicked) { initGame(); STATE.SCENE = 'game'; STATE.INTRO_TIMER = 0; } } }
  update(); draw();
  if (STATE.MOUSE.clicked) { handleClick(STATE.CLICK_X, STATE.CLICK_Y); STATE.MOUSE.clicked = false; }
  if (STATE.MOUSE.held && STATE.SCENE === 'game' && !STATE.drivingRaft && !STATE.backpackOpen && STATE.attackCooldown <= 0) { if (STATE.leftClickAttack) playerAttack(0); if (STATE.rightClickAttack) playerAttack(2); }
  if ((STATE.SCENE === 'game') && !STATE.backpackOpen && STATE.MOUSE.down) { const invY = H - 55, slotSize = 44, maxShow = Math.min(PLAYER.inventory.length, 9), startX = W / 2 - maxShow * slotSize / 2; for (let i = 0; i < maxShow; i++) { const sx = startX + i * slotSize, sy = invY; if (STATE.MOUSE.x >= sx && STATE.MOUSE.x <= sx + slotSize - 2 && STATE.MOUSE.y >= sy && STATE.MOUSE.y <= sy + slotSize - 2) { PLAYER.selectedSlot = i; if (STATE._lastClickSlot === i && Date.now() - STATE._lastClickTime < 400) { useItem(i); STATE._lastClickSlot = -1; } STATE._lastClickSlot = i; STATE._lastClickTime = Date.now(); } } }
  requestAnimationFrame(gameLoop);
}

// 标题界面密码检测 - 通过全局按键事件
const origKeyDown = window.onkeydown;
document.addEventListener('keydown', function(e) {
  if (STATE.SCENE === 'title') {
    if (!STATE._pwdBuf) STATE._pwdBuf = '';
    if (e.key === 'Enter') {
      if (STATE._pwdBuf === TEST_PASSWORD) {
        TEST_MODE = true;
        STATE._pwdBuf = '';
        addMessage('✅ 测试模式已激活！', '#0f0');
      } else if (STATE._pwdBuf.length > 0) {
        STATE._pwdBuf = '';
      }
      return;
    }
    if (e.key === 'Escape') { STATE._pwdBuf = ''; return; }
    if (e.key === 'Backspace') { STATE._pwdBuf = STATE._pwdBuf.slice(0, -1); return; }
    if (e.key.length === 1) { STATE._pwdBuf += e.key; }
  }
});


// 制造台滚轮滚动
canvas.addEventListener('wheel', function(e) {
  if (STATE.SCENE === 'craft') {
    e.preventDefault();
    STATE.craftScrollOffset += e.deltaY > 0 ? 60 : -60;
  }
}, { passive: false });

PLAYER.hookRange = 300; PLAYER.helmetEquipped = false; PLAYER.chestEquipped = false;
PLAYER.waterBottle = 0; PLAYER.seaWater = 0;
STATE._pwdBuf = '';
gameLoop();
