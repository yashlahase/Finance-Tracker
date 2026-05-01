let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));

const API_BASE = '/api';

// Global Chart instances
let catChart = null;
let monChart = null;
let reportChart = null;

// DOM Elements - Using a helper to ensure they exist
const getEl = (id) => document.getElementById(id);

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Navigation (Login/Register toggle)
    const showRegisterLink = getEl('show-register');
    const showLoginLink = getEl('show-login');
    const loginForm = getEl('login-form');
    const registerForm = getEl('register-form');

    if (showRegisterLink && loginForm && registerForm) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLoginLink && loginForm && registerForm) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    // Dashboard Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const tabEl = getEl(`${tabId}-tab`);
            if (tabEl) tabEl.classList.remove('hidden');

            if (tabId === 'budgets') loadBudgets();
            if (tabId === 'reports') loadReports();
        });
    });

    // Logout
    const logoutBtn = getEl('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            location.reload();
        });
    }

    // Initial State
    if (token && user) {
        showDashboard();
    } else {
        const authContainer = getEl('auth-container');
        if (authContainer) authContainer.classList.remove('hidden');
    }

    // Event Listeners for Forms
    setupFormListeners();
}

function setupFormListeners() {
    // Login
    const loginBtn = getEl('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            const email = getEl('login-email').value;
            const password = getEl('login-password').value;

            if (!email || !password) return alert('Please enter credentials');

            loginBtn.classList.add('loading');
            try {
                const data = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (data && data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    token = data.token;
                    user = data.user;
                    showDashboard();
                } else if (data) {
                    alert(data.error || 'Login failed');
                }
            } finally {
                loginBtn.classList.remove('loading');
            }
        });
    }

    // Register
    const registerBtn = getEl('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async (e) => {
            const name = getEl('reg-name').value;
            const email = getEl('reg-email').value;
            const password = getEl('reg-password').value;

            if (!name || !email || !password) return alert('Please fill all fields');

            registerBtn.classList.add('loading');
            try {
                const data = await apiFetch('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password })
                });

                if (data && data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    token = data.token;
                    user = data.user;
                    await createDefaultCategories();
                    showDashboard();
                } else if (data) {
                    alert(data.error || 'Registration failed');
                }
            } finally {
                registerBtn.classList.remove('loading');
            }
        });
    }

    // Transaction Form
    const transForm = getEl('transaction-form');
    if (transForm) {
        transForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const payload = {
                amount: parseFloat(getEl('trans-amount').value),
                type: getEl('trans-type').value,
                categoryId: getEl('trans-category').value,
                description: getEl('trans-desc').value,
                date: getEl('trans-date').value || new Date().toISOString()
            };

            if (payload.amount <= 0) return alert('Amount must be positive');

            btn.classList.add('loading');
            try {
                const data = await apiFetch('/transactions', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (data && data.id) {
                    getEl('modal-overlay').classList.add('hidden');
                    transForm.reset();
                    await showDashboard();
                } else if (data) {
                    alert(data.error || 'Failed to save');
                }
            } finally {
                btn.classList.remove('loading');
            }
        });
    }

    // Budget Form
    const budgetForm = getEl('budget-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const payload = {
                categoryId: getEl('budget-category').value,
                amount: parseFloat(getEl('budget-amount').value),
                month: parseInt(getEl('budget-month').value),
                year: parseInt(getEl('budget-year').value)
            };

            if (payload.amount <= 0) return alert('Amount must be positive');

            btn.classList.add('loading');
            try {
                const data = await apiFetch('/budgets', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (data && data.id) {
                    getEl('budget-modal-overlay').classList.add('hidden');
                    budgetForm.reset();
                    loadBudgets();
                } else if (data) {
                    alert(data.error || 'Failed to set budget');
                }
            } finally {
                btn.classList.remove('loading');
            }
        });
    }

    // Modal Overlays
    const openModalBtn = getEl('open-modal-btn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            getEl('modal-overlay').classList.remove('hidden');
            loadCategories('trans-category');
        });
    }

    const openBudgetModalBtn = getEl('open-budget-modal-btn');
    if (openBudgetModalBtn) {
        openBudgetModalBtn.addEventListener('click', () => {
            getEl('budget-modal-overlay').classList.remove('hidden');
            loadCategories('budget-category', 'EXPENSE');
        });
    }

    const closeModalBtn = getEl('close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => getEl('modal-overlay').classList.add('hidden'));

    const closeBudgetModalBtn = getEl('close-budget-modal');
    if (closeBudgetModalBtn) closeBudgetModalBtn.addEventListener('click', () => getEl('budget-modal-overlay').classList.add('hidden'));
}

