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

const DashboardPage = (user) => `
    <div class="dashboard-container">
        <header class="dashboard-header">
            <div>
                <h1>Painel de Despesas</h1>
                <p title="${user.email}">${user.email}</p>
            </div>
            <button id="logout-btn" class="btn btn-logout">Sair</button>
        </header>

        <div class="dashboard-grid">
            <aside class="summary-section">
                <div class="glass-card summary-card">
                    <h2>Resumo do Mês</h2>
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
                <h2>Histórico de Despesas</h2>
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

const ConfirmationModal = (id) => `
    <div id="modal-${id}" class="modal-overlay">
        <div class="modal-content glass-card">
            <h3>Confirmar Exclusão</h3>
            <p>Você tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.</p>
            <div class="modal-buttons">
                <button id="cancel-delete-btn" class="btn btn-cancel">Cancelar</button>
                <button id="confirm-delete-btn" class="btn btn-confirm-delete">Excluir</button>
            </div>
        </div>
    </div>
`;

// --- LÓGICA DE ROTEAMENTO E RENDERIZAÇÃO ---

const render = (template, container) => {
    container.innerHTML = template;
};

const showDashboard = (user) => {
    render(DashboardPage(user), appRoot);
    setupDashboardListeners(user);
    loadExpenses(user.uid);
};

const showLoginPage = () => {
    render(LoginPage(), appRoot);
    setupLoginListeners();
};

// --- LÓGICA DE AUTENTICAÇÃO ---

const setupLoginListeners = () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const errorEl = document.getElementById('error-message');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
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

// --- LÓGICA DO DASHBOARD ---

const setupDashboardListeners = (user) => {
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
    
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

    // Lógica das abas
    const tabs = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-content-${target}`) {
                    content.classList.add('active');
                }
            });
        });
    });
};

const addExpense = (userId, description, amount, type) => {
    db.collection('expenses').add({
        userId,
        description,
        amount,
        type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error("Erro ao adicionar despesa: ", error));
};

const showDeleteConfirmation = (id) => {
    render(ConfirmationModal(id), modalContainer);
    const modal = document.getElementById(`modal-${id}`);
    setTimeout(() => { modal.style.opacity = '1'; }, 10);

    document.getElementById('cancel-delete-btn').onclick = () => hideModal(id);
    document.getElementById('confirm-delete-btn').onclick = () => {
        db.collection('expenses').doc(id).delete()
          .catch(error => console.error("Erro ao excluir despesa: ", error));
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

const updateSummary = (fixedExpenses, variableExpenses) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filterByMonth = (expense) => {
        const expenseDate = expense.createdAt?.toDate();
        return expenseDate && expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    };

    const totalFixed = fixedExpenses.filter(filterByMonth).reduce((sum, ex) => sum + ex.amount, 0);
    const totalVariable = variableExpenses.filter(filterByMonth).reduce((sum, ex) => sum + ex.amount, 0);
    const totalOverall = totalFixed + totalVariable;

    document.querySelector('#total-fixo .value').textContent = formatCurrency(totalFixed);
    document.querySelector('#total-variavel .value').textContent = formatCurrency(totalVariable);
    document.querySelector('#total-geral .value').textContent = formatCurrency(totalOverall);
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
                <button onclick="window.showDeleteConfirmation('${id}')" class="btn-delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                </button>
            </div>
        `;
        containerEl.appendChild(li);
    });
};

const loadExpenses = (userId) => {
    const spinnerEl = document.getElementById('loading-spinner');

    db.collection('expenses')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (querySnapshot) => {
            spinnerEl.style.display = 'none';
            
            const allDocs = querySnapshot.docs;
            const fixedExpenses = allDocs.filter(doc => doc.data().type === 'fixa');
            const variableExpenses = allDocs.filter(doc => doc.data().type === 'variavel');

            updateSummary(fixedExpenses.map(d => d.data()), variableExpenses.map(d => d.data()));
            
            renderExpenseList(fixedExpenses, document.getElementById('fixed-expenses-list'), document.getElementById('empty-state-fixed'));
            renderExpenseList(variableExpenses, document.getElementById('variable-expenses-list'), document.getElementById('empty-state-variable'));
        },
        (error) => {
            console.error("Erro ao carregar despesas:", error);
            spinnerEl.style.display = 'none';
            appRoot.innerHTML += `<p style="text-align: center; color: #fb7185;">Não foi possível carregar os dados.</p>`;
        }
    );
};

// --- INICIALIZAÇÃO ---

auth.onAuthStateChanged(user => {
    if (user) {
        showDashboard(user);
    } else {
        showLoginPage();
    }
});
