const allRoles = ['预言家', '女巫', '猎人', '骑士', '狼王', '狼人', '黑市商人', '狼兄', '狼弟', '平民',
  '狼人1','狼人2','狼人3','平民1','平民2','平民3','平民4'];

const roleEmojis = {
  '预言家': '🔮',
  '女巫': '🧙🏻‍♀️',
  '猎人': '🔫',
  '骑士': '♞',
  '狼王': '👑',
  '狼人': '🐺',
  '黑市商人': '🏪',
  '狼兄': '🐺👨',
  '狼弟': '🐺👦',
  '平民': '👤',
  '狼人1': '🐺',
  '狼人2': '🐺',
  '狼人3': '🐺',
  '平民1': '👤',
  '平民2': '👤',
  '平民3': '👤',
  '平民4': '👤',
};

function getEmojiForRole(role) {
  if (roleEmojis[role]) return roleEmojis[role];
  // fallback: strip trailing digits (e.g., 平民1 -> 平民)
  const base = role.replace(/\d+$/, '');
  return roleEmojis[base] || '❓';
}

const roleCategories = {
  god: ['预言家', '女巫', '猎人', '骑士'],
  wolf: ['狼王', '狼人', '狼兄', '狼弟', '狼人1','狼人2','狼人3'],
  trader: ['黑市商人'],
  civilian: ['平民','平民1','平民2','平民3','平民4'],
};

const roleDetails = {
  basic: {
    title: '预言家 + 女巫 + 猎人 + 骑士 + 狼王',
    note: 'Balanced for a first session with clear roles and strong storytelling.',
    // Explicit 12-player pool: 4 gods, 1 狼王, 3 numbered 狼人, 4 numbered 平民
    defaultRoles: ['预言家', '女巫', '猎人', '骑士', '狼王', '狼人1', '狼人2', '狼人3', '平民1', '平民2', '平民3', '平民4'],
  }
};

let playerRoleSelections = [];
let deadPlayers = new Set(); // tracks dead player numbers (1-based)
let deadReasons = {}; // map playerNum -> reason string
let wolfKillTarget = null;
let witchPoisonTarget = null;
// Game-level potion state — persists across rounds, only reset on new game
let witchHasSavePotion = true;
let witchHasPoisonPotion = true;

// DOM Elements
const roleCards = Array.from(document.querySelectorAll('.role-card'));
const selectedRolesList = document.getElementById('selectedRolesList');
const statusMessage = document.getElementById('statusMessage');
const resetButton = document.getElementById('resetButton');
const continueButton = document.getElementById('continueButton');
const backButton = document.getElementById('backButton');
const generateRosterButton = document.getElementById('generateRosterButton');
const playerCountInput = document.getElementById('playerCount');
const selectedSetupLabel = document.getElementById('selectedSetupLabel');
const rolePoolLabel = document.getElementById('rolePoolLabel');
const playersList = document.getElementById('playersList');
const rolePreviewList = document.getElementById('rolePreviewList');
const roleSelectionStep = document.getElementById('roleSelectionStep');
const playerSetupStep = document.getElementById('playerSetupStep');
const actionPhaseStep = document.getElementById('actionPhaseStep');
const stepOnePill = document.getElementById('stepOnePill');
const stepTwoPill = document.getElementById('stepTwoPill');
const actionBackButton = document.getElementById('actionBackButton');
const wolfTargetSelect = document.getElementById('wolfTargetSelect');
const confirmWolfActionButton = document.getElementById('confirmWolfActionButton');

