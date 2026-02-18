const STORAGE_KEY = 'nestflow_state_v1';

const anchorLabels = {
  consult_date: 'Consult',
  list_date: 'List',
  contract_date: 'Contract',
  closing_date: 'Close',
  custom: 'Custom'
};

const baseTemplates = [
  {
    id: 'buyer',
    name: 'Buyer',
    tasks: [
      { id: 'buyer-consult', title: 'Buyer consultation', offsetDays: 0, defaultAnchor: 'consult_date' },
      { id: 'buyer-preapproval', title: 'Confirm pre-approval letter', offsetDays: 2, defaultAnchor: 'consult_date' }
    ]
  },
  {
    id: 'seller',
    name: 'Seller',
    tasks: [
      { id: 'seller-consult', title: 'Seller consultation', offsetDays: 0, defaultAnchor: 'consult_date' },
      { id: 'seller-disclosures', title: 'Draft disclosures', offsetDays: 3, defaultAnchor: 'consult_date' }
    ]
  },
  {
    id: 'prospect',
    name: 'Prospect',
    tasks: [
      { id: 'prospect-intro', title: 'Intro call', offsetDays: 0, defaultAnchor: 'consult_date' },
      { id: 'prospect-needs', title: 'Needs analysis', offsetDays: 2, defaultAnchor: 'consult_date' }
    ]
  }
];

const stagePacks = [
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    suggestedAnchor: 'list_date',
    tasks: [
      { id: 'cs-photography', title: 'Schedule photography', offsetDays: -7, defaultAnchor: 'list_date' },
      { id: 'cs-marketing', title: 'Prepare marketing remarks', offsetDays: -3, defaultAnchor: 'list_date' }
    ]
  },
  {
    id: 'on-market',
    name: 'On Market',
    suggestedAnchor: 'list_date',
    tasks: [
      { id: 'om-open-house', title: 'Host first open house', offsetDays: 4, defaultAnchor: 'list_date' },
      { id: 'om-feedback', title: 'Review showing feedback', offsetDays: 7, defaultAnchor: 'list_date' }
    ]
  },
  {
    id: 'under-contract',
    name: 'Under Contract',
    suggestedAnchor: 'contract_date',
    tasks: [
      { id: 'uc-escrow', title: 'Open escrow', offsetDays: 0, defaultAnchor: 'contract_date' },
      { id: 'uc-inspection', title: 'Inspection completed', offsetDays: 7, defaultAnchor: 'contract_date' }
    ]
  },
  {
    id: 'closing-week',
    name: 'Closing Week',
    suggestedAnchor: 'closing_date',
    tasks: [
      { id: 'cw-final-walkthrough', title: 'Final walkthrough', offsetDays: -2, defaultAnchor: 'closing_date' },
      { id: 'cw-funds', title: 'Verify wire/funds', offsetDays: -1, defaultAnchor: 'closing_date' }
    ]
  },
  {
    id: 'post-closing',
    name: 'Post Closing',
    suggestedAnchor: 'closing_date',
    tasks: [
      { id: 'pc-thankyou', title: 'Send thank you gift', offsetDays: 3, defaultAnchor: 'closing_date' },
      { id: 'pc-review', title: 'Request client review', offsetDays: 7, defaultAnchor: 'closing_date' }
    ]
  }
];

const state = {
  transactions: [],
  activeTransactionId: null,
  saveStatus: 'Saved'
};

const els = {
  baseTemplate: document.getElementById('base-template'),
  form: document.getElementById('transaction-form'),
  name: document.getElementById('transaction-name'),
  panel: document.getElementById('transaction-panel'),
  title: document.getElementById('transaction-title'),
  anchors: document.getElementById('anchors'),
  addPack: document.getElementById('add-pack'),
  packDialog: document.getElementById('pack-dialog'),
  packForm: document.getElementById('pack-form'),
  packSelect: document.getElementById('pack-select'),
  packAnchor: document.getElementById('pack-anchor'),
  allowDuplicates: document.getElementById('allow-duplicates'),
  packsList: document.getElementById('applied-packs'),
  tasksBody: document.getElementById('tasks-body'),
  saveIndicator: document.getElementById('save-indicator'),
  exportButton: document.getElementById('export-json'),
  importInput: document.getElementById('import-json'),
  transactionPicker: document.getElementById('transaction-picker')
};

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toDateInput(date) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function activeTransaction() {
  return state.transactions.find((tx) => tx.id === state.activeTransactionId) || null;
}

