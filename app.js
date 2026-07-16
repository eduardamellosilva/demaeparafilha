/**
 * De Mãe para Filha - Arquivo de Lógica Principal (app.js)
 * Gerencia o estado, renderização da interface, modais, eventos e persistência.
 */

// Estado Global da Aplicação
let state = {
    vendas: [],
    gastos: [],
    insumos: [],
    receitas: []
};

// Referência ao Gráfico Financeiro
let financeChartInstance = null;

// Referência aos Gráficos de Relatório
let lucroChartInstance = null;
let produtosChartInstance = null;

// Estado do Calendário
let calendarCurrentDate = new Date();

// Inicialização do App
document.addEventListener('DOMContentLoaded', () => {
    // Verifica autenticação antes de carregar dados
    auth.onAuthStateChanged(user => {
        if (user) {
            // Opcional: Mostrar nome do usuário logado se existir o elemento
            const titleSubtitle = document.getElementById('tab-subtitle');
            if (titleSubtitle && titleSubtitle.textContent.includes('Bem-vindo')) {
                const firstName = (user.displayName || 'Confeiteira').split(' ')[0];
                titleSubtitle.textContent = `Bem-vindo(a) de volta, ${firstName}! Veja como está sua confeitaria hoje.`;
            }
            
            // Inicia o app (eventos e menus)
            initApp();
            
            // Carrega dados da nuvem e escuta por mudanças
            loadState();
        } else {
            // Se não estiver logado, redireciona
            window.location.href = 'login.html';
        }
    });
});

// Carrega dados do Firebase (em tempo real)
function loadState() {
    db.ref('confeitaria_state').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.vendas = data.vendas || [];
            state.gastos = data.gastos || [];
            state.insumos = data.insumos || [];
            state.receitas = data.receitas || [];
        } else {
            state = { vendas: [], gastos: [], insumos: [], receitas: [] };
        }
        
        // Sempre que os dados mudarem na nuvem, atualiza a tela
        renderAll();
        updateDashboardChart();
        checkEntregasHoje();
    }, (error) => {
        console.error("Erro ao ler do Firebase:", error);
    });
}

// Reseta para estrutura básica vazia
function resetStateToDefault() {
    state = { vendas: [], gastos: [], insumos: [], receitas: [] };
    saveState();
}

// Salva dados no Firebase
function saveState() {
    db.ref('confeitaria_state').set(state).catch(e => console.error("Erro ao salvar:", e));
}

// Inicializa a aplicação (Menus e Eventos que não dependem de dados)
function initApp() {
    lucide.createIcons();
    initTabs();
    initHamburgerMenu();
    initModals();
    initFormEvents();
    initSettingsEvents();
    initDarkMode();
    initCalendar();
    initAuth();
    initAIScanner();
}

function initAuth() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('Deseja realmente sair?')) {
                auth.signOut().then(() => {
                    localStorage.removeItem('firebase_user_uid');
                    window.location.href = 'login.html';
                });
            }
        });
    }
}

function initHamburgerMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    // Abre gaveta móvel
    document.getElementById('btn-hamburger-mobile').addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });
    
    // Fecha gaveta móvel
    document.getElementById('btn-close-sidebar').addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Fecha ao clicar fora (no overlay)
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Fecha gaveta móvel ao clicar em qualquer item do menu
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    });

    // Colapso de barra lateral no desktop
    document.getElementById('btn-hamburger-desktop').addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        
        // Redesenha e ajusta tamanho do Chart.js após terminar a transição (320ms)
        setTimeout(() => {
            if (financeChartInstance) {
                financeChartInstance.resize();
            }
        }, 320);
    });
}

/**
 * --- SISTEMA DE ABAS ---
 */
function initTabs() {
    // Abas Principais (Sidebar)
    const menuItems = document.querySelectorAll('.menu-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            // Ativa item no menu
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            // Ativa painel correspondente
            tabPanes.forEach(pane => pane.classList.remove('active'));
            const targetPane = document.getElementById(`tab-${tabId}`);
            if (targetPane) targetPane.classList.add('active');
            
            // Atualiza título do cabeçalho
            const titleMap = {
                'dashboard':     { title: 'Painel Geral',              sub: 'Bem-vindo(a) de volta! Veja como está sua confeitaria hoje.' },
                'vendas':        { title: 'Minhas Vendas',             sub: 'Gerencie suas encomendas, status de entrega e pagamentos.' },
                'gastos':        { title: 'Meus Gastos',               sub: 'Monitore suas despesas com insumos, utilidades e embalagens.' },
                'precificacao':  { title: 'Precificação e Receitas',   sub: 'Cadastre ingredientes e calcule o custo exato das receitas.' },
                'calendario':    { title: 'Calendário de Encomendas',  sub: 'Visualize e gerencie suas entregas em formato de calendário.' },
                'relatorios':    { title: 'Relatórios de Desempenho',  sub: 'Gráficos e análises do desempenho financeiro da sua confeitaria.' },
                'configuracoes': { title: 'Configurações',             sub: 'Gerenciamento de banco de dados local e backup.' }
            };
            
            if (titleMap[tabId]) {
                document.getElementById('tab-title').textContent = titleMap[tabId].title;
                document.getElementById('tab-subtitle').textContent = titleMap[tabId].sub;
            }
            
            // Re-renderizações específicas se necessário
            if (tabId === 'dashboard') {
                updateDashboardChart();
            }
            if (tabId === 'relatorios') {
                renderRelatorios();
            }
        });
    });

    // Sub-abas (Tela de Precificação)
    const subTabButtons = document.querySelectorAll('.btn-sub-tab');
    const subTabPanes = document.querySelectorAll('.sub-tab-pane');
    
    subTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const subTabId = btn.getAttribute('data-sub-tab');
            
            subTabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            subTabPanes.forEach(p => p.classList.remove('active'));
            document.getElementById(`sub-tab-${subTabId}`).classList.add('active');
        });
    });
}

/**
 * --- GERENCIADOR DE MODAIS ---
 */
function initModals() {
    // Abrir Modais
    document.getElementById('btn-quick-sale').addEventListener('click', () => openModalVenda());
    document.getElementById('btn-add-expense').addEventListener('click', () => openModalGasto());
    document.getElementById('btn-add-insumo').addEventListener('click', () => openModalInsumo());
    document.getElementById('btn-add-receita').addEventListener('click', () => openModalReceita());
    
    // Fechar Modais clicando nos botões com data-modal ou fundo cinza
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target === btn || btn.classList.contains('modal-close') || btn.getAttribute('type') === 'button') {
                const modalId = btn.getAttribute('data-modal') || btn.closest('.modal').id;
                closeModal(modalId);
            }
        });
    });
    
    // Fechar ao clicar fora do conteúdo
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

/**
 * --- RENDERIZAÇÃO DOS COMPONENTES (LEITURA DO ESTADO) ---
 */
function renderAll() {
    renderDashboard();
    renderVendas();
    renderGastos();
    renderInsumos();
    renderReceitas();
    renderCalendario();
    renderRelatorios();
    
    // Atualiza os dropdowns dinâmicos em formulários
    populateDropdowns();
}

// 1. Dashboard
function renderDashboard() {
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth(); // 0 a 11
    
    // Filtra vendas do mês atual (exclui cancelados)
    const vendasMes = state.vendas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda.getFullYear() === anoAtual && dataVenda.getMonth() === mesAtual && v.statusEntrega !== 'cancelado';
    });
    
    // Filtra gastos do mês atual
    const gastosMes = state.gastos.filter(g => {
        const dataGasto = new Date(g.data);
        return dataGasto.getFullYear() === anoAtual && dataGasto.getMonth() === mesAtual;
    });
    
    // Calcula totais
    const totalGanhos = vendasMes.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const totalGastos = gastosMes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
    const lucroLiquido = totalGanhos - totalGastos;
    
    // Calcula Margem de Lucro do mês
    let margemLucro = 0;
    if (totalGanhos > 0) {
        margemLucro = (lucroLiquido / totalGanhos) * 100;
    }
    
    // Preenche cards
    document.getElementById('dash-ganhos').textContent = formatCurrency(totalGanhos);
    document.getElementById('dash-ganhos-count').textContent = `${vendasMes.length} venda(s) realizada(s)`;
    
    document.getElementById('dash-gastos').textContent = formatCurrency(totalGastos);
    document.getElementById('dash-gastos-count').textContent = `${gastosMes.length} despesa(s) registrada(s)`;
    
    document.getElementById('dash-lucro').textContent = formatCurrency(lucroLiquido);
    
    const profitSub = document.getElementById('dash-lucro-percent');
    if (lucroLiquido >= 0) {
        profitSub.textContent = `Margem de lucro de ${margemLucro.toFixed(1)}%`;
        profitSub.className = 'metric-subtext text-success';
    } else {
        profitSub.textContent = `Prejuízo de R$ ${Math.abs(lucroLiquido).toFixed(2)}`;
        profitSub.className = 'metric-subtext text-danger';
    }
    
    // Renderiza Próximas Entregas (vendas pendentes ordenadas por data >= hoje)
    renderProximasEntregas();
}

