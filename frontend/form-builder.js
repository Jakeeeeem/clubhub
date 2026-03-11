/* =========================================================
           State
           ========================================================= */
let fields = []; // current form's field defs
let selectedFieldIdx = -1;
let currentFormId = null; // null for new forms
let dragSrcType = null; // dragging from palette

/* =========================================================
           Boot
           ========================================================= */
if (typeof document !== "undefined")
  document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("authToken");
    if (!token) return (window.location.href = "index.html");
    loadMyForms();
    initDnD();
  });

/* =========================================================
           API helpers
           ========================================================= */
const API =
  (typeof window !== "undefined" && window.API_BASE) ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "");

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("authToken");
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* =========================================================
           Forms list
           ========================================================= */
async function loadMyForms() {
  try {
    const { forms } = await apiFetch("/api/forms");
    const container = document.getElementById("myFormsContainer");
    if (!forms.length) {
      container.innerHTML =
        '<p style="color:var(--text-muted); font-size:0.85rem;">No forms yet. Click + New Form to start.</p>';
      return;
    }
    container.innerHTML = forms
      .map(
        (f) => `
            <div class="form-list-item" onclick="loadForm('${f.id}')">
                <div>
                    <div class="form-list-item-title">${f.title}</div>
                    <div class="form-list-item-meta">${new Date(f.created_at).toLocaleDateString()}</div>
                </div>
                <span class="badge-responses">${f.response_count} resp.</span>
            </div>
        `,
      )
      .join("");
  } catch (e) {
    document.getElementById("myFormsContainer").innerHTML =
      `<p style="color:#f87171; font-size:0.85rem;">Failed to load forms</p>`;
  }
}

/* =========================================================
           New / Load form
           ========================================================= */
function newForm() {
  currentFormId = null;
  fields = [];
  selectedFieldIdx = -1;
  document.getElementById("formTitle").value = "";
  document.getElementById("formDescription").value = "";
  document.getElementById("btnViewResponses").style.display = "none";
  document.getElementById("btnShareLink").style.display = "none";
  renderCanvas();
  clearProps();
}

async function loadForm(id) {
  try {
    const { form } = await apiFetch(`/api/forms/${id}`);
    currentFormId = id;
    document.getElementById("formTitle").value = form.title;
    document.getElementById("formDescription").value = form.description || "";
    fields = form.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.field_type,
      required: f.is_required,
      options: f.options ? (Array.isArray(f.options) ? f.options : []) : [],
    }));
    selectedFieldIdx = -1;
    document.getElementById("btnViewResponses").style.display = "";
    document.getElementById("btnShareLink").style.display = "";
    renderCanvas();
    clearProps();
  } catch (e) {
    showToast("❌ Failed to load form: " + e.message);
  }
}

/* =========================================================
           Canvas rendering
           ========================================================= */
function renderCanvas() {
  const canvas = document.getElementById("fieldCanvas");
  canvas.classList.toggle("empty", fields.length === 0);

  if (fields.length === 0) {
    canvas.innerHTML = "";
    return;
  }

  canvas.innerHTML = fields
    .map(
      (f, i) => `
                <div class="field-row ${selectedFieldIdx === i ? "selected" : ""}"
                     style="width: ${f.width === "50%" ? "calc(50% - 0.5rem)" : "100%"}; display: ${f.width === "50%" ? "inline-flex" : "flex"}; vertical-align: top; margin-right: ${f.width === "50%" ? "0.5rem" : "0"};"
                     onclick="selectField(${i})"
                     draggable="true"
                     data-index="${i}"
                     ondragstart="onRowDragStart(event, ${i})"
                     ondragover="onRowDragOver(event)"
                     ondrop="onRowDrop(event, ${i})">
                    
                    <div class="field-row-handle">⠿</div>
                    
                    <div class="field-row-header">
                        <div class="field-row-label">
                            ${f.label || "Untitled field"}
                            ${f.required ? '<span style="color:#f87171; margin-left:4px;">*</span>' : ""}
                        </div>
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">
                            ${f.type}
                        </div>
                    </div>

                    <div class="field-mock-input">
                        ${renderMockInput(f)}
                    </div>

                    <button class="field-row-delete" onclick="event.stopPropagation(); deleteField(${i})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            `,
    )
    .join("");
}

function renderMockInput(f) {
  switch (f.type) {
    case "select":
    case "multiselect":
      return `<div style="padding:0.6rem; font-size:0.8rem; opacity:0.5;">Choose from: ${f.options?.join(", ") || "no options"}</div>`;
    case "textarea":
      return `<div style="padding:0.6rem; font-size:0.8rem; opacity:0.3;">Long answer text...</div>`;
    case "checkbox":
      return `<div style="padding:0.6rem; font-size:0.8rem; opacity:0.5;">[ ] ${f.options?.[0] || "Option"}</div>`;
    default:
      return `<div style="padding:0.6rem; font-size:0.8rem; opacity:0.3;">${f.hint || "Short answer text..."}</div>`;
  }
}

/* =========================================================
           Field operations
           ========================================================= */
