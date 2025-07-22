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
let currentUser = null;

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
        <div class="page-header">
             <h1 class="page-title">Painel de Despesas</h1>
        </div>
        <div class="dashboard-grid">
            <aside class="summary-section">
                <div class="glass-card summary-card">
                    <h2 id="summary-title">Resumo do Mês</h2>
                    <div id="total-variavel" class="summary-item"><span class="label">Variáveis</span><span class="value">R$ 0,00</span></div>
                    <div id="total-fixo" class="summary-item"><span class="label">Fixas</span><span class="value">R$ 0,00</span></div>
                    <div id="total-geral" class="summary-item"><span class="label">Total</span><span class="value">R$ 0,00</span></div>
                </div>
                <div class="glass-card summary-card" style="margin-top: 2rem;">
                    <h2>Adicionar Despesa</h2>
                    <form id="expense-form" class="form-add-expense">
                        <input type="text" id="description" class="input-add-expense" placeholder="Descrição (ex: Jantar)" required>
                        <input type="number" id="amount" class="input-add-expense" placeholder="Valor" step="0.01" required>
                        <div class="expense-type-selector">
                            <input type="radio" id="type-variable" name="expense-type" value="variavel" checked><label for="type-variable">Variável</label>
                            <input type="radio" id="type-fixed" name="expense-type" value="fixa"><label for="type-fixed">Fixa</label>
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
        <div class="page-header">
            <h1 class="page-title">Despesas Dark</h1>
            <button id="add-session-btn" class="btn btn-gradient">Criar Nova Sessão</button>
        </div>
        <div id="dark-loading-spinner" class="loader"></div>
        <div id="sessions-container" class="sessions-container"></div>
        <p id="empty-state-dark" class="empty-state" style="display: none;">Nenhuma sessão de débito criada.</p>
    </div>
`;

const SessionCard = (session) => {
    const debtorsHtml = session.debtors.map((debtor, index) => `
        <div class="debtor-item">
            <span class="debtor-name">${debtor.name}</span>
            <div class="debtor-status ${debtor.status === 'paid' ? 'status-paid' : 'status-owing'}" onclick="window.toggleDebtorStatus('${session.id}', ${index})">
                <div class="status-indicator"></div>
                <span>${debtor.status === 'paid' ? 'Pago' : 'Devendo'}</span>
            </div>
        </div>
    `).join('');

    return `
        <div class="glass-card session-card" id="session-${session.id}">
            <div class="session-header">
                <div>
                    <h3 class="session-title">${session.title}</h3>
                    <p class="session-details">Total: ${formatCurrency(session.totalDebit)} | Material: ${session.totalMaterial} un.</p>
                </div>
                <button onclick="window.showDeleteConfirmation('${session.id}', 'darkSessions')" class="btn-delete" title="Excluir sessão">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                </button>
            </div>
            <div class="session-debtors-list">${debtorsHtml}</div>
            <div class="session-actions">
                <button class="btn btn-secondary" onclick="window.showAddDebtorModal('${session.id}')">Adicionar Devedor</button>
            </div>
        </div>
    `;
};

const ModalComponent = ({ id, title, content, onConfirm, confirmText = 'Confirmar' }) => `
    <div id="modal-${id}" class="modal-overlay">
        <div class="modal-content glass-card">
            <h3>${title}</h3>
            <div id="modal-content-body">${content}</div>
            <div class="modal-buttons" style="margin-top: 2rem;">
                <button id="cancel-btn-${id}" class="btn btn-cancel">Cancelar</button>
                <button id="confirm-btn-${id}" class="btn btn-gradient">${confirmText}</button>
            </div>
        </div>
    </div>