function updateRolePreview() {
  rolePreviewList.innerHTML = '';
  const roleCounts = {};

  playerRoleSelections.forEach((role) => {
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  // Create 3-column layout: god, wolf, civilian
  const columns = {
    god: document.createElement('div'),
    wolf: document.createElement('div'),
    civilian: document.createElement('div'),
  };

  columns.god.className = 'role-column god-column';
  columns.wolf.className = 'role-column wolf-column';
  columns.civilian.className = 'role-column civilian-column';

  // Add title to each column
  const godTitle = document.createElement('div');
  godTitle.className = 'column-title';
  godTitle.textContent = 'God';
  columns.god.appendChild(godTitle);

  const wolfTitle = document.createElement('div');
  wolfTitle.className = 'column-title';
  wolfTitle.textContent = 'Wolf';
  columns.wolf.appendChild(wolfTitle);

  const civilianTitle = document.createElement('div');
  civilianTitle.className = 'column-title';
  civilianTitle.textContent = 'Civilian';
  columns.civilian.appendChild(civilianTitle);

  // Populate columns
  Object.entries(roleCounts).forEach(([role, count]) => {
    const chip = document.createElement('div');
    chip.className = 'role-chip';
    chip.innerHTML = `<span class="role-emoji">${getEmojiForRole(role)}</span> <span>${role} ×${count}</span>`;

    const base = role.replace(/\d+$/, '');
    if (roleCategories.god.includes(base)) {
      columns.god.appendChild(chip);
    } else if (roleCategories.wolf.includes(base)) {
      columns.wolf.appendChild(chip);
    } else if (roleCategories.trader.includes(base)) {
      columns.trader.appendChild(chip);
    } else if (roleCategories.civilian.includes(base)) {
      columns.civilian.appendChild(chip);
    }
  });

  rolePreviewList.appendChild(columns.god);
  rolePreviewList.appendChild(columns.wolf);
  rolePreviewList.appendChild(columns.civilian);

  // Dead column: show who died and reason
  const deadCol = document.createElement('div');
  deadCol.className = 'role-column dead-column';
  const deadTitle = document.createElement('div');
  deadTitle.className = 'column-title';
  deadTitle.textContent = 'Dead';
  deadCol.appendChild(deadTitle);

  const deadNums = Array.from(deadPlayers).sort((a,b) => a - b);
  deadNums.forEach(n => {
    const role = playerRoleSelections[n - 1] || 'Unknown';
    const reason = deadReasons[n] || 'died';
    const chip = document.createElement('div');
    chip.className = 'role-chip';
    chip.innerHTML = `<span class="role-emoji">${getEmojiForRole(role)}</span> <span>Player ${n}: ${role} — ${reason}</span>`;
    deadCol.appendChild(chip);
  });

  rolePreviewList.appendChild(deadCol);
}

function getDefaultRoles(roleKey, playerCount) {
  const detail = roleDetails[roleKey] || roleDetails['basic'];
  // clone template
  let pool = Array.isArray(detail.defaultRoles) ? detail.defaultRoles.slice() : [];
  // ensure length equals playerCount
  while (pool.length < playerCount) {
    // generate numbered civilians to keep each as a unique selectable option
    const civCount = pool.filter(r => /^平民(\d*)$/.test(r)).length;
    const nextIdx = civCount + 1;
    pool.push(`平民${nextIdx}`);
  }
  if (pool.length > playerCount) pool = pool.slice(0, playerCount);
  return pool;
}

function renderPlayerSetup() {
  const selectedCard = document.querySelector('.role-card.selected');
  const roleKey = selectedCard?.dataset.role || 'basic';
  const detail = roleDetails[roleKey];
  const playerCount = Math.max(5, Math.min(20, Number(playerCountInput.value) || 8));

  playerCountInput.value = playerCount;
  selectedSetupLabel.textContent = `Current setup: ${detail.title}`;
  rolePoolLabel.textContent = `${playerCount} players total`;

  const defaultRoles = getDefaultRoles(roleKey, playerCount);
  // rolePool defines which roles are available for this mode (with multiplicity)
  const rolePool = defaultRoles.slice();
  playerRoleSelections = Array(playerCount).fill('');

  playersList.innerHTML = '';

  // compute allowed counts from rolePool
  const allowedCounts = {};
  rolePool.forEach(r => { allowedCounts[r] = (allowedCounts[r] || 0) + 1; });

  // Roles that should be unique are those with allowed count === 1
  const uniqueRoles = new Set(Object.keys(allowedCounts).filter(k => allowedCounts[k] === 1));

  defaultRoles.forEach((role, index) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    
    const playerNum = document.createElement('div');
    playerNum.className = 'player-number';
    playerNum.textContent = `Player ${index + 1}`;
    
    const roleLabel = document.createElement('label');
    roleLabel.className = 'player-role-field';
    roleLabel.innerHTML = `<span>Role</span>`;
    
    const select = document.createElement('select');
    select.className = 'player-role-select';
    select.setAttribute('data-player-index', index);
    
    // Add empty option first
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.text = 'Select a role...';
    emptyOpt.selected = true;
    select.appendChild(emptyOpt);
    
    // Filter roles to prevent duplicates of unique roles
    // Build allowed roles list (unique roles from pool)
    const allowedRoleList = Array.from(new Set(rolePool));
    allowedRoleList.forEach(r => {
      // Check how many of this role are already selected by others
      const selectedByOthers = playerRoleSelections.some((selectedRole, idx) => selectedRole === r && idx !== index);
      const selectedCount = playerRoleSelections.reduce((c, s, idx) => c + ((s === r && idx !== index) ? 1 : 0), 0);
      const allowed = allowedCounts[r] || 0;
      // If this role is limited and already filled by others, skip it
      if (allowed > 0 && selectedCount >= allowed && !select.value) {
        // skip adding option (unless current select already has it, handled later)
        return;
      }
      const opt = document.createElement('option');
      opt.value = r;
      opt.text = `${getEmojiForRole(r)} ${r}`;
      select.appendChild(opt);
    });
    
    select.addEventListener('change', (e) => {
      const playerIdx = Number(e.target.getAttribute('data-player-index'));
      const val = e.target.value;
      // Tentatively set selection
      playerRoleSelections[playerIdx] = val;
      // Enforce allowed counts
      if (val) {
        const allowed = allowedCounts[val] || 0;
        const selectedCount = playerRoleSelections.reduce((c, s) => c + (s === val ? 1 : 0), 0);
        if (allowed > 0 && selectedCount > allowed) {
          alert(`Only ${allowed} ${val} role(s) allowed in this setup.`);
          playerRoleSelections[playerIdx] = '';
          e.target.value = '';
          updateRolePreview();
          updateAllDropdowns();
          return;
        }
      }
      updateRolePreview();
      updateAllDropdowns(); // Refresh all dropdowns to hide/show unavailable roles
      // Re-enable proceed button if all roles now filled
      const allFilled = playerRoleSelections.every(r => r);
      const proceedBtn = document.getElementById('proceedToDayButton');
      const warning = document.getElementById('wakeUpRoleWarning');
      if (proceedBtn && proceedBtn.disabled && allFilled) {
        proceedBtn.disabled = false;
        if (warning) warning.style.display = 'none';
      }
    });

    // Mark as dead button
    const deadBtn = document.createElement('button');
    deadBtn.className = 'dead-toggle-btn';
    deadBtn.textContent = '☠ Mark dead';
    deadBtn.setAttribute('data-player-index', index);
    deadBtn.addEventListener('click', () => {
      const num = index + 1;
      toggleDead(num);
    });

    roleLabel.appendChild(select);
    card.appendChild(playerNum);
    card.appendChild(roleLabel);
    card.appendChild(deadBtn);
    playersList.appendChild(card);
  });

  updateRolePreview();
}

function updateAllDropdowns() {
  // Determine role pool for current selected setup
  const selectedCard = document.querySelector('.role-card.selected');
  const roleKey = selectedCard?.dataset.role || 'basic';
  const rolePool = getDefaultRoles(roleKey, playerRoleSelections.length);
  const allowedCounts = {};
  rolePool.forEach(r => { allowedCounts[r] = (allowedCounts[r] || 0) + 1; });

  const selects = document.querySelectorAll('.player-role-select');
  selects.forEach(select => {
    const playerIdx = Number(select.getAttribute('data-player-index'));
    const currentValue = select.value;

    // Remove all options except the empty one
    const options = select.querySelectorAll('option');
    options.forEach((opt, i) => { if (i > 0) opt.remove(); });

    const allowedRoleList = Array.from(new Set(rolePool));
    allowedRoleList.forEach(r => {
      const selectedCountExcl = playerRoleSelections.reduce((c, s, idx) => c + ((s === r && idx !== playerIdx) ? 1 : 0), 0);
      const allowed = allowedCounts[r] || 0;
      // Skip if filled up by others
      if (allowed > 0 && selectedCountExcl >= allowed && currentValue !== r) return;
      const opt = document.createElement('option');
      opt.value = r;
      opt.text = `${getEmojiForRole(r)} ${r}`;
      select.appendChild(opt);
    });

    // Restore current selection if still available
    select.value = currentValue;
  });
}

function renderSelection() {
  selectedRolesList.innerHTML = '';
  const selectedRoles = roleCards.filter((card) => card.classList.contains('selected'));

  if (selectedRoles.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No roles selected yet';
    selectedRolesList.appendChild(li);
    return;
  }

  selectedRoles.forEach((card) => {
    const li = document.createElement('li');
    li.textContent = roleDetails[card.dataset.role]?.title || card.querySelector('h3').textContent;
    selectedRolesList.appendChild(li);
  });
}

function updateStatus() {
  const selectedCard = document.querySelector('.role-card.selected');
  if (!selectedCard) {
    statusMessage.textContent = 'Choose at least one role to start the session.';
    return;
  }
  const detail = roleDetails[selectedCard.dataset.role];
  statusMessage.textContent = detail.note;
}

function setActiveStep(num) {
  roleSelectionStep.classList.toggle('active', num === 1);
  playerSetupStep.classList.toggle('active', num === 2);
  if (actionPhaseStep) {
    actionPhaseStep.classList.toggle('active', num === 3);
  }
  stepOnePill.classList.toggle('active', num === 1);
  stepTwoPill.classList.toggle('active', num === 2);
}

function toggleSelection(card) {
  const isSelected = card.classList.contains('selected');
  if (!isSelected) {
    roleCards.forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
  } else {
    card.classList.remove('selected');
  }
  renderSelection();
  updateStatus();
}

// Event Listeners
roleCards.forEach((card) => {
  card.addEventListener('click', () => toggleSelection(card));
});

resetButton.addEventListener('click', () => {
  roleCards.forEach((card) => card.classList.remove('selected'));
  roleCards[0].classList.add('selected');
  renderSelection();
  updateStatus();
  // Full game reset — restore witch potions
  witchHasSavePotion = true;
  witchHasPoisonPotion = true;
  resetNightPhaseUI();
  setActiveStep(1);
});

continueButton.addEventListener('click', () => {
  const selectedCard = document.querySelector('.role-card.selected');
  if (!selectedCard) {
    statusMessage.textContent = 'Select a role setup before continuing.';
    return;
  }
  const detail = roleDetails[selectedCard.dataset.role];
  statusMessage.textContent = `Ready for ${detail.title}. Next step: assign players and start the night.`;
  setActiveStep(2);
  // default to 12 players for standard gameplay
  playerCountInput.value = 12;
  renderPlayerSetup();
});

backButton.addEventListener('click', () => {
  resetNightPhaseUI();
  setActiveStep(1);
});

if (actionBackButton) {
  actionBackButton.addEventListener('click', () => {
    setActiveStep(2);
  });
}

function renderActionPhase() {
  const playerCount = playerRoleSelections.length;
  if (!wolfTargetSelect) return;
  
  wolfTargetSelect.innerHTML = '<option value="">Select a player...</option>';
  
  for (let i = 1; i <= playerCount; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.text = `Player ${i}`;
    wolfTargetSelect.appendChild(opt);
  }

  wolfTargetSelect.addEventListener('change', (e) => {
    wolfKillTarget = e.target.value ? Number(e.target.value) : null;
  });

  // Set up Wolf Brothers select if in game
  const wolfBrothersTargetSelect = document.getElementById('wolfBrothersTargetSelect');
  if (wolfBrothersTargetSelect) {
    wolfBrothersTargetSelect.innerHTML = '<option value="">Select a player...</option>';
    for (let i = 1; i <= playerCount; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.text = `Player ${i}`;
      wolfBrothersTargetSelect.appendChild(opt);
    }
    wolfBrothersTargetSelect.addEventListener('change', (e) => {
      wolfKillTarget = e.target.value ? Number(e.target.value) : null;
    });
  }

  // Set up Black Market Trader select if in game
  const traderTargetSelect = document.getElementById('traderTargetSelect');
  if (traderTargetSelect) {
    traderTargetSelect.innerHTML = '<option value="">Select a player...</option>';
    for (let i = 1; i <= playerCount; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.text = `Player ${i}`;
      traderTargetSelect.appendChild(opt);
    }
  }
}

function showWitchPhase() {
  showSection('wolfCloseEyesMessage', ['wolfActionSection']);
  setTimeout(() => {
    updateWitchPotionUI();
    // Update witch victim text if available
    const witchText = document.getElementById('witchNightVictimText');
    if (witchText) {
        witchText.textContent = wolfKillTarget ? '昨晚这个号码被狼人袭击。' : '昨晚没有玩家被狼人袭击。';
    }
    showSection('witchActionSection', ['wolfCloseEyesMessage']);
  }, 1500);
}

if (confirmWolfActionButton) {
  confirmWolfActionButton.addEventListener('click', () => {
    if (!wolfKillTarget) {
      alert('Please select a player to eliminate.');
      return;
    }
    console.log(`Wolf team eliminates Player ${wolfKillTarget}`);
    alert(`Wolf team decision recorded: Player ${wolfKillTarget} will be eliminated.`);
    showWitchPhase();
  });
}

// Wolf Brothers action handler
const confirmWolfBrothersActionButton = document.getElementById('confirmWolfBrothersActionButton');
if (confirmWolfBrothersActionButton) {
  confirmWolfBrothersActionButton.addEventListener('click', () => {
    const wolfBrothersTargetSelect = document.getElementById('wolfBrothersTargetSelect');
    if (!wolfBrothersTargetSelect.value) {
      alert('Please select a player to eliminate.');
      return;
    }
    wolfKillTarget = Number(wolfBrothersTargetSelect.value);
    console.log(`Wolf Brothers eliminate Player ${wolfKillTarget}`);
    alert(`Wolf Brothers decision recorded: Player ${wolfKillTarget} will be eliminated.`);
    showWitchPhase();
  });
}

// Black Market Trader action handler
const confirmTraderActionButton = document.getElementById('confirmTraderActionButton');
let traderDiscoveredRole = null;
if (confirmTraderActionButton) {
  confirmTraderActionButton.addEventListener('click', () => {
    const traderTargetSelect = document.getElementById('traderTargetSelect');
    if (!traderTargetSelect.value) {
      alert('Please select a player to learn about.');
      return;
    }
    const targetNum = Number(traderTargetSelect.value);
    traderDiscoveredRole = playerRoleSelections[targetNum - 1];
    console.log(`Black Market Trader discovers Player ${targetNum} is: ${traderDiscoveredRole}`);
    alert(`Trading complete! Player ${targetNum}'s role: ${getEmojiForRole(traderDiscoveredRole)} ${traderDiscoveredRole}`);
    showTraderCloseEyes();
  });
}

function showTraderCloseEyes() {
  setTimeout(() => {
    showSection('traderCloseEyesMessage', ['traderActionSection']);
  }, 500);
  setTimeout(() => {
    showSection('knightActionSection', ['traderCloseEyesMessage']);
  }, 2000);
}

function proceedToActionPhase() {
  renderActionPhase();
  setActiveStep(3);
}

generateRosterButton.addEventListener('click', () => {
  renderPlayerSetup();
});

playerCountInput.addEventListener('change', () => {
  renderPlayerSetup();
});

function resetNightPhaseUI() {
  const actionPhaseSections = document.getElementById('actionPhaseSections');
  if (actionPhaseSections) actionPhaseSections.style.display = 'none';
  ['wolfCloseEyesMessage','wolfActionSection','wolfBrothersActionSection','wolfBrothersCloseEyesMessage',
   'witchActionSection','witchCloseEyesMessage','traderActionSection','traderCloseEyesMessage',
   'seerActionSection','seerCloseEyesMessage','hunterActionSection',
   'hunterCloseEyesMessage','knightActionSection','wakeUpSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  // Determine which wolf team setup to show
  const hasWolfBrothers = playerRoleSelections.includes('狼兄') || playerRoleSelections.includes('狼弟');
  const hasTrader = playerRoleSelections.includes('黑市商人');
  
  let firstNightAction = 'wolfActionSection';
  if (hasWolfBrothers) {
    firstNightAction = 'wolfBrothersActionSection';
  }
  
  const action = document.getElementById(firstNightAction);
  if (action) action.style.display = 'block';
  
  // Clear wolf/trader select
  const wolfSelect = document.getElementById('wolfTargetSelect');
  const wolfBrothersSelect = document.getElementById('wolfBrothersTargetSelect');
  const traderSelect = document.getElementById('traderTargetSelect');
  
  if (wolfSelect) wolfSelect.value = '';
  if (wolfBrothersSelect) wolfBrothersSelect.value = '';
  if (traderSelect) traderSelect.value = '';
  
  wolfKillTarget = null;
  traderDiscoveredRole = null;
  
  // Clear witch radio
  document.querySelectorAll('input[name="witchPotion"]').forEach(r => r.checked = false);
  const poisonContainer = document.getElementById('witchPoisonSelectContainer');
  if (poisonContainer) poisonContainer.style.display = 'none';
  witchPoisonTarget = null;
}

// Proceed to action phase
const proceedToActionPhaseButton = document.getElementById('proceedToActionPhaseButton');
if (proceedToActionPhaseButton) {
  proceedToActionPhaseButton.addEventListener('click', () => {
    resetNightPhaseUI();
    renderActionPhase();
    const actionPhaseSections = document.getElementById('actionPhaseSections');
    if (actionPhaseSections) actionPhaseSections.style.display = 'block';
  });
}

// Witch potion selection handlers
const witchSaveBtn = document.getElementById('witchSaveBtn');
const witchPoisonBtn = document.getElementById('witchPoisonBtn');
const witchPoisonSelectContainer = document.getElementById('witchPoisonSelectContainer');
const witchPoisonSelect = document.getElementById('witchPoisonSelect');
const confirmWitchActionButton = document.getElementById('confirmWitchActionButton');

if (witchSaveBtn) {
  witchSaveBtn.addEventListener('change', () => {
    witchPoisonTarget = null;
    if (witchPoisonSelectContainer) {
      witchPoisonSelectContainer.style.display = 'none';
    }
  });
}

if (witchPoisonBtn) {
  witchPoisonBtn.addEventListener('change', () => {
    witchSaveUsed = false;
    if (witchPoisonSelectContainer) {
      witchPoisonSelectContainer.style.display = 'block';
      // Populate poison select with players
      const playerCount = playerRoleSelections.length;
      if (witchPoisonSelect) {
        witchPoisonSelect.innerHTML = '<option value="">Select a player...</option>';
        for (let i = 1; i <= playerCount; i++) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.text = `Player ${i}`;
          witchPoisonSelect.appendChild(opt);
        }
      }
    }
  });
}

if (witchPoisonSelect) {
  witchPoisonSelect.addEventListener('change', (e) => {
    witchPoisonTarget = e.target.value ? Number(e.target.value) : null;
  });
}

function showSection(showId, hideIds) {
  hideIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const show = document.getElementById(showId);
  if (show) show.style.display = 'block';
}

function updateWitchPotionUI() {
  if (witchSaveBtn) {
    witchSaveBtn.disabled = !witchHasSavePotion;
    witchSaveBtn.closest('.potion-option').style.opacity = witchHasSavePotion ? '1' : '0.4';
    witchSaveBtn.closest('.potion-option').title = witchHasSavePotion ? '' : 'Save potion already used this game';
  }
  if (witchPoisonBtn) {
    witchPoisonBtn.disabled = !witchHasPoisonPotion;
    witchPoisonBtn.closest('.potion-option').style.opacity = witchHasPoisonPotion ? '1' : '0.4';
    witchPoisonBtn.closest('.potion-option').title = witchHasPoisonPotion ? '' : 'Poison potion already used this game';
  }
}

if (confirmWitchActionButton) {
  confirmWitchActionButton.addEventListener('click', () => {
    const saveSelected = witchSaveBtn?.checked;
    const poisonSelected = witchPoisonBtn?.checked;
    if (saveSelected && witchHasSavePotion) {
      witchHasSavePotion = false;
      roundSaveUsed = true;
    }
    if (poisonSelected && witchPoisonTarget && witchHasPoisonPotion) {
      witchHasPoisonPotion = false;
      nightPoisoned = witchPoisonTarget;
    }
    // Show witch close eyes, then seer
    showSection('witchCloseEyesMessage', ['witchActionSection']);
    setTimeout(() => {
      // Populate seer target dropdown
      const seerSelect = document.getElementById('seerTargetSelect');
      if (seerSelect) {
        seerSelect.innerHTML = '<option value="">Select a player...</option>';
        const pc = playerRoleSelections.length || 8;
        for (let i = 1; i <= pc; i++) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.text = `Player ${i}`;
          seerSelect.appendChild(opt);
        }
      }
      showSection('seerActionSection', ['witchCloseEyesMessage']);
    }, 1500);
  });
}

