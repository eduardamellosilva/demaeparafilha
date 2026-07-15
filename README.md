# De Mãe para Filha 🍰
### Sistema de Gestão de Confeitaria

Aplicação web responsiva para controle financeiro de confeitaria artesanal, funcionando 100% no navegador com dados salvos localmente (localStorage).

## ✨ Funcionalidades

- **Painel Geral** — Ganhos, gastos e lucro do mês com gráfico comparativo mensal
- **Próximas Encomendas** — Ações rápidas de um clique: confirmar entrega, registrar pagamento e enviar lembrete via WhatsApp
- **Minhas Vendas** — Cadastro e controle de pedidos com status de pagamento e entrega
- **Meus Gastos** — Registro de despesas por categoria (Ingredientes, Embalagens, Gás, etc.)
- **Precificação** — Cadastro de ingredientes (insumos) e cálculo automático de custo de receitas com margem de lucro
- **Configurações** — Backup e restauração dos dados em arquivo JSON

## 📱 Responsivo

- Menu sanduíche (hamburger) com gaveta lateral em dispositivos móveis
- Sidebar colapsável no computador para ampliar a área de trabalho

## 🚀 Como executar

```bash
py run_server.py
```

Acesse: **http://localhost:8000**

> Não requer instalação de dependências. Funciona em qualquer navegador moderno.

## 🛠️ Tecnologias

- HTML5 + CSS3 (Vanilla)
- JavaScript (ES6+)
- [Chart.js](https://www.chartjs.org/) — Gráficos financeiros
- [Lucide Icons](https://lucide.dev/) — Ícones
- [Google Fonts — Outfit](https://fonts.google.com/specimen/Outfit) — Tipografia
- `localStorage` — Persistência local dos dados

## 📁 Estrutura

```
confeitaria-control/
├── index.html       # Estrutura e templates HTML
├── style.css        # Estilos e design responsivo
├── app.js           # Lógica principal, renderização e eventos
├── calculator.js    # Módulo de cálculos de receitas e precificação
└── run_server.py    # Servidor local Python para desenvolvimento
```
