const formatDuration = seconds => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
};
const stat = (value, label) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
const byId = id => document.getElementById(id);

async function loadJSON(path, fallback) {
  const response = await fetch(path, { cache: "no-store" });
  return response.ok ? response.json() : fallback;
}

function aggregatePlayers(operations, registry) {
  const people = new Map();
  for (const operation of operations) for (const entry of operation.players) {
    const person = people.get(entry.id) || { id:entry.id, name:entry.name, operations:0, playtime:0, kills:0, deaths:0, lastOperation:"" };
    person.name = entry.name;
    person.operations += 1;
    person.playtime += entry.playtimeSeconds || 0;
    person.kills += entry.kills || 0;
    person.deaths += entry.deaths || 0;
    if (operation.date > person.lastOperation) person.lastOperation = operation.date;
    people.set(entry.id, person);
  }
  return [...people.values()].map(person => ({ ...person, status:registry.people?.[person.id]?.status === "inactive" ? "inactive" : "active" }));
}

function operationCard(operation) {
  const date = new Date(`${operation.date}T12:00:00Z`).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
  return `<a class="operation" href="operation.html?id=${encodeURIComponent(operation.id)}"><div class="operation-date">${date}${operation.demo ? '<br><span class="demo-tag">Demo</span>' : ''}</div><div><h2>${escapeHTML(operation.name)}</h2><div class="operation-meta">${escapeHTML(operation.campaign)} · ${escapeHTML(operation.terrain)} · ${formatDuration(operation.durationSeconds)} · ${operation.players.length} players</div></div><div class="operation-result">${escapeHTML(operation.result)}</div></a>`;
}

