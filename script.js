const allRoles = ['预言家', '女巫', '猎人', '骑士', '狼王', '狼人', '平民'];

const roleEmojis = {
  '预言家': '🔮',
  '女巫': '🧙🏻‍♀️',
  '猎人': '🔫',
  '骑士': '♞',
  '狼王': '👑',
  '狼人': '🐺',
  '平民': '👤',
};

const roleCategories = {
  god: ['预言家', '女巫', '猎人', '骑士'],
  wolf: ['狼王', '狼人'],
  civilian: ['平民'],
};

const roleDetails = {
  basic: {
    title: '预言家 + 女巫 + 猎人 + 骑士 + 狼王',
    note: 'Balanced for a first session with clear roles and strong storytelling.',
    defaultRoles: ['预言家', '女巫', '猎人', '骑士', '狼王', '平民', '平民', '平民'],
  },
  advanced: {
    title: '预言家 + 女巫 + 猎人 + 骑士 + 狼王 + 狼人',
    note: 'Adds extra information and tactical depth for larger groups and longer rounds.',
    defaultRoles: ['预言家', '女巫', '猎人', '骑士', '狼王', '狼人', '平民', '平民'],
  },
  chaos: {
    title: '混乱夜晚',
    note: 'A playful setup that makes every round feel unpredictable.',
    defaultRoles: ['预言家', '女巫', '猎人', '骑士', '狼王', '狼人', '狼人', '平民'],
  },
};

let playerRoleSelections = [];
let deadPlayers = new Set(); // tracks dead player numbers (1-based)
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
    chip.innerHTML = `<span class="role-emoji">${roleEmojis[role]}</span> <span>${role} ×${count}</span>`;

    if (roleCategories.god.includes(role)) {
      columns.god.appendChild(chip);
    } else if (roleCategories.wolf.includes(role)) {
      columns.wolf.appendChild(chip);
    } else if (roleCategories.civilian.includes(role)) {
      columns.civilian.appendChild(chip);
    }
  });

  rolePreviewList.appendChild(columns.god);
  rolePreviewList.appendChild(columns.wolf);
  rolePreviewList.appendChild(columns.civilian);
}

function getDefaultRoles(roleKey, playerCount) {
  // Return empty array - players must select roles manually
  return Array(playerCount).fill('');
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
  playerRoleSelections = Array(playerCount).fill('');

  playersList.innerHTML = '';

  // Roles that can only be selected once
  const uniqueRoles = new Set(['预言家', '女巫', '猎人', '骑士', '狼王']);

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
    allRoles.forEach(r => {
      // Check if this role is already selected by another player
      const isAlreadySelected = playerRoleSelections.some((selectedRole, idx) => selectedRole === r && idx !== index);
      
      // Skip this role if it's a unique role that's already been selected
      if (uniqueRoles.has(r) && isAlreadySelected) {
        return; // Skip adding this option
      }
      
      const opt = document.createElement('option');
      opt.value = r;
      opt.text = `${roleEmojis[r]} ${r}`;
      select.appendChild(opt);
    });
    
    select.addEventListener('change', (e) => {
      const playerIdx = Number(e.target.getAttribute('data-player-index'));
      playerRoleSelections[playerIdx] = e.target.value;
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
  const uniqueRoles = new Set(['预言家', '女巫', '猎人', '骑士', '狼王']);
  const selects = document.querySelectorAll('.player-role-select');
  
  selects.forEach(select => {
    const playerIdx = Number(select.getAttribute('data-player-index'));
    const currentValue = select.value;
    
    // Store current selection
    const options = select.querySelectorAll('option');
    
    // Remove all options except the empty one
    options.forEach((opt, i) => {
      if (i > 0) opt.remove(); // Keep the empty "Select a role..." option
    });
    
    // Add options based on current selections
    allRoles.forEach(r => {
      // Check if this role is already selected by another player
      const isAlreadySelected = playerRoleSelections.some((selectedRole, idx) => selectedRole === r && idx !== playerIdx);
      
      // Skip this role if it's a unique role that's already been selected
      if (uniqueRoles.has(r) && isAlreadySelected) {
        return;
      }
      
      const opt = document.createElement('option');
      opt.value = r;
      opt.text = `${roleEmojis[r]} ${r}`;
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
}

function showWitchPhase() {
  showSection('wolfCloseEyesMessage', ['wolfActionSection']);
  setTimeout(() => {
    updateWitchPotionUI();
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
  ['wolfCloseEyesMessage','witchActionSection','witchCloseEyesMessage',
   'seerActionSection','seerCloseEyesMessage','hunterActionSection',
   'hunterCloseEyesMessage','knightActionSection','wakeUpSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const wolfAction = document.getElementById('wolfActionSection');
  if (wolfAction) wolfAction.style.display = 'block';
  // Clear wolf select
  const wolfSelect = document.getElementById('wolfTargetSelect');
  if (wolfSelect) wolfSelect.value = '';
  wolfKillTarget = null;
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
      showSection('knightActionSection', ['hunterCloseEyesMessage']);
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

  if (killed) {
    lines.push(`🐺 The wolves targeted <strong>Player ${killed}</strong>.`);
    if (roundSaveUsed) {
      lines.push(`💚 女巫 used her save potion — Player ${killed} survived the night!`);
    } else {
      lines.push(`💀 Player ${killed} was eliminated.`);
      died.push(killed);
    }
  } else {
    lines.push(`🐺 The wolves did not kill anyone.`);
  }

  if (nightPoisoned) {
    lines.push(`☠️ 女巫 poisoned <strong>Player ${nightPoisoned}</strong> — Player ${nightPoisoned} was eliminated.`);
    died.push(nightPoisoned);
  }

  // Final summary
  if (died.length === 0) {
    lines.push(`<br>😴 <strong>No one died tonight.</strong>`);
  } else {
    lines.push(`<br>📢 <strong>Tonight, Player ${died.join(' and Player ')} died.</strong>`);
  }

  const resultDiv = document.getElementById('nightResultText');
  // Auto-mark night deaths
  died.forEach(p => markDead(p));

  if (resultDiv) resultDiv.innerHTML = lines.map(l => `<p style="margin:6px 0">${l}</p>`).join('');
  showSection('nightResultSection', ['sheriffResultSection','sheriffQuestionSection','wakeUpSection','sheriffNominationSection']);
}

// ─── Dead player tracking ─────────────────────────────────────────────────────
function markDead(playerNum) {
  deadPlayers.add(playerNum);
  renderDeadUI();
}

function markAlive(playerNum) {
  deadPlayers.delete(playerNum);
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
    } else {
      card.classList.remove('dead');
      btn.textContent = '☠ Mark dead';
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
    markDead(target);
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
    markDead(target);
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
