const PALETTE = ['#1D9E75','#378ADD','#D85A30','#8E44AD','#E67E22','#E74C3C','#2C3E50','#16A085','#27AE60','#F39C12','#D35400','#C0392B','#7F8C8D','#2471A3','#A04000','#6C3483'];

const DEFAULT_STATE = {
  clients: [
    {id:'c1',name:'American Express',color:'#1D9E75'},
    {id:'c2',name:'AirPlus',color:'#378ADD'},
    {id:'c3',name:'HRS',color:'#D85A30'},
    {id:'c4',name:'AFTM',color:'#8E44AD'},
  ],
  statuts: [
    {id:'s1',name:'À faire',bg:'#DDEEFF',fg:'#1A3A5C'},
    {id:'s2',name:'En cours',bg:'#FDE8CC',fg:'#7A3C00'},
    {id:'s3',name:'Attente retour client',bg:'#F8D7E3',fg:'#7A1C3C'},
    {id:'s4',name:'Attente retour tiers',bg:'#E8E2F8',fg:'#3C2A7A'},
    {id:'s5',name:'Devis envoyé',bg:'#D6EFDA',fg:'#1A5C2A'},
    {id:'s6',name:'À relancer',bg:'#FFC36B',fg:'#5C2A00'},
    {id:'s7',name:'Bloqué',bg:'#FADADD',fg:'#5C1A1A'},
    {id:'s8',name:'Terminé',bg:'#1E7E44',fg:'#FFFFFF'},
  ],
  types: ['Devis','Publication RS','Création','Planification','Réunion','Relance','Rédaction','Autre'],
  priorites: [
    {name:'Haute',color:'#E74C3C'},
    {name:'Normale',color:'#2980B9'},
    {name:'Basse',color:'#27AE60'},
    {name:'Non définie',color:'#95A5A6'},
  ],
  cards: [
    {id:1,title:'Devis Foodelles — cocktail mardi + PDJ mercredi',client:'c1',type:'Devis',status:'s4',priority:'Non définie',date:'',comment:'En attente de réception du devis'},
    {id:2,title:'Publier vidéo ISOS sur LinkedIn',client:'c4',type:'Publication RS',status:'s1',priority:'Haute',date:'2025-04-07',comment:'Publier impérativement le 7 avril'},
    {id:3,title:'Brief créatif campagne print Q2',client:'c2',type:'Création',status:'s2',priority:'Normale',date:'',comment:''},
    {id:4,title:'Calendrier éditorial avril',client:'c3',type:'Planification',status:'s1',priority:'Normale',date:'',comment:''},
    {id:5,title:'Relance devis logo',client:'c2',type:'Relance',status:'s6',priority:'Haute',date:'',comment:''},
    {id:6,title:'Suivi compte RS Instagram',client:'c3',type:'Publication RS',status:'s2',priority:'Normale',date:'',comment:''},
  ],
};

let state;
let filterStatus = 'all';
let editCardId = null;
let editClientId = null;
let settingsOpen = false;
let dragId = null;
let newClientColor = PALETTE[0];
let newStatutBg = '#DDEEFF';
let newPrioColor = '#E74C3C';

function uid() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2); }

function loadState() {
  try {
    const saved = localStorage.getItem('kanban_pro_v3');
    if (saved) { state = JSON.parse(saved); return; }
  } catch(e) {}
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem('kanban_pro_v3', JSON.stringify(state));
}

function getStatut(id) { return state.statuts.find(s => s.id === id) || {name:'?',bg:'#eee',fg:'#333'}; }
function getClient(id) { return state.clients.find(c => c.id === id) || {name:'?',color:'#888'}; }
function getPrio(name) { return state.priorites.find(p => p.name === name) || {color:'#888'}; }

function dateClass(d) {
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const dt = new Date(d);
  if (dt < today) return 'retard';
  if ((dt - today) / 86400000 <= 3) return 'proche';
  return '';
}
function fmtDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return day + '/' + m + '/' + y;
}