function renderProximasEntregas() {
    const listContainer = document.getElementById('upcoming-deliveries-list');
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Mostra as próximas pendentes (incluindo as atrasadas para alerta do usuário!)
    const proximas = state.vendas
        .filter(v => v.statusEntrega === 'pendente')
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .slice(0, 5); // limite de 5 entregas prioritárias
        
    if (proximas.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar"></i>
                <p>Nenhuma entrega pendente agendada.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    listContainer.innerHTML = '';
    
    proximas.forEach(v => {
        const dt = new Date(v.data + 'T00:00:00');
        const dia = dt.getDate().toString().padStart(2, '0');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mes = meses[dt.getMonth()];
        
        // Calcula prazo relativo
        const diffTime = dt - hoje;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        let badgeText = '';
        let badgeClass = '';
        
        if (diffDays < 0) {
            badgeText = 'Atrasado!';
            badgeClass = 'time-atrasado';
        } else if (diffDays === 0) {
            badgeText = 'Hoje';
            badgeClass = 'time-hoje';
        } else if (diffDays === 1) {
            badgeText = 'Amanhã';
            badgeClass = 'time-amanha';
        } else {
            badgeText = `Em ${diffDays} dias`;
            badgeClass = 'time-futuro';
        }
        
        // Botões de Ações Rápidas
        const payBtn = v.statusPagamento !== 'pago'
            ? `<button class="btn-delivery-action btn-pay" onclick="confirmarPagamentoRapido('${v.id}')" title="Confirmar pagamento de ${formatCurrency(v.total)}"><i data-lucide="dollar-sign"></i></button>`
            : '';
            
        const completeBtn = `<button class="btn-delivery-action btn-complete" onclick="completarEntregaRapido('${v.id}')" title="Marcar como Entregue"><i data-lucide="check"></i></button>`;
        
        const whatsappBtn = `<button class="btn-delivery-action btn-whatsapp" onclick="enviarMensagemWhatsApp('${v.id}')" title="Enviar lembrete de WhatsApp"><i data-lucide="message-circle"></i></button>`;
        
        const item = document.createElement('div');
        item.className = `delivery-item ${v.statusPagamento === 'pago' ? 'pago' : ''}`;
        
        const contatoLabel = v.contato ? `<br><small class="text-muted">${v.contato}</small>` : '';
        
        item.innerHTML = `
            <div class="delivery-info-container">
                <div class="delivery-date-badge">
                    <span class="day">${dia}</span>
                    <span class="month">${mes}</span>
                </div>
                <div class="delivery-meta">
                    <span class="relative-time-badge ${badgeClass}">${badgeText}</span>
                    <div class="delivery-client"><strong>${v.cliente}</strong>${contatoLabel}</div>
                    <div class="delivery-product">${v.quantidade}x ${v.produto}</div>
                </div>
            </div>
            <div class="delivery-actions">
                ${whatsappBtn}
                ${payBtn}
                ${completeBtn}
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    // Atualiza os ícones gerados dinamicamente
    lucide.createIcons();
}

// 2. Vendas (Listagem e Filtros)
function renderVendas() {
    const tableBody = document.getElementById('vendas-table-body');
    const searchQuery = document.getElementById('vendas-search').value.toLowerCase();
    const filterStatus = document.getElementById('vendas-filter-status').value;
    
    // Limpa a tabela
    tableBody.innerHTML = '';
    
    // Filtra vendas
    const vendasFiltradas = state.vendas.filter(v => {
        const matchesSearch = v.cliente.toLowerCase().includes(searchQuery) || v.produto.toLowerCase().includes(searchQuery);
        
        let matchesStatus = true;
        if (filterStatus === 'pendente-pago') {
            matchesStatus = v.statusPagamento === 'pendente';
        } else if (filterStatus === 'pago') {
            matchesStatus = v.statusPagamento === 'pago';
        } else if (filterStatus === 'pendente-entrega') {
            matchesStatus = v.statusEntrega === 'pendente';
        } else if (filterStatus === 'entregue') {
            matchesStatus = v.statusEntrega === 'entregue';
        } else if (filterStatus === 'proximas') {
            const dataVenda = new Date(v.data + 'T00:00:00');
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            matchesStatus = dataVenda >= hoje && v.statusEntrega === 'pendente';
        }
        
        return matchesSearch && matchesStatus;
    });
    
    if (vendasFiltradas.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted" style="padding: 3rem;">
                    Nenhuma venda encontrada com os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordena por data decrescente (mais recentes primeiro)
    vendasFiltradas.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    vendasFiltradas.forEach(v => {
        const row = document.createElement('tr');
        
        const dataFormatada = formatDate(v.data);
        
        const badgePag = v.statusPagamento === 'pago' 
            ? '<span class="badge badge-success">Pago</span>' 
            : '<span class="badge badge-warning">Pendente</span>';
            
        let badgeEnt = '';
        if (v.statusEntrega === 'entregue') {
            badgeEnt = '<span class="badge badge-success">Entregue</span>';
        } else if (v.statusEntrega === 'cancelado') {
            badgeEnt = '<span class="badge badge-danger">Cancelado</span>';
        } else {
            badgeEnt = '<span class="badge badge-info">Pendente</span>';
        }
        
        const contatoExibicao = v.contato ? `<br><small class="text-light">${v.contato}</small>` : '';
        
        // Forma de pagamento badge
        const formaPagHtml = v.formaPagamento
            ? `<br><small><span class="badge badge-${v.formaPagamento}">${getFormaPagLabel(v.formaPagamento)}</span></small>`
            : '';
        
        // Observações icon
        const obsHtml = v.observacoes
            ? `<span class="obs-icon" data-obs="${v.observacoes.replace(/"/g, '&quot;').replace(/\n/g, '\n')}"><i data-lucide="message-square"></i></span>`
            : '';
        
        row.innerHTML = `
            <td><strong>${v.cliente}</strong>${contatoExibicao}</td>
            <td>${v.produto} <small class="text-muted">(x${v.quantidade})</small>${obsHtml}</td>
            <td><strong>${formatCurrency(v.total)}</strong></td>
            <td>${dataFormatada}</td>
            <td>${badgePag}${formaPagHtml}</td>
            <td>${badgeEnt}</td>
            <td class="actions-cell">
                <button class="btn-action" onclick="editVenda('${v.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
                <button class="btn-action btn-delete" onclick="deleteVenda('${v.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    lucide.createIcons();
}

// 3. Gastos (Listagem e Filtros)
function renderGastos() {
    const tableBody = document.getElementById('gastos-table-body');
    const searchQuery = document.getElementById('gastos-search').value.toLowerCase();
    const filterCategory = document.getElementById('gastos-filter-category').value;
    
    tableBody.innerHTML = '';
    
    const gastosFiltrados = state.gastos.filter(g => {
        const matchesSearch = g.descricao.toLowerCase().includes(searchQuery);
        const matchesCategory = filterCategory === 'todos' || g.categoria === filterCategory;
        return matchesSearch && matchesCategory;
    });
    
    if (gastosFiltrados.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted" style="padding: 3rem;">
                    Nenhum gasto registrado ou encontrado.
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordena por data decrescente
    gastosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    gastosFiltrados.forEach(g => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${g.descricao}</strong></td>
            <td><span class="badge badge-info">${g.categoria}</span></td>
            <td><strong>${formatCurrency(g.valor)}</strong></td>
            <td>${formatDate(g.data)}</td>
            <td class="actions-cell">
                <button class="btn-action" onclick="editGasto('${g.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
                <button class="btn-action btn-delete" onclick="deleteGasto('${g.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    lucide.createIcons();
}

// 4. Insumos (Ingredientes)
function renderInsumos() {
    const tableBody = document.getElementById('insumos-table-body');
    const searchQuery = document.getElementById('insumos-search').value.toLowerCase();
    
    tableBody.innerHTML = '';
    
    const insumosFiltrados = state.insumos.filter(i => i.nome.toLowerCase().includes(searchQuery));
    
    if (insumosFiltrados.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted" style="padding: 3rem;">
                    Nenhum ingrediente cadastrado ainda.
                </td>
            </tr>
        `;
        return;
    }
    
    insumosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
    
    insumosFiltrados.forEach(i => {
        const row = document.createElement('tr');
        const custoMedida = i.preco / i.tamanho;
        
        row.innerHTML = `
            <td><strong>${i.nome}</strong></td>
            <td>${i.tamanho} ${i.unidade}</td>
            <td>${formatCurrency(i.preco)}</td>
            <td>${formatCurrency(custoMedida)} / ${i.unidade}</td>
            <td class="actions-cell">
                <button class="btn-action" onclick="editInsumo('${i.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
                <button class="btn-action btn-delete" onclick="deleteInsumo('${i.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    lucide.createIcons();
}

// 5. Receitas
function renderReceitas() {
    const tableBody = document.getElementById('receitas-table-body');
    const searchQuery = document.getElementById('receitas-search').value.toLowerCase();
    
    tableBody.innerHTML = '';
    
    const receitasFiltradas = state.receitas.filter(r => r.nome.toLowerCase().includes(searchQuery));
    
    if (receitasFiltradas.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding: 3rem;">
                    Nenhuma receita cadastrada ainda.
                </td>
            </tr>
        `;
        return;
    }
    
    receitasFiltradas.sort((a, b) => a.nome.localeCompare(b.nome));
    
    receitasFiltradas.forEach(r => {
        const row = document.createElement('tr');
        
        const custoTotal = ConfeitariaCalculadora.calcularCustoTotal(r, state.insumos);
        const custoUnitario = ConfeitariaCalculadora.calcularCustoUnitario(r, state.insumos);
        const precoSugerido = ConfeitariaCalculadora.calcularPrecoVendaSugerido(r, state.insumos);
        const precoSugeridoUnit = ConfeitariaCalculadora.calcularPrecoVendaUnitarioSugerido(r, state.insumos);
        
        row.innerHTML = `
            <td><strong>${r.nome}</strong></td>
            <td>${r.rendimento} porções</td>
            <td>${formatCurrency(custoTotal)}</td>
            <td>${formatCurrency(custoUnitario)}</td>
            <td>
                <strong class="text-success">${formatCurrency(precoSugerido)}</strong>
                <br><small class="text-muted">${formatCurrency(precoSugeridoUnit)} / un</small>
            </td>
            <td class="actions-cell">
                <button class="btn-action" onclick="editReceita('${r.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
                <button class="btn-action btn-delete" onclick="deleteReceita('${r.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    lucide.createIcons();
}

/**
 * --- POPULA DROPDOWNS EM FORMULÁRIOS ---
 */
function populateDropdowns() {
    // 1. Dropdown de Receitas na Venda
    const vendaReceitaSelect = document.getElementById('venda-receita-id');
    vendaReceitaSelect.innerHTML = '<option value="">-- Selecione a Receita --</option>';
    
    state.receitas.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.nome;
        vendaReceitaSelect.appendChild(opt);
    });
    
    // 2. Dropdown de Insumos na Receita
    const receitaInsumoSelect = document.getElementById('recipe-add-insumo-select');
    receitaInsumoSelect.innerHTML = '<option value="">-- Escolha um Ingrediente --</option>';
    
    state.insumos.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.id;
        opt.textContent = `${i.nome} (${i.unidade})`;
        receitaInsumoSelect.appendChild(opt);
    });
}

/**
 * --- EVENTOS E SUBMISSÕES DE FORMULÁRIOS (C.U.D) ---
 */
function initFormEvents() {
    // A. CADASTRO DE VENDA
    const formVenda = document.getElementById('form-venda');
    const tipoProdSelect = document.getElementById('venda-tipo-produto');
    const receitaGroup = document.getElementById('venda-receita-select-group');
    const descGroup = document.getElementById('venda-descricao-group');
    
    const inputQtd = document.getElementById('venda-qtd');
    const inputPreco = document.getElementById('venda-preco');
    const textTotal = document.getElementById('venda-total');
    
    // Alternância do tipo de produto (manual vs receita)
    tipoProdSelect.addEventListener('change', () => {
        if (tipoProdSelect.value === 'receita') {
            receitaGroup.style.display = 'block';
            document.getElementById('venda-receita-id').setAttribute('required', 'true');
        } else {
            receitaGroup.style.display = 'none';
            document.getElementById('venda-receita-id').removeAttribute('required');
            document.getElementById('venda-produto').value = '';
        }
        recalcVendaTotal();
    });
    
    // Auto-preenchimento ao escolher receita
    document.getElementById('venda-receita-id').addEventListener('change', (e) => {
        const recId = e.target.value;
        if (recId) {
            const receita = state.receitas.find(r => r.id === recId);
            if (receita) {
                // Preenche descrição e preço unitário sugerido
                document.getElementById('venda-produto').value = receita.nome;
                const precoSugeridoUnit = ConfeitariaCalculadora.calcularPrecoVendaUnitarioSugerido(receita, state.insumos);
                inputPreco.value = precoSugeridoUnit.toFixed(2);
                recalcVendaTotal();
            }
        }
    });
    
    // Recálculo do valor total do pedido
    inputQtd.addEventListener('input', recalcVendaTotal);
    inputPreco.addEventListener('input', recalcVendaTotal);
    
    function recalcVendaTotal() {
        const q = parseFloat(inputQtd.value) || 0;
        const p = parseFloat(inputPreco.value) || 0;
        textTotal.value = formatCurrency(q * p);
    }
    
    // Envio do formulário
    formVenda.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('venda-id').value;
        const cliente = document.getElementById('venda-cliente').value;
        const contato = document.getElementById('venda-contato').value;
        const data = document.getElementById('venda-data').value;
        const produto = document.getElementById('venda-produto').value;
        const quantidade = parseFloat(inputQtd.value) || 1;
        const precoUnitario = parseFloat(inputPreco.value) || 0;
        const total = quantidade * precoUnitario;
        const statusPagamento = document.getElementById('venda-status-pagamento').value;
        const statusEntrega = document.getElementById('venda-status-entrega').value;
        const formaPagamento = document.getElementById('venda-forma-pagamento').value;
        const observacoes = document.getElementById('venda-observacoes').value;
        
        const vendaData = {
            id: id || generateUUID(),
            cliente,
            contato,
            data,
            produto,
            quantidade,
            precoUnitario,
            total,
            statusPagamento,
            statusEntrega,
            formaPagamento,
            observacoes
        };
        
        if (id) {
            // Edição
            const idx = state.vendas.findIndex(v => v.id === id);
            if (idx !== -1) state.vendas[idx] = vendaData;
        } else {
            // Nova
            state.vendas.push(vendaData);
        }
        
        saveState();
        closeModal('modal-venda');
        renderAll();
        updateDashboardChart();
    });
    
    // B. CADASTRO DE GASTO
    const formGasto = document.getElementById('form-gasto');
    formGasto.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('gasto-id').value;
        const descricao = document.getElementById('gasto-descricao').value;
        const categoria = document.getElementById('gasto-categoria').value;
        const data = document.getElementById('gasto-data').value;
        const valor = parseFloat(document.getElementById('gasto-valor').value) || 0;
        
        const gastoData = {
            id: id || generateUUID(),
            descricao,
            categoria,
            data,
            valor
        };
        
        if (id) {
            const idx = state.gastos.findIndex(g => g.id === id);
            if (idx !== -1) state.gastos[idx] = gastoData;
        } else {
            state.gastos.push(gastoData);
        }
        
        saveState();
        closeModal('modal-gasto');
        renderAll();
        updateDashboardChart();
    });
    
    // C. CADASTRO DE INSUMO
    const formInsumo = document.getElementById('form-insumo');
    formInsumo.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('insumo-id').value;
        const nome = document.getElementById('insumo-nome').value;
        const unidade = document.getElementById('insumo-unidade').value;
        const tamanho = parseFloat(document.getElementById('insumo-tamanho').value) || 1;
        const preco = parseFloat(document.getElementById('insumo-preco').value) || 0;
        
        const insumoData = {
            id: id || generateUUID(),
            nome,
            unidade,
            tamanho,
            preco
        };
        
        if (id) {
            const idx = state.insumos.findIndex(i => i.id === id);
            if (idx !== -1) state.insumos[idx] = insumoData;
        } else {
            state.insumos.push(insumoData);
        }
        
        saveState();
        closeModal('modal-insumo');
        renderAll();
    });
    
    // D. CADASTRO DE RECEITA & CÁLCULO LIVE
    const formReceita = document.getElementById('form-receita');
    const btnAddIngredient = document.getElementById('btn-recipe-add-ingredient');
    
    // Variável local de controle dos ingredientes da receita atualmente em edição
    let receitaIngredientesTemp = [];
    
    // Evento de clique para adicionar ingrediente à lista temporária
    btnAddIngredient.addEventListener('click', () => {
        const insumoSelect = document.getElementById('recipe-add-insumo-select');
        const inputQtd = document.getElementById('recipe-add-insumo-qtd');
        
        const insumoId = insumoSelect.value;
        const quantidade = parseFloat(inputQtd.value) || 0;
        
        if (!insumoId || quantidade <= 0) {
            alert('Por favor, selecione um ingrediente e informe uma quantidade maior que zero.');
            return;
        }
        
        // Verifica se ingrediente já está na receita
        const existente = receitaIngredientesTemp.find(item => item.insumoId === insumoId);
        if (existente) {
            existente.quantidade += quantidade;
        } else {
            receitaIngredientesTemp.push({ insumoId, quantidade });
        }
        
        // Limpa inputs
        insumoSelect.value = '';
        inputQtd.value = '';
        
        // Atualiza a visualização e os cálculos na tela
        updateRecipeFormUI(receitaIngredientesTemp);
    });
    
    // Função para atualizar a UI do formulário de receita e recalcular os valores live
    window.updateRecipeFormUI = function(ingredientesList) {
        receitaIngredientesTemp = ingredientesList;
        const ul = document.getElementById('recipe-ingredients-list-ul');
        ul.innerHTML = '';
        
        let custoInsumos = 0;
        
        ingredientesList.forEach((item, index) => {
            const insumo = state.insumos.find(i => i.id === item.insumoId);
            if (insumo) {
                const custoProp = ConfeitariaCalculadora.calcularCustoInsumo(insumo, item.quantidade);
                custoInsumos += custoProp;
                
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <span class="ingredient-item-name">${insumo.nome}</span>
                        <span class="ingredient-item-cost">${item.quantidade} ${insumo.unidade}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <strong>${formatCurrency(custoProp)}</strong>
                        <button type="button" class="btn-action btn-delete" onclick="removeIngredientFromRecipe(${index})" style="padding: 0.2rem;"><i data-lucide="x"></i></button>
                    </div>
                `;
                ul.appendChild(li);
            }
        });
        
        lucide.createIcons();
        
        // Atualiza campos de cálculo baseados nas entradas
        const rendimento = parseInt(document.getElementById('receita-rendimento').value) || 1;
        const margem = parseFloat(document.getElementById('receita-margem').value) || 0;
        const adicionais = parseFloat(document.getElementById('receita-custos-adicionais').value) || 0;
        
        const custoTotal = custoInsumos + adicionais;
        const custoUnitario = custoTotal / rendimento;
        const markup = margem / 100;
        const precoTotal = custoTotal * (1 + markup);
        const precoUnitario = precoTotal / rendimento;
        const lucroTotal = precoTotal - custoTotal;
        
        document.getElementById('calc-custo-insumos').textContent = formatCurrency(custoInsumos);
        document.getElementById('calc-custo-total').textContent = formatCurrency(custoTotal);
        document.getElementById('calc-custo-unitario').textContent = formatCurrency(custoUnitario);
        document.getElementById('calc-lucro-estimado').textContent = formatCurrency(lucroTotal);
        document.getElementById('calc-preco-venda-sugerido').textContent = formatCurrency(precoTotal);
        document.getElementById('calc-preco-venda-unitario').textContent = formatCurrency(precoUnitario);
    };
    
    // Ouvintes de inputs para atualizar o cálculo live ao digitar margem/rendimento/custos adicionais
    ['receita-rendimento', 'receita-margem', 'receita-custos-adicionais'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateRecipeFormUI(receitaIngredientesTemp);
        });
    });
    
    // Remover ingrediente da receita sendo editada
    window.removeIngredientFromRecipe = function(index) {
        receitaIngredientesTemp.splice(index, 1);
        updateRecipeFormUI(receitaIngredientesTemp);
    };
    
    // Submissão da receita
    formReceita.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('receita-id').value;
        const nome = document.getElementById('receita-nome').value;
        const rendimento = parseInt(document.getElementById('receita-rendimento').value) || 1;
        const margem = parseFloat(document.getElementById('receita-margem').value) || 0;
        const custosAdicionais = parseFloat(document.getElementById('receita-custos-adicionais').value) || 0;
        
        if (receitaIngredientesTemp.length === 0) {
            alert('Adicione pelo menos um ingrediente à sua receita.');
            return;
        }
        
        const receitaData = {
            id: id || generateUUID(),
            nome,
            rendimento,
            margem,
            custosAdicionais,
            ingredientes: receitaIngredientesTemp
        };
        
        if (id) {
            const idx = state.receitas.findIndex(r => r.id === id);
            if (idx !== -1) state.receitas[idx] = receitaData;
        } else {
            state.receitas.push(receitaData);
        }
        
        saveState();
        closeModal('modal-receita');
        renderAll();
    });

    // Ouvintes dos filtros de tabelas em tempo real
    document.getElementById('vendas-search').addEventListener('input', renderVendas);
    document.getElementById('vendas-filter-status').addEventListener('change', renderVendas);
    
    document.getElementById('gastos-search').addEventListener('input', renderGastos);
    document.getElementById('gastos-filter-category').addEventListener('change', renderGastos);
    
    document.getElementById('insumos-search').addEventListener('input', renderInsumos);
    document.getElementById('receitas-search').addEventListener('input', renderReceitas);
}