const confirmSeerActionButton = document.getElementById('confirmSeerActionButton');
if (confirmSeerActionButton) {
  confirmSeerActionButton.addEventListener('click', () => {
    showSection('seerCloseEyesMessage', ['seerActionSection']);
    setTimeout(() => {
      showSection('hunterActionSection', ['seerCloseEyesMessage']);
    }, 1500);
  });
}

const confirmHunterActionButton = document.getElementById('confirmHunterActionButton');
if (confirmHunterActionButton) {
  confirmHunterActionButton.addEventListener('click', () => {
    showSection('hunterCloseEyesMessage', ['hunterActionSection']);
    setTimeout(() => {
      // Check if Black Market Trader is in the game
      const hasTrader = playerRoleSelections.includes('黑市商人');
      if (hasTrader) {
        showSection('traderActionSection', ['hunterCloseEyesMessage']);
      } else {
        showSection('knightActionSection', ['hunterCloseEyesMessage']);
      }
    }, 1500);
  });
}

// Night outcome tracking
let nightKilled = null;
let nightPoisoned = null;  // captured at witch confirm time
let roundSaveUsed = false; // per-round flag, reset each new night

// Knight confirm — just check roles on proceed click now
const confirmKnightActionButton = document.getElementById('confirmKnightActionButton');
if (confirmKnightActionButton) {
  confirmKnightActionButton.addEventListener('click', () => {
    showSection('wakeUpSection', ['knightActionSection']);
    // Reset proceed button
    const btn = document.getElementById('proceedToDayButton');
    const warning = document.getElementById('wakeUpRoleWarning');
    if (btn) btn.disabled = false;
    if (warning) warning.style.display = 'none';
  });
}