// ============ RENDER ============
function render() {
  renderLegend();
  renderFilters();
  renderColumns();
  if (settingsOpen) renderSettings();
}

function renderLegend() {
  document.getElementById('legend').innerHTML =
    '<span style="font-size:11px;color:#888;font-weight:600;">Priorité :</span>' +
    state.priorites.map(p =>
      `<div class="legend-item"><div class="legend-dot" style="background:${p.color}"></div>${p.name}</div>`
    ).join('') +
    '<span style="margin-left:10px;font-size:11px;color:#888;font-weight:600;">Échéance :</span>' +
    '<div class="legend-item"><span style="color:#A32D2D;font-weight:600;">&#9679; En retard</span></div>' +
    '<div class="legend-item"><span style="color:#854F0B;font-weight:600;">&#9679; Dans 3 jours</span></div>';
}

function renderFilters() {
  const chips = [{id:'all',name:'Toutes'}, ...state.statuts];
  document.getElementById('filterBar').innerHTML = chips.map(s =>
    `<span class="fchip${filterStatus===s.id?' on':''}" onclick="setFilter('${s.id}')">${s.name}</span>`
  ).join('');
}

function setFilter(id) { filterStatus = id; renderFilters(); renderColumns(); }

function renderColumns() {
  const filtered = filterStatus === 'all' ? state.cards : state.cards.filter(c => c.status === filterStatus);

  let html = state.clients.map(client => {
    const cc = filtered.filter(c => c.client === client.id);
    return `
      <div class="col">
        <div class="col-header">
          <div class="col-dot" style="background:${client.color}"></div>
          <span class="col-name" title="${client.name}">${client.name}</span>
          <span class="col-count">${cc.length}</span>
          <button class="col-edit-btn" onclick="openClientModal('${client.id}')" title="Modifier">&#9998;</button>
          <button class="col-edit-btn del" onclick="deleteClient('${client.id}')" title="Supprimer">&#10005;</button>
        </div>
        <div class="cards-zone" id="zone-${client.id}"
          ondragover="onDragOver(event,'${client.id}')"
          ondrop="onDrop(event,'${client.id}')"
          ondragleave="onDragLeave('${client.id}')">
          ${cc.map(card => cardHtml(card, client.color)).join('')}
        </div>
        <button class="add-card-btn" onclick="openCardModal('${client.id}')">+ Ajouter une carte</button>
      </div>`;
  }).join('');

  // Colonne ajout client
  html += `
    <div class="add-col-card">
      <label>+ Nouveau client</label>
      <input id="newClientName" type="text" placeholder="Nom du client…" onkeydown="if(event.key==='Enter')addClient()" />
      <label>Couleur</label>
      <div class="color-swatches">${PALETTE.map(c =>
        `<div class="swatch${newClientColor===c?' sel':''}" style="background:${c}" onclick="pickNewClientColor('${c}')"></div>`
      ).join('')}</div>
      <button class="btn green" style="width:100%;justify-content:center;margin-top:4px;" onclick="addClient()">Ajouter la colonne</button>
    </div>`;

  document.getElementById('columns').innerHTML = html;

  document.querySelectorAll('.card').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragId = parseInt(el.dataset.id);
      setTimeout(() => el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });
}

