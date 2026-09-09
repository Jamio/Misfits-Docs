const formatDuration = seconds => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
};

const stat = (value, label) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);

async function loadArchive() {
  const response = await fetch("data/operations.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Archive returned ${response.status}`);
  return response.json();
}

function aggregatePlayers(operations) {
  const players = new Map();
  for (const operation of operations) {
    for (const entry of operation.players) {
      const record = players.get(entry.id) || { id: entry.id, name: entry.name, operations: 0, playtime: 0, kills: 0, deaths: 0 };
      record.name = entry.name;
      record.operations += 1;
      record.playtime += entry.playtimeSeconds || 0;
      record.kills += entry.kills || 0;
      record.deaths += entry.deaths || 0;
      players.set(entry.id, record);
    }
  }
  return [...players.values()].sort((a, b) => b.playtime - a.playtime || a.name.localeCompare(b.name));
}

function renderOperations(data) {
  const operations = [...data.operations].sort((a, b) => b.date.localeCompare(a.date));
  const playerIds = new Set(operations.flatMap(operation => operation.players.map(player => player.id)));
  const totalSeconds = operations.reduce((sum, operation) => sum + operation.durationSeconds, 0);
  document.querySelector("#archive-summary").innerHTML = [stat(operations.length, "Operations"), stat(playerIds.size, "Personnel"), stat(formatDuration(totalSeconds), "Mission time"), stat(operations.reduce((sum, operation) => sum + operation.players.length, 0), "Attendances")].join("");
  document.querySelector("#operation-list").innerHTML = operations.map(operation => `<a class="operation" href="operation.html?id=${encodeURIComponent(operation.id)}"><div class="operation-date">${new Date(`${operation.date}T12:00:00Z`).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}${operation.demo ? '<br><span class="demo-tag">Demo</span>' : ''}</div><div><h2>${escapeHTML(operation.name)}</h2><div class="operation-meta">${escapeHTML(operation.campaign)} · ${escapeHTML(operation.terrain)} · ${formatDuration(operation.durationSeconds)} · ${operation.players.length} players</div></div><div class="operation-result">${escapeHTML(operation.result)}</div></a>`).join("") || '<div class="empty">No operations have been exported yet.</div>';
  document.querySelector("#archive-status").textContent = `${operations.length} records online`;
}

function renderPlayers(data) {
  const players = aggregatePlayers(data.operations);
  const totalPlaytime = players.reduce((sum, player) => sum + player.playtime, 0);
  document.querySelector("#archive-summary").innerHTML = [stat(players.length, "Personnel"), stat(data.operations.length, "Operations"), stat(formatDuration(totalPlaytime), "Combined time"), stat(players.reduce((sum, player) => sum + player.kills, 0), "Recorded kills")].join("");
  document.querySelector("#player-list").innerHTML = players.map((player, index) => `<tr><td class="rank">${index + 1}</td><td><span class="player-link">${escapeHTML(player.name)}</span></td><td>${player.operations}</td><td>${formatDuration(player.playtime)}</td><td>${player.kills}</td><td>${player.deaths}</td></tr>`).join("") || '<tr><td colspan="6">No personnel records have been exported yet.</td></tr>';
  document.querySelector("#archive-status").textContent = `${players.length} service records`;
}

function renderOperation(data) {
  const id = new URLSearchParams(window.location.search).get("id");
  const operation = data.operations.find(entry => entry.id === id);
  if (!operation) {
    document.querySelector("#operation-detail").innerHTML = '<div class="empty">Operation record not found.</div>';
    document.querySelector("#archive-status").textContent = "Unknown record";
    return;
  }
  document.title = `${operation.name} · Misfits`;
  document.querySelector("#archive-status").textContent = operation.demo ? "Demonstration record" : "Archived operation";
  document.querySelector("#operation-detail").innerHTML = `<section class="page-head"><div><div class="eyebrow">${escapeHTML(operation.campaign)} · ${escapeHTML(operation.date)}</div><h1>${escapeHTML(operation.name)}</h1></div><div class="operation-result">${escapeHTML(operation.result)}</div></section>${operation.demo ? '<p class="notice">Synthetic demonstration data used to review the Operations Hub layout.</p>' : ''}<section class="stats-strip">${stat(formatDuration(operation.durationSeconds), "Duration")}${stat(operation.players.length, "Attendance")}${stat(escapeHTML(operation.terrain), "Terrain")}${stat(operation.players.reduce((sum, player) => sum + (player.kills || 0), 0), "Recorded kills")}</section>${operation.summary ? `<p class="lede">${escapeHTML(operation.summary)}</p>` : ''}<h2>Attendance</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>Role</th><th>Group</th><th>Time</th><th>Kills</th><th>Deaths</th></tr></thead><tbody>${operation.players.map(player => `<tr><td class="player-link">${escapeHTML(player.name)}</td><td>${escapeHTML(player.role || "—")}</td><td>${escapeHTML(player.group || "—")}</td><td>${formatDuration(player.playtimeSeconds || 0)}</td><td>${player.kills || 0}</td><td>${player.deaths || 0}</td></tr>`).join("")}</tbody></table></div>`;
}

loadArchive().then(data => {
  if (document.body.dataset.page === "players") return renderPlayers(data);
  if (document.body.dataset.page === "operation") return renderOperation(data);
  return renderOperations(data);
}).catch(error => {
  document.querySelector("#archive-status").textContent = "Archive unavailable";
  const target = document.querySelector("#operation-list") || document.querySelector("#player-list") || document.querySelector("#operation-detail");
  target.innerHTML = target.tagName === "TBODY" ? '<tr><td colspan="6">Personnel data could not be loaded.</td></tr>' : '<div class="empty">Operation data could not be loaded.</div>';
  console.error(error);
});