const proceedToDayButton = document.getElementById('proceedToDayButton');
if (proceedToDayButton) {
  proceedToDayButton.addEventListener('click', () => {
    // Check all roles filled
    const unfilled = playerRoleSelections.filter(r => !r).length;
    const warning = document.getElementById('wakeUpRoleWarning');
    if (unfilled > 0) {
      if (warning) warning.style.display = 'block';
      return;
    }
    if (warning) warning.style.display = 'none';
    showSection('sheriffQuestionSection', ['wakeUpSection']);
  });
}

const sheriffYesButton = document.getElementById('sheriffYesButton');
if (sheriffYesButton) {
  sheriffYesButton.addEventListener('click', () => {
    // Build nominee grid
    const grid = document.getElementById('sheriffNomineeGrid');
    if (grid) {
      grid.innerHTML = '';
      const count = playerRoleSelections.length || 8;
      for (let i = 1; i <= count; i++) {
        const chip = document.createElement('div');
        chip.className = 'nominee-chip';
        chip.textContent = `Player ${i}`;
        chip.dataset.player = i;
        chip.addEventListener('click', () => chip.classList.toggle('selected'));
        grid.appendChild(chip);
      }
    }
    showSection('sheriffNominationSection', ['sheriffQuestionSection']);
  });
}