function cardHtml(card, clientColor) {
  const s = getStatut(card.status);
  const p = getPrio(card.priority);
  const dc = dateClass(card.date);
  return `
    <div class="card" draggable="true" data-id="${card.id}" ondblclick="openCardModal(null,${card.id})"
      style="border-left-color:${clientColor}">
      <div class="card-title">${card.title}</div>
      <div class="card-meta">
        <span class="pill" style="background:${s.bg};color:${s.fg}">${s.name}</span>
        <div class="prio-dot" style="background:${p.color}" title="Priorité : ${card.priority}"></div>
        ${card.type ? `<span class="pill" style="background:#f0f0f0;color:#555">${card.type}</span>` : ''}
      </div>
      <div class="card-bottom">
        ${card.date
          ? `<span class="card-date ${dc}">${dc==='retard'?'&#9888; ':dc==='proche'?'&#9651; ':''}${fmtDate(card.date)}</span>`
          : '<span></span>'}
        <button class="icon-btn" onclick="deleteCard(${card.id})" title="Supprimer">&#10005;</button>
      </div>
      ${card.comment ? `<div style="font-size:10px;color:#888;margin-top:5px;font-style:italic;border-top:1px solid #f0f0f0;padding-top:5px;">${card.comment}</div>` : ''}
    </div>`;
}

// ============ DRAG & DROP ============
function onDragOver(e, clientId) {
  e.preventDefault();
  document.getElementById('zone-'+clientId).classList.add('drag-over');
}
function onDragLeave(clientId) {
  document.getElementById('zone-'+clientId).classList.remove('drag-over');
}
function onDrop(e, clientId) {
  e.preventDefault();
  document.getElementById('zone-'+clientId).classList.remove('drag-over');
  if (dragId === null) return;
  const card = state.cards.find(c => c.id === dragId);
  if (card) { card.client = clientId; saveState(); renderColumns(); }
  dragId = null;
}

// ============ CARTE MODAL ============
function openCardModal(clientId, cardId) {
  editCardId = cardId || null;
  const card = cardId ? state.cards.find(c => c.id === cardId) : null;
  document.getElementById('cardModalTitle').textContent = card ? 'Modifier la carte' : 'Nouvelle carte';
  document.getElementById('fClient').innerHTML = state.clients.map(c =>
    `<option value="${c.id}"${(card&&card.client===c.id)||(!card&&clientId===c.id)?' selected':''}>${c.name}</option>`
  ).join('');
  document.getElementById('fType').innerHTML = state.types.map(t =>
    `<option${card&&card.type===t?' selected':''}>${t}</option>`
  ).join('');
  document.getElementById('fStatus').innerHTML = state.statuts.map(s =>
    `<option value="${s.id}"${card&&card.status===s.id?' selected':''}>${s.name}</option>`
  ).join('');
  document.getElementById('fPriority').innerHTML = state.priorites.map(p =>
    `<option${card&&card.priority===p.name?' selected':''}>${p.name}</option>`
  ).join('');
  document.getElementById('fTitle').value = card ? card.title : '';
  document.getElementById('fDate').value = card ? (card.date||'') : '';
  document.getElementById('fComment').value = card ? (card.comment||'') : '';
  document.getElementById('cardModalBg').classList.add('open');
  setTimeout(() => document.getElementById('fTitle').focus(), 100);
}
function closeCardModal() { document.getElementById('cardModalBg').classList.remove('open'); }
function saveCard() {
  const title = document.getElementById('fTitle').value.trim();
  if (!title) { document.getElementById('fTitle').style.borderColor='#E74C3C'; return; }
  const data = {
    title,
    client:   document.getElementById('fClient').value,
    type:     document.getElementById('fType').value,
    status:   document.getElementById('fStatus').value,
    priority: document.getElementById('fPriority').value,
    date:     document.getElementById('fDate').value,
    comment:  document.getElementById('fComment').value,
  };
  if (editCardId) {
    const idx = state.cards.findIndex(c => c.id === editCardId);
    if (idx >= 0) state.cards[idx] = {...state.cards[idx], ...data};
  } else {
    state.cards.push({id: Date.now(), ...data});
  }
  saveState(); closeCardModal(); render();
}
function deleteCard(id) {
  if (!confirm('Supprimer cette carte ?')) return;
  state.cards = state.cards.filter(c => c.id !== id);
  saveState(); renderColumns();
}