function setSaveIndicator(status) {
  state.saveStatus = status;
  els.saveIndicator.textContent = status;
  els.saveIndicator.classList.toggle('saving', status === 'Saving...');
  els.saveIndicator.classList.toggle('saved', status === 'Saved');
}

function calculateDueDate(transaction, task) {
  if (task.manualOverrideDate) return task.manualOverrideDate;
  const anchorDate = transaction.anchors[task.anchorType] || null;
  if (!anchorDate) return null;

  const d = new Date(anchorDate);
  d.setDate(d.getDate() + task.offsetDays);
  return d.toISOString().slice(0, 10);
}

function updateTaskDueDate(transaction, task) {
  task.dueDate = calculateDueDate(transaction, task);
}

function recalcTasksForAnchor(transaction, anchorType) {
  for (const task of transaction.tasks) {
    if (task.anchorType !== anchorType) continue;
    if (task.manualOverrideDate) {
      task.dueDate = task.manualOverrideDate;
      continue;
    }
    updateTaskDueDate(transaction, task);
  }
}

function buildTask(transaction, task, source, anchorOverride) {
  const anchorType = anchorOverride || task.defaultAnchor;
  const built = {
    id: crypto.randomUUID(),
    templateTaskId: task.id,
    title: task.title,
    normalizedTitle: normalizeTitle(task.title),
    anchorType,
    offsetDays: task.offsetDays,
    manualOverrideDate: null,
    dueDate: null,
    source,
    completed: false
  };

  updateTaskDueDate(transaction, built);
  return built;
}

function saveState() {
  try {
    setSaveIndicator('Saving...');
    const payload = {
      transactions: state.transactions,
      activeTransactionId: state.activeTransactionId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaveIndicator('Saved');
  } catch {
    setSaveIndicator('Save unavailable');
  }
}

function coerceImportedState(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (!Array.isArray(parsed.transactions)) return null;

  const safeTransactions = parsed.transactions
    .filter((tx) => tx && typeof tx === 'object' && typeof tx.id === 'string')
    .map((tx) => ({
      id: tx.id,
      name: typeof tx.name === 'string' ? tx.name : 'Untitled transaction',
      baseTemplateId: typeof tx.baseTemplateId === 'string' ? tx.baseTemplateId : 'buyer',
      anchors: {
        consult_date: tx.anchors?.consult_date || null,
        list_date: tx.anchors?.list_date || null,
        contract_date: tx.anchors?.contract_date || null,
        closing_date: tx.anchors?.closing_date || null,
        custom: tx.anchors?.custom || null
      },
      appliedPacks: Array.isArray(tx.appliedPacks) ? tx.appliedPacks : [],
      tasks: Array.isArray(tx.tasks)
        ? tx.tasks.map((task) => ({
            id: task.id || crypto.randomUUID(),
            templateTaskId: task.templateTaskId || '',
            title: task.title || 'Untitled task',
            normalizedTitle: normalizeTitle(task.title || 'Untitled task'),
            anchorType: Object.hasOwn(anchorLabels, task.anchorType) ? task.anchorType : 'consult_date',
            offsetDays: Number.isInteger(task.offsetDays) ? task.offsetDays : 0,
            manualOverrideDate: task.manualOverrideDate || null,
            dueDate: null,
            source: task.source || 'Imported',
            completed: Boolean(task.completed)
          }))
        : []
    }));

  const nextActive = safeTransactions.some((tx) => tx.id === parsed.activeTransactionId)
    ? parsed.activeTransactionId
    : safeTransactions[0]?.id || null;

  for (const tx of safeTransactions) {
    for (const task of tx.tasks) {
      updateTaskDueDate(tx, task);
    }
  }

  return {
    transactions: safeTransactions,
    activeTransactionId: nextActive
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setSaveIndicator('Saved');
      return;
    }
    const parsed = JSON.parse(raw);
    const hydrated = coerceImportedState(parsed);
    if (!hydrated) {
      setSaveIndicator('Saved');
      return;
    }

    state.transactions = hydrated.transactions;
    state.activeTransactionId = hydrated.activeTransactionId;
    setSaveIndicator('Saved');
  } catch {
    setSaveIndicator('Save unavailable');
  }
}