const sheriffNoButton = document.getElementById('sheriffNoButton');
if (sheriffNoButton) {
  sheriffNoButton.addEventListener('click', () => {
    showNightResults();
  });
}

const confirmSheriffNomineesButton = document.getElementById('confirmSheriffNomineesButton');
if (confirmSheriffNomineesButton) {
  confirmSheriffNomineesButton.addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.nominee-chip.selected'));
    if (selected.length === 0) {
      alert('Please select at least one nominee.');
      return;
    }
    const nominees = selected.map(c => Number(c.dataset.player));
    const startPlayer = nominees[Math.floor(Math.random() * nominees.length)];
    const direction = Math.random() < 0.5 ? 'clockwise ➡️' : 'counter-clockwise ⬅️';
    const resultText = document.getElementById('sheriffResultText');
    if (resultText) {
      resultText.innerHTML =
        `Nominees: <strong>${nominees.map(n => `Player ${n}`).join(', ')}</strong><br><br>` +
        `Player <strong>${startPlayer}</strong> speaks first, going <strong>${direction}</strong>.`;
    }
    showSection('sheriffResultSection', ['sheriffNominationSection']);
  });
}

const sheriffPhaseOverButton = document.getElementById('sheriffPhaseOverButton');
if (sheriffPhaseOverButton) {
  sheriffPhaseOverButton.addEventListener('click', () => {
    showNightResults();
  });
}