function addField(type) {
  const labels = {
    text: "Text Answer",
    number: "Number",
    email: "Email",
    phone: "Phone",
    date: "Date",
    textarea: "Paragraph",
    select: "Dropdown",
    multiselect: "Multi-select",
    checkbox: "Checkbox",
    file: "File Upload",
  };
  fields.push({
    label: labels[type] || "Field",
    type,
    required: false,
    options: ["select", "multiselect", "checkbox"].includes(type)
      ? ["Option 1"]
      : [],
  });
  selectedFieldIdx = fields.length - 1;
  renderCanvas();
  renderProps(selectedFieldIdx);
}

function deleteField(idx) {
  fields.splice(idx, 1);
  if (selectedFieldIdx >= fields.length) selectedFieldIdx = fields.length - 1;
  renderCanvas();
  if (selectedFieldIdx >= 0) renderProps(selectedFieldIdx);
  else clearProps();
}

function selectField(idx) {
  selectedFieldIdx = idx;
  renderCanvas();
  renderProps(idx);
}

/* =========================================================
           Props panel
           ========================================================= */
function renderProps(idx) {
  const f = fields[idx];
  const needsOptions = ["select", "multiselect", "checkbox"].includes(f.type);

  document.getElementById("propsContent").innerHTML = `
        <div class="prop-group">
            <label>Label</label>
            <input type="text" id="propLabel" value="${f.label}" oninput="updateField(${idx}, 'label', this.value)">
        </div>
        <div class="prop-group">
            <label>Placeholder / Hint (optional)</label>
            <input type="text" id="propHint" value="${f.hint || ""}" oninput="updateField(${idx}, 'hint', this.value)">
        </div>
        <div class="prop-group">
            <label>Field Width</label>
            <select onchange="updateField(${idx}, 'width', this.value)" style="width: 100%;" class="form-control">
                <option value="100%" ${f.width === "100%" ? "selected" : ""}>Full Width (1/1)</option>
                <option value="50%" ${f.width === "50%" ? "selected" : ""}>Half Width (1/2)</option>
            </select>
        </div>
        <div class="prop-group">
            <div class="toggle-row">
                <label>Required</label>
                <label class="toggle-switch-sm">
                    <input type="checkbox" id="propRequired" ${f.required ? "checked" : ""} onchange="updateField(${idx}, 'required', this.checked)">
                    <span></span>
                </label>
            </div>
        </div>
        ${
          needsOptions
            ? `
        <div class="prop-group">
            <label>Options</label>
            <div class="options-builder" id="optionsBuilder">
                ${(f.options || [])
                  .map(
                    (o, oi) => `
                    <div class="option-row">
                        <input type="text" value="${o}" oninput="updateOption(${idx}, ${oi}, this.value)">
                        <button onclick="removeOption(${idx}, ${oi})">✕</button>
                    </div>
                `,
                  )
                  .join("")}
            </div>
            <button class="btn-add-option" onclick="addOption(${idx})">+ Add Option</button>
        </div>`
            : ""
        }
    `;
}

function clearProps() {
  document.getElementById("propsContent").innerHTML =
    '<div class="props-placeholder">🖱 Click a field on the canvas to edit its properties</div>';
}

function updateField(idx, key, value) {
  fields[idx][key] = value;
  if (key === "label") {
    // update label in row instantly without full re-render
    const rows = document.querySelectorAll(".field-row");
    if (rows[idx])
      rows[idx].querySelector(".field-row-label").textContent =
        value || "Untitled field";
  }
  if (key === "required") renderCanvas();
}

function addOption(idx) {
  fields[idx].options = fields[idx].options || [];
  fields[idx].options.push("Option " + (fields[idx].options.length + 1));
  renderProps(idx);
}

function removeOption(idx, oi) {
  fields[idx].options.splice(oi, 1);
  renderProps(idx);
}

function updateOption(idx, oi, value) {
  fields[idx].options[oi] = value;
}

/* =========================================================
           Drag & Drop — palette → canvas
           ========================================================= */
function initDnD() {
  document.querySelectorAll(".field-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (e) => {
      dragSrcType = chip.dataset.type;
      e.dataTransfer.effectAllowed = "copy";
    });
  });

  const canvas = document.getElementById("fieldCanvas");
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    canvas.classList.add("drag-over");
  });
  canvas.addEventListener("dragleave", () =>
    canvas.classList.remove("drag-over"),
  );
  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    canvas.classList.remove("drag-over");
    if (dragSrcType) {
      addField(dragSrcType);
      dragSrcType = null;
    }
  });
}

/* ── Reordering rows ── */
let dragRowSrc = -1;
function onRowDragStart(e, idx) {
  dragRowSrc = idx;
  dragSrcType = null;
  e.dataTransfer.effectAllowed = "move";
}
function onRowDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function onRowDrop(e, targetIdx) {
  e.stopPropagation();
  if (dragRowSrc < 0 || dragRowSrc === targetIdx) return;
  const moved = fields.splice(dragRowSrc, 1)[0];
  fields.splice(targetIdx, 0, moved);
  selectedFieldIdx = targetIdx;
  dragRowSrc = -1;
  renderCanvas();
  renderProps(selectedFieldIdx);
}

