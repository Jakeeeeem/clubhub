// Minimal helper for Camp Admin UI (frontend/camp-admin.js)
async function api(path, opts = {}) {
  opts.headers = opts.headers || { "Content-Type": "application/json" };
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function $id(n) {
  return document.getElementById(n);
}

document.getElementById("loadGroups").addEventListener("click", async () => {
  const eventId = $id("eventId").value.trim();
  if (!eventId) return alert("Enter event id");
  try {
    const groups = await api(`/api/events/${eventId}/groups`);
    $id("groupsList").textContent = JSON.stringify(groups, null, 2);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("createGroup").addEventListener("click", async () => {
  const eventId = $id("eventId").value.trim();
  const name = $id("groupName").value.trim();
  const coachId = $id("groupCoach").value.trim() || null;
  if (!eventId || !name) return alert("Event id and group name required");
  try {
    const created = await api(`/api/events/${eventId}/groups`, {
      method: "POST",
      body: JSON.stringify({ name, coachId }),
    });
    alert("Created: " + (created.name || created.id));
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("assignToGroup").addEventListener("click", async () => {
  const eventId = $id("eventId").value.trim();
  const playerId = $id("assignPlayerId").value.trim();
  const groupId = $id("assignGroupId").value.trim();
  if (!eventId || !playerId || !groupId)
    return alert("Provide event, player and group");
  try {
    await api(`/api/events/${eventId}/assign-group`, {
      method: "POST",
      body: JSON.stringify({ playerId, groupId }),
    });
    alert("Assigned");
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("assignBib").addEventListener("click", async () => {
  const eventId = $id("eventId").value.trim();
  const playerId = $id("bibPlayerId").value.trim();
  const bibNumber = $id("bibNumber").value.trim();
  const bibColor = $id("bibColor").value.trim();
  if (!eventId || !playerId || !bibNumber)
    return alert("Event, player and bib number required");
  try {
    const res = await api(`/api/events/${eventId}/bibs`, {
      method: "POST",
      body: JSON.stringify({ playerId, bibNumber, bibColor }),
    });
    alert("Bib saved: " + res.bib_number);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("exportCsv").addEventListener("click", () => {
  const eventId = $id("eventId").value.trim();
  if (!eventId) return alert("Enter event id");
  // Navigate to export endpoint to trigger CSV download
  window.location = `/api/events/${eventId}/export`;
});

document.getElementById("checkinBtn").addEventListener("click", async () => {
  const eventId = $id("eventId").value.trim();
  const playerId = $id("checkinPlayer").value.trim();
  if (!eventId || !playerId) return alert("Event and player required");
  try {
    await api(`/api/events/${eventId}/checkin`, {
      method: "POST",
      body: JSON.stringify({ playerId }),
    });
    alert("Checked in");
  } catch (err) {
    alert(err.message);
  }
});

// Expose for console debugging
window.CampAdmin = { api };