async function showDashboard() {
    const authContainer = getEl('auth-container');
    const dashboardContainer = getEl('dashboard-container');
    
    if (authContainer) authContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');
    
    if (user && getEl('user-name')) {
        getEl('user-name').innerText = `Welcome, ${user.name}`;
    }

    // Load Overview Data
    const summary = await apiFetch('/dashboard/summary');
    if (summary) {
        if (getEl('total-balance')) getEl('total-balance').innerText = `$${parseFloat(summary.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (getEl('total-income')) getEl('total-income').innerText = `+$${parseFloat(summary.totalIncome).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (getEl('total-expense')) getEl('total-expense').innerText = `-$${parseFloat(summary.totalExpenses).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        renderCategoryChart(summary.categorySummary);
    }

    const report = await apiFetch('/dashboard/reports/monthly');
    if (report) renderMonthlyChart(report);

    const transactions = await apiFetch('/transactions');
    if (transactions) {
        const list = getEl('transaction-list');
        if (list) {
            list.innerHTML = transactions.map(t => `
                <tr>
                    <td>${new Date(t.date).toLocaleDateString()}</td>
                    <td>${t.category ? t.category.name : 'Unknown'}</td>
                    <td>${t.description || '-'}</td>
                    <td style="color: ${t.type === 'INCOME' ? 'var(--income)' : 'var(--expense)'}; font-weight: 600;">${t.type}</td>
                    <td style="text-align: right; font-weight: bold;">$${parseFloat(t.amount).toFixed(2)}</td>
                </tr>
            `).join('');
        }
    }
}

async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        if (res.status === 401) {
            localStorage.clear();
            location.reload();
            return null;
        }
        return res.json();
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

async function loadCategories(selectId, filterType = null) {
    const categories = await apiFetch('/categories');
    if (!categories) return;
    
    let filtered = categories;
    if (filterType) filtered = categories.filter(c => c.type === filterType);

    const select = getEl(selectId);
    if (select) {
        select.innerHTML = filtered.map(c => `
            <option value="${c.id}">${c.name}${!filterType ? ` (${c.type})` : ''}</option>
        `).join('');
    }
}

async function loadBudgets() {
    const budgets = await apiFetch('/budgets');
    if (!budgets) return;

    const list = getEl('budget-list');
    if (!list) return;

    if (budgets.length === 0) {
        list.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No budgets set yet. Start by setting a goal!</div>';
        return;
    }

    list.innerHTML = budgets.map(b => {
        const progress = Math.min(b.progress, 100);
        let statusClass = '';
        if (progress > 90) statusClass = 'danger';
        else if (progress > 70) statusClass = 'warning';

        return `
            <div class="card budget-card">
                <div class="budget-info">
                    <span class="budget-label">${b.category.name}</span>
                    <span class="budget-value">$${parseFloat(b.spent).toFixed(2)} / $${parseFloat(b.amount).toFixed(2)}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar ${statusClass}" style="width: ${progress}%"></div>
                </div>
                <div class="budget-status">
                    ${b.remaining >= 0 
                        ? `$${parseFloat(b.remaining).toFixed(2)} remaining` 
                        : `<span style="color: var(--expense)">$${Math.abs(b.remaining).toFixed(2)} over budget</span>`}
                </div>
                <button onclick="deleteBudget('${b.id}')" style="background: transparent; border: none; color: #ef4444; font-size: 0.8rem; margin-top: 1rem; cursor: pointer; opacity: 0.6;">Delete</button>
            </div>
        `;
    }).join('');
}

window.deleteBudget = async (id) => {
    if (!confirm('Are you sure?')) return;
    await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
    loadBudgets();
};

async function loadReports() {
    const yearEl = getEl('report-year');
    if (!yearEl) return;
    const year = yearEl.value;
    const data = await apiFetch(`/dashboard/reports/monthly?year=${year}`);
    if (!data) return;

    const canvas = getEl('reportMonthlyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportChart) reportChart.destroy();
    
    reportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                { label: 'Income', data: data.map(d => d.income), backgroundColor: '#10b981', borderRadius: 6 },
                { label: 'Expense', data: data.map(d => d.expense), backgroundColor: '#ef4444', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { position: 'top', labels: { color: '#f8fafc', font: { family: 'Outfit' } } } }
        }
    });

    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    if (getEl('annual-savings')) getEl('annual-savings').innerText = `$${savings.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    if (getEl('savings-rate')) getEl('savings-rate').innerText = `${savingsRate.toFixed(1)}%`;
}

function renderCategoryChart(summary) {
    const canvas = getEl('categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (catChart) catChart.destroy();
    const expenses = summary.filter(s => s.type === 'EXPENSE');
    catChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: expenses.map(s => s.categoryName),
            datasets: [{
                data: expenses.map(s => s.totalAmount),
                backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: { 
            cutout: '70%',
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit' } } } } 
        }
    });
}

function renderMonthlyChart(data) {
    const canvas = getEl('monthlyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (monChart) monChart.destroy();
    monChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month.substring(0, 3)),
            datasets: [
                { label: 'Income', data: data.map(d => d.income), backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Expense', data: data.map(d => d.expense), backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function createDefaultCategories() {
    const defaults = [
        { name: 'Salary', type: 'INCOME' },
        { name: 'Food', type: 'EXPENSE' },
        { name: 'Rent', type: 'EXPENSE' },
        { name: 'Entertainment', type: 'EXPENSE' },
        { name: 'Shopping', type: 'EXPENSE' },
        { name: 'Utilities', type: 'EXPENSE' }
    ];
    for (const cat of defaults) {
        await apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify(cat)
        });
    }
}