/**
 * --- FUNÇÕES DE EDIÇÃO E EXCLUSÃO (WINDOW SCOPE PARA FACILIDADE NAS TABELAS) ---
 */

// VENDAS
window.editVenda = function(id) {
    const v = state.vendas.find(item => item.id === id);
    if (!v) return;
    
    document.getElementById('modal-venda-title').textContent = 'Editar Pedido';
    document.getElementById('venda-id').value = v.id;
    document.getElementById('venda-cliente').value = v.cliente;
    document.getElementById('venda-contato').value = v.contato || '';
    document.getElementById('venda-data').value = v.data;
    
    document.getElementById('venda-tipo-produto').value = 'manual';
    document.getElementById('venda-receita-select-group').style.display = 'none';
    document.getElementById('venda-receita-id').removeAttribute('required');
    
    document.getElementById('venda-produto').value = v.produto;
    document.getElementById('venda-qtd').value = v.quantidade;
    document.getElementById('venda-preco').value = v.precoUnitario;
    document.getElementById('venda-total').value = formatCurrency(v.total);
    
    document.getElementById('venda-status-pagamento').value = v.statusPagamento;
    document.getElementById('venda-status-entrega').value = v.statusEntrega;
    document.getElementById('venda-forma-pagamento').value = v.formaPagamento || 'pix';
    document.getElementById('venda-observacoes').value = v.observacoes || '';
    
    openModal('modal-venda');
};