function createTransaction(name, baseTemplateId) {
  const baseTemplate = baseTemplates.find((tpl) => tpl.id === baseTemplateId);
  if (!baseTemplate) return;

  const tx = {
    id: crypto.randomUUID(),
    name,
    baseTemplateId,
    anchors: {
      consult_date: toDateInput(new Date()),
      list_date: null,
      contract_date: null,
      closing_date: null,
      custom: null
    },
    appliedPacks: [{ id: baseTemplate.id, name: `${baseTemplate.name} (base)` }],
    tasks: []
  };

  tx.tasks.push(...baseTemplate.tasks.map((task) => buildTask(tx, task, baseTemplate.name, task.defaultAnchor)));
  state.transactions.unshift(tx);
  state.activeTransactionId = tx.id;
}

function applyPack(packId, anchorType, allowDuplicates = false) {
  const pack = stagePacks.find((item) => item.id === packId);
  const transaction = activeTransaction();
  if (!pack || !transaction) return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;

  for (const templateTask of pack.tasks) {
    const duplicate = transaction.tasks.find(
      (task) =>
        task.templateTaskId === templateTask.id ||
        task.normalizedTitle === normalizeTitle(templateTask.title)
    );

    if (duplicate && !allowDuplicates) {
      skipped += 1;
      continue;
    }

    transaction.tasks.push(buildTask(transaction, templateTask, pack.name, anchorType));
    added += 1;
  }

  if (!transaction.appliedPacks.some((item) => item.id === pack.id)) {
    transaction.appliedPacks.push({ id: pack.id, name: pack.name, anchorType });
  }

  return { added, skipped };
}

function renderTemplateSelectors() {
  els.baseTemplate.innerHTML = baseTemplates
    .map((tpl) => `<option value="${tpl.id}">${tpl.name}</option>`)
    .join('');

  els.packSelect.innerHTML = stagePacks
    .map((pack) => `<option value="${pack.id}">${pack.name}</option>`)
    .join('');

  const anchorOptions = Object.entries(anchorLabels)
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join('');
  els.packAnchor.innerHTML = anchorOptions;
}

function renderTransactionPicker() {
  els.transactionPicker.innerHTML = state.transactions
    .map((tx) => `<option value="${tx.id}">${tx.name}</option>`)
    .join('');

  if (state.activeTransactionId) {
    els.transactionPicker.value = state.activeTransactionId;
  }
}

function renderAnchors(transaction) {
  els.anchors.innerHTML = Object.entries(anchorLabels)
    .map(
      ([anchor, label]) => `
      <label>
        ${label} Date
        <input type="date" data-anchor="${anchor}" value="${toDateInput(transaction.anchors[anchor])}" />
      </label>
    `
    )
    .join('');
}

function renderPacks(transaction) {
  els.packsList.innerHTML = transaction.appliedPacks
    .map((pack) => {
      const anchor = pack.anchorType ? ` (${anchorLabels[pack.anchorType]})` : '';
      return `<li>${pack.name}${anchor}</li>`;
    })
    .join('');
}

function renderTasks(transaction) {
  const today = toDateInput(new Date());
  const anchorOptions = Object.entries(anchorLabels)
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join('');

  els.tasksBody.innerHTML = transaction.tasks
    .map((task) => {
      const overdue = task.dueDate && task.dueDate < today && !task.completed;
      const dueClass = task.completed ? 'task-complete' : overdue ? 'task-overdue' : '';

      return `
        <tr>
          <td><input type="checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} /></td>
          <td>${task.title}</td>
          <td>
            <select data-field="anchorType" data-task-id="${task.id}">
              ${anchorOptions}
            </select>
          </td>
          <td>
            <input type="number" data-field="offsetDays" data-task-id="${task.id}" value="${task.offsetDays}" />
          </td>
          <td>
            <input type="date" data-field="manualOverrideDate" data-task-id="${task.id}" value="${task.manualOverrideDate || ''}" />
            <div class="due-chip ${dueClass}">${task.dueDate || 'Awaiting anchor date'}</div>
          </td>
          <td>${task.source}</td>
        </tr>
      `;
    })
    .join('');

  for (const task of transaction.tasks) {
    const select = els.tasksBody.querySelector(`select[data-field="anchorType"][data-task-id="${task.id}"]`);
    if (select) select.value = task.anchorType;
  }
}

