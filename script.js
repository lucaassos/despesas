// ===================================================================================
// PASSO 1: COLE A CONFIGURAÇÃO DO SEU FIREBASE AQUI
// ===================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBbA1r0N7a7Jelzx1nM9cVlHJCKxsHfXfE",
  authDomain: "controle-despesas-app.firebaseapp.com",
  projectId: "controle-despesas-app",
  storageBucket: "controle-despesas-app.firebasestorage.app",
  messagingSenderId: "799151739641",
  appId: "1:799151739641:web:86067067319e8c4cf30828"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const appRoot = document.getElementById('app-root');
const modalContainer = document.getElementById('modal-container');

// Variáveis de estado
let currentPage = 'dashboard';
let allUserExpenses = [];
let selectedMonthYear = '';

// --- TEMPLATES HTML ---

const LoginPage = () => `
    <div class="login-container">
        <div class="login-form-card glass-card">
            <div class="title">
                <h1>Acessar Painel</h1>
                <p>Controle financeiro pessoal.</p>
            </div>
            <form id="login-form">
                <div class="form-group">
                    <input type="email" id="email" class="form-field" placeholder=" " required>
                    <label for="email" class="form-label">E-mail</label>
                </div>
                <div class="form-group">
                    <input type="password" id="password" class="form-field" placeholder=" " required>
                    <label for="password" class="form-label">Senha</label>
                </div>
                <p id="error-message"></p>
                <button type="submit" id="login-btn" class="btn btn-gradient">Entrar</button>
            </form>
            <p class="login-footer">Acesso restrito.</p>
        </div>
    </div>
`;

const HeaderComponent = (user, activePage) => `
    <header class="main-header">
        <nav class="main-nav">
            <a href="#" class="${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">Painel Principal</a>
            <a href="#" class="${activePage === 'dark' ? 'active' : ''}" data-page="dark">Despesas Dark</a>
        </nav>
        <div class="user-controls">
            <span class="user-email" title="${user.email}">${user.email}</span>
            <button id="logout-btn" class="btn btn-logout">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/></svg>
                <span>Sair</span>
            </button>
        </div>
    </header>
`;

const DashboardPage = () => `
    <div class="page-container">
        <h1 class="page-title">Painel de Despesas</h1>
        <div class="dashboard-grid">
            <aside class="summary-section">
                <div class="glass-card summary-card">
                    <h2 id="summary-title">Resumo do Mês</h2>
                    <div id="total-variavel" class="summary-item">
                        <span class="label">Variáveis</span>
                        <span class="value">R$ 0,00</span>
                    </div>
                    <div id="total-fixo" class="summary-item">
                        <span class="label">Fixas</span>
                        <span class="value">R$ 0,00</span>
                    </div>
                    <div id="total-geral" class="summary-item">
                        <span class="label">Total</span>
                        <span class="value">R$ 0,00</span>
                    </div>
                </div>
                
                <div class="glass-card summary-card" style="margin-top: 2rem;">
                    <h2>Adicionar Despesa</h2>
                    <form id="expense-form" class="form-add-expense">
                        <input type="text" id="description" class="input-add-expense" placeholder="Descrição (ex: Jantar)" required>
                        <input type="number" id="amount" class="input-add-expense" placeholder="Valor" step="0.01" required>
                        <div class="expense-type-selector">
                            <input type="radio" id="type-variable" name="expense-type" value="variavel" checked>
                            <label for="type-variable">Variável</label>
                            <input type="radio" id="type-fixed" name="expense-type" value="fixa">
                            <label for="type-fixed">Fixa</label>
                        </div>
                        <button type="submit" class="btn btn-gradient">Adicionar</button>
                    </form>
                </div>
            </aside>

            <main class="history-section">
                <div class="history-header">
                    <h2>Histórico de Despesas</h2>
                    <select id="month-filter"></select>
                </div>
                <div class="glass-card" style="padding: 1.5rem;">
                    <nav class="tabs-nav">
                        <div class="tab-item active" data-tab="variable">Variáveis</div>
                        <div class="tab-item" data-tab="fixed">Fixas</div>
                    </nav>
                    <div id="loading-spinner" class="loader"></div>
                    <div id="tab-content-variable" class="tab-content active">
                        <div id="variable-expenses-list" class="expense-list"></div>
                        <p id="empty-state-variable" class="empty-state" style="display: none;">Nenhuma despesa variável registrada.</p>
                    </div>
                    <div id="tab-content-fixed" class="tab-content">
                        <div id="fixed-expenses-list" class="expense-list"></div>
                        <p id="empty-state-fixed" class="empty-state" style="display: none;">Nenhuma despesa fixa registrada.</p>
                    </div>
                </div>
            </main>
        </div>
    </div>
`;