// ============ CLIENT MODAL ============
function openClientModal(id) {
  editClientId = id;
  const client = state.clients.find(c => c.id === id);
  document.getElementById('clientModalTitle').textContent = 'Modifier — ' + client.name;
  document.getElementById('cName').value = client.name;
  document.getElementById('cColor').value = client.color;
  renderClientColorPick(client.color);
  document.getElementById('clientModalBg').classList.add('open');
}
function renderClientColorPick(selected) {
  document.getElementById('cColorPick').innerHTML = PALETTE.map(c =>
    `<div class="cp${selected===c?' sel':''}" style="background:${c}"
      onclick="document.getElementById('cColor').value='${c}';renderClientColorPick('${c}')"></div>`
  ).join('');
}
function closeClientModal() { document.getElementById('clientModalBg').classList.remove('open'); }
function saveClient() {
  const name = document.getElementById('cName').value.trim();
  const color = document.getElementById('cColor').value;
  if (!name) return;
  const idx = state.clients.findIndex(c => c.id === editClientId);
  if (idx >= 0) state.clients[idx] = {...state.clients[idx], name, color};
  saveState(); closeClientModal(); render();
}
function deleteClient(id) {
  if (state.cards.some(c => c.client === id)) {
    alert('Ce client a encore des cartes. Supprimez-les ou déplacez-les d\'abord.');
    return;
  }
  if (!confirm('Supprimer cette colonne client ?')) return;
  state.clients = state.clients.filter(c => c.id !== id);
  saveState(); render();
}

// ============ AJOUT CLIENT ============
function pickNewClientColor(col) { newClientColor = col; renderColumns(); }
function addClient() {
  const name = document.getElementById('newClientName').value.trim();
  if (!name) return;
  state.clients.push({id: uid(), name, color: newClientColor});
  saveState(); render();
}

// ============ SETTINGS ============
function toggleSettings() {
  settingsOpen = !settingsOpen;
  document.getElementById('settingsPanel').classList.toggle('open', settingsOpen);
  document.getElementById('settingsBtn').textContent = settingsOpen ? '✕ Fermer' : '⚙ Personnaliser';
  if (settingsOpen) renderSettings();
}

function renderSettings() {
  document.getElementById('settingsGrid').innerHTML = `

    <div class="settings-section">
      <h4>Statuts</h4>
      <div class="tag-list">${state.statuts.map(s => `
        <div class="tag-row">
          <div class="tag-dot" style="background:${s.bg};border:1px solid ${s.fg}40"></div>
          <span class="tag-label">${s.name}</span>
          <button class="tag-del" onclick="deleteStatut('${s.id}')">&#10005;</button>
        </div>`).join('')}</div>
      <div class="add-tag-row">
        <input id="newStatutName" placeholder="Nouveau statut…" onkeydown="if(event.key==='Enter')addStatut()" />
        <div class="cp" id="newStatutDot" style="background:${newStatutBg};border:2px solid #333;cursor:pointer;" onclick="cycleStatutColor()" title="Changer la couleur"></div>
        <button class="btn green" style="height:28px;padding:0 8px;font-size:11px;" onclick="addStatut()">+</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>Types de tâche</h4>
      <div class="tag-list">${state.types.map((t,i) => `
        <div class="tag-row">
          <span class="tag-label">${t}</span>
          <button class="tag-del" onclick="deleteType(${i})">&#10005;</button>
        </div>`).join('')}</div>
      <div class="add-tag-row">
        <input id="newTypeName" placeholder="Nouveau type…" onkeydown="if(event.key==='Enter')addType()" />
        <button class="btn green" style="height:28px;padding:0 8px;font-size:11px;" onclick="addType()">+</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>Priorités</h4>
      <div class="tag-list">${state.priorites.map((p,i) => `
        <div class="tag-row">
          <div class="tag-dot" style="background:${p.color}"></div>
          <span class="tag-label">${p.name}</span>
          <button class="tag-del" onclick="deletePrio(${i})">&#10005;</button>
        </div>`).join('')}</div>
      <div class="add-tag-row">
        <input id="newPrioName" placeholder="Nouvelle priorité…" onkeydown="if(event.key==='Enter')addPrio()" />
        <div class="cp" id="newPrioDot" style="background:${newPrioColor};border:2px solid #333;cursor:pointer;" onclick="cyclePrioColor()" title="Changer la couleur"></div>
        <button class="btn green" style="height:28px;padding:0 8px;font-size:11px;" onclick="addPrio()">+</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>Export / Import</h4>
      <p style="font-size:11px;color:#888;margin-bottom:10px;">Sauvegardez vos données ou restaurez une sauvegarde.</p>
      <div style="display:flex;flex-direction:column;gap:7px;">
        <button class="btn" style="width:100%;justify-content:center;" onclick="exportData()">&#8681; Exporter (JSON)</button>
        <label class="btn" style="width:100%;justify-content:center;cursor:pointer;">
          &#8679; Importer (JSON)
          <input type="file" accept=".json" onchange="importData(event)" style="display:none" />
        </label>
        <button class="btn red" style="width:100%;justify-content:center;" onclick="resetAll()">&#9888; Réinitialiser</button>
      </div>
    </div>
  `;
}