window.deleteVenda = function(id) {
    if (confirm('Deseja realmente excluir este pedido? Esta ação não pode ser desfeita.')) {
        state.vendas = state.vendas.filter(v => v.id !== id);
        saveState();
        renderAll();
        updateDashboardChart();
    }
};

// GASTOS
window.editGasto = function(id) {
    const g = state.gastos.find(item => item.id === id);
    if (!g) return;
    
    document.getElementById('modal-gasto-title').textContent = 'Editar Gasto';
    document.getElementById('gasto-id').value = g.id;
    document.getElementById('gasto-descricao').value = g.descricao;
    document.getElementById('gasto-categoria').value = g.categoria;
    document.getElementById('gasto-data').value = g.data;
    document.getElementById('gasto-valor').value = g.valor;
    
    openModal('modal-gasto');
};

window.deleteGasto = function(id) {
    if (confirm('Deseja realmente excluir este gasto?')) {
        state.gastos = state.gastos.filter(g => g.id !== id);
        saveState();
        renderAll();
        updateDashboardChart();
    }
};

// INSUMOS
window.editInsumo = function(id) {
    const i = state.insumos.find(item => item.id === id);
    if (!i) return;
    
    document.getElementById('modal-insumo-title').textContent = 'Editar Ingrediente';
    document.getElementById('insumo-id').value = i.id;
    document.getElementById('insumo-nome').value = i.nome;
    document.getElementById('insumo-unidade').value = i.unidade;
    document.getElementById('insumo-tamanho').value = i.tamanho;
    document.getElementById('insumo-preco').value = i.preco;
    
    openModal('modal-insumo');
};

