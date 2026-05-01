let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));

const API_BASE = '/api';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const modalOverlay = document.getElementById('modal-overlay');
const transCategory = document.getElementById('trans-category');

// Navigation
document.getElementById('show-register').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Initialize
if (token) {
    showDashboard();
}

// Authentication Helper
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    
    if (res.status === 401) {
        localStorage.clear();
        location.reload();
        return null;
    }
    
    return res.json();
}

// Login logic
document.getElementById('login-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.classList.add('loading');
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
        btn.classList.remove('loading');
    }
});

// Register logic
document.getElementById('register-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    btn.classList.add('loading');
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
            
            // Bonus: Create default categories for new user
            await createDefaultCategories();
            showDashboard();
        } else if (data) {
            alert(data.error || 'Registration failed');
        }
    } finally {
        btn.classList.remove('loading');
    }
});

async function createDefaultCategories() {
    const defaults = [
        { name: 'Salary', type: 'INCOME' },
        { name: 'Food', type: 'EXPENSE' },
        { name: 'Rent', type: 'EXPENSE' },
        { name: 'Entertainment', type: 'EXPENSE' }
    ];
    for (const cat of defaults) {
        await apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify(cat)
        });
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// Dashboard Actions
document.getElementById('open-modal-btn').addEventListener('click', () => {
    modalOverlay.classList.remove('hidden');
    loadCategories();
});

document.getElementById('close-modal').addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

async function loadCategories() {
    const categories = await apiFetch('/categories');
    if (!categories) return;
    transCategory.innerHTML = categories.map(c => `
        <option value="${c.id}">${c.name} (${c.type})</option>
    `).join('');
}

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const payload = {
        amount: parseFloat(document.getElementById('trans-amount').value),
        type: document.getElementById('trans-type').value,
        categoryId: document.getElementById('trans-category').value,
        description: document.getElementById('trans-desc').value,
        date: document.getElementById('trans-date').value || new Date().toISOString()
    };

    btn.classList.add('loading');
    try {
        const data = await apiFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (data && data.id) {
            modalOverlay.classList.add('hidden');
            document.getElementById('transaction-form').reset();
            await showDashboard();
        } else if (data) {
            alert(data.error || 'Failed to save');
        }
    } finally {
        btn.classList.remove('loading');
    }
});

// Dashboard Rendering
async function showDashboard() {
    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    document.getElementById('user-name').innerText = `Welcome, ${user.name}`;
    
    const summary = await apiFetch('/dashboard/summary');
    if (summary) {
        document.getElementById('total-balance').innerText = `$${parseFloat(summary.balance).toFixed(2)}`;
        document.getElementById('total-income').innerText = `+$${parseFloat(summary.totalIncome).toFixed(2)}`;
        document.getElementById('total-expense').innerText = `-$${parseFloat(summary.totalExpenses).toFixed(2)}`;
        renderCategoryChart(summary.categorySummary);
    }

    const report = await apiFetch('/dashboard/reports/monthly');
    if (report) renderMonthlyChart(report);

    const transactions = await apiFetch('/transactions');
    if (transactions) {
        const list = document.getElementById('transaction-list');
        list.innerHTML = transactions.map(t => `
            <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 1rem 0;">${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.category ? t.category.name : 'Unknown'}</td>
                <td>${t.description || '-'}</td>
                <td style="color: ${t.type === 'INCOME' ? 'var(--income)' : 'var(--expense)'}">${t.type}</td>
                <td style="text-align: right; font-weight: bold;">$${parseFloat(t.amount).toFixed(2)}</td>
            </tr>
        `).join('');
    }
}

// Chart Helper Functions
let catChart = null;
let monChart = null;

function renderCategoryChart(summary) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (catChart) catChart.destroy();
    const expenses = summary.filter(s => s.type === 'EXPENSE');
    catChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: expenses.map(s => s.categoryName),
            datasets: [{
                data: expenses.map(s => s.totalAmount),
                backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
            }]
        },
        options: { plugins: { legend: { labels: { color: '#94a3b8' } } } }
    });
}

function renderMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monChart) monChart.destroy();
    monChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month.substring(0, 3)),
            datasets: [
                { label: 'Income', data: data.map(d => d.income), backgroundColor: '#22c55e' },
                { label: 'Expense', data: data.map(d => d.expense), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { labels: { color: '#94a3b8' } } }
        }
    });
}