let statutColorIdx = 0;
const STATUT_COLORS = ['#DDEEFF','#FDE8CC','#F8D7E3','#E8E2F8','#D6EFDA','#FFC36B','#FADADD','#E8F8E8','#FFF8DC','#E8F0FE'];
function cycleStatutColor() {
  statutColorIdx = (statutColorIdx + 1) % STATUT_COLORS.length;
  newStatutBg = STATUT_COLORS[statutColorIdx];
  document.getElementById('newStatutDot').style.background = newStatutBg;
}

let prioColorIdx = 0;
const PRIO_COLORS = ['#E74C3C','#2980B9','#27AE60','#95A5A6','#E67E22','#8E44AD','#F39C12','#16A085'];
function cyclePrioColor() {
  prioColorIdx = (prioColorIdx + 1) % PRIO_COLORS.length;
  newPrioColor = PRIO_COLORS[prioColorIdx];
  document.getElementById('newPrioDot').style.background = newPrioColor;
}

function addStatut() {
  const name = document.getElementById('newStatutName').value.trim();
  if (!name) return;
  state.statuts.push({id: uid(), name, bg: newStatutBg, fg: '#1a1a1a'});
  saveState(); render();
}
function deleteStatut(id) {
  if (!confirm('Supprimer ce statut ?')) return;
  state.statuts = state.statuts.filter(s => s.id !== id);
  saveState(); render();
}
function addType() {
  const name = document.getElementById('newTypeName').value.trim();
  if (!name) return;
  if (!state.types.includes(name)) state.types.push(name);
  saveState(); render();
}
function deleteType(i) {
  state.types.splice(i, 1);
  saveState(); render();
}
function addPrio() {
  const name = document.getElementById('newPrioName').value.trim();
  if (!name) return;
  state.priorites.push({name, color: newPrioColor});
  saveState(); render();
}
function deletePrio(i) {
  state.priorites.splice(i, 1);
  saveState(); render();
}

// ============ EXPORT / IMPORT ============
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kanban_sauvegarde_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.clients || !imported.cards) throw new Error();
      state = imported;
      saveState(); render();
      alert('Import réussi !');
    } catch {
      alert('Fichier invalide. Utilisez un fichier exporté depuis cette application.');
    }
  };
  reader.readAsText(file);
}
function resetAll() {
  if (!confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) return;
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState(); render();
}

// ============ INIT ============
document.getElementById('cardModalBg').addEventListener('click', e => {
  if (e.target === document.getElementById('cardModalBg')) closeCardModal();
});
document.getElementById('clientModalBg').addEventListener('click', e => {
  if (e.target === document.getElementById('clientModalBg')) closeClientModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCardModal(); closeClientModal(); }
});

loadState();
render();
