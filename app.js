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
  transaction: null
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
  tasksBody: document.getElementById('tasks-body')
};

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toDateInput(date) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function calculateDueDate(task) {
  if (task.manualOverrideDate) return task.manualOverrideDate;
  const anchorDate = state.transaction.anchors[task.anchorType] || null;
  if (!anchorDate) return null;

  const d = new Date(anchorDate);
  d.setDate(d.getDate() + task.offsetDays);
  return d.toISOString().slice(0, 10);
}

function updateTaskDueDate(task) {
  task.dueDate = calculateDueDate(task);
}

function recalcTasksForAnchor(anchorType) {
  for (const task of state.transaction.tasks) {
    if (task.anchorType !== anchorType) continue;
    if (task.manualOverrideDate) {
      task.dueDate = task.manualOverrideDate;
      continue;
    }
    updateTaskDueDate(task);
  }
}

function buildTask(task, source, anchorOverride) {
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

  updateTaskDueDate(built);
  return built;
}

function createTransaction(name, baseTemplateId) {
  const baseTemplate = baseTemplates.find((tpl) => tpl.id === baseTemplateId);
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

  state.transaction = tx;
  tx.tasks.push(...baseTemplate.tasks.map((task) => buildTask(task, baseTemplate.name, task.defaultAnchor)));
}

function applyPack(packId, anchorType, allowDuplicates = false) {
  const pack = stagePacks.find((item) => item.id === packId);
  if (!pack || !state.transaction) return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;

  for (const templateTask of pack.tasks) {
    const duplicate = state.transaction.tasks.find(
      (task) =>
        task.templateTaskId === templateTask.id ||
        task.normalizedTitle === normalizeTitle(templateTask.title)
    );

    if (duplicate && !allowDuplicates) {
      skipped += 1;
      continue;
    }

    state.transaction.tasks.push(buildTask(templateTask, pack.name, anchorType));
    added += 1;
  }

  if (!state.transaction.appliedPacks.some((item) => item.id === pack.id)) {
    state.transaction.appliedPacks.push({ id: pack.id, name: pack.name, anchorType });
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

function renderAnchors() {
  els.anchors.innerHTML = Object.entries(anchorLabels)
    .map(
      ([anchor, label]) => `
      <label>
        ${label} Date
        <input type="date" data-anchor="${anchor}" value="${toDateInput(state.transaction.anchors[anchor])}" />
      </label>
    `
    )
    .join('');
}

function renderPacks() {
  els.packsList.innerHTML = state.transaction.appliedPacks
    .map((pack) => {
      const anchor = pack.anchorType ? ` (${anchorLabels[pack.anchorType]})` : '';
      return `<li>${pack.name}${anchor}</li>`;
    })
    .join('');
}

function renderTasks() {
  const today = toDateInput(new Date());
  const anchorOptions = Object.entries(anchorLabels)
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join('');

  els.tasksBody.innerHTML = state.transaction.tasks
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

  for (const task of state.transaction.tasks) {
    const select = els.tasksBody.querySelector(`select[data-field="anchorType"][data-task-id="${task.id}"]`);
    if (select) {
      select.value = task.anchorType;
    }
  }
}

function renderTransaction() {
  if (!state.transaction) return;
  els.panel.hidden = false;
  els.title.textContent = state.transaction.name;
  renderAnchors();
  renderPacks();
  renderTasks();
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  createTransaction(els.name.value.trim(), els.baseTemplate.value);
  renderTransaction();
  els.form.reset();
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
  els.packDialog.close();
  window.alert(`Pack applied: ${added} task(s) added, ${skipped} duplicate(s) skipped.`);
});

els.anchors.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  const anchorType = target.dataset.anchor;
  if (!anchorType) return;

  state.transaction.anchors[anchorType] = target.value || null;
  recalcTasksForAnchor(anchorType);
  renderTasks();
});

els.tasksBody.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  const taskId = target.dataset.taskId;
  if (!taskId) return;

  const task = state.transaction.tasks.find((item) => item.id === taskId);
  if (!task) return;

  if (target instanceof HTMLInputElement && target.type === 'checkbox') {
    task.completed = target.checked;
    renderTasks();
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

  updateTaskDueDate(task);
  renderTasks();
});

renderTemplateSelectors();