window.deleteInsumo = function(id) {
    // Verifica se insumo está sendo usado em alguma receita
    const usado = state.receitas.some(r => r.ingredientes.some(item => item.insumoId === id));
    if (usado) {
        alert('Este ingrediente não pode ser excluído pois está associado a uma ou mais receitas. Remova-o das receitas primeiro.');
        return;
    }
    
    if (confirm('Deseja realmente excluir este ingrediente?')) {
        state.insumos = state.insumos.filter(i => i.id !== id);
        saveState();
        renderAll();
    }
};

// RECEITAS
window.editReceita = function(id) {
    const r = state.receitas.find(item => item.id === id);
    if (!r) return;
    
    document.getElementById('modal-receita-title').textContent = 'Editar Receita';
    document.getElementById('receita-id').value = r.id;
    document.getElementById('receita-nome').value = r.nome;
    document.getElementById('receita-rendimento').value = r.rendimento;
    document.getElementById('receita-margem').value = r.margem;
    document.getElementById('receita-custos-adicionais').value = r.custosAdicionais || 0.00;
    
    // Abre modal e carrega os ingredientes na área temporária
    openModal('modal-receita');
    updateRecipeFormUI(JSON.parse(JSON.stringify(r.ingredientes))); // deep copy
};

window.deleteReceita = function(id) {
    if (confirm('Deseja realmente excluir esta receita?')) {
        state.receitas = state.receitas.filter(r => r.id !== id);
        saveState();
        renderAll();
    }
};

/**
 * --- RESET DOS FORMULÁRIOS AO ABRIR PARA CADASTRO ---
 */
function openModalVenda() {
    document.getElementById('modal-venda-title').textContent = 'Novo Pedido';
    document.getElementById('form-venda').reset();
    document.getElementById('venda-id').value = '';
    
    // Configura data padrão para hoje
    document.getElementById('venda-data').value = new Date().toISOString().split('T')[0];
    
    // UI default manual
    document.getElementById('venda-tipo-produto').value = 'manual';
    document.getElementById('venda-receita-select-group').style.display = 'none';
    document.getElementById('venda-receita-id').removeAttribute('required');
    document.getElementById('venda-total').value = 'R$ 0,00';
    document.getElementById('venda-forma-pagamento').value = 'pix';
    document.getElementById('venda-observacoes').value = '';
    
    openModal('modal-venda');
}

function openModalGasto() {
    document.getElementById('modal-gasto-title').textContent = 'Registrar Gasto';
    document.getElementById('form-gasto').reset();
    document.getElementById('gasto-id').value = '';
    document.getElementById('gasto-data').value = new Date().toISOString().split('T')[0];
    openModal('modal-gasto');
}

function openModalInsumo() {
    document.getElementById('modal-insumo-title').textContent = 'Novo Ingrediente';
    document.getElementById('form-insumo').reset();
    document.getElementById('insumo-id').value = '';
    openModal('modal-insumo');
}

function openModalReceita() {
    if (state.insumos.length === 0) {
        alert('Por favor, cadastre primeiro alguns ingredientes antes de criar uma receita!');
        return;
    }
    document.getElementById('modal-receita-title').textContent = 'Nova Receita & Custos';
    document.getElementById('form-receita').reset();
    document.getElementById('receita-id').value = '';
    document.getElementById('receita-rendimento').value = 1;
    document.getElementById('receita-margem').value = 100;
    document.getElementById('receita-custos-adicionais').value = '0.00';
    
    updateRecipeFormUI([]);
    openModal('modal-receita');
}

/**
 * --- SISTEMA DE CONFIGURAÇÃO E BACKUP ---
 */
function initSettingsEvents() {
    // API IA (Gemini)
    const geminiInput = document.getElementById('input-gemini-key');
    if (geminiInput) {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            geminiInput.value = savedKey;
        }
        
        document.getElementById('btn-save-gemini-key').addEventListener('click', () => {
            const key = geminiInput.value.trim();
            if (key) {
                localStorage.setItem('gemini_api_key', key);
                alert('Chave salva com sucesso no seu dispositivo!');
            } else {
                localStorage.removeItem('gemini_api_key');
                alert('Chave removida!');
            }
        });
    }

    // Exportar dados
    document.getElementById('btn-export-backup').addEventListener('click', () => {
        if (state.vendas.length === 0 && state.gastos.length === 0 && state.insumos.length === 0 && state.receitas.length === 0) {
            alert('Não há dados para exportar!');
            return;
        }
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const dlAnchorElem = document.createElement('a');
        const dataStrFileName = `doce_controle_backup_${new Date().toISOString().split('T')[0]}.json`;
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", dataStrFileName);
        dlAnchorElem.click();
    });
    
    // Importar dados
    const fileInput = document.getElementById('btn-import-backup');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                // Valida estrutura mínima do JSON
                if (parsed.vendas && parsed.gastos && parsed.insumos && parsed.receitas) {
                    if (confirm('Esta ação substituirá todos os dados atuais pelos dados do arquivo de backup. Deseja continuar?')) {
                        state = parsed;
                        saveState();
                        renderAll();
                        updateDashboardChart();
                        alert('Backup importado com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido! O arquivo de backup selecionado não está no formato correto.');
                }
            } catch (err) {
                alert('Erro ao ler o arquivo. Verifique se é um arquivo JSON válido.');
            }
        };
        reader.readAsText(file);
    });
    
    // Limpar Banco de Dados
    document.getElementById('btn-clear-db').addEventListener('click', () => {
        if (confirm('ATENÇÃO: Isso excluirá PERMANENTEMENTE todos os seus registros de vendas, gastos, ingredientes e receitas. Deseja prosseguir?')) {
            resetStateToDefault();
            renderAll();
            updateDashboardChart();
            alert('Todos os dados foram excluídos com sucesso.');
        }
    });
    
    // Carregar Dados Demonstrativos (Seed)
    document.getElementById('btn-seed-data').addEventListener('click', () => {
        if (confirm('Carregar dados de demonstração irá substituir seus dados atuais. Deseja continuar?')) {
            seedSampleData();
            renderAll();
            updateDashboardChart();
            alert('Dados demonstrativos carregados com sucesso! Navegue pelo painel e telas para testar o sistema.');
        }
    });
}