function renderOperations(data) {
  const campaigns = [...new Set(data.operations.map(operation => operation.campaign))].sort();
  byId("campaign-filter").innerHTML += campaigns.map(campaign => `<option value="${escapeHTML(campaign)}">${escapeHTML(campaign)}</option>`).join("");
  const draw = () => {
    const query = byId("operation-search").value.trim().toLowerCase();
    const campaign = byId("campaign-filter").value;
    const order = byId("operation-sort").value;
    const operations = data.operations.filter(operation => (!campaign || operation.campaign === campaign) && (!query || [operation.name, operation.terrain, operation.result].some(value => String(value).toLowerCase().includes(query))));
    operations.sort((a,b) => order === "date-asc" ? a.date.localeCompare(b.date) : order === "duration-desc" ? b.durationSeconds-a.durationSeconds : order === "duration-asc" ? a.durationSeconds-b.durationSeconds : b.date.localeCompare(a.date));
    byId("operation-list").innerHTML = operations.map(operationCard).join("") || '<div class="empty">No operations match those filters.</div>';
    byId("archive-status").textContent = `${operations.length} of ${data.operations.length} records`;
  };
  const playerIds = new Set(data.operations.flatMap(operation => operation.players.map(player => player.id)));
  const totalSeconds = data.operations.reduce((sum, operation) => sum + operation.durationSeconds, 0);
  byId("archive-summary").innerHTML = [stat(data.operations.length,"Operations"),stat(playerIds.size,"Personnel"),stat(formatDuration(totalSeconds),"Mission time"),stat(data.operations.reduce((sum,operation) => sum+operation.players.length,0),"Attendances")].join("");
  document.querySelectorAll("#operation-search,#campaign-filter,#operation-sort").forEach(control => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", draw));
  draw();
}

function renderPlayers(data, registry) {
  const campaigns = [...new Set(data.operations.map(operation => operation.campaign))].sort();
  byId("personnel-campaign-filter").innerHTML += campaigns.map(campaign => `<option value="${escapeHTML(campaign)}">${escapeHTML(campaign)}</option>`).join("");
  const allPlayers = aggregatePlayers(data.operations, registry);
  const draw = () => {
    const query = byId("personnel-search").value.trim().toLowerCase();
    const status = byId("status-filter").value;
    const campaign = byId("personnel-campaign-filter").value;
    const order = byId("personnel-sort").value;
    const campaignPlayers = aggregatePlayers(data.operations.filter(operation => !campaign || operation.campaign === campaign), registry);
    const players = campaignPlayers.filter(person => (!status || person.status === status) && (!query || person.name.toLowerCase().includes(query)));
    const sorters = { name:(a,b)=>a.name.localeCompare(b.name), operations:(a,b)=>b.operations-a.operations, playtime:(a,b)=>b.playtime-a.playtime, kills:(a,b)=>b.kills-a.kills, recent:(a,b)=>b.lastOperation.localeCompare(a.lastOperation) };
    players.sort((a,b) => sorters[order](a,b) || a.name.localeCompare(b.name));
    byId("player-list").innerHTML = players.map((person,index) => `<tr><td class="rank">${index+1}</td><td><span class="player-link">${escapeHTML(person.name)}</span></td><td><span class="status-tag ${person.status}">${escapeHTML(person.status)}</span></td><td>${person.operations}</td><td>${formatDuration(person.playtime)}</td><td>${person.kills}</td><td>${person.deaths}</td><td>${escapeHTML(person.lastOperation)}</td></tr>`).join("") || '<tr><td colspan="8">No personnel match those filters.</td></tr>';
    byId("archive-status").textContent = `${players.length} of ${campaignPlayers.length} records`;
  };
  const totalPlaytime = allPlayers.reduce((sum,player) => sum+player.playtime,0);
  byId("archive-summary").innerHTML = [stat(allPlayers.length,"Personnel"),stat(data.operations.length,"Operations"),stat(formatDuration(totalPlaytime),"Combined time"),stat(allPlayers.reduce((sum,player)=>sum+player.kills,0),"Recorded kills")].join("");
  document.querySelectorAll("#personnel-search,#status-filter,#personnel-campaign-filter,#personnel-sort").forEach(control => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", draw));
  draw();
}

function renderOperation(data) {
  const id = new URLSearchParams(window.location.search).get("id");
  const operation = data.operations.find(entry => entry.id === id);
  if (!operation) { byId("operation-detail").innerHTML='<div class="empty">Operation record not found.</div>'; byId("archive-status").textContent="Unknown record"; return; }
  document.title = `${operation.name} · Misfits`;
  byId("archive-status").textContent = operation.demo ? "Demonstration record" : "Archived operation";
  byId("operation-detail").innerHTML = `<section class="page-head"><div><div class="eyebrow">${escapeHTML(operation.campaign)} · ${escapeHTML(operation.date)}</div><h1>${escapeHTML(operation.name)}</h1></div><div class="operation-result">${escapeHTML(operation.result)}</div></section>${operation.demo?'<p class="notice">Synthetic demonstration data used to review the Operations Hub layout.</p>':''}<section class="stats-strip">${stat(formatDuration(operation.durationSeconds),"Duration")}${stat(operation.players.length,"Attendance")}${stat(escapeHTML(operation.terrain),"Terrain")}${stat(operation.players.reduce((sum,player)=>sum+(player.kills||0),0),"Recorded kills")}</section>${operation.summary?`<p class="lede">${escapeHTML(operation.summary)}</p>`:''}<h2>Attendance</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>Role</th><th>Group</th><th>Time</th><th>Kills</th><th>Deaths</th></tr></thead><tbody>${operation.players.map(player=>`<tr><td class="player-link">${escapeHTML(player.name)}</td><td>${escapeHTML(player.role||"—")}</td><td>${escapeHTML(player.group||"—")}</td><td>${formatDuration(player.playtimeSeconds||0)}</td><td>${player.kills||0}</td><td>${player.deaths||0}</td></tr>`).join("")}</tbody></table></div>`;
}

Promise.all([loadJSON("data/operations.json",{operations:[]}),loadJSON("data/personnel.json",{people:{}})]).then(([data,registry]) => {
  if (document.body.dataset.page === "players") return renderPlayers(data,registry);
  if (document.body.dataset.page === "operation") return renderOperation(data);
  return renderOperations(data);
}).catch(error => {
  byId("archive-status").textContent="Archive unavailable";
  const target=byId("operation-list")||byId("player-list")||byId("operation-detail");
  target.innerHTML=target.tagName==="TBODY"?'<tr><td colspan="8">Personnel data could not be loaded.</td></tr>':'<div class="empty">Operation data could not be loaded.</div>';
  console.error(error);
});