function showNightResults() {
  const lines = [];
  const killed = wolfKillTarget;
  const died = []; // players who actually died
  const diedReasons = {};

  if (killed) {
    lines.push(`🐺 The wolves targeted <strong>Player ${killed}</strong>.`);
    if (roundSaveUsed) {
      lines.push(`💚 The witch used her save potion — Player ${killed} survived the night!`);
    } else {
      lines.push(`💀 Player ${killed} was eliminated.`);
      died.push(killed);
      diedReasons[killed] = 'killed by wolves';
    }
  } else {
    lines.push(`🐺 The wolves did not kill anyone.`);
  }

  if (nightPoisoned) {
    lines.push(`☠️ The witch poisoned <strong>Player ${nightPoisoned}</strong> — Player ${nightPoisoned} was eliminated.`);
    died.push(nightPoisoned);
    diedReasons[nightPoisoned] = 'poisoned by witch';
  }

  // Final summary
  if (died.length === 0) {
    lines.push(`<br>😴 <strong>No one died tonight.</strong>`);
  } else {
    lines.push(`<br>📢 <strong>Tonight, Player ${died.join(' and Player ')} died.</strong>`);
  }

  const resultDiv = document.getElementById('nightResultText');
  // Auto-mark night deaths with reasons
  died.forEach(p => markDead(p, diedReasons[p] || 'died during night'));

  if (resultDiv) resultDiv.innerHTML = lines.map(l => `<p style="margin:6px 0">${l}</p>`).join('');
  showSection('nightResultSection', ['sheriffResultSection','sheriffQuestionSection','wakeUpSection','sheriffNominationSection']);
}

// ─── Dead player tracking ─────────────────────────────────────────────────────
function markDead(playerNum) {
  const reason = arguments.length > 1 ? arguments[1] : '';
  deadPlayers.add(playerNum);
  if (reason) deadReasons[playerNum] = reason;
  renderDeadUI();
}