// Gera dados fictícios bem estruturados para teste imediato
function seedSampleData() {
    const idInsumoLc = generateUUID();
    const idInsumoCl = generateUUID();
    const idInsumoMnt = generateUUID();
    const idInsumoChoc = generateUUID();
    const idInsumoGran = generateUUID();
    const idInsumoFar = generateUUID();
    const idInsumoOvos = generateUUID();
    
    const insumos = [
        { id: idInsumoLc, nome: "Leite Condensado", unidade: "g", tamanho: 395, preco: 6.50 },
        { id: idInsumoCl, nome: "Creme de Leite", unidade: "g", tamanho: 200, preco: 3.20 },
        { id: idInsumoMnt, nome: "Manteiga com Sal", unidade: "g", tamanho: 200, preco: 9.80 },
        { id: idInsumoChoc, nome: "Chocolate em Pó 50%", unidade: "g", tamanho: 400, preco: 18.90 },
        { id: idInsumoGran, nome: "Granulado Chocolate", unidade: "g", tamanho: 150, preco: 5.40 },
        { id: idInsumoFar, nome: "Farinha de Trigo", unidade: "g", tamanho: 1000, preco: 5.00 },
        { id: idInsumOvos, nome: "Ovos Médios", unidade: "un", tamanho: 30, preco: 18.00 }
    ];
    
    const idReceitaBrigadeiro = generateUUID();
    const idReceitaBoloCenoura = generateUUID();
    
    const receitas = [
        {
            id: idReceitaBrigadeiro,
            nome: "Cento de Brigadeiros Gourmet",
            rendimento: 100,
            margem: 120, // 120% lucro
            custosAdicionais: 8.50, // Embalagens e forminhas
            ingredientes: [
                { insumoId: idInsumoLc, quantidade: 790 }, // 2 latas
                { insumoId: idInsumoCl, quantidade: 200 }, // 1 caixinha
                { insumoId: idInsumoMnt, quantidade: 30 },
                { insumoId: idInsumoChoc, quantidade: 80 },
                { insumoId: idInsumoGran, quantidade: 150 }
            ]
        },
        {
            id: idReceitaBoloCenoura,
            nome: "Bolo de Cenoura com Calda de Chocolate (M)",
            rendimento: 1,
            margem: 150, // 150% lucro
            custosAdicionais: 3.50, // Embalagem descartável
            ingredientes: [
                { insumoId: idInsumoFar, quantidade: 300 },
                { insumoId: idInsumOvos, quantidade: 3 },
                { insumoId: idInsumoLc, quantidade: 395 },
                { insumoId: idInsumoChoc, quantidade: 40 },
                { insumoId: idInsumoMnt, quantidade: 15 }
            ]
        }
    ];
    
    // Cria datas baseadas no mês atual
    const obterDataMes = (diaOffset) => {
        const d = new Date();
        d.setDate(d.getDate() - diaOffset);
        return d.toISOString().split('T')[0];
    };
    
    // Outros meses para popular o gráfico financeiro
    const obterDataMesDiferente = (mesOffset, dia) => {
        const d = new Date();
        d.setMonth(d.getMonth() - mesOffset);
        d.setDate(dia);
        return d.toISOString().split('T')[0];
    };

    const vendas = [
        {
            id: generateUUID(),
            cliente: "Maria Oliveira",
            contato: "(11) 98888-1111",
            data: obterDataMes(1),
            produto: "Cento de Brigadeiros Gourmet",
            quantidade: 1,
            precoUnitario: 90.00,
            total: 90.00,
            statusPagamento: "pago",
            statusEntrega: "entregue",
            formaPagamento: "pix",
            observacoes: "Entregar em caixa personalizada."
        },
        {
            id: generateUUID(),
            cliente: "Paula Souza",
            contato: "(11) 97777-2222",
            data: obterDataMes(0),
            produto: "Bolo de Cenoura com Calda de Chocolate (M)",
            quantidade: 2,
            precoUnitario: 45.00,
            total: 90.00,
            statusPagamento: "pendente",
            statusEntrega: "pendente",
            formaPagamento: "dinheiro",
            observacoes: ""
        },
        {
            id: generateUUID(),
            cliente: "Carlos Ferreira",
            contato: "(11) 96666-3333",
            data: obterDataMes(-2),
            produto: "Cento de Brigadeiros Gourmet",
            quantidade: 2,
            precoUnitario: 90.00,
            total: 180.00,
            statusPagamento: "pago",
            statusEntrega: "pendente",
            formaPagamento: "cartao-credito",
            observacoes: "Sem amendoim (alergia)."
        },
        {
            id: generateUUID(),
            cliente: "Juliana Santos",
            contato: "",
            data: obterDataMesDiferente(1, 10),
            produto: "Cento de Brigadeiros Gourmet",
            quantidade: 3,
            precoUnitario: 85.00,
            total: 255.00,
            statusPagamento: "pago",
            statusEntrega: "entregue",
            formaPagamento: "pix",
            observacoes: ""
        },
        {
            id: generateUUID(),
            cliente: "Renato Lima",
            contato: "",
            data: obterDataMesDiferente(2, 15),
            produto: "Bolo de Cenoura com Calda de Chocolate (M)",
            quantidade: 4,
            precoUnitario: 40.00,
            total: 160.00,
            statusPagamento: "pago",
            statusEntrega: "entregue",
            formaPagamento: "transferencia",
            observacoes: ""
        }
    ];
    
    const gastos = [
        {
            id: generateUUID(),
            descricao: "Compra de Ingredientes Semanal",
            categoria: "Ingredientes",
            data: obterDataMes(5),
            valor: 65.50
        },
        {
            id: generateUUID(),
            descricao: "Embalagens para Brigadeiros",
            categoria: "Embalagens",
            data: obterDataMes(12),
            valor: 24.90
        },
        {
            id: generateUUID(),
            descricao: "Botijão de Gás Cozinha",
            categoria: "Energia/Água/Gás",
            data: obterDataMes(20),
            valor: 110.00
        },
        {
            id: generateUUID(),
            descricao: "Ingredientes Mês Passado",
            categoria: "Ingredientes",
            data: obterDataMesDiferente(1, 8),
            valor: 120.00
        },
        {
            id: generateUUID(),
            descricao: "Marketing Redes Sociais",
            categoria: "Marketing/Divulgação",
            data: obterDataMesDiferente(2, 5),
            valor: 50.00
        }
    ];
    
    state = { insumos, receitas, vendas, gastos };
    saveState();
}

/**
 * --- ATUALIZAÇÃO DO GRÁFICO (CHART.JS) ---
 */