function renderTransaction() {
  const transaction = activeTransaction();
  renderTransactionPicker();

  if (!transaction) {
    els.panel.hidden = true;
    return;
  }

  els.panel.hidden = false;
  els.title.textContent = transaction.name;
  renderAnchors(transaction);
  renderPacks(transaction);
  renderTasks(transaction);
}

function exportState() {
  const payload = {
    transactions: state.transactions,
    activeTransactionId: state.activeTransactionId
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nestflow-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importState(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const hydrated = coerceImportedState(parsed);
      if (!hydrated) {
        window.alert('Import failed: file is not a valid NestFlow backup.');
        return;
      }

      state.transactions = hydrated.transactions;
      state.activeTransactionId = hydrated.activeTransactionId;
      saveState();
      renderTransaction();
      window.alert('Import complete.');
    } catch {
      window.alert('Import failed: could not read JSON.');
    }
  };

  reader.readAsText(file);
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  createTransaction(els.name.value.trim(), els.baseTemplate.value);
  renderTransaction();
  saveState();
  els.form.reset();
});

els.transactionPicker.addEventListener('change', () => {
  state.activeTransactionId = els.transactionPicker.value || null;
  renderTransaction();
  saveState();
});

els.addPack.addEventListener('click', () => {
  const selectedPack = stagePacks.find((pack) => pack.id === els.packSelect.value) || stagePacks[0];
  els.packAnchor.value = selectedPack.suggestedAnchor;
  els.allowDuplicates.checked = false;
  els.packDialog.showModal();
});

els.packSelect.addEventListener('change', () => {
  const selectedPack = stagePacks.find((pack) => pack.id === els.packSelect.value);
  if (selectedPack) {
    els.packAnchor.value = selectedPack.suggestedAnchor;
  }
});

els.packForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const { added, skipped } = applyPack(
    els.packSelect.value,
    els.packAnchor.value,
    els.allowDuplicates.checked
  );
  renderTransaction();
  saveState();
  els.packDialog.close();
  window.alert(`Pack applied: ${added} task(s) added, ${skipped} duplicate(s) skipped.`);
});

els.anchors.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  const anchorType = target.dataset.anchor;
  const transaction = activeTransaction();
  if (!anchorType || !transaction) return;

  transaction.anchors[anchorType] = target.value || null;
  recalcTasksForAnchor(transaction, anchorType);
  renderTasks(transaction);
  saveState();
});

els.tasksBody.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  const taskId = target.dataset.taskId;
  const transaction = activeTransaction();
  if (!taskId || !transaction) return;

  const task = transaction.tasks.find((item) => item.id === taskId);
  if (!task) return;

  if (target instanceof HTMLInputElement && target.type === 'checkbox') {
    task.completed = target.checked;
    renderTasks(transaction);
    saveState();
    return;
  }

  const field = target.dataset.field;
  if (!field) return;

  if (field === 'anchorType' && target instanceof HTMLSelectElement) {
    task.anchorType = target.value;
  } else if (field === 'offsetDays' && target instanceof HTMLInputElement) {
    const parsed = Number.parseInt(target.value, 10);
    task.offsetDays = Number.isNaN(parsed) ? 0 : parsed;
  } else if (field === 'manualOverrideDate' && target instanceof HTMLInputElement) {
    task.manualOverrideDate = target.value || null;
  }

  updateTaskDueDate(transaction, task);
  renderTasks(transaction);
  saveState();
});

els.exportButton.addEventListener('click', () => {
  exportState();
});

els.importInput.addEventListener('change', () => {
  const file = els.importInput.files?.[0];
  if (file) {
    importState(file);
  }
  els.importInput.value = '';
});

renderTemplateSelectors();
loadState();
renderTransaction();