function markAlive(playerNum) {
  deadPlayers.delete(playerNum);
  delete deadReasons[playerNum];
  renderDeadUI();
}

function toggleDead(playerNum) {
  if (deadPlayers.has(playerNum)) {
    markAlive(playerNum);
  } else {
    markDead(playerNum);
  }
}

function renderDeadUI() {
  const cards = document.querySelectorAll('.player-card');
  cards.forEach(card => {
    const btn = card.querySelector('.dead-toggle-btn');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-player-index'));
    const num = idx + 1;
    if (deadPlayers.has(num)) {
      card.classList.add('dead');
      btn.textContent = '✅ Mark alive';
      // show reason
      let reasonEl = card.querySelector('.death-reason');
      if (!reasonEl) {
        reasonEl = document.createElement('div');
        reasonEl.className = 'death-reason';
        card.appendChild(reasonEl);
      }
        reasonEl.textContent = deadReasons[num] ? `Reason: ${deadReasons[num]}` : 'Dead';
    } else {
      card.classList.remove('dead');
      btn.textContent = '☠ Mark dead';
      const reasonEl = card.querySelector('.death-reason');
      if (reasonEl) reasonEl.remove();
    }
  });
}

// ─── Win condition ────────────────────────────────────────────────────────────
function checkWinCondition() {
  const wolfRoles = ['狼王', '狼人'];
  let aliveWolves = 0;
  let aliveVillagers = 0;
  playerRoleSelections.forEach((role, idx) => {
    if (deadPlayers.has(idx + 1)) return;
    if (wolfRoles.includes(role)) aliveWolves++;
    else aliveVillagers++;
  });

  if (aliveWolves === 0) {
    showWin('🎉 Villagers win!', `All wolves have been eliminated. The village is safe!<br>Alive wolves: 0 | Alive villagers: ${aliveVillagers}`);
    return true;
  }
  if (aliveWolves >= aliveVillagers) {
    showWin('🐺 Wolves win!', `Wolves equal or outnumber the villagers. The village falls!<br>Alive wolves: ${aliveWolves} | Alive villagers: ${aliveVillagers}`);
    return true;
  }
  return false;
}

function showWin(title, desc) {
  document.getElementById('winTitle').innerHTML = title;
  document.getElementById('winDesc').innerHTML = desc;
  showSection('winSection', ['dayVoteSection','shootSection','dayDiscussionSection','nightResultSection']);
}

// ─── Special ability: Shoot (Hunter / Wolf King) ──────────────────────────────
function triggerShoot(shooterNum, shooterRole, onDone) {
  const wolfRoles = ['狼王', '狼人'];
  const title = document.getElementById('shootTitle');
  const desc = document.getElementById('shootDesc');
  const grid = document.getElementById('shootPlayerGrid');
  if (title) title.textContent = shooterRole === '猎人' ? '🔫 猎人 — Final shot' : '👑 狼王 — Final shot';
  if (desc) desc.textContent = `Player ${shooterNum} (${shooterRole}) was eliminated. They may shoot one player before dying.`;
  if (grid) {
    grid.innerHTML = '';
    playerRoleSelections.forEach((_, idx) => {
      const num = idx + 1;
      if (deadPlayers.has(num)) return;
      const chip = document.createElement('div');
      chip.className = 'nominee-chip';
      chip.textContent = `Player ${num}`;
      chip.dataset.player = num;
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.nominee-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
      grid.appendChild(chip);
    });
  }

  const confirmShoot = document.getElementById('confirmShootButton');
  const skipShoot = document.getElementById('skipShootButton');

  const cleanup = () => {
    confirmShoot.replaceWith(confirmShoot.cloneNode(true));
    skipShoot.replaceWith(skipShoot.cloneNode(true));
  };

  const newConfirm = document.getElementById('confirmShootButton');
  const newSkip = document.getElementById('skipShootButton');

  newConfirm.addEventListener('click', () => {
    const sel = grid.querySelector('.nominee-chip.selected');
    if (!sel) { alert('Select a player to shoot.'); return; }
    const target = Number(sel.dataset.player);
    markDead(target, shooterRole === '猎人' ? 'shot by hunter' : 'killed by special ability');
    showSection('dayDiscussionSection', ['shootSection']);
    if (!checkWinCondition()) {
      showSection('dayDiscussionSection', ['shootSection']);
    }
    if (onDone) onDone();
  }, { once: true });

  newSkip.addEventListener('click', () => {
    showSection('dayDiscussionSection', ['shootSection']);
    if (onDone) onDone();
  }, { once: true });

  showSection('shootSection', ['dayVoteSection','dayDiscussionSection']);
}

// ─── Day voting ───────────────────────────────────────────────────────────────
const startDayPhaseButton = document.getElementById('startDayPhaseButton');
if (startDayPhaseButton) {
  startDayPhaseButton.addEventListener('click', () => {
    if (checkWinCondition()) return;
    showSection('dayDiscussionSection', ['nightResultSection']);
  });
}