function updateDashboardChart() {
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    // Agrupa dados financeiros por mês nos últimos 6 meses para exibição
    const labels = [];
    const dadosGanhos = [];
    const dadosGastos = [];
    
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Prepara os últimos 6 meses
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        labels.push(`${mesesNomes[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
        
        // Ganhos no respectivo mês
        const totalVendasMes = state.vendas
            .filter(v => {
                const dv = new Date(v.data);
                return dv.getFullYear() === d.getFullYear() && dv.getMonth() === d.getMonth() && v.statusEntrega !== 'cancelado';
            })
            .reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
            
        // Gastos no respectivo mês
        const totalGastosMes = state.gastos
            .filter(g => {
                const dg = new Date(g.data);
                return dg.getFullYear() === d.getFullYear() && dg.getMonth() === d.getMonth();
            })
            .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
            
        dadosGanhos.push(totalVendasMes);
        dadosGastos.push(totalGastosMes);
    }
    
    // Destrói gráfico antigo se existir
    if (financeChartInstance) {
        financeChartInstance.destroy();
    }
    
    // Cria novo gráfico
    financeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ganhos (R$)',
                    data: dadosGanhos,
                    backgroundColor: 'rgba(46, 204, 113, 0.75)', // Success color
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Gastos (R$)',
                    data: dadosGastos,
                    backgroundColor: 'rgba(231, 76, 96, 0.75)', // Danger color
                    borderColor: 'rgba(231, 76, 96, 1)',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Outfit',
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(0);
                        },
                        font: {
                            family: 'Outfit'
                        }
                    },
                    grid: {
                        color: 'rgba(183, 110, 121, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Outfit'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * --- FORMATADORES E UTILITÁRIOS ---
 */

// Formata data de AAAA-MM-DD para DD/MM/AAAA
function formatDate(dateStr) {
    if (!dateStr) return '';
    const partes = dateStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dateStr;
}

// Formata número em Moeda Real R$
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Helper para gerar UUID simples
function generateUUID() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Ações rápidas do Dashboard de encomendas
window.confirmarPagamentoRapido = function(id) {
    const v = state.vendas.find(item => item.id === id);
    if (!v) return;
    v.statusPagamento = 'pago';
    saveState();
    renderAll();
    updateDashboardChart();
};

window.completarEntregaRapido = function(id) {
    const v = state.vendas.find(item => item.id === id);
    if (!v) return;
    v.statusEntrega = 'entregue';
    saveState();
    renderAll();
    updateDashboardChart();
};

window.enviarMensagemWhatsApp = function(id) {
    const v = state.vendas.find(item => item.id === id);
    if (!v) return;
    
    if (!v.contato) {
        alert('Nenhum telefone de contato cadastrado para este pedido! Edite a venda para adicionar um telefone.');
        return;
    }
    
    let telefone = v.contato.replace(/\D/g, '');
    if (!telefone) {
        alert('O número de telefone cadastrado é inválido! Use apenas números com DDD.');
        return;
    }
    
    if (telefone.length === 10 || telefone.length === 11) {
        telefone = '55' + telefone;
    }
    
    const dataFormatada = formatDate(v.data);
    const totalFormatado = formatCurrency(v.total);
    const statusPag = v.statusPagamento === 'pago' ? 'já pago' : 'pagamento pendente';
    const obsLine = v.observacoes ? `\n\u2709️ *Observações:* ${v.observacoes}` : '';
    
    const mensagem = `Olá, *${v.cliente}*! Tudo bem? 🍰 Aqui é da confeitaria.\n\nPassando para confirmar os detalhes do seu pedido:\n📦 *Encomenda:* ${v.quantidade}x ${v.produto}\n📅 *Data de Entrega:* ${dataFormatada}\n💰 *Valor Total:* ${totalFormatado} (${statusPag})${obsLine}\n\nEstá tudo confirmado para a data? Aguardo seu retorno!`;
    
    const url = `https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
};


/**
 * --- DARK MODE ---
 */
function initDarkMode() {
    const btn  = document.getElementById('btn-dark-mode');
    const icon = document.getElementById('dark-mode-icon');
    
    // Restaura preferência salva
    if (localStorage.getItem('dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        icon.setAttribute('data-lucide', 'sun');
        lucide.createIcons();
    }
    
    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('dark_mode', isDark);
        icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        lucide.createIcons();
    });
}

/**
 * --- NOTIFICAÇÃO DE ENTREGAS DO DIA ---
 */
function checkEntregasHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    const entregasHoje = state.vendas.filter(v => v.data === hoje && v.statusEntrega === 'pendente');
    
    if (entregasHoje.length === 0) return;
    
    const banner = document.getElementById('banner-hoje');
    const text   = document.getElementById('banner-hoje-text');
    
    const nomes = entregasHoje.slice(0, 3).map(v => v.cliente).join(', ');
    const extra = entregasHoje.length > 3 ? ` e mais ${entregasHoje.length - 3}` : '';
    text.textContent = `Você tem ${entregasHoje.length} entrega(s) hoje: ${nomes}${extra}`;
    
    banner.style.display = 'flex';
    document.body.classList.add('has-banner');
    lucide.createIcons();
    
    document.getElementById('btn-fechar-banner').addEventListener('click', () => {
        banner.style.display = 'none';
        document.body.classList.remove('has-banner');
    });
}

/**
 * --- CALENDÁRIO DE ENCOMENDAS ---
 */
function initCalendar() {
    document.getElementById('btn-cal-prev').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        renderCalendario();
    });
    document.getElementById('btn-cal-next').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        renderCalendario();
    });
}

function renderCalendario() {
    const titleEl = document.getElementById('calendar-month-title');
    if (!titleEl) return;
    
    const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    
    const ano = calendarCurrentDate.getFullYear();
    const mes = calendarCurrentDate.getMonth();
    
    titleEl.textContent = `${mesesNomes[mes]} de ${ano}`;
    
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Esconde painel de pedidos do dia
    const ordersPanel = document.getElementById('calendar-day-orders-panel');
    if (ordersPanel) ordersPanel.style.display = 'none';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0];
    
    const primeiroDia = new Date(ano, mes, 1).getDay(); // 0=Dom
    const totalDias   = new Date(ano, mes + 1, 0).getDate();
    
    // Mapeia pedidos por dia
    const ordersPerDay = {};
    state.vendas.forEach(v => {
        if (!v.data) return;
        const d = new Date(v.data + 'T00:00:00');
        if (d.getFullYear() === ano && d.getMonth() === mes) {
            const dia = d.getDate();
            if (!ordersPerDay[dia]) ordersPerDay[dia] = [];
            ordersPerDay[dia].push(v);
        }
    });
    
    // Células vazias antes do primeiro dia
    for (let i = 0; i < primeiroDia; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day calendar-day-empty';
        grid.appendChild(cell);
    }
    
    // Células dos dias
    for (let dia = 1; dia <= totalDias; dia++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        if (dateStr === hojeStr) cell.classList.add('calendar-day-today');
        
        const orders = ordersPerDay[dia] || [];
        
        let dotsHtml = '';
        if (orders.length > 0) {
            cell.classList.add('calendar-day-has-orders');
            
            const dtCell = new Date(dateStr + 'T00:00:00');
            const hasAtrasado = orders.some(v => v.statusEntrega === 'pendente' && dtCell < hoje);
            const hasPendente = orders.some(v => v.statusEntrega === 'pendente');
            
            let dotClass = 'dot-entregue';
            if (hasAtrasado)      dotClass = 'dot-atrasado';
            else if (hasPendente) dotClass = 'dot-pendente';
            
            const countHtml = orders.length > 1 ? `<span class="calendar-count">${orders.length}</span>` : '';
            dotsHtml = `<div class="calendar-dots"><span class="calendar-dot ${dotClass}"></span>${countHtml}</div>`;
            
            const capturedDia   = dia;
            const capturedDate  = dateStr;
            const capturedOrders = orders;
            cell.addEventListener('click', () => {
                showCalendarDayOrders(capturedDia, capturedDate, capturedOrders);
                document.querySelectorAll('.calendar-day.selected').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
            });
        }
        
        cell.innerHTML = `<span class="calendar-day-number">${dia}</span>${dotsHtml}`;
        grid.appendChild(cell);
    }
}