`;

// --- LÓGICA DE ROTEAMENTO E RENDERIZAÇÃO ---

const navigateTo = (page, user) => {
    currentPage = page;
    appRoot.innerHTML = HeaderComponent(user, page);
    
    const pageContent = document.createElement('div');
    appRoot.appendChild(pageContent);

    if (page === 'dashboard') {
        render(DashboardPage(), pageContent);
        setupDashboardListeners(user);
        loadExpenses(user.uid);
    } else if (page === 'dark') {
        render(DarkExpensesPage(), pageContent);
        setupDarkExpensesListeners(user);
        loadDarkSessions(user.uid);
    }

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
    appRoot.innerHTML = '';
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
            .catch(error => errorEl.textContent = getFriendlyAuthError(error.code));
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

    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-content-${target}`) content.classList.add('active');
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
        const li = document.createElement('div');
        li.className = 'expense-item';
        li.innerHTML = `
            <div>
                <p class="description">${expense.description}</p>
                <p class="date">${expense.createdAt?.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) || '...'}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <p class="amount">${formatCurrency(expense.amount)}</p>
                <button onclick="window.showDeleteConfirmation('${expenseDoc.id}', 'expenses')" class="btn-delete">
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
            if (!selectedMonthYear || !monthSet.has(selectedMonthYear)) selectedMonthYear = currentMonthYear;
            monthFilterEl.value = selectedMonthYear;
            displayExpensesForSelectedMonth();
        }, (error) => console.error("Erro ao carregar despesas:", error));
};

// --- LÓGICA DA PÁGINA "DESPESAS DARK" ---

const setupDarkExpensesListeners = (user) => {
    document.getElementById('add-session-btn').addEventListener('click', () => showAddSessionModal(user.uid));
};

const showAddSessionModal = (userId) => {
    const modalId = 'add-session';
    const modalContent = `
        <form id="add-session-form" class="form-add-expense">
            <input type="text" id="session-title" class="input-add-expense" placeholder="Título da Sessão" required>
            <input type="number" id="session-debit" class="input-add-expense" placeholder="Valor Total do Débito" step="0.01" required>
            <input type="number" id="session-material" class="input-add-expense" placeholder="Qtd. Total de Material" required>
        </form>
    `;
    render(ModalComponent({ id: modalId, title: 'Criar Nova Sessão de Débito', content: modalContent, confirmText: 'Criar' }), modalContainer);
    
    const modal = document.getElementById(`modal-${modalId}`);
    setTimeout(() => modal.style.opacity = '1', 10);

    document.getElementById(`cancel-btn-${modalId}`).onclick = () => hideModal(modalId);
    document.getElementById(`confirm-btn-${modalId}`).onclick = () => {
        const title = document.getElementById('session-title').value;
        const totalDebit = parseFloat(document.getElementById('session-debit').value);
        const totalMaterial = parseInt(document.getElementById('session-material').value);

        if (title && !isNaN(totalDebit) && !isNaN(totalMaterial)) {
            db.collection('darkSessions').add({
                userId, title, totalDebit, totalMaterial,
                debtors: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            hideModal(modalId);
        }
    };
};

const showAddDebtorModal = (sessionId) => {
    const modalId = 'add-debtor';
    const modalContent = `
        <form id="add-debtor-form" class="form-add-expense">
            <input type="text" id="debtor-name" class="input-add-expense" placeholder="Nome do Devedor" required>
        </form>
    `;
    render(ModalComponent({ id: modalId, title: 'Adicionar Devedor à Sessão', content: modalContent, confirmText: 'Adicionar' }), modalContainer);

    const modal = document.getElementById(`modal-${modalId}`);
    setTimeout(() => modal.style.opacity = '1', 10);

    document.getElementById(`cancel-btn-${modalId}`).onclick = () => hideModal(modalId);
    document.getElementById(`confirm-btn-${modalId}`).onclick = () => {
        const name = document.getElementById('debtor-name').value;
        if (name) {
            const newDebtor = { name, status: 'owing' };
            db.collection('darkSessions').doc(sessionId).update({
                debtors: firebase.firestore.FieldValue.arrayUnion(newDebtor)
            });
            hideModal(modalId);
        }
    };
};
window.showAddDebtorModal = showAddDebtorModal;

const toggleDebtorStatus = async (sessionId, debtorIndex) => {
    const sessionRef = db.collection('darkSessions').doc(sessionId);
    const doc = await sessionRef.get();
    if (doc.exists) {
        const session = doc.data();
        const debtors = session.debtors;
        const debtor = debtors[debtorIndex];
        if (debtor) {
            debtor.status = debtor.status === 'owing' ? 'paid' : 'owing';
            await sessionRef.update({ debtors });
        }
    }
};
window.toggleDebtorStatus = toggleDebtorStatus;

const loadDarkSessions = (userId) => {
    const containerEl = document.getElementById('sessions-container');
    const spinnerEl = document.getElementById('dark-loading-spinner');
    const emptyStateEl = document.getElementById('empty-state-dark');

    db.collection('darkSessions').where('userId', '==', userId).orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot) => {
            spinnerEl.style.display = 'none';
            containerEl.innerHTML = '';
            if (querySnapshot.empty) {
                emptyStateEl.style.display = 'block';
                return;
            }
            emptyStateEl.style.display = 'none';
            querySnapshot.forEach(doc => {
                const session = { id: doc.id, ...doc.data() };
                containerEl.innerHTML += SessionCard(session);
            });
        }, (error) => console.error("Erro ao carregar sessões:", error));
};

// --- Funções Utilitárias ---

const showDeleteConfirmation = (id, collectionName) => {
    render(ModalComponent({ id, title: 'Confirmar Exclusão', content: '<p>Você tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>', confirmText: 'Excluir' }), modalContainer);
    const modal = document.getElementById(`modal-${id}`);
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
    document.getElementById(`cancel-btn-${id}`).onclick = () => hideModal(id);
    document.getElementById(`confirm-btn-${id}`).onclick = () => {
        db.collection(collectionName).doc(id).delete()
          .catch(error => console.error("Erro ao excluir item: ", error));
        hideModal(id);
    };
};
window.showDeleteConfirmation = showDeleteConfirmation;

const hideModal = (id) => {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
};

const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;

// CORREÇÃO APLICADA AQUI
const getMonthYear = (date) => {
    if (!date) return null;
    // Se for um timestamp do Firebase, converte. Senão, usa diretamente.
    const d = date.toDate ? date.toDate() : date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthYearForDisplay = (monthYear) => {
    const [year, month] = monthYear.split('-');
    return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// --- INICIALIZAÇÃO ---

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        navigateTo(currentPage, user);
    } else {
        showLoginPage();
    }
});