/* =========================================================
           Save
           ========================================================= */
async function saveForm() {
  const title = document.getElementById("formTitle").value.trim();
  if (!title) return showToast("⚠️ Please add a form title");
  if (fields.length === 0) return showToast("⚠️ Add at least one field");

  const btn = document.getElementById("btnSaveForm");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const payload = {
    title,
    description:
      document.getElementById("formDescription").value.trim() || null,
    fields: fields.map((f, i) => ({
      label: f.label,
      fieldType: f.type,
      isRequired: !!f.required,
      options: f.options && f.options.length ? f.options : null,
      sortOrder: i,
    })),
  };

  try {
    if (currentFormId) {
      // For existing forms: update header only (field editing would need separate endpoint in the future)
      await apiFetch(`/api/forms/${currentFormId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
        }),
      });
      showToast("✅ Form updated!");
    } else {
      const { form } = await apiFetch("/api/forms", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      currentFormId = form.id;
      document.getElementById("btnViewResponses").style.display = "";
      document.getElementById("btnShareLink").style.display = "";
      showToast("✅ Form created!");
    }
    loadMyForms();
  } catch (e) {
    showToast("❌ " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Save Form";
  }
}

/* =========================================================
           Preview
           ========================================================= */
function openPreview() {
  const title = document.getElementById("formTitle").value || "Form Preview";
  document.getElementById("previewTitle").textContent = title;
  document.getElementById("previewBody").innerHTML =
    fields
      .map(
        (f) => `
        <div class="preview-field">
            <label>${f.label}${f.required ? '<span class="req">*</span>' : ""}</label>
            ${renderPreviewInput(f)}
        </div>
    `,
      )
      .join("") || '<p style="color:var(--text-muted)">No fields yet.</p>';
  document.getElementById("previewModal").classList.add("open");
}

function renderPreviewInput(f) {
  switch (f.type) {
    case "textarea":
      return `<textarea rows="3" placeholder="${f.hint || ""}"></textarea>`;
    case "select":
      return `<select><option value="">Choose...</option>${(f.options || []).map((o) => `<option>${o}</option>`).join("")}</select>`;
    case "multiselect":
      return (f.options || [])
        .map(
          (o) =>
            `<label style="display:flex;gap:.5rem;align-items:center;"><input type="checkbox"> ${o}</label>`,
        )
        .join("");
    case "checkbox":
      return (f.options || [])
        .map(
          (o) =>
            `<label style="display:flex;gap:.5rem;align-items:center;"><input type="checkbox"> ${o}</label>`,
        )
        .join("");
    case "date":
      return `<input type="date">`;
    case "number":
      return `<input type="number" placeholder="${f.hint || ""}">`;
    case "email":
      return `<input type="email" placeholder="${f.hint || "your@email.com"}">`;
    case "phone":
      return `<input type="tel" placeholder="${f.hint || "+44..."}">`;
    case "file":
      return `<input type="file">`;
    default:
      return `<input type="text" placeholder="${f.hint || ""}">`;
  }
}

function closePreview() {
  document.getElementById("previewModal").classList.remove("open");
}

/* =========================================================
           Responses & Share
           ========================================================= */
async function viewResponses() {
  if (!currentFormId) return;
  try {
    const { responses, total } = await apiFetch(
      `/api/forms/${currentFormId}/responses`,
    );
    if (total === 0) return showToast("📭 No responses yet for this form.");
    // Build a CSV-like preview in a new window
    const win = window.open("", "_blank");
    const headers = Object.keys(responses[0].response_data || {});
    win.document.write(
      `<html><head><title>Form Responses</title><style>body{font-family:system-ui;padding:2rem;background:#111;color:#eee;}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:.5rem .75rem;text-align:left}th{background:#1e1e2e}</style></head><body>`,
    );
    win.document.write(
      `<h2>📊 Responses — ${total} total</h2><table><thead><tr><th>Submitted</th><th>User</th>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>`,
    );
    responses.forEach((r) => {
      win.document.write(
        `<tr><td>${new Date(r.submitted_at).toLocaleString()}</td><td>${r.first_name ? r.first_name + " " + r.last_name : "Guest"}</td>${headers.map((h) => `<td>${r.response_data[h] ?? ""}</td>`).join("")}</tr>`,
      );
    });
    win.document.write("</tbody></table></body></html>");
    win.document.close();
  } catch (e) {
    showToast("❌ " + e.message);
  }
}

function copyShareLink() {
  if (!currentFormId) return;
  const url = `${window.location.origin}/public-form.html?formId=${currentFormId}`;
  navigator.clipboard
    .writeText(url)
    .then(() => showToast("🔗 Share link copied!"));
}

/* =========================================================
           Utility
           ========================================================= */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getFields: () => fields,
    setFields: (f) => (fields = f),
    getSelectedFieldIdx: () => selectedFieldIdx,
    setSelectedFieldIdx: (i) => (selectedFieldIdx = i),
    setDragRowSrc: (i) => (dragRowSrc = i),
    addField,
    deleteField,
    selectField,
    updateField,
    addOption,
    removeOption,
    updateOption,
    onRowDrop,
  };
}