function showCalendarDayOrders(dia, dateStr, orders) {
    const panel = document.getElementById('calendar-day-orders-panel');
    const title = document.getElementById('calendar-selected-day-title');
    const list  = document.getElementById('calendar-day-orders-list');
    if (!panel || !title || !list) return;
    
    const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const d = new Date(dateStr + 'T00:00:00');
    title.textContent = `${dia} de ${mesesNomes[d.getMonth()]} — ${orders.length} encomenda(s)`;
    
    list.innerHTML = '';
    orders.forEach(v => {
        const statusClass = v.statusEntrega === 'entregue' ? 'badge-success' : 'badge-warning';
        const statusText  = v.statusEntrega === 'entregue' ? 'Entregue' : 'Pendente';
        const div = document.createElement('div');
        div.className = 'calendar-order-item';
        div.innerHTML = `
            <div>
                <strong>${v.cliente}</strong>
                ${v.contato ? `<br><small class="text-muted">${v.contato}</small>` : ''}
                <br><span class="text-muted">${v.quantidade}x ${v.produto}</span>
                ${v.observacoes ? `<br><small class="text-light">📝 ${v.observacoes}</small>` : ''}
            </div>
            <div style="text-align:right; flex-shrink:0">
                <strong>${formatCurrency(v.total)}</strong>
                <br><span class="badge ${statusClass}">${statusText}</span>
            </div>
        `;
        list.appendChild(div);
    });
    
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * --- RELATÓRIOS DE DESEMPENHO ---
 */
function renderRelatorios() {
    const tab = document.getElementById('tab-relatorios');
    if (!tab || !tab.classList.contains('active')) return;
    
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const hoje = new Date();
    const labels = [];
    const dadosLucro = [];
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        labels.push(`${mesesNomes[d.getMonth()]}/${d.getFullYear().toString().substr(-2)}`);
        
        const totalVendas = state.vendas
            .filter(v => {
                const dv = new Date(v.data);
                return dv.getFullYear() === d.getFullYear() && dv.getMonth() === d.getMonth() && v.statusEntrega !== 'cancelado';
            })
            .reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
            
        const totalGastos = state.gastos
            .filter(g => {
                const dg = new Date(g.data);
                return dg.getFullYear() === d.getFullYear() && dg.getMonth() === d.getMonth();
            })
            .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
            
        dadosLucro.push(totalVendas - totalGastos);
    }
    
    // Gráfico de Linha - Evolução do Lucro
    const ctxLucro = document.getElementById('lucroChart');
    if (ctxLucro) {
        if (lucroChartInstance) lucroChartInstance.destroy();
        lucroChartInstance = new Chart(ctxLucro.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Lucro Líquido (R$)',
                    data: dadosLucro,
                    borderColor: '#B76E79',
                    backgroundColor: 'rgba(183, 110, 121, 0.12)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#B76E79',
                    pointBorderColor: '#fff',
                    pointRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        ticks: { callback: v => 'R$ ' + v.toFixed(0), font: { family: 'Outfit' } },
                        grid: { color: 'rgba(183,110,121,0.06)' }
                    },
                    x: {
                        ticks: { font: { family: 'Outfit' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
    
    // Dados de produtos
    const produtosMap = {};
    state.vendas.filter(v => v.statusEntrega !== 'cancelado').forEach(v => {
        const nome = v.produto || 'Sem nome';
        if (!produtosMap[nome]) produtosMap[nome] = { qtd: 0, faturamento: 0 };
        produtosMap[nome].qtd          += parseFloat(v.quantidade) || 0;
        produtosMap[nome].faturamento  += parseFloat(v.total)      || 0;
    });
    
    const produtosSorted = Object.entries(produtosMap).sort((a, b) => b[1].faturamento - a[1].faturamento);
    const top5 = produtosSorted.slice(0, 5);
    const cores = ['#B76E79','#E3B448','#5DADE2','#58D68D','#AF7AC5'];
    
    // Gráfico de Rosca - Produtos
    const ctxProd = document.getElementById('produtosChart');
    if (ctxProd) {
        if (produtosChartInstance) produtosChartInstance.destroy();
        produtosChartInstance = new Chart(ctxProd.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: top5.map(([nome]) => nome.length > 22 ? nome.substring(0, 22) + '…' : nome),
                datasets: [{
                    data: top5.map(([, d]) => d.faturamento),
                    backgroundColor: cores,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Outfit', size: 11 }, boxWidth: 14, padding: 10 } },
                    tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.raw)}` } }
                }
            }
        });
    }
    
    // Tabela de produtos
    const tableBody = document.getElementById('produtos-relatorio-body');
    if (tableBody) {
        if (produtosSorted.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:2rem">Sem dados de vendas.</td></tr>';
        } else {
            tableBody.innerHTML = '';
            produtosSorted.forEach(([nome, data], i) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong style="color:var(--primary)">#${i + 1}</strong></td>
                    <td>${nome}</td>
                    <td>${data.qtd.toFixed(0)}</td>
                    <td><strong>${formatCurrency(data.faturamento)}</strong></td>
                `;
                tableBody.appendChild(row);
            });
        }
    }
    
    // Top Clientes
    const clientesMap = {};
    state.vendas.filter(v => v.statusEntrega !== 'cancelado').forEach(v => {
        if (!clientesMap[v.cliente]) clientesMap[v.cliente] = { total: 0, pedidos: 0 };
        clientesMap[v.cliente].total   += parseFloat(v.total) || 0;
        clientesMap[v.cliente].pedidos += 1;
    });
    
    const clientesSorted = Object.entries(clientesMap).sort((a, b) => b[1].total - a[1].total);
    const top3 = clientesSorted.slice(0, 3);
    const medalhas = ['🥇','🥈','🥉'];
    
    const topClientesBody = document.getElementById('top-clientes-body');
    if (topClientesBody) {
        if (top3.length === 0) {
            topClientesBody.innerHTML = '<div class="empty-state"><p>Sem dados de vendas ainda.</p></div>';
        } else {
            topClientesBody.innerHTML = '';
            top3.forEach(([nome, data], i) => {
                const div = document.createElement('div');
                div.className = 'top-cliente-item';
                div.innerHTML = `
                    <div class="top-cliente-rank">${medalhas[i]}</div>
                    <div class="top-cliente-info">
                        <strong>${nome}</strong>
                        <small class="text-muted">${data.pedidos} pedido(s)</small>
                    </div>
                    <div class="top-cliente-valor">${formatCurrency(data.total)}</div>
                `;
                topClientesBody.appendChild(div);
            });
        }
    }
}

/**
 * --- HELPER: LABEL DA FORMA DE PAGAMENTO ---
 */
function getFormaPagLabel(forma) {
    const map = {
        'pix':            'Pix',
        'dinheiro':       'Dinheiro',
        'cartao-credito': 'Crédito',
        'cartao-debito':  'Débito',
        'transferencia':  'Transferência'
    };
    return map[forma] || forma;
}

/**
 * --- LEITOR DE NOTAS FISCAIS (IA GEMINI) ---
 */
function initAIScanner() {
    const scanInput = document.getElementById('btn-scan-receipt');
    if (!scanInput) return;

    scanInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            alert('Por favor, configure sua Chave de API do Gemini na aba "Configurações" antes de ler notas fiscais.');
            scanInput.value = ''; // Reset
            return;
        }

        // Show loading state
        const labelBtn = scanInput.closest('.btn');
        const originalText = labelBtn.innerHTML;
        labelBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Lendo IA...';
        lucide.createIcons();
        labelBtn.style.pointerEvents = 'none';

        try {
            // Convert to Base64
            const base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Call Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Analise esta nota fiscal. Extraia os produtos e seus preços totais. Retorne EXATAMENTE UM JSON ARRAY neste formato: [{\"nome\": \"Farinha\", \"valor\": 5.90}]. Sem crases, sem markdown, apenas o array JSON válido." },
                            { inline_data: { mime_type: file.type, data: base64Image } }
                        ]
                    }]
                })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }

            let textContent = result.candidates[0].content.parts[0].text;
            // Remove markdown format se a IA retornar (ex: ```json ... ```)
            textContent = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
            
            const itens = JSON.parse(textContent);
            
            if (itens && itens.length > 0) {
                const hoje = new Date().toISOString().split('T')[0];
                let cont = 0;
                itens.forEach(item => {
                    // Trata o valor numérico que a IA pode retornar como string "5.90" ou "5,90"
                    let valor = typeof item.valor === 'string' ? item.valor.replace(',', '.') : item.valor;
                    valor = parseFloat(valor);
                    
                    if (item.nome && !isNaN(valor) && valor > 0) {
                        state.gastos.push({
                            id: generateUUID(),
                            descricao: item.nome,
                            categoria: "Outros",
                            data: hoje,
                            valor: valor
                        });
                        cont++;
                    }
                });
                
                if (cont > 0) {
                    saveState();
                    renderGastos();
                    alert(`${cont} itens foram adicionados aos seus gastos com sucesso! (Verifique a categoria se necessário)`);
                } else {
                    alert('Não consegui identificar itens válidos na nota.');
                }
            } else {
                alert('Nenhum item encontrado na nota.');
            }
            
        } catch (err) {
            console.error('Erro na IA:', err);
            alert('Erro ao processar a nota fiscal. Verifique se sua Chave de API está correta nas Configurações.');
        } finally {
            // Restore button
            labelBtn.innerHTML = originalText;
            lucide.createIcons();
            labelBtn.style.pointerEvents = 'auto';
            scanInput.value = ''; // Reset
        }
    });
}