const startVoteButton = document.getElementById('startVoteButton');
if (startVoteButton) {
  startVoteButton.addEventListener('click', () => {
    const grid = document.getElementById('votePlayerGrid');
    if (grid) {
      grid.innerHTML = '';
      playerRoleSelections.forEach((_, idx) => {
        const num = idx + 1;
        if (deadPlayers.has(num)) return;
        const chip = document.createElement('div');
        chip.className = 'nominee-chip';
        chip.textContent = `Player ${num}`;
        chip.dataset.player = num;
        chip.addEventListener('click', () => {
          grid.querySelectorAll('.nominee-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
        });
        grid.appendChild(chip);
      });
    }
    showSection('dayVoteSection', ['dayDiscussionSection']);
  });
}

const confirmVoteButton = document.getElementById('confirmVoteButton');
if (confirmVoteButton) {
  confirmVoteButton.addEventListener('click', () => {
    const sel = document.querySelector('#votePlayerGrid .nominee-chip.selected');
    if (!sel) { alert('Select a player to vote out.'); return; }
    const target = Number(sel.dataset.player);
    const role = playerRoleSelections[target - 1];
    markDead(target, 'voted out');
    if (checkWinCondition()) return;
    // Trigger special shoot ability if hunter or wolf king
    if (role === '猎人' || role === '狼王') {
      triggerShoot(target, role);
    } else {
      showSection('dayDiscussionSection', ['dayVoteSection']);
      // After day phase, allow starting next night
      const btn = document.getElementById('startVoteButton');
      if (btn) btn.textContent = 'Proceed to vote again / start night';
    }
  });
}

const skipVoteButton = document.getElementById('skipVoteButton');
if (skipVoteButton) {
  skipVoteButton.addEventListener('click', () => {
    showSection('dayDiscussionSection', ['dayVoteSection']);
  });
}

// Add "Start next night" button to day discussion
const startNightFromDay = document.createElement('button');
startNightFromDay.id = 'startNightFromDayButton';
startNightFromDay.className = 'primary-button';
startNightFromDay.textContent = 'Start next night';
startNightFromDay.style.marginTop = '8px';
startNightFromDay.addEventListener('click', () => {
  if (checkWinCondition()) return;
  const dayDisc = document.getElementById('dayDiscussionSection');
  if (dayDisc) dayDisc.style.display = 'none';
  // Reset for next night
  ['wolfCloseEyesMessage','witchActionSection','witchCloseEyesMessage',
   'seerActionSection','seerCloseEyesMessage','hunterActionSection',
   'hunterCloseEyesMessage','knightActionSection','wakeUpSection',
   'sheriffQuestionSection','sheriffNominationSection','sheriffResultSection',
   'nightResultSection','dayDiscussionSection','dayVoteSection','shootSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const wolfAction = document.getElementById('wolfActionSection');
  if (wolfAction) wolfAction.style.display = 'block';
  const wolfSelect = document.getElementById('wolfTargetSelect');
  if (wolfSelect) wolfSelect.value = '';
  wolfKillTarget = null;
  witchPoisonTarget = null;
  nightPoisoned = null;
  roundSaveUsed = false;
  document.querySelectorAll('input[name="witchPotion"]').forEach(r => r.checked = false);
  const poisonContainer = document.getElementById('witchPoisonSelectContainer');
  if (poisonContainer) poisonContainer.style.display = 'none';
  renderActionPhase();
});

// Append "Start next night" to day discussion section
const dayDiscSection = document.getElementById('dayDiscussionSection');
if (dayDiscSection) {
  const controls = dayDiscSection.querySelector('.action-controls');
  if (controls) controls.appendChild(startNightFromDay);
}

// Win condition for new game button
const newGameButton = document.getElementById('newGameButton');
if (newGameButton) {
  newGameButton.addEventListener('click', () => {
    location.reload();
  });
}

const resetGameButton = document.getElementById('resetGameButton');
if (resetGameButton) {
  resetGameButton.addEventListener('click', () => {
    witchHasSavePotion = true;
    witchHasPoisonPotion = true;
    wolfKillTarget = null;
    witchPoisonTarget = null;
    nightPoisoned = null;
    roundSaveUsed = false;
    deadPlayers.clear();
    renderDeadUI();
    const actionPhaseSections = document.getElementById('actionPhaseSections');
    if (actionPhaseSections) actionPhaseSections.style.display = 'none';
    ['wolfCloseEyesMessage','witchActionSection','witchCloseEyesMessage',
     'seerActionSection','seerCloseEyesMessage','hunterActionSection',
     'hunterCloseEyesMessage','knightActionSection','wakeUpSection',
     'sheriffQuestionSection','sheriffNominationSection','sheriffResultSection',
     'nightResultSection','dayDiscussionSection','dayVoteSection','shootSection','winSection'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const wolfAction = document.getElementById('wolfActionSection');
    if (wolfAction) wolfAction.style.display = 'block';
    const wolfSelect = document.getElementById('wolfTargetSelect');
    if (wolfSelect) wolfSelect.value = '';
    document.querySelectorAll('input[name="witchPotion"]').forEach(r => {
      r.checked = false;
      r.disabled = false;
    });
    document.querySelectorAll('.potion-option').forEach(el => {
      el.style.opacity = '1';
      el.title = '';
    });
    const poisonContainer = document.getElementById('witchPoisonSelectContainer');
    if (poisonContainer) poisonContainer.style.display = 'none';
  });
}

// Initialize
renderSelection();
updateStatus();
setActiveStep(1);
renderPlayerSetup();