const DarkExpensesPage = () => `
    <div class="page-container">
        <h1 class="page-title">Despesas Dark</h1>
        <div class="dark-expense-grid">
            <aside>
                <div class="glass-card" style="padding: 1.5rem;">
                    <h2>Adicionar Devedor</h2>
                    <form id="dark-expense-form" class="form-add-expense">
                        <input type="text" id="debtor-name" class="input-add-expense" placeholder="Nome do devedor" required>
                        <input type="number" id="debt-amount" class="input-add-expense" placeholder="Valor do débito" step="0.01" required>
                        <input type="number" id="material-quantity" class="input-add-expense" placeholder="Qtd. de material" required>
                        <button type="submit" class="btn btn-gradient">Adicionar</button>
                    </form>
                </div>
            </aside>
            <main>
                <h2>Lista de Devedores</h2>
                <div class="glass-card" style="padding: 1.5rem;">
                    <div id="dark-loading-spinner" class="loader"></div>
                    <div id="debtor-list" class="debtor-list"></div>
                    <p id="empty-state-dark" class="empty-state" style="display: none;">Nenhum devedor registrado.</p>
                </div>
            </main>
        </div>
    </div>
`;

const ConfirmationModal = (id) => `
    <div id="modal-${id}" class="modal-overlay">
        <div class="modal-content glass-card">
            <h3>Confirmar Exclusão</h3>
            <p>Você tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
            <div class="modal-buttons">
                <button id="cancel-delete-btn" class="btn btn-cancel">Cancelar</button>
                <button id="confirm-delete-btn" class="btn btn-confirm-delete">Excluir</button>
            </div>
        </div>
    </div>
`;

// --- LÓGICA DE ROTEAMENTO E RENDERIZAÇÃO ---

const navigateTo = (page, user) => {
    currentPage = page;
    appRoot.innerHTML = HeaderComponent(user, page); // Renderiza o cabeçalho
    
    const pageContent = document.createElement('div');
    appRoot.appendChild(pageContent);

    if (page === 'dashboard') {
        render(DashboardPage(), pageContent);
        setupDashboardListeners(user);
        loadExpenses(user.uid);
    } else if (page === 'dark') {
        render(DarkExpensesPage(), pageContent);
        setupDarkExpensesListeners(user);
        loadDarkDebts(user.uid);
    }

    // Adiciona listeners aos links de navegação no cabeçalho
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.target.dataset.page, user);
        });
    });
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
};

const render = (template, container) => {
    container.innerHTML = template;
};

const showLoginPage = () => {
    appRoot.innerHTML = ''; // Limpa o cabeçalho
    render(LoginPage(), appRoot);
    setupLoginListeners();
};

// --- LÓGICA DE AUTENTICAÇÃO ---

const setupLoginListeners = () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = '';
        auth.signInWithEmailAndPassword(emailEl.value, passwordEl.value)
            .catch(error => {
                errorEl.textContent = getFriendlyAuthError(error.code);
            });
    });
};

const getFriendlyAuthError = (code) => {
    switch (code) {
        case 'auth/user-not-found': return 'Usuário não encontrado.';
        case 'auth/wrong-password': return 'Senha incorreta.';
        case 'auth/invalid-email': return 'Formato de e-mail inválido.';
        default: return 'E-mail ou senha inválidos.';
    }
}

// --- LÓGICA DO DASHBOARD PRINCIPAL ---

