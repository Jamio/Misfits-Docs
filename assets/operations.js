const formatDuration = seconds => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
};
const stat = (value, label) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
const byId = id => document.getElementById(id);
const formatDistance = metres => metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
const formatValue = value => Number(value || 0).toLocaleString("en-GB", { maximumFractionDigits:1 });

async function loadJSON(path, fallback) {
  const response = await fetch(path, { cache: "no-store" });
  return response.ok ? response.json() : fallback;
}

function aggregatePlayers(operations, registry) {
  const people = new Map();
  const blankRecord = (id, name="Unknown") => ({ id, name, status:"active", operations:0, playtime:0, kills:0, infantryKills:0, vehicleKills:0, friendlyKills:0, longestKill:0, shots:0, launcherShots:0, grenades:0, explosives:0, deaths:0, respawns:0, unconscious:0, treatments:0, damageReceived:0, distanceFoot:0, distanceVehicle:0, vehicleTime:0, lastOperation:"" });
  for (const [id, profile] of Object.entries(registry.people || {})) {
    people.set(id, { ...blankRecord(id, profile.name || "Unknown"), status:profile.status === "inactive" ? "inactive" : "active" });
  }
  for (const operation of operations) for (const entry of operation.players) {
    const profile = registry.people?.[entry.id];
    const person = people.get(entry.id) || blankRecord(entry.id, profile?.name || entry.name);
    person.name = profile?.name || entry.name;
    person.status = profile?.status === "inactive" ? "inactive" : "active";
    person.operations += 1;
    person.playtime += entry.playtimeSeconds || 0;
    for (const key of ["kills","infantryKills","vehicleKills","friendlyKills","shots","launcherShots","grenades","explosives","deaths","respawns","unconscious","treatments","damageReceived","distanceFoot","distanceVehicle","vehicleTime"]) person[key] += entry[key] || 0;
    person.longestKill = Math.max(person.longestKill, entry.longestKill || 0);
    if (operation.date > person.lastOperation) person.lastOperation = operation.date;
    people.set(entry.id, person);
  }
  return [...people.values()];
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
  const allPlayers = aggregatePlayers(data.operations, registry);
  const draw = () => {
    const query = byId("personnel-search").value.trim().toLowerCase();
    const status = byId("status-filter").value;
    const order = byId("personnel-sort").value;
    const players = allPlayers.filter(person => (!status || person.status === status) && (!query || person.name.toLowerCase().includes(query)));
    const sorters = { name:(a,b)=>a.name.localeCompare(b.name), operations:(a,b)=>b.operations-a.operations, recent:(a,b)=>b.lastOperation.localeCompare(a.lastOperation) };
    players.sort((a,b) => sorters[order](a,b) || a.name.localeCompare(b.name));
    byId("player-list").innerHTML = players.map((person,index) => `<tr><td class="rank">${index+1}</td><td><a class="player-link" href="player.html?id=${encodeURIComponent(person.id)}">${escapeHTML(person.name)}</a></td><td><span class="status-tag ${person.status}">${escapeHTML(person.status)}</span></td><td>${person.operations}</td><td>${person.lastOperation ? escapeHTML(person.lastOperation) : "—"}</td><td><a href="player.html?id=${encodeURIComponent(person.id)}">View record →</a></td></tr>`).join("") || '<tr><td colspan="6">No personnel match those filters.</td></tr>';
    byId("archive-status").textContent = `${players.length} of ${allPlayers.length} personnel`;
  };
  byId("archive-summary").innerHTML = [stat(allPlayers.length,"Personnel"),stat(allPlayers.filter(person=>person.status==="active").length,"Active"),stat(allPlayers.filter(person=>person.status==="inactive").length,"Inactive"),stat(data.operations.length,"Operations archived")].join("");
  document.querySelectorAll("#personnel-search,#status-filter,#personnel-sort").forEach(control => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", draw));
  draw();
}

function renderPlayer(data, registry) {
  const id = new URLSearchParams(window.location.search).get("id");
  const person = aggregatePlayers(data.operations, registry).find(entry => entry.id === id);
  if (!person) { byId("player-detail").innerHTML='<div class="empty">Personnel record not found.</div>'; byId("archive-status").textContent="Unknown record"; return; }
  const history = data.operations.filter(operation => operation.players.some(entry => entry.id === id)).sort((a,b)=>b.date.localeCompare(a.date));
  const historyRows = history.map(operation => {
    const entry = operation.players.find(player => player.id === id);
    return `<tr><td><a href="operation.html?id=${encodeURIComponent(operation.id)}">${escapeHTML(operation.name)}</a></td><td>${escapeHTML(operation.date)}</td><td>${escapeHTML(operation.campaign)}</td><td>${escapeHTML(entry.role || "—")}</td><td>${escapeHTML(entry.group || "—")}</td><td>${formatDuration(entry.playtimeSeconds || 0)}</td><td>${entry.kills || 0}</td><td>${entry.deaths || 0}</td></tr>`;
  }).join("");
  document.title = `${person.name} · Misfits Personnel`;
  byId("archive-status").textContent = "Service record";
  byId("player-detail").innerHTML = `<section class="page-head service-head"><div><div class="eyebrow">Personnel record</div><h1>${escapeHTML(person.name)}</h1></div><span class="status-tag ${person.status}">${escapeHTML(person.status)}</span></section><section class="stats-strip">${stat(person.operations,"Operations")}${stat(formatDuration(person.playtime),"Time deployed")}${stat(formatValue(person.kills),"Recorded kills")}${stat(formatValue(person.deaths),"Deaths")}</section><div class="service-grid"><section class="service-panel"><h2>Combat</h2><dl>${serviceRow("Infantry kills",person.infantryKills)}${serviceRow("Vehicle kills",person.vehicleKills)}${serviceRow("Longest kill",formatDistance(person.longestKill))}${serviceRow("Shots fired",formatValue(person.shots))}${serviceRow("Launcher shots",formatValue(person.launcherShots))}${serviceRow("Grenades thrown",formatValue(person.grenades))}${serviceRow("Explosives placed",formatValue(person.explosives))}${serviceRow("Friendly kills",person.friendlyKills)}</dl></section><section class="service-panel"><h2>Medical</h2><dl>${serviceRow("Treatments given",formatValue(person.treatments))}${serviceRow("Unconscious events",formatValue(person.unconscious))}${serviceRow("Damage received",formatValue(person.damageReceived))}${serviceRow("Respawns",formatValue(person.respawns))}</dl></section><section class="service-panel"><h2>Movement</h2><dl>${serviceRow("Distance on foot",formatDistance(person.distanceFoot))}${serviceRow("Distance in vehicles",formatDistance(person.distanceVehicle))}${serviceRow("Time in vehicles",formatDuration(person.vehicleTime))}${serviceRow("Last operation",person.lastOperation || "—")}</dl></section></div><section class="service-history"><h2>Operation history</h2><div class="table-wrap"><table><thead><tr><th>Operation</th><th>Date</th><th>Campaign</th><th>Role</th><th>Group</th><th>Time</th><th>Kills</th><th>Deaths</th></tr></thead><tbody>${historyRows || '<tr><td colspan="8">No exported operations yet.</td></tr>'}</tbody></table></div></section>`;
}

function serviceRow(label, value) { return `<div><dt>${label}</dt><dd>${value}</dd></div>`; }

function renderOperation(data) {
  const id = new URLSearchParams(window.location.search).get("id");
  const operation = data.operations.find(entry => entry.id === id);
  if (!operation) { byId("operation-detail").innerHTML='<div class="empty">Operation record not found.</div>'; byId("archive-status").textContent="Unknown record"; return; }
  document.title = `${operation.name} · Misfits`;
  byId("archive-status").textContent = operation.demo ? "Demonstration record" : "Archived operation";
  byId("operation-detail").innerHTML = `<section class="page-head"><div><div class="eyebrow">${escapeHTML(operation.campaign)} · ${escapeHTML(operation.date)}</div><h1>${escapeHTML(operation.name)}</h1></div><div class="operation-result">${escapeHTML(operation.result)}</div></section>${operation.demo?'<p class="notice">Synthetic demonstration data used to review the Operations Hub layout.</p>':''}<section class="stats-strip">${stat(formatDuration(operation.durationSeconds),"Duration")}${stat(operation.players.length,"Attendance")}${stat(escapeHTML(operation.terrain),"Terrain")}${stat(operation.players.reduce((sum,player)=>sum+(player.kills||0),0),"Recorded kills")}</section>${operation.summary?`<p class="lede">${escapeHTML(operation.summary)}</p>`:''}<h2>Attendance</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>Role</th><th>Group</th><th>Time</th><th>Kills</th><th>Deaths</th></tr></thead><tbody>${operation.players.map(player=>`<tr><td><a class="player-link" href="player.html?id=${encodeURIComponent(player.id)}">${escapeHTML(player.name)}</a></td><td>${escapeHTML(player.role||"—")}</td><td>${escapeHTML(player.group||"—")}</td><td>${formatDuration(player.playtimeSeconds||0)}</td><td>${player.kills||0}</td><td>${player.deaths||0}</td></tr>`).join("")}</tbody></table></div>`;
}

Promise.all([loadJSON("data/operations.json",{operations:[]}),loadJSON("data/personnel.json",{people:{}})]).then(([data,registry]) => {
  if (document.body.dataset.page === "players") return renderPlayers(data,registry);
  if (document.body.dataset.page === "player") return renderPlayer(data,registry);
  if (document.body.dataset.page === "operation") return renderOperation(data);
  return renderOperations(data);
}).catch(error => {
  byId("archive-status").textContent="Archive unavailable";
  const target=byId("operation-list")||byId("player-list")||byId("operation-detail")||byId("player-detail");
  target.innerHTML=target.tagName==="TBODY"?'<tr><td colspan="8">Personnel data could not be loaded.</td></tr>':'<div class="empty">Operation data could not be loaded.</div>';
  console.error(error);
});
