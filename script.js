const STORAGE_KEY = "family_expenses";

let transactions = [];
let currentFilter = "all";

const elements = {
  totalIncome: document.querySelector("#total-income"),
  totalExpense: document.querySelector("#total-expense"),
  balance: document.querySelector("#balance"),
  form: document.querySelector("#transaction-form"),
  type: document.querySelector("#type"),
  amount: document.querySelector("#amount"),
  description: document.querySelector("#description"),
  category: document.querySelector("#category"),
  date: document.querySelector("#date"),
  error: document.querySelector("#form-error"),
  tableBody: document.querySelector("#transactions-body"),
  filterButtons: document.querySelectorAll("[data-filter]"),
  downloadWeekly: document.querySelector("#download-weekly"),
  downloadMonthly: document.querySelector("#download-monthly"),
};

function init() {
  setDefaultDate();
  loadTransactionsFromStorage();
  renderAll();
  attachEvents();
}

function setDefaultDate() {
  const today = new Date();
  elements.date.value = today.toISOString().slice(0, 10);
}

function attachEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.tableBody.addEventListener("click", handleDelete);
  elements.filterButtons.forEach((btn) =>
    btn.addEventListener("click", handleFilterClick)
  );
  elements.downloadWeekly.addEventListener("click", () =>
    downloadReport("week")
  );
  elements.downloadMonthly.addEventListener("click", () =>
    downloadReport("month")
  );
}

function handleSubmit(event) {
  event.preventDefault();
  elements.error.textContent = "";

  const type = elements.type.value;
  const amount = parseFloat(elements.amount.value);
  const description = elements.description.value.trim();
  const category = elements.category.value.trim();
  const date = elements.date.value;

  if (!description || Number.isNaN(amount) || amount <= 0 || !date) {
    elements.error.textContent = "Please enter a valid amount, date, and description.";
    return;
  }

  const transaction = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    type,
    amount,
    description,
    category: category || "Uncategorized",
    date,
  };

  addTransaction(transaction);
  elements.form.reset();
  setDefaultDate();
}

function handleDelete(event) {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  const id = button.getAttribute("data-id");
  deleteTransaction(id);
}

function handleFilterClick(event) {
  const filter = event.target.getAttribute("data-filter");
  if (!filter) return;
  currentFilter = filter;
  setActiveFilterButton(filter);
  renderTransactions();
}

function addTransaction(transaction) {
  transactions.push(transaction);
  saveTransactionsToStorage();
  renderAll();
}

function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactionsToStorage();
  renderAll();
}

function loadTransactionsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      transactions = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load transactions:", error);
    transactions = [];
  }
}

function saveTransactionsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Failed to save transactions:", error);
  }
}

function calculateTotals() {
  let income = 0;
  let expense = 0;
  transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });
  return {
    income,
    expense,
    balance: income - expense,
  };
}

function renderSummary() {
  const { income, expense, balance } = calculateTotals();
  elements.totalIncome.textContent = formatCurrency(income);
  elements.totalExpense.textContent = formatCurrency(expense);
  elements.balance.textContent = formatCurrency(balance);
}

function renderTransactions() {
  elements.tableBody.innerHTML = "";
  const filtered = filterTransactionsByType(currentFilter);

  if (!filtered.length) {
    elements.tableBody.innerHTML =
      '<tr id="empty-state"><td class="empty" colspan="6">No transactions found.</td></tr>';
    return;
  }

  const rows = filtered
    .map(
      (t) => `
      <tr>
        <td>${formatDisplayDate(t.date)}</td>
        <td>${escapeHtml(t.description)}</td>
        <td>${escapeHtml(t.category)}</td>
        <td><span class="badge ${t.type}">${capitalize(t.type)}</span></td>
        <td class="right">${formatCurrency(t.amount)}</td>
        <td class="right">
          <button class="delete-btn" data-id="${t.id}" title="Delete">×</button>
        </td>
      </tr>
    `
    )
    .join("");

  elements.tableBody.innerHTML = rows;
}

function filterTransactionsByType(filter) {
  if (filter === "all") return [...transactions];
  return transactions.filter((t) => t.type === filter);
}

function setActiveFilterButton(active) {
  elements.filterButtons.forEach((btn) => {
    const isActive = btn.getAttribute("data-filter") === active;
    btn.classList.toggle("active", isActive);
  });
}

function renderAll() {
  renderSummary();
  renderTransactions();
}

function formatCurrency(value) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 Sunday ... 6 Saturday
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function endOfCurrentWeek() {
  const start = startOfCurrentWeek();
  const sunday = new Date(start);
  sunday.setDate(start.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

function filterByRange(range) {
  let start;
  let end;

  if (range === "week") {
    start = startOfCurrentWeek();
    end = endOfCurrentWeek();
  } else {
    start = startOfCurrentMonth();
    end = endOfCurrentMonth();
  }

  return transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return d >= start && d <= end;
  });
}

function downloadReport(range) {
  const scoped = filterByRange(range);
  const totals = scoped.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  const balance = totals.income - totals.expense;

  const heading =
    range === "week"
      ? "Weekly Report (Mon-Sun, current week)"
      : "Monthly Report (Current month)";

  const rows =
    scoped.length === 0
      ? "<tr><td colspan='5'>No transactions in this range.</td></tr>"
      : scoped
          .map(
            (t) => `
        <tr>
          <td>${formatDisplayDate(t.date)}</td>
          <td>${escapeHtml(t.description)}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${capitalize(t.type)}</td>
          <td style="text-align:right">${formatCurrency(t.amount)}</td>
        </tr>`
          )
          .join("");

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) return;

  reportWindow.document.write(`
    <html>
      <head>
        <title>${heading}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1f2933; }
          h1 { margin: 0 0 6px 0; }
          h2 { margin: 4px 0 16px 0; color: #5d6a75; font-size: 1rem; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e1e6ef; padding: 8px; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .summary { margin-top: 12px; }
          .summary strong { display: inline-block; width: 140px; }
        </style>
      </head>
      <body>
        <h1>${heading}</h1>
        <h2>Generated on ${formatDisplayDate(new Date().toISOString().slice(0,10))}</h2>
        <div class="summary">
          <div><strong>Total Income:</strong> ${formatCurrency(totals.income)}</div>
          <div><strong>Total Expense:</strong> ${formatCurrency(totals.expense)}</div>
          <div><strong>Balance:</strong> ${formatCurrency(balance)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.onload = () => { window.print(); window.close(); };
        <\/script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

document.addEventListener("DOMContentLoaded", init);