const setupDashboardListeners = (user) => {
    const expenseForm = document.getElementById('expense-form');
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.querySelector('input[name="expense-type"]:checked').value;

        if (description && !isNaN(amount) && amount > 0) {
            addExpense(user.uid, description, amount, type);
            expenseForm.reset();
        }
    });

    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-content-${target}`) {
                    content.classList.add('active');
                }
            });
        });
    });

    document.getElementById('month-filter').addEventListener('change', (e) => {
        selectedMonthYear = e.target.value;
        displayExpensesForSelectedMonth();
    });
};

const addExpense = (userId, description, amount, type) => {
    db.collection('expenses').add({
        userId, description, amount, type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error("Erro ao adicionar despesa: ", error));
};

const showDeleteConfirmation = (id, collectionName) => {
    render(ConfirmationModal(id), modalContainer);
    const modal = document.getElementById(`modal-${id}`);
    setTimeout(() => { modal.style.opacity = '1'; }, 10);

    document.getElementById('cancel-delete-btn').onclick = () => hideModal(id);
    document.getElementById('confirm-delete-btn').onclick = () => {
        db.collection(collectionName).doc(id).delete()
          .catch(error => console.error("Erro ao excluir item: ", error));
        hideModal(id);
    };
};

const hideModal = (id) => {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
}

window.showDeleteConfirmation = showDeleteConfirmation;

const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const getMonthYear = (date) => {
    if (!date) return null;
    const d = date.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthYearForDisplay = (monthYear) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const displayExpensesForSelectedMonth = () => {
    const filteredExpenses = allUserExpenses.filter(doc => getMonthYear(doc.data().createdAt) === selectedMonthYear);
    const fixedExpenses = filteredExpenses.filter(doc => doc.data().type === 'fixa');
    const variableExpenses = filteredExpenses.filter(doc => doc.data().type === 'variavel');

    document.getElementById('summary-title').textContent = `Resumo de ${formatMonthYearForDisplay(selectedMonthYear)}`;
    const totalFixed = fixedExpenses.reduce((sum, ex) => sum + ex.data().amount, 0);
    const totalVariable = variableExpenses.reduce((sum, ex) => sum + ex.data().amount, 0);
    document.querySelector('#total-fixo .value').textContent = formatCurrency(totalFixed);
    document.querySelector('#total-variavel .value').textContent = formatCurrency(totalVariable);
    document.querySelector('#total-geral .value').textContent = formatCurrency(totalFixed + totalVariable);

    renderExpenseList(fixedExpenses, document.getElementById('fixed-expenses-list'), document.getElementById('empty-state-fixed'));
    renderExpenseList(variableExpenses, document.getElementById('variable-expenses-list'), document.getElementById('empty-state-variable'));
};

const renderExpenseList = (expenses, containerEl, emptyStateEl) => {
    containerEl.innerHTML = '';
    if (expenses.length === 0) {
        emptyStateEl.style.display = 'block';
        return;
    }
    emptyStateEl.style.display = 'none';

    expenses.forEach(expenseDoc => {
        const expense = expenseDoc.data();
        const id = expenseDoc.id;
        const date = expense.createdAt?.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) || '...';
        const li = document.createElement('div');
        li.className = 'expense-item';
        li.innerHTML = `
            <div>
                <p class="description">${expense.description}</p>
                <p class="date">${date}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <p class="amount">${formatCurrency(expense.amount)}</p>
                <button onclick="window.showDeleteConfirmation('${id}', 'expenses')" class="btn-delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                </button>
            </div>
        `;
        containerEl.appendChild(li);
    });
};

const loadExpenses = (userId) => {
    const spinnerEl = document.getElementById('loading-spinner');
    const monthFilterEl = document.getElementById('month-filter');

    db.collection('expenses').where('userId', '==', userId).orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot) => {
            spinnerEl.style.display = 'none';
            allUserExpenses = querySnapshot.docs;
            const monthSet = new Set(allUserExpenses.map(doc => getMonthYear(doc.data().createdAt)).filter(Boolean));
            const currentMonthYear = getMonthYear(new Date());
            monthSet.add(currentMonthYear);
            monthFilterEl.innerHTML = '';
            Array.from(monthSet).sort().reverse().forEach(monthYear => {
                const option = document.createElement('option');
                option.value = monthYear;
                option.textContent = formatMonthYearForDisplay(monthYear);
                monthFilterEl.appendChild(option);
            });
            if (!selectedMonthYear || !monthSet.has(selectedMonthYear)) {
                selectedMonthYear = currentMonthYear;
            }
            monthFilterEl.value = selectedMonthYear;
            displayExpensesForSelectedMonth();
        }, (error) => {
            console.error("Erro ao carregar despesas:", error);
            spinnerEl.style.display = 'none';
        }
    );
};

// --- LÓGICA DA PÁGINA "DESPESAS DARK" ---

const setupDarkExpensesListeners = (user) => {
    const darkExpenseForm = document.getElementById('dark-expense-form');
    darkExpenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const debtorName = document.getElementById('debtor-name').value;
        const debtAmount = parseFloat(document.getElementById('debt-amount').value);
        const materialQuantity = parseInt(document.getElementById('material-quantity').value);

        if (debtorName && !isNaN(debtAmount) && !isNaN(materialQuantity)) {
            addDarkDebt(user.uid, debtorName, debtAmount, materialQuantity);
            darkExpenseForm.reset();
        }
    });
};

const addDarkDebt = (userId, debtorName, debtAmount, materialQuantity) => {
    db.collection('darkDebts').add({
        userId, debtorName, debtAmount, materialQuantity,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error("Erro ao adicionar dívida: ", error));
};

const loadDarkDebts = (userId) => {
    const listEl = document.getElementById('debtor-list');
    const spinnerEl = document.getElementById('dark-loading-spinner');
    const emptyStateEl = document.getElementById('empty-state-dark');

    db.collection('darkDebts').where('userId', '==', userId).orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot) => {
            spinnerEl.style.display = 'none';
            listEl.innerHTML = '';
            if (querySnapshot.empty) {
                emptyStateEl.style.display = 'block';
                return;
            }
            emptyStateEl.style.display = 'none';
            querySnapshot.forEach(doc => {
                const debt = doc.data();
                const id = doc.id;
                const li = document.createElement('div');
                li.className = 'debtor-item';
                li.innerHTML = `
                    <div class="debtor-info">
                        <span class="debtor-name">${debt.debtorName}</span>
                        <span class="debtor-details">
                            Valor: ${formatCurrency(debt.debtAmount)} | Material: ${debt.materialQuantity} un.
                        </span>
                    </div>
                    <div class="debtor-actions">
                         <button onclick="window.showDeleteConfirmation('${id}', 'darkDebts')" class="btn-delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                        </button>
                    </div>
                `;
                listEl.appendChild(li);
            });
        }, (error) => {
            console.error("Erro ao carregar devedores:", error);
            spinnerEl.style.display = 'none';
        }
    );
};

// --- INICIALIZAÇÃO ---

auth.onAuthStateChanged(user => {
    if (user) {
        navigateTo(currentPage, user); // Inicia na página atual ou dashboard
    } else {
        showLoginPage();
    }
});
