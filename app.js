const state = {
  isAuthenticated: false,
  sidebarOpen: false,
  activePage: "dashboard_geral",
  selectedPeriod: "30",
  selectedSeller: "all",
  selectedBank: "all",
  selectedStatus: "all",
  searchTerm: "",
  selectedSellerDetail: null,
  notifications: [],
  modal: null,
  modalData: null,
  tableState: {},
};

const STORAGE_KEYS = {
  auth: "crm-financeiro-auth-v1",
  profile: "crm-financeiro-profile-v1",
  sellers: "crm-financeiro-sellers-v2",
  sales: "crm-financeiro-sales-v2",
  goals: "crm-financeiro-goals-v2",
};

const defaultSellers = [];

const bankOptions = ["V8", "SOMA", "LOTUS", "ICRED", "BANCO PAN", "BANCO C6", "GRANDINO", "VCTEX", "PRESENÇA BANK"];

const defaultSales = [];

const cashFlow = [];

const defaultGoals = [
  { nome: "Meta Geral", tipo: "Equipe", valor_meta: 0, valor_realizado: 0 },
];

const defaultProfile = {
  name: "Seu Nome",
  role: "Seu cargo",
  sellerId: "",
};

function canUseStorage() {
  return typeof localStorage !== "undefined";
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function readStorage(key, fallback) {
  if (!canUseStorage()) return cloneData(fallback);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : cloneData(fallback);
  } catch {
    return cloneData(fallback);
  }
}

function writeStorage(key, value) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function removeStorage(key) {
  if (!canUseStorage()) return;
  localStorage.removeItem(key);
}

function persistCRMData() {
  writeStorage(STORAGE_KEYS.sellers, sellers);
  writeStorage(STORAGE_KEYS.sales, sales);
  writeStorage(STORAGE_KEYS.goals, goals);
}

function persistProfile() {
  writeStorage(STORAGE_KEYS.profile, profile);
}

const sellers = readStorage(STORAGE_KEYS.sellers, defaultSellers);
const sales = readStorage(STORAGE_KEYS.sales, defaultSales);
const goals = readStorage(STORAGE_KEYS.goals, defaultGoals);
const profile = readStorage(STORAGE_KEYS.profile, defaultProfile);

state.isAuthenticated = readStorage(STORAGE_KEYS.auth, false);

function ensureEntityIds() {
  sellers.forEach((seller) => {
    if (!seller.id) seller.id = slugify(seller.nome);
  });
  sales.forEach((sale, index) => {
    if (!sale[10]) sale[10] = `sale-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  });
}

ensureEntityIds();

const pageMap = {
  dashboard_geral: { title: "Dashboard Geral", subtitle: "Visão completa do desempenho comercial e financeiro" },
  financeiro: { title: "Financeiro", subtitle: "Controle de vendas, comissões e indicadores financeiros" },
  comissoes: { title: "Comissões", subtitle: "Controle detalhado das comissões por venda e por operador" },
  fluxo_de_caixa: { title: "Fluxo de Caixa", subtitle: "Entradas, pendências e visão financeira operacional" },
  vendedores: { title: "Vendedores", subtitle: "Acompanhe o desempenho individual da equipe" },
  metas: { title: "Metas", subtitle: "Acompanhe a evolução das metas da equipe e dos vendedores" },
  historico: { title: "Histórico", subtitle: "Consulte o registro completo das operações" },
  relatorios: { title: "Relatórios", subtitle: "Análises consolidadas para tomada de decisão" },
  configuracoes: { title: "Configurações", subtitle: "Ajustes gerais da plataforma" },
};

const navItems = [
  ["dashboard_geral", "Painel"],
  ["dashboard_geral", "Dashboard Geral"],
  ["financeiro", "Financeiro"],
  ["comissoes", "Comissões"],
  ["fluxo_de_caixa", "Fluxo de Caixa"],
  ["vendedores", "Vendedores"],
  ["metas", "Metas"],
  ["historico", "Histórico"],
  ["relatorios", "Relatórios"],
  ["configuracoes", "Configurações"],
];

const todayISO = new Date().toISOString().slice(0, 10);

const fmtCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const fmtPercent = (value) => `${value.toFixed(1).replace(".", ",")}%`;
const fmtInteger = (value) => new Intl.NumberFormat("pt-BR").format(value);
const fmtDate = (value) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));

function slugify(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizedName(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function getInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "PF";
}

function getProfileSeller() {
  return sellers.find((seller) => seller.id === profile.sellerId) ?? null;
}

function parseSale(entry) {
  const seller = sellers.find((item) => item.id === entry[1]);
  return {
    id: entry[10],
    data: entry[0],
    vendedorId: entry[1],
    vendedor: seller?.nome ?? entry[1],
    cliente: entry[2],
    valor: entry[3],
    banco: entry[4],
    percentual_comissao: entry[5],
    comissao: entry[3] * entry[5],
    status: entry[6],
    dataProposta: entry[7],
    produto: entry[8],
    comissaoGestor: entry[9] ?? 0,
  };
}

function findSaleIndexById(id) {
  return sales.findIndex((sale) => sale[10] === id);
}

function updateSaleRecord(saleId, payload) {
  const index = findSaleIndexById(saleId);
  if (index === -1) return false;
  sales[index] = [
    todayISO,
    payload.seller,
    payload.client,
    payload.value,
    payload.bank,
    payload.sellerPercent / 100,
    payload.status,
    payload.proposalDate,
    payload.product,
    payload.value * (payload.ownerPercent / 100),
    saleId,
  ];
  persistCRMData();
  return true;
}

function removeSaleRecord(saleId) {
  const index = findSaleIndexById(saleId);
  if (index === -1) return false;
  sales.splice(index, 1);
  persistCRMData();
  return true;
}

function updateSellerRecord(sellerId, payload) {
  const seller = sellers.find((item) => item.id === sellerId);
  if (!seller) return false;
  const previousName = seller.nome;
  seller.nome = payload.name;
  seller.meta_mensal = payload.goal;
  seller.avatar = payload.avatar;
  const goalEntry = goals.find((goal) => goal.tipo === "Vendedor" && goal.nome === previousName);
  if (goalEntry) {
    goalEntry.nome = payload.name;
    goalEntry.valor_meta = payload.goal;
  }
  persistCRMData();
  return true;
}

function removeSellerRecord(sellerId) {
  const sellerIndex = sellers.findIndex((item) => item.id === sellerId);
  if (sellerIndex === -1) return false;
  const seller = sellers[sellerIndex];
  if (sales.some((sale) => sale[1] === sellerId)) {
    showToast("Exclusão bloqueada", "Remova ou reatribua as vendas desse vendedor antes de excluir.");
    return false;
  }
  sellers.splice(sellerIndex, 1);
  const goalIndex = goals.findIndex((goal) => goal.tipo === "Vendedor" && goal.nome === seller.nome);
  if (goalIndex !== -1) goals.splice(goalIndex, 1);
  persistCRMData();
  return true;
}

function resetCRMData() {
  sellers.splice(0, sellers.length, ...cloneData(defaultSellers));
  sales.splice(0, sales.length, ...cloneData(defaultSales));
  goals.splice(0, goals.length, ...cloneData(defaultGoals));
  ensureEntityIds();
  persistCRMData();
}

function parseCashFlow(entry) {
  return { data: entry[0], tipo: entry[1], descricao: entry[2], categoria: entry[3], valor: entry[4], status: entry[5] };
}

function getDays(period) {
  return { "7": 7, "30": 30, "90": 90, "180": 180 }[period] ?? 30;
}

function getDateLimit() {
  const limit = new Date("2026-04-17T00:00:00");
  limit.setDate(limit.getDate() - getDays(state.selectedPeriod));
  return limit;
}

function matchesSearch(text) {
  if (!state.searchTerm.trim()) return true;
  return text.toLowerCase().includes(state.searchTerm.trim().toLowerCase());
}

function getFilteredSales() {
  const limit = getDateLimit();
  return sales
    .map(parseSale)
    .filter((sale) => new Date(`${sale.data}T00:00:00`) >= limit)
    .filter((sale) => state.selectedSeller === "all" || sale.vendedorId === state.selectedSeller)
    .filter((sale) => state.selectedBank === "all" || sale.banco === state.selectedBank)
    .filter((sale) => state.selectedStatus === "all" || slugify(sale.status) === slugify(state.selectedStatus))
    .filter((sale) => matchesSearch(`${sale.cliente} ${sale.vendedor} ${sale.banco} ${sale.status} ${sale.dataProposta} ${sale.produto}`));
}

function getFilteredCashFlow() {
  const limit = getDateLimit();
  return cashFlow
    .map(parseCashFlow)
    .filter((entry) => new Date(`${entry.data}T00:00:00`) >= limit)
    .filter((entry) => state.selectedStatus === "all" || slugify(entry.status) === slugify(state.selectedStatus))
    .filter((entry) => matchesSearch(`${entry.tipo} ${entry.descricao} ${entry.categoria} ${entry.status}`));
}

function getDashboardMetrics(filteredSales) {
  const totalSales = filteredSales.reduce((sum, item) => sum + item.valor, 0);
  const totalCommission = filteredSales.reduce((sum, item) => sum + item.comissao, 0);
  const ownerProfit = filteredSales.reduce((sum, item) => sum + item.comissaoGestor, 0);
  const totalCount = filteredSales.length;
  const avgTicket = totalCount ? totalSales / totalCount : 0;
  const goalPercent = goals[0].valor_meta ? (totalSales / goals[0].valor_meta) * 100 : 0;
  const received = filteredSales.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.valor, 0);
  return { totalSales, totalCommission, ownerProfit, totalCount, avgTicket, goalPercent, received };
}

function getSellerStats(filteredSales) {
  return sellers
    .map((seller) => {
      const sellerSales = filteredSales.filter((sale) => sale.vendedorId === seller.id);
      const total = sellerSales.reduce((sum, item) => sum + item.valor, 0);
      const commission = sellerSales.reduce((sum, item) => sum + item.comissao, 0);
      return {
        ...seller,
        realizado: total,
        comissao_total: commission,
        quantidade_vendas: sellerSales.length,
        percentual_meta: seller.meta_mensal ? (total / seller.meta_mensal) * 100 : 0,
      };
    })
    .sort((a, b) => b.realizado - a.realizado);
}

function getBankDistribution(filteredSales) {
  return filteredSales.reduce((acc, sale) => {
    acc[sale.banco] = (acc[sale.banco] ?? 0) + sale.valor;
    return acc;
  }, {});
}

function getSalesTrend(filteredSales) {
  const grouped = filteredSales.reduce((acc, sale) => {
    acc[sale.data] = (acc[sale.data] ?? 0) + sale.valor;
    return acc;
  }, {});
  return Object.entries(grouped)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-7)
    .map(([date, total]) => ({ date: fmtDate(date), total }));
}

function getTimeline(filteredSales) {
  return filteredSales
    .slice()
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 6)
    .map((sale) => ({
      title: `${sale.vendedor} confirmou ${fmtCurrency(sale.valor)}`,
      subtitle: `${sale.cliente} · ${sale.banco} · ${sale.status}`,
      date: fmtDate(sale.data),
    }));
}

function showToast(title, message) {
  const id = `${Date.now()}-${Math.random()}`;
  state.notifications = [...state.notifications, { id, title, message }];
  renderApp();
  window.setTimeout(() => {
    state.notifications = state.notifications.filter((item) => item.id !== id);
    renderApp();
  }, 2600);
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCurrentExportData() {
  const filteredSales = getFilteredSales();
  const filteredCashFlow = getFilteredCashFlow();
  const sellerStats = getSellerStats(filteredSales);
  const totalSales = filteredSales.reduce((sum, item) => sum + item.valor, 0);

  if (state.activePage === "fluxo_de_caixa") {
    return {
      filename: "fluxo-de-caixa",
      title: "Fluxo de Caixa",
      columns: ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Status"],
      rows: filteredCashFlow.map((item) => [item.data, item.tipo, item.descricao, item.categoria, item.valor, item.status]),
    };
  }

  if (state.activePage === "metas") {
    return {
      filename: "metas",
      title: "Metas",
      columns: ["Vendedor", "Meta", "Realizado", "Falta", "Progresso"],
      rows: sellerStats.map((item) => [
        item.nome,
        item.meta_mensal,
        item.realizado,
        Math.max(item.meta_mensal - item.realizado, 0),
        `${item.percentual_meta.toFixed(2)}%`,
      ]),
    };
  }

  if (state.activePage === "relatorios") {
    return {
      filename: "relatorio-gerencial",
      title: "Relatório Gerencial",
      columns: ["Indicador", "Valor"],
      rows: [
        ["Total de vendas", totalSales],
        ["Comissão total", filteredSales.reduce((sum, item) => sum + item.comissao, 0)],
        ["Meu lucro", filteredSales.reduce((sum, item) => sum + item.comissaoGestor, 0)],
        ["Quantidade de vendas", filteredSales.length],
        ["Ticket médio", filteredSales.length ? totalSales / filteredSales.length : 0],
      ],
    };
  }

    return {
      filename: state.activePage === "comissoes" ? "comissoes" : "financeiro",
      title: pageMap[state.activePage]?.title ?? "Financeiro",
    columns: ["Data", "Vendedor", "Cliente", "Valor", "Banco", "Comissão", "Minha comissão", "Status"],
    rows: filteredSales.map((row) => [row.data, row.vendedor, row.cliente, row.valor, row.banco, row.comissao, row.comissaoGestor, row.status]),
    };
  }

function exportCurrentView(kind = "csv") {
  const dataset = getCurrentExportData();
  if (kind === "pdf") {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${dataset.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
          h1 { margin-bottom: 8px; }
          p { color: #667085; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #d0d5dd; padding: 10px; text-align: left; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${dataset.title}</h1>
        <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <table>
          <thead><tr>${dataset.columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead>
          <tbody>${dataset.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </body>
      </html>
    `;
    const reportWindow = window.open("", "_blank");
    if (reportWindow) {
      reportWindow.document.write(html);
      reportWindow.document.close();
      reportWindow.focus();
      reportWindow.print();
      showToast("Relatório pronto", "A visualização para PDF foi aberta para impressão ou salvamento.");
    }
    return;
  }

  if (kind === "excel") {
    const content = [dataset.columns.join("\t"), ...dataset.rows.map((row) => row.join("\t"))].join("\n");
    downloadBlob(`${dataset.filename}.xls`, content, "application/vnd.ms-excel;charset=utf-8;");
    showToast("Exportação concluída", "A planilha foi gerada com os dados visíveis.");
    return;
  }

  const content = [dataset.columns.join(";"), ...dataset.rows.map((row) => row.join(";"))].join("\n");
  downloadBlob(`${dataset.filename}.csv`, content, "text/csv;charset=utf-8;");
  showToast("Exportação concluída", "O arquivo CSV foi gerado com os filtros atuais.");
}

function getStatusClass(status) {
  return slugify(status);
}

function renderEmptyState(title, description, actionLabel = "", action = "") {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">+</div>
      <h3>${title}</h3>
      <p>${description}</p>
      ${actionLabel && action ? `<button class="btn btn-primary" data-action="${action}">${actionLabel}</button>` : ""}
    </div>
  `;
}

function renderKpiCard(title, value, support, deltaText, deltaType) {
  return `
    <article class="kpi-card">
      <div class="kpi-label">${title}</div>
      <div class="kpi-value">${value}</div>
      <div class="helper-text">${support}</div>
      <div class="delta ${deltaType}">${deltaText}</div>
    </article>
  `;
}

function renderTable(tableKey, columns, rows, emptyTitle = "Nenhuma venda registrada", emptyText = "Cadastre a primeira venda para começar o acompanhamento.") {
  if (!rows.length) {
    return renderEmptyState(emptyTitle, emptyText, state.activePage === "vendedores" ? "Cadastrar vendedor" : "Nova venda", state.activePage === "vendedores" ? "new-seller" : "new-sale");
  }
  const tableState = state.tableState[tableKey] ?? { page: 1, sortIndex: 0, sortDir: "desc" };
  return `
    <div class="table-shell" data-table-key="${tableKey}" data-row-count="${rows.length}">
      <table data-table-key="${tableKey}">
        <thead>
          <tr>
            ${columns.map((column, index) => `
              <th>
                <button class="sort-btn" data-action="sort-table" data-table-key="${tableKey}" data-sort-index="${index}">
                  ${column}
                  ${tableState.sortIndex === index ? (tableState.sortDir === "asc" ? "↑" : "↓") : "↕"}
                </button>
              </th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
    <div class="table-pagination">
      <button class="report-action" data-action="prev-page" data-table-key="${tableKey}">Anterior</button>
      <span class="mini-tag" data-table-page-label="${tableKey}">Página ${tableState.page} de 1</span>
      <button class="report-action" data-action="next-page" data-table-key="${tableKey}">Próxima</button>
      <span class="helper-text" data-table-count-label="${tableKey}">${fmtInteger(rows.length)} registros visíveis</span>
    </div>
  `;
}

function renderLineChart(data) {
  if (!data.length) return renderEmptyState("Nenhum dado encontrado", "Cadastre sua primeira venda para visualizar a evolução do período.", "Nova venda", "new-sale");
  const width = 640, height = 240, padding = 28;
  const max = Math.max(...data.map((item) => item.total));
  const points = data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - (item.total / max) * (height - padding * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  return `
    <div class="chart-wrap">
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" aria-label="Evolução de Vendas">
        <defs>
          <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(36,107,255,0.32)" />
            <stop offset="100%" stop-color="rgba(36,107,255,0.02)" />
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#chartArea)"></path>
        <path d="${path}" fill="none" stroke="#246bff" stroke-width="4" stroke-linecap="round"></path>
        ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#fff" stroke="#246bff" stroke-width="3"><title>${point.date}: ${fmtCurrency(point.total)}</title></circle>`).join("")}
        ${points.map((point) => `<text x="${point.x}" y="${height - 8}" text-anchor="middle" fill="#667085" font-size="11">${point.date}</text>`).join("")}
      </svg>
    </div>
  `;
}

function renderBarChart(stats, key = "realizado") {
  if (!stats.length) return renderEmptyState("Nenhum vendedor cadastrado", "Cadastre vendedores para acompanhar ranking, desempenho e metas.", "Cadastrar vendedor", "new-seller");
  const max = Math.max(...stats.map((item) => item[key]), 1);
  return `
    <div class="mini-list">
      ${stats.map((item) => `
        <div class="mini-list-item">
          <div>
            <strong>${item.nome}</strong>
            <div class="helper-text">${fmtInteger(item.quantidade_vendas ?? 0)} vendas</div>
          </div>
          <div style="min-width:55%;">
            <div class="progress-row">
              <strong>${fmtCurrency(item[key])}</strong>
              <span class="helper-text">${fmtPercent((item[key] / max) * 100)}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${(item[key] / max) * 100}%"></div></div>
          </div>
        </div>`).join("")}
    </div>
  `;
}

function renderDonutChart(distribution) {
  const entries = Object.entries(distribution);
  if (!entries.length) return renderEmptyState("Nenhum dado encontrado", "Cadastre vendas para visualizar a distribuição financeira.", "Nova venda", "new-sale");
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const colors = ["#246bff", "#111827", "#12b76a", "#f79009", "#475467", "#98a2b3", "#7a5af8"];
  let cumulative = 0;
  const arcs = entries.map(([label, value], index) => {
    const ratio = value / total;
    const start = cumulative;
    cumulative += ratio;
    const startAngle = start * Math.PI * 2 - Math.PI / 2;
    const endAngle = cumulative * Math.PI * 2 - Math.PI / 2;
    const x1 = 90 + Math.cos(startAngle) * 68;
    const y1 = 90 + Math.sin(startAngle) * 68;
    const x2 = 90 + Math.cos(endAngle) * 68;
    const y2 = 90 + Math.sin(endAngle) * 68;
    const largeArc = ratio > 0.5 ? 1 : 0;
    return `<path d="M ${x1} ${y1} A 68 68 0 ${largeArc} 1 ${x2} ${y2}" stroke="${colors[index % colors.length]}" stroke-width="24" fill="none" stroke-linecap="round"></path>`;
  }).join("");
  return `
    <div class="chart-wrap">
      <svg class="chart-svg" viewBox="0 0 180 180" style="height:220px">
        <circle cx="90" cy="90" r="68" stroke="#e6ebf2" stroke-width="24" fill="none"></circle>
        ${arcs}
        <text x="90" y="84" text-anchor="middle" fill="#667085" font-size="11">Total</text>
        <text x="90" y="103" text-anchor="middle" fill="#111827" font-size="14" font-weight="700">${fmtCurrency(total)}</text>
      </svg>
      <div class="chart-legend">
        ${entries.map(([label, value], index) => `<div class="legend-item"><span class="legend-dot" style="background:${colors[index % colors.length]}"></span><span>${label} · ${fmtPercent((value / total) * 100)}</span></div>`).join("")}
      </div>
    </div>
  `;
}

function renderTopbar() {
  const page = pageMap[state.activePage];
  const profileSeller = getProfileSeller();
  return `
    <header class="topbar">
      <div class="topbar-meta">
        <button class="icon-btn mobile-sidebar-toggle" data-action="toggle-sidebar">☰</button>
        <div>
          <div class="section-eyebrow">CRM Financeiro</div>
          <h1 class="page-title">${page.title}</h1>
        </div>
      </div>
      <div class="topbar-actions">
        <div class="period-pill">Período atual · Últimos ${state.selectedPeriod} dias</div>
        <div class="searchbox">
          <span>⌕</span>
          <input type="search" placeholder="Pesquisar" value="${state.searchTerm}" data-input="search" />
        </div>
        ${profileSeller ? `<button class="btn btn-secondary" data-action="my-sales">Minhas vendas</button>` : ""}
        <button class="btn btn-secondary" data-action="export">Exportar relatório</button>
        <button class="btn btn-primary" data-action="new-sale">${profileSeller ? "Lançar minha venda" : "Nova venda"}</button>
        <button class="icon-btn" data-action="notifications">🔔</button>
        <div class="avatar">
          <div class="avatar-circle">${getInitials(profile.name)}</div>
          <div><strong>${profile.name}</strong><div class="helper-text">${profile.role}</div></div>
        </div>
        <button class="btn btn-secondary" data-action="logout">Sair</button>
      </div>
    </header>
  `;
}

function renderSidebar(filteredSales) {
  const metrics = getDashboardMetrics(filteredSales);
  return `
    <aside class="app-sidebar ${state.sidebarOpen ? "open" : ""}">
      <div class="sidebar-header">
        <div>
          <div class="brand-mark">MC</div>
          <h2 style="margin:14px 0 0;">CRM Financeiro</h2>
          <div class="sidebar-caption">Gestão comercial e controle financeiro</div>
        </div>
        <button class="icon-btn mobile-sidebar-toggle" data-action="toggle-sidebar">✕</button>
      </div>
      <div class="nav-group">
        <div class="nav-section-label">Painel</div>
        ${navItems.slice(1).map(([id, label]) => `
          <button class="nav-link ${state.activePage === id ? "active" : ""}" data-page="${id}">
            <span>${label}</span><span class="nav-dot"></span>
          </button>
        `).join("")}
      </div>
      <div class="sidebar-footer">
        <div class="section-eyebrow">Resumo do período</div>
        <h3 style="margin:6px 0;">Recebimento confirmado</h3>
        <strong>${fmtCurrency(metrics.received)}</strong>
        <div class="helper-text">Baseada nos filtros ativos e vendas recebidas.</div>
      </div>
    </aside>
  `;
}

function renderFilters() {
  const statusOptions = ["Recebido", "Pendente", "Em análise", "Cancelado", "Confirmado", "Atrasado", "Estornado"];
  const profileSeller = getProfileSeller();
  return `
    <div class="panel">
      <div class="section-header">
        <div>
          <div class="section-eyebrow">Filtros globais</div>
          <h3 style="margin:4px 0;">Visão operacional</h3>
          <div class="panel-subtitle">Atualize cartões, tabelas e gráficos em tempo real.</div>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary" data-action="refresh">Atualizar dados</button>
          ${profileSeller ? `<button class="btn btn-secondary" data-action="my-sales">Ver minhas vendas</button>` : ""}
          <button class="btn btn-secondary" data-action="clear-filters">Limpar filtros</button>
        </div>
      </div>
      <div class="filters-row" style="margin-top:18px;">
        <label class="field">
          <span>Selecionar período</span>
          <select data-input="period">
            <option value="7" ${state.selectedPeriod === "7" ? "selected" : ""}>Últimos 7 dias</option>
            <option value="30" ${state.selectedPeriod === "30" ? "selected" : ""}>Últimos 30 dias</option>
            <option value="90" ${state.selectedPeriod === "90" ? "selected" : ""}>Últimos 90 dias</option>
            <option value="180" ${state.selectedPeriod === "180" ? "selected" : ""}>Últimos 180 dias</option>
          </select>
        </label>
        <label class="field">
          <span>Todos os vendedores</span>
          <select data-input="seller">
            <option value="all">Todos os vendedores</option>
            ${sellers.map((seller) => `<option value="${seller.id}" ${state.selectedSeller === seller.id ? "selected" : ""}>${seller.nome}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Todos os bancos</span>
          <select data-input="bank">
            <option value="all">Todos os bancos</option>
            ${bankOptions.map((bank) => `<option value="${bank}" ${state.selectedBank === bank ? "selected" : ""}>${bank}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Todos os status</span>
          <select data-input="status">
            <option value="all">Todos os status</option>
            ${statusOptions.map((status) => `<option value="${status}" ${state.selectedStatus === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderDashboardPage(filteredSales) {
  const metrics = getDashboardMetrics(filteredSales);
  const sellerStats = getSellerStats(filteredSales);
  const latestSales = filteredSales.slice().sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6);
  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div class="hero-copy">
          <div class="section-eyebrow">Dashboard Geral</div>
          <h1>Dashboard Geral</h1>
          <p>Visão completa do desempenho comercial e financeiro com foco em gestão, comissões, metas e evolução da operação.</p>
        </div>
        <div class="action-row">
          <button class="btn btn-secondary" data-action="export">Exportar relatório</button>
          <button class="btn btn-primary" data-action="refresh">Atualizar dados</button>
        </div>
      </div>
      <div class="hero-metrics">
        <div class="metric-item"><span class="helper-text">Meta mensal da equipe</span><strong>${fmtCurrency(goals[0].valor_meta)}</strong></div>
        <div class="metric-item"><span class="helper-text">Progresso consolidado</span><strong>${fmtPercent(metrics.goalPercent)}</strong></div>
        <div class="metric-item"><span class="helper-text">Recebimento confirmado</span><strong>${fmtCurrency(metrics.received)}</strong></div>
      </div>
    </section>
    <section class="kpi-grid">
      ${renderKpiCard("Total de Vendas", fmtCurrency(metrics.totalSales), "Resultado acumulado no período", "12,4% acima da última janela", "positive")}
      ${renderKpiCard("Total de Comissões", fmtCurrency(metrics.totalCommission), "Comissões geradas no período", "Repasse dentro da política atual", "positive")}
      ${renderKpiCard("Meu Lucro", fmtCurrency(metrics.ownerProfit), "Comissão recebida pela sua gestão", "Resultado direto das vendas da equipe", "positive")}
      ${renderKpiCard("Quantidade de Vendas", fmtInteger(metrics.totalCount), "Negociações concluídas", "Pipeline aquecido com novos contratos", "warning")}
      ${renderKpiCard("Ticket Médio", fmtCurrency(metrics.avgTicket), "Valor médio por venda", "Acima da média operacional", "positive")}
    </section>
    <section class="two-column">
      <div class="panel">
        <div class="section-header">
          <div><div class="section-eyebrow">Evolução</div><h3 style="margin:4px 0;">Evolução de Vendas</h3><div class="panel-subtitle">Comportamento diário dentro do período selecionado.</div></div>
          <div class="mini-tag">Atualização em tempo real</div>
        </div>
        ${renderLineChart(getSalesTrend(filteredSales))}
      </div>
      <div class="panel">
        <div class="section-header">
          <div><div class="section-eyebrow">Meta Geral</div><h3 style="margin:4px 0;">Acompanhamento consolidado da meta mensal</h3></div>
          <div class="mini-tag">${fmtPercent(metrics.goalPercent)}</div>
        </div>
        <div class="progress-row" style="margin-top:18px;">
          <div><div class="panel-label">Meta mensal</div><div class="panel-value">${fmtCurrency(goals[0].valor_meta)}</div></div>
          <div><div class="panel-label">Realizado</div><div class="panel-value">${fmtCurrency(metrics.totalSales)}</div></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(metrics.goalPercent, 100)}%"></div></div>
        <div class="mini-list">
          ${sellerStats.slice(0, 4).map((seller) => `
            <div class="mini-list-item">
              <div><strong>${seller.nome}</strong><div class="helper-text">${fmtInteger(seller.quantidade_vendas)} vendas</div></div>
              <div style="text-align:right;"><strong>${fmtCurrency(seller.realizado)}</strong><div class="helper-text">Comissão ${fmtCurrency(seller.comissao_total)}</div></div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
    <section class="two-column">
      <div class="table-card">
        <div class="section-header"><div><div class="section-eyebrow">Resumo por Vendedor</div><h3 style="margin:4px 0;">Comparativo rápido entre operadores</h3></div></div>
        ${renderBarChart(sellerStats)}
      </div>
      <div class="table-card">
        <div class="section-header"><div><div class="section-eyebrow">Últimas Vendas</div><h3 style="margin:4px 0;">Movimentações mais recentes do período</h3></div></div>
        ${renderTable("dashboard-latest-sales", ["Data", "Cliente", "Valor", "Banco", "Comissão"], latestSales.map((sale) => `
          <tr>
            <td>${fmtDate(sale.data)}</td>
            <td>${sale.cliente}</td>
            <td class="table-currency">${fmtCurrency(sale.valor)}</td>
            <td>${sale.banco}</td>
            <td class="table-currency">${fmtCurrency(sale.comissao)}</td>
          </tr>
        `))}
      </div>
    </section>
  `;
}

function renderFinanceiroPage(filteredSales) {
  const metrics = getDashboardMetrics(filteredSales);
  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div class="hero-copy">
          <div class="section-eyebrow">Financeiro</div>
          <h1>Financeiro</h1>
          <p>Controle de vendas, comissões e indicadores financeiros com visão pronta para gestão e tomada de decisão.</p>
        </div>
        <div class="action-row">
          <button class="btn btn-primary" data-action="new-sale">Nova venda</button>
          <button class="btn btn-secondary" data-action="export">Exportar financeiro</button>
        </div>
      </div>
    </section>
    <section class="kpi-grid">
      ${renderKpiCard("Total Recebido", fmtCurrency(metrics.received), "Soma total confirmada", "Conciliação saudável", "positive")}
      ${renderKpiCard("Comissão Total", fmtCurrency(metrics.totalCommission), "Comissão acumulada da equipe", "Repasse previsto para sexta", "warning")}
      ${renderKpiCard("Meu Lucro", fmtCurrency(metrics.ownerProfit), "Comissão que entra para você", "Acompanhamento por venda cadastrada", "positive")}
      ${renderKpiCard("Ticket Médio", fmtCurrency(metrics.avgTicket), "Média de valor por negociação", "Baseado nas vendas filtradas", "positive")}
      ${renderKpiCard("Meta Atingida", fmtPercent(metrics.goalPercent), "Percentual sobre a meta geral", "Ritmo consistente da operação", "positive")}
    </section>
    <section class="two-column">
      <div class="panel">
        <div class="section-header"><div><div class="section-eyebrow">Desempenho Financeiro</div><h3 style="margin:4px 0;">Resumo visual do período atual</h3></div></div>
        ${renderLineChart(getSalesTrend(filteredSales))}
      </div>
      <div class="panel">
        <div class="section-header"><div><div class="section-eyebrow">Distribuição por Banco</div><h3 style="margin:4px 0;">Participação por instituição</h3></div></div>
        ${renderDonutChart(getBankDistribution(filteredSales))}
      </div>
    </section>
    <section class="table-card">
      <div class="section-header"><div><div class="section-eyebrow">Vendas Registradas</div><h3 style="margin:4px 0;">Tabela completa com os registros financeiros</h3><div class="table-subtitle">Leitura rápida de valores, comissão e status.</div></div></div>
      ${renderTable("financeiro-sales", ["Data", "Vendedor", "Cliente", "Valor", "Banco", "% Comissão", "Comissão", "Minha comissão", "Status", "Ações"], filteredSales.map((sale) => `
        <tr>
          <td>${fmtDate(sale.data)}</td>
          <td>${sale.vendedor}</td>
          <td>${sale.cliente}</td>
          <td class="table-currency">${fmtCurrency(sale.valor)}</td>
          <td>${sale.banco}</td>
          <td>${fmtPercent(sale.percentual_comissao * 100)}</td>
          <td class="table-currency">${fmtCurrency(sale.comissao)}</td>
          <td class="table-currency">${fmtCurrency(sale.comissaoGestor)}</td>
          <td><span class="badge ${getStatusClass(sale.status)}">${sale.status}</span></td>
          <td><div class="table-row-actions"><button class="seller-action" data-action="edit-sale" data-sale-id="${sale.id}">Editar</button><button class="seller-action seller-action-danger" data-action="delete-sale" data-sale-id="${sale.id}">Excluir</button></div></td>
        </tr>
      `))}
    </section>
  `;
}

function renderComissoesPage(filteredSales) {
  const commissions = filteredSales.map((sale) => sale.comissao);
  const total = commissions.reduce((sum, value) => sum + value, 0);
  const ownerProfit = filteredSales.reduce((sum, sale) => sum + sale.comissaoGestor, 0);
  const highest = Math.max(...commissions, 0);
  const average = commissions.length ? total / commissions.length : 0;
  return `
    <section class="hero-panel">
      <div class="hero-row"><div class="hero-copy"><div class="section-eyebrow">Comissões</div><h1>Comissões</h1><p>Controle detalhado das comissões por venda e por operador, com ranking claro e histórico completo.</p></div></div>
    </section>
    <section class="kpi-grid">
      ${renderKpiCard("Comissão Total", fmtCurrency(total), "Comissão acumulada da equipe", "Distribuição saudável", "positive")}
      ${renderKpiCard("Comissão do Mês", fmtCurrency(total), "Comissões do período filtrado", "Mesmo critério da tabela", "positive")}
      ${renderKpiCard("Meu Lucro", fmtCurrency(ownerProfit), "Comissão recebida pela gestão", "Baseada em cada venda", "positive")}
      ${renderKpiCard("Maior Comissão", fmtCurrency(highest), "Maior valor individual", "Operação de alta margem", "warning")}
      ${renderKpiCard("Média por Venda", fmtCurrency(average), "Média de comissão por venda", "Indicador operacional", "positive")}
    </section>
    <section class="two-column">
      <div class="panel"><div class="section-header"><div><div class="section-eyebrow">Ranking de Comissões</div><h3 style="margin:4px 0;">Quem mais gerou comissão no período</h3></div></div>${renderBarChart(getSellerStats(filteredSales).map((seller) => ({ ...seller, realizado: seller.comissao_total })))}</div>
      <div class="panel">
        <div class="section-header"><div><div class="section-eyebrow">Comissões por Vendedor</div><h3 style="margin:4px 0;">Comparativo detalhado entre operadores</h3></div></div>
        <div class="mini-list">
          ${getSellerStats(filteredSales).map((seller) => `
            <div class="mini-list-item">
              <div><strong>${seller.nome}</strong><div class="helper-text">${fmtInteger(seller.quantidade_vendas)} vendas comissionadas</div></div>
              <div style="text-align:right;"><strong>${fmtCurrency(seller.comissao_total)}</strong><div class="helper-text">${fmtPercent(seller.percentual_meta)}</div></div>
            </div>`).join("")}
        </div>
      </div>
    </section>
    <section class="table-card">
      <div class="section-header"><div><div class="section-eyebrow">Histórico de Comissões</div><h3 style="margin:4px 0;">Lista completa das comissões registradas</h3></div></div>
      ${renderTable("comissoes-history", ["Data", "Vendedor", "Cliente", "Valor da Venda", "% Comissão", "Comissão", "Minha comissão", "Banco", "Status"], filteredSales.map((sale) => `
        <tr>
          <td>${fmtDate(sale.data)}</td><td>${sale.vendedor}</td><td>${sale.cliente}</td>
          <td class="table-currency">${fmtCurrency(sale.valor)}</td><td>${fmtPercent(sale.percentual_comissao * 100)}</td>
          <td class="table-currency">${fmtCurrency(sale.comissao)}</td><td class="table-currency">${fmtCurrency(sale.comissaoGestor)}</td><td>${sale.banco}</td>
          <td><span class="badge ${getStatusClass(sale.status)}">${sale.status}</span></td>
        </tr>`))}
    </section>
  `;
}

function renderFluxoPage() {
  const entries = getFilteredCashFlow();
  const received = entries.filter((item) => item.status === "Confirmado" && item.valor > 0).reduce((sum, item) => sum + item.valor, 0);
  const pending = entries.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + Math.abs(item.valor), 0);
  const overdue = entries.filter((item) => item.status === "Atrasado").reduce((sum, item) => sum + Math.abs(item.valor), 0);
  const reverted = entries.filter((item) => item.status === "Estornado").reduce((sum, item) => sum + Math.abs(item.valor), 0);
  const fees = entries.filter((item) => item.categoria === "Operacional").reduce((sum, item) => sum + Math.abs(item.valor), 0);
  return `
    <section class="hero-panel"><div class="hero-row"><div class="hero-copy"><div class="section-eyebrow">Fluxo de Caixa</div><h1>Fluxo de Caixa</h1><p>Entradas, pendências e visão financeira operacional para acompanhamento diário da empresa.</p></div></div></section>
    <section class="kpi-grid">
      ${renderKpiCard("Recebidos", fmtCurrency(received), "Valores já confirmados", "Conciliação positiva", "positive")}
      ${renderKpiCard("Pendentes", fmtCurrency(pending), "Valores aguardando confirmação", "Exige acompanhamento", "warning")}
      ${renderKpiCard("Inadimplentes", fmtCurrency(overdue), "Valores não recebidos no prazo", "Prioridade da cobrança", "negative")}
      ${renderKpiCard("Estornos", fmtCurrency(reverted), "Valores revertidos", "Monitoramento crítico", "negative")}
    </section>
    <section class="two-column">
      <div class="panel">
        <div class="section-header"><div><div class="section-eyebrow">Resumo do Fluxo</div><h3 style="margin:4px 0;">Visão consolidada de entradas e saídas</h3></div></div>
        <div class="mini-list">
          <div class="mini-list-item"><div><strong>Saldo operacional líquido</strong><div class="helper-text">Entradas menos saídas do período</div></div><div><strong>${fmtCurrency(entries.reduce((sum, item) => sum + item.valor, 0))}</strong></div></div>
          <div class="mini-list-item"><div><strong>Taxas Gateway</strong><div class="helper-text">Custos operacionais financeiros</div></div><div><strong>${fmtCurrency(fees)}</strong></div></div>
          <div class="mini-list-item"><div><strong>Recebimentos confirmados</strong><div class="helper-text">Fluxo já conciliado</div></div><div><strong>${fmtCurrency(received)}</strong></div></div>
        </div>
      </div>
      <div class="panel">
        <div class="section-header"><div><div class="section-eyebrow">Movimentações</div><h3 style="margin:4px 0;">Distribuição por status</h3></div></div>
        ${renderDonutChart(entries.reduce((acc, entry) => { acc[entry.status] = (acc[entry.status] ?? 0) + Math.abs(entry.valor); return acc; }, {}))}
      </div>
    </section>
    <section class="table-card">
      <div class="section-header"><div><div class="section-eyebrow">Movimentações</div><h3 style="margin:4px 0;">Histórico detalhado financeiro</h3></div></div>
      ${renderTable("fluxo-movimentacoes", ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Status"], entries.map((entry) => `
        <tr>
          <td>${fmtDate(entry.data)}</td><td>${entry.tipo}</td><td>${entry.descricao}</td><td>${entry.categoria}</td>
          <td class="table-currency">${fmtCurrency(entry.valor)}</td><td><span class="badge ${getStatusClass(entry.status)}">${entry.status}</span></td>
        </tr>`), "Nenhum dado encontrado", "Tente ajustar os filtros para visualizar os resultados.")}
    </section>
  `;
}

function renderVendedoresPage(filteredSales) {
  const sellerStats = getSellerStats(filteredSales);
  const profileSeller = getProfileSeller();
  if (!sellerStats.length) {
    return `
      <section class="hero-panel">
        <div class="hero-row">
          <div class="hero-copy"><div class="section-eyebrow">Vendedores</div><h1>Vendedores</h1><p>Acompanhe o desempenho individual da equipe com métricas de meta, comissão, volume e histórico operacional.</p></div>
          <div class="action-row">${profileSeller ? `<button class="btn btn-secondary" data-action="my-sales">Minhas vendas</button>` : ""}<button class="btn btn-primary" data-action="new-seller">Cadastrar vendedor</button></div>
        </div>
      </section>
      <section class="panel">
        ${renderEmptyState("Nenhum vendedor cadastrado", "Cadastre o primeiro vendedor para começar a montar seu time e acompanhar resultados no CRM.", "Cadastrar vendedor", "new-seller")}
      </section>
    `;
  }
  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div class="hero-copy"><div class="section-eyebrow">Vendedores</div><h1>Vendedores</h1><p>Acompanhe o desempenho individual da equipe com métricas de meta, comissão, volume e histórico operacional.</p></div>
        <div class="action-row">${profileSeller ? `<button class="btn btn-secondary" data-action="my-sales">Minhas vendas</button>` : ""}<button class="btn btn-primary" data-action="new-seller">Cadastrar vendedor</button></div>
      </div>
    </section>
    <section class="two-column">
      <div class="panel"><div class="section-header"><div><div class="section-eyebrow">Ranking de Vendedores</div><h3 style="margin:4px 0;">Classificação por resultado financeiro</h3></div></div>${renderBarChart(sellerStats)}</div>
      <div class="panel">
        <div class="section-header"><div><div class="section-eyebrow">Desempenho Individual</div><h3 style="margin:4px 0;">Cards detalhados por operador</h3></div></div>
        <div class="seller-grid">
          ${sellerStats.map((seller, index) => `
            <article class="seller-card">
              <div class="seller-header">
                <div class="seller-rank">#${index + 1}</div>
                <div class="seller-heading">
                  <strong>${seller.nome}</strong>
                  <p>Meta mensal ${fmtCurrency(seller.meta_mensal)}</p>
                </div>
              </div>
              <div class="seller-highlight">
                <div class="seller-highlight-label">Realizado no período</div>
                <span class="seller-money">${fmtCurrency(seller.realizado)}</span>
                <div class="helper-text">Comissão ${fmtCurrency(seller.comissao_total)}</div>
              </div>
              <div class="seller-meta">
                <div class="seller-stat">
                  <span class="seller-stat-value">${fmtInteger(seller.quantidade_vendas)}</span>
                  <div class="helper-text">Vendas fechadas</div>
                </div>
                <div class="seller-stat">
                  <span class="seller-stat-value">${fmtPercent(seller.percentual_meta)}</span>
                  <div class="helper-text">Meta atingida</div>
                </div>
              </div>
              <div class="seller-progress-card">
                <div class="progress-row">
                  <span class="helper-text">Progresso da meta mensal</span>
                  <strong>${fmtPercent(seller.percentual_meta)}</strong>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(seller.percentual_meta, 100)}%"></div></div>
              </div>
              <div class="report-actions seller-actions">
                <button class="seller-action seller-action-primary" data-seller="${seller.id}" data-action="seller-detail">Abrir painel</button>
                <button class="seller-action" data-seller="${seller.id}" data-action="edit-seller">Editar</button>
                <button class="seller-action seller-action-danger" data-seller="${seller.id}" data-action="delete-seller">Excluir</button>
              </div>
            </article>`).join("")}
        </div>
      </div>
    </section>
    <section class="table-card">
      <div class="section-header"><div><div class="section-eyebrow">Histórico por Vendedor</div><h3 style="margin:4px 0;">Tabela com vendas, comissão e meta</h3></div></div>
      ${renderTable("vendedores-history", ["Data", "Vendedor", "Cliente", "Valor", "Comissão", "Status", "Produto"], filteredSales.map((sale) => `
        <tr>
          <td>${fmtDate(sale.data)}</td><td>${sale.vendedor}</td><td>${sale.cliente}</td><td class="table-currency">${fmtCurrency(sale.valor)}</td>
          <td class="table-currency">${fmtCurrency(sale.comissao)}</td><td><span class="badge ${getStatusClass(sale.status)}">${sale.status}</span></td><td>${sale.produto}</td>
        </tr>`))}
    </section>
  `;
}

function renderMetasPage(filteredSales) {
  const sellerStats = getSellerStats(filteredSales);
  const total = filteredSales.reduce((sum, sale) => sum + sale.valor, 0);
  const teamPercent = (total / goals[0].valor_meta) * 100;
  return `
    <section class="hero-panel"><div class="hero-row"><div class="hero-copy"><div class="section-eyebrow">Metas</div><h1>Metas</h1><p>Acompanhe a evolução das metas da equipe e dos vendedores com alta clareza visual e leitura executiva.</p></div></div></section>
    <section class="kpi-grid">
      ${renderKpiCard("Meta Geral", fmtCurrency(goals[0].valor_meta), "Objetivo mensal da equipe", "Direcionamento estratégico", "positive")}
      ${renderKpiCard("Realizado Geral", fmtCurrency(total), "Resultado consolidado", "Volume computado pelos filtros", "positive")}
      ${renderKpiCard("Percentual Concluído", fmtPercent(teamPercent), "Progresso sobre a meta", "Ritmo da operação", "warning")}
      ${renderKpiCard("Falta para Meta", fmtCurrency(Math.max(goals[0].valor_meta - total, 0)), "Restante para o objetivo", "Monitorar cadência semanal", "warning")}
    </section>
    <section class="goals-grid">
      <div class="goal-card">
        <div class="section-eyebrow">Meta da Equipe</div><h3 style="margin:4px 0;">Visão consolidada da operação</h3>
        <span class="goal-value">${fmtPercent(teamPercent)}</span>
        <p>${fmtCurrency(total)} de ${fmtCurrency(goals[0].valor_meta)} realizados.</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(teamPercent, 100)}%"></div></div>
      </div>
      <div class="goal-card">
        <div class="section-eyebrow">Progresso das Metas</div><h3 style="margin:4px 0;">Leitura rápida por performance</h3>
        <div class="mini-list">
          ${sellerStats.map((seller) => `<div class="mini-list-item"><div><strong>${seller.nome}</strong><div class="helper-text">Meta ${fmtCurrency(seller.meta_mensal)}</div></div><div style="text-align:right;"><strong>${fmtPercent(seller.percentual_meta)}</strong><div class="helper-text">${fmtCurrency(seller.realizado)}</div></div></div>`).join("")}
        </div>
      </div>
    </section>
    <section class="table-card">
      <div class="section-header"><div><div class="section-eyebrow">Metas por Vendedor</div><h3 style="margin:4px 0;">Progresso individual em relação ao objetivo mensal</h3></div></div>
      ${renderTable("metas-vendedores", ["Vendedor", "Meta", "Realizado", "Falta", "Progresso"], sellerStats.map((seller) => `
        <tr>
          <td>${seller.nome}</td><td class="table-currency">${fmtCurrency(seller.meta_mensal)}</td><td class="table-currency">${fmtCurrency(seller.realizado)}</td>
          <td class="table-currency">${fmtCurrency(Math.max(seller.meta_mensal - seller.realizado, 0))}</td>
          <td><div class="progress-bar"><div class="progress-fill" style="width:${Math.min(seller.percentual_meta, 100)}%"></div></div><div class="helper-text" style="margin-top:8px;">${fmtPercent(seller.percentual_meta)}</div></td>
        </tr>`))}
    </section>
  `;
}

function renderHistoricoPage(filteredSales) {
  return `
    <section class="hero-panel"><div class="hero-row"><div class="hero-copy"><div class="section-eyebrow">Histórico</div><h1>Histórico</h1><p>Consulte o registro completo das operações com foco em auditoria, rastreabilidade e leitura rápida da operação.</p></div></div></section>
    <section class="two-column">
      <div class="timeline-card">
        <div class="section-eyebrow">Linha do Tempo</div><h3 style="margin:4px 0;">Movimentações recentes da operação</h3>
        <div class="timeline-list">
          ${getTimeline(filteredSales).map((item) => `
            <div class="timeline-item">
              <div style="display:flex; gap:12px;"><span class="timeline-marker"></span><div><strong>${item.title}</strong><p>${item.subtitle}</p></div></div>
              <span class="mini-tag">${item.date}</span>
            </div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="section-eyebrow">Registros</div><h3 style="margin:4px 0;">Indicadores de auditoria</h3>
        <div class="mini-list">
          <div class="mini-list-item"><div><strong>Operações visíveis</strong><div class="helper-text">Todas as vendas após filtros</div></div><div><strong>${fmtInteger(filteredSales.length)}</strong></div></div>
          <div class="mini-list-item"><div><strong>Comissão rastreável</strong><div class="helper-text">Cálculo consolidado do período</div></div><div><strong>${fmtCurrency(filteredSales.reduce((sum, sale) => sum + sale.comissao, 0))}</strong></div></div>
          <div class="mini-list-item"><div><strong>Status críticos</strong><div class="helper-text">Pendente, cancelado e em análise</div></div><div><strong>${fmtInteger(filteredSales.filter((sale) => sale.status !== "Recebido").length)}</strong></div></div>
        </div>
      </div>
    </section>
    <section class="table-card">
      <div class="section-header"><div><div class="section-eyebrow">Registros Completos</div><h3 style="margin:4px 0;">Tabela completa para consulta</h3></div></div>
      ${renderTable("historico-registros", ["Data", "Tipo", "Vendedor", "Cliente", "Valor", "Banco", "Comissão", "Minha comissão", "Status", "Data da proposta", "Produto", "Ações"], filteredSales.map((sale) => `
        <tr>
          <td>${fmtDate(sale.data)}</td><td>Venda</td><td>${sale.vendedor}</td><td>${sale.cliente}</td><td class="table-currency">${fmtCurrency(sale.valor)}</td>
          <td>${sale.banco}</td><td class="table-currency">${fmtCurrency(sale.comissao)}</td><td class="table-currency">${fmtCurrency(sale.comissaoGestor)}</td><td><span class="badge ${getStatusClass(sale.status)}">${sale.status}</span></td><td>${fmtDate(sale.dataProposta)}</td><td>${sale.produto}</td><td><div class="table-row-actions"><button class="seller-action" data-action="edit-sale" data-sale-id="${sale.id}">Editar</button><button class="seller-action seller-action-danger" data-action="delete-sale" data-sale-id="${sale.id}">Excluir</button></div></td>
        </tr>`))}
    </section>
  `;
}

function renderRelatoriosPage(filteredSales) {
  const sellerStats = getSellerStats(filteredSales);
  const cards = [
    ["Relatório Financeiro", "Resumo de vendas, comissões e fluxo", fmtCurrency(filteredSales.reduce((sum, sale) => sum + sale.valor, 0))],
    ["Relatório por Vendedor", "Desempenho individual detalhado", `${fmtInteger(sellerStats.length)} operadores`],
    ["Relatório de Metas", "Comparativo entre objetivo e realizado", fmtPercent((filteredSales.reduce((sum, sale) => sum + sale.valor, 0) / goals[0].valor_meta) * 100)],
    ["Relatório de Bancos", "Análise por instituição", `${fmtInteger(Object.keys(getBankDistribution(filteredSales)).length)} bancos`],
  ];
  return `
    <section class="hero-panel">
      <div class="hero-row">
        <div class="hero-copy"><div class="section-eyebrow">Relatórios</div><h1>Relatórios</h1><p>Análises consolidadas para tomada de decisão com visual executivo e exportação imediata.</p></div>
        <div class="action-row"><button class="btn btn-secondary" data-action="export-pdf">Exportar PDF</button><button class="btn btn-primary" data-action="export-excel">Exportar Excel</button></div>
      </div>
    </section>
    <section class="report-grid">
      ${cards.map(([title, description, metric]) => `
        <article class="report-card">
          <div class="section-eyebrow">${title}</div><h3 style="margin:6px 0;">${metric}</h3><p>${description}</p>
          <div class="report-actions"><button class="report-action" data-action="export-excel">Exportar</button><button class="report-action" data-action="refresh">Visualizar</button></div>
        </article>`).join("")}
    </section>
  `;
}

function renderConfiguracoesPage() {
  const profileSeller = getProfileSeller();
  return `
    <section class="hero-panel"><div class="hero-row"><div class="hero-copy"><div class="section-eyebrow">Configurações</div><h1>Configurações</h1><p>Ajustes gerais da plataforma preparados para futuras integrações, automações, usuários e parâmetros financeiros.</p></div></div></section>
    <section class="panel">
      <div class="section-header">
        <div><div class="section-eyebrow">Perfil</div><h3 style="margin:4px 0;">Personalização do usuário</h3><div class="panel-subtitle">Defina o nome e o cargo exibidos no topo da plataforma.</div></div>
      </div>
      <form id="profile-form" class="modal-grid" style="margin-top:18px;">
        <label class="field"><span>Nome</span><input name="name" type="text" value="${profile.name}" placeholder="Seu nome" required /></label>
        <label class="field"><span>Cargo</span><input name="role" type="text" value="${profile.role}" placeholder="Seu cargo" required /></label>
        <label class="field" style="grid-column:1 / -1;"><span>Meu cadastro como vendedor</span><select name="sellerId"><option value="">Não vinculado</option>${sellers.map((seller) => `<option value="${seller.id}" ${profile.sellerId === seller.id ? "selected" : ""}>${seller.nome}</option>`).join("")}</select><div class="helper-text">${profileSeller ? "Seu perfil está vinculado ao vendedor e o CRM pode filtrar suas vendas." : "Vincule seu perfil a um vendedor para usar os atalhos de minhas vendas."}</div></label>
        <div class="modal-actions">
          <button class="btn btn-primary" type="submit">Salvar perfil</button>
        </div>
      </form>
    </section>
    <section class="panel">
      <div class="section-header">
        <div><div class="section-eyebrow">Dados locais</div><h3 style="margin:4px 0;">Gerenciamento dos dados salvos</h3><div class="panel-subtitle">Use esta opção para limpar os cadastros salvos no navegador e voltar o sistema para o estado inicial vazio.</div></div>
        <div class="table-actions"><button class="btn btn-secondary" data-action="reset-data">Limpar dados salvos</button></div>
      </div>
    </section>
  `;
}

function renderPageContent(filteredSales) {
  switch (state.activePage) {
    case "dashboard_geral": return renderDashboardPage(filteredSales);
    case "financeiro": return renderFinanceiroPage(filteredSales);
    case "comissoes": return renderComissoesPage(filteredSales);
    case "fluxo_de_caixa": return renderFluxoPage();
    case "vendedores": return renderVendedoresPage(filteredSales);
    case "metas": return renderMetasPage(filteredSales);
    case "historico": return renderHistoricoPage(filteredSales);
    case "relatorios": return renderRelatoriosPage(filteredSales);
    case "configuracoes": return renderConfiguracoesPage();
    default: return renderDashboardPage(filteredSales);
  }
}

function renderSellerDrawer(filteredSales) {
  if (!state.selectedSellerDetail) return "";
  const seller = sellers.find((item) => item.id === state.selectedSellerDetail);
  const sellerSales = filteredSales.filter((sale) => sale.vendedorId === state.selectedSellerDetail);
  return `
    <div class="drawer open" id="seller-drawer">
      <aside class="drawer-panel">
        <div class="drawer-header">
          <div><div class="section-eyebrow">Detalhes do vendedor</div><h3 style="margin:4px 0;">${seller?.nome ?? "Vendedor"}</h3><p class="muted">Visão individual com histórico, meta e comissão.</p></div>
          <button class="icon-btn" data-action="close-drawer">✕</button>
        </div>
        <div class="detail-stats" style="margin-top:18px;">
          <div class="detail-tile"><strong>${fmtCurrency(sellerSales.reduce((sum, item) => sum + item.valor, 0))}</strong><div class="helper-text">Realizado</div></div>
          <div class="detail-tile"><strong>${fmtCurrency(sellerSales.reduce((sum, item) => sum + item.comissao, 0))}</strong><div class="helper-text">Comissão</div></div>
          <div class="detail-tile"><strong>${fmtInteger(sellerSales.length)}</strong><div class="helper-text">Quantidade de vendas</div></div>
        </div>
        <div style="margin-top:18px;">
          ${renderTable("drawer-seller-history", ["Data", "Cliente", "Valor", "Banco", "Status"], sellerSales.map((sale) => `
            <tr>
              <td>${fmtDate(sale.data)}</td><td>${sale.cliente}</td><td class="table-currency">${fmtCurrency(sale.valor)}</td><td>${sale.banco}</td>
              <td><span class="badge ${getStatusClass(sale.status)}">${sale.status}</span></td>
            </tr>`), "Nenhum dado encontrado", "Tente ajustar os filtros para visualizar os resultados.")}
        </div>
      </aside>
    </div>
  `;
}

function renderToasts() {
  return `<div class="toast-stack">${state.notifications.map((toast) => `<div class="toast"><strong>${toast.title}</strong><div class="helper-text">${toast.message}</div></div>`).join("")}</div>`;
}

function renderModal() {
  if (!state.modal) return "";

  if (state.modal === "new-sale" || state.modal === "edit-sale") {
    const sale = state.modalData;
    const isEditing = state.modal === "edit-sale";
    return `
      <div class="modal-backdrop" id="app-modal">
        <div class="modal-card">
          <div class="drawer-header">
            <div><div class="section-eyebrow">${isEditing ? "Editar venda" : "Nova venda"}</div><h3 style="margin:4px 0;">${isEditing ? "Editar venda" : "Cadastrar nova venda"}</h3><p class="muted">Inclua a operação e atualize os indicadores do CRM.</p></div>
            <button class="icon-btn" data-action="close-modal">✕</button>
          </div>
          <form id="sale-form" class="modal-grid">
            <label class="field"><span>Vendedor</span><select name="seller" required>${sellers.map((seller) => `<option value="${seller.id}" ${(sale?.vendedorId === seller.id || (!sale && profile.sellerId === seller.id)) ? "selected" : ""}>${seller.nome}</option>`).join("")}</select></label>
            <label class="field"><span>Cliente</span><input name="client" type="text" placeholder="Nome do cliente" value="${sale?.cliente ?? ""}" required /></label>
            <label class="field"><span>Valor</span><input name="value" type="number" min="0.01" step="0.01" placeholder="25000" value="${sale?.valor ?? ""}" required /></label>
            <label class="field"><span>Banco</span><select name="bank" required>${bankOptions.map((bank) => `<option value="${bank}" ${sale?.banco === bank ? "selected" : ""}>${bank}</option>`).join("")}</select></label>
            <label class="field"><span>% Comissão do vendedor</span><input name="commission" type="number" min="0" max="100" step="0.01" value="${sale ? (sale.percentual_comissao * 100) : "7.5"}" required /></label>
            <label class="field"><span>Status</span><select name="status" required>${["Recebido", "Pendente", "Em análise", "Cancelado"].map((status) => `<option value="${status}" ${sale?.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
            <label class="field"><span>Data da proposta</span><input name="proposalDate" type="date" value="${sale?.dataProposta ?? todayISO}" required /></label>
            <label class="field"><span>Produto</span><select name="product" required>${["FGTS","CLT","INSS"].map((product) => `<option value="${product}" ${sale?.produto === product ? "selected" : ""}>${product}</option>`).join("")}</select></label>
            <label class="field" style="grid-column:1 / -1;"><span>% Sua comissão</span><input name="ownerCommissionPercent" type="number" min="0" max="100" step="0.01" value="${sale && sale.valor ? ((sale.comissaoGestor / sale.valor) * 100).toFixed(2) : ""}" placeholder="5" required /></label>
            <div class="sale-preview" style="grid-column:1 / -1;">
              <div class="sale-preview-item">
                <span class="sale-preview-label">Comissão do vendedor</span>
                <strong id="seller-commission-preview">${fmtCurrency(0)}</strong>
              </div>
              <div class="sale-preview-item">
                <span class="sale-preview-label">Seu lucro na venda</span>
                <strong id="owner-commission-preview">${fmtCurrency(0)}</strong>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
              <button class="btn btn-primary" type="submit">${isEditing ? "Salvar alterações" : "Salvar"}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (state.modal === "new-seller" || state.modal === "edit-seller") {
    const seller = state.modalData;
    const isEditing = state.modal === "edit-seller";
    return `
      <div class="modal-backdrop" id="app-modal">
        <div class="modal-card modal-card-sm">
          <div class="drawer-header">
            <div><div class="section-eyebrow">${isEditing ? "Editar vendedor" : "Novo vendedor"}</div><h3 style="margin:4px 0;">${isEditing ? "Editar vendedor" : "Cadastrar vendedor"}</h3><p class="muted">Inclua um novo operador para aparecer no CRM, nos filtros e nas metas.</p></div>
            <button class="icon-btn" data-action="close-modal">✕</button>
          </div>
          <form id="seller-form" class="form-stack" style="margin-top:20px;">
            <label class="field"><span>Nome</span><input name="name" type="text" placeholder="Nome do vendedor" value="${seller?.nome ?? ""}" required /></label>
            <label class="field"><span>Meta mensal</span><input name="goal" type="number" min="0.01" step="0.01" placeholder="250000" value="${seller?.meta_mensal ?? ""}" required /></label>
            <label class="field"><span>Vínculo</span><select name="isOwner"><option value="no">Cadastro normal</option><option value="yes" ${profile.sellerId && seller?.id === profile.sellerId ? "selected" : ""}>Sou eu</option></select></label>
            <div class="modal-actions">
              <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
              <button class="btn btn-primary" type="submit">${isEditing ? "Salvar alterações" : "Salvar vendedor"}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (state.modal === "forgot-password") {
    return `
      <div class="modal-backdrop" id="app-modal">
        <div class="modal-card modal-card-sm">
          <div class="drawer-header">
            <div><div class="section-eyebrow">Recuperação</div><h3 style="margin:4px 0;">Recuperar acesso</h3><p class="muted">Informe o e-mail para receber o link de redefinição.</p></div>
            <button class="icon-btn" data-action="close-modal">✕</button>
          </div>
          <form id="recovery-form" class="form-stack">
            <label class="field"><span>E-mail</span><input name="email" type="email" value="diretoria@mdcred.com.br" required /></label>
            <div class="modal-actions">
              <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
              <button class="btn btn-primary" type="submit">Enviar link</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  return "";
}

function renderLogin() {
  return `
    <main class="login-shell">
      <section class="login-brand">
        <div class="brand-mark">MC</div>
        <div class="brand-eyebrow" style="margin-top:20px;">CRM Financeiro</div>
        <h1>Controle financeiro com visão comercial real.</h1>
        <p>Ambiente preparado para acompanhar vendas, comissões, metas, fluxo de caixa e performance da equipe com padrão visual de operação já consolidada.</p>
        <div class="trust-grid">
          <div class="trust-card"><div class="brand-eyebrow">Gestão</div><strong>Visibilidade executiva</strong><p>Indicadores, metas e ranking em uma visão única.</p></div>
          <div class="trust-card"><div class="brand-eyebrow">Segurança</div><strong>Operação confiável</strong><p>Leitura financeira clara com histórico e rastreabilidade.</p></div>
          <div class="trust-card"><div class="brand-eyebrow">Performance</div><strong>Time orientado a resultado</strong><p>Comissões, fluxo e evolução monitorados em tempo real.</p></div>
        </div>
      </section>
      <section class="login-card">
        <div class="section-eyebrow">Acesse sua plataforma</div>
        <h2>Acesse sua plataforma</h2>
        <p>Entre para acompanhar suas vendas, comissões e resultados em tempo real.</p>
        <form id="login-form" class="form-stack">
          <label class="field"><span>E-mail</span><input type="email" name="email" value="diretoria@mdcred.com.br" required /></label>
          <label class="field"><span>Senha</span><input type="password" name="password" value="123456" required /></label>
          <button class="btn btn-primary" type="submit">Entrar</button>
          <button class="btn link-btn" type="button" data-action="forgot-password">Esqueci minha senha</button>
        </form>
      </section>
    </main>
    ${renderModal()}
  `;
}

function renderAppShell() {
  const filteredSales = getFilteredSales();
  return `
    <div class="app-shell">
      ${renderSidebar(filteredSales)}
      <main class="app-content">
        ${renderTopbar()}
        <section class="main-scroll">
          ${renderFilters()}
          ${renderPageContent(filteredSales)}
        </section>
      </main>
      ${renderSellerDrawer(filteredSales)}
      ${renderModal()}
      ${renderToasts()}
    </div>
  `;
}

function parseCellValue(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (/^\d{2}\/\w{3}$/.test(normalized)) return normalized;
  if (normalized.includes("R$")) {
    return Number(normalized.replace(/[R$\.\s]/g, "").replace(",", "."));
  }
  const maybeNumber = Number(normalized.replace(/\./g, "").replace(",", ".").replace("%", ""));
  if (!Number.isNaN(maybeNumber) && normalized.match(/\d/)) return maybeNumber;
  return normalized.toLowerCase();
}

function compareTableValues(left, right, dir) {
  const leftValue = parseCellValue(left);
  const rightValue = parseCellValue(right);
  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return dir === "asc" ? leftValue - rightValue : rightValue - leftValue;
  }
  return dir === "asc"
    ? String(leftValue).localeCompare(String(rightValue), "pt-BR")
    : String(rightValue).localeCompare(String(leftValue), "pt-BR");
}

function setupTables() {
  document.querySelectorAll("table[data-table-key]").forEach((table) => {
    const tableKey = table.getAttribute("data-table-key");
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const tableState = state.tableState[tableKey] ?? { page: 1, sortIndex: 0, sortDir: "desc" };
    const sortedRows = rows.sort((a, b) => {
      const left = a.children[tableState.sortIndex]?.innerText ?? "";
      const right = b.children[tableState.sortIndex]?.innerText ?? "";
      return compareTableValues(left, right, tableState.sortDir);
    });
    const pageSize = 6;
    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const currentPage = Math.min(tableState.page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    sortedRows.forEach((row, index) => {
      row.style.display = index >= start && index < end ? "" : "none";
    });

    const pageLabel = document.querySelector(`[data-table-page-label="${tableKey}"]`);
    const countLabel = document.querySelector(`[data-table-count-label="${tableKey}"]`);
    if (pageLabel) pageLabel.textContent = `Página ${currentPage} de ${totalPages}`;
    if (countLabel) countLabel.textContent = `${fmtInteger(sortedRows.length)} registros visíveis`;
  });
}

function updateSalePreview(form) {
  if (!form) return;
  const value = Number(form.querySelector('[name="value"]')?.value || 0);
  const sellerPercent = Number(form.querySelector('[name="commission"]')?.value || 0);
  const ownerPercent = Number(form.querySelector('[name="ownerCommissionPercent"]')?.value || 0);
  const sellerPreview = document.getElementById("seller-commission-preview");
  const ownerPreview = document.getElementById("owner-commission-preview");
  if (sellerPreview) sellerPreview.textContent = fmtCurrency(value * (sellerPercent / 100));
  if (ownerPreview) ownerPreview.textContent = fmtCurrency(value * (ownerPercent / 100));
}

function attachEvents() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.isAuthenticated = true;
      writeStorage(STORAGE_KEYS.auth, true);
      renderApp();
      showToast("Acesso liberado", "Ambiente carregado com os dados mais recentes.");
    });
  }

  const saleForm = document.getElementById("sale-form");
  if (saleForm) {
    updateSalePreview(saleForm);
    saleForm.querySelectorAll('input[name="value"], input[name="commission"], input[name="ownerCommissionPercent"]').forEach((input) =>
      input.addEventListener("input", () => updateSalePreview(saleForm))
    );
    saleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const isEditingSale = state.modal === "edit-sale";
      const formData = new FormData(saleForm);
      const saleValue = Number(formData.get("value"));
      const sellerPercent = Number(formData.get("commission"));
      const ownerPercent = Number(formData.get("ownerCommissionPercent"));

      if (saleValue <= 0 || sellerPercent < 0 || sellerPercent > 100 || ownerPercent < 0 || ownerPercent > 100) {
        showToast("Dados inválidos", "Revise valor e percentuais antes de salvar a venda.");
        return;
      }

      const payload = {
        seller: formData.get("seller"),
        client: formData.get("client"),
        value: saleValue,
        bank: formData.get("bank"),
        sellerPercent,
        status: formData.get("status"),
        proposalDate: formData.get("proposalDate"),
        product: formData.get("product"),
        ownerPercent,
      };

      if (isEditingSale && state.modalData?.id) {
        updateSaleRecord(state.modalData.id, payload);
      } else {
        sales.unshift([
          todayISO,
          payload.seller,
          payload.client,
          payload.value,
          payload.bank,
          payload.sellerPercent / 100,
          payload.status,
          payload.proposalDate,
          payload.product,
          payload.value * (payload.ownerPercent / 100),
          `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ]);
        persistCRMData();
      }
      persistCRMData();
      state.modal = null;
      state.modalData = null;
      renderApp();
      showToast(isEditingSale ? "Venda atualizada" : "Venda cadastrada", "A operação foi salva e os indicadores foram atualizados.");
    });
  }

  const recoveryForm = document.getElementById("recovery-form");
  if (recoveryForm) {
    recoveryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.modal = null;
      renderApp();
      showToast("Recuperação enviada", "Enviamos o link de redefinição para o e-mail informado.");
    });
  }

  const sellerForm = document.getElementById("seller-form");
  if (sellerForm) {
    sellerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const isEditingSeller = state.modal === "edit-seller";
      const formData = new FormData(sellerForm);
      const name = String(formData.get("name")).trim();
      const goal = Number(formData.get("goal"));
      const isOwner = formData.get("isOwner") === "yes";
      const id = slugify(name);
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

      if (!name || goal <= 0) {
        showToast("Dados inválidos", "Informe um nome e uma meta mensal maior que zero.");
        return;
      }

      if (sellers.some((seller) => normalizedName(seller.nome) === normalizedName(name) && (!isEditingSeller || seller.id !== state.modalData?.id))) {
        showToast("Cadastro não realizado", "Já existe um vendedor com esse nome.");
        return;
      }

      if (isEditingSeller && state.modalData?.id) {
        updateSellerRecord(state.modalData.id, { name, goal, avatar: initials || "NV" });
        if (isOwner) {
          profile.sellerId = state.modalData.id;
          persistProfile();
        } else if (profile.sellerId === state.modalData.id) {
          profile.sellerId = "";
          persistProfile();
        }
      } else {
        sellers.push({ id, nome: name, meta_mensal: goal, avatar: initials || "NV" });
        goals.push({ nome: name, tipo: "Vendedor", valor_meta: goal, valor_realizado: 0 });
        if (isOwner) {
          profile.sellerId = id;
          persistProfile();
        }
        persistCRMData();
      }
      state.modal = null;
      state.modalData = null;
      renderApp();
      showToast(isEditingSeller ? "Vendedor atualizado" : "Vendedor cadastrado", "O cadastro foi salvo com sucesso.");
    });
  }

  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(profileForm);
      profile.name = String(formData.get("name")).trim() || defaultProfile.name;
      profile.role = String(formData.get("role")).trim() || defaultProfile.role;
      profile.sellerId = String(formData.get("sellerId") || "");
      persistProfile();
      renderApp();
      showToast("Perfil atualizado", "O cabeçalho da plataforma foi personalizado com sucesso.");
    });
  }

  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => {
    state.activePage = button.getAttribute("data-page");
    state.sidebarOpen = false;
    renderApp();
  }));

  document.querySelectorAll("[data-input]").forEach((input) => input.addEventListener("input", () => {
    const type = input.getAttribute("data-input");
    if (type === "search") state.searchTerm = input.value;
    if (type === "period") state.selectedPeriod = input.value;
    if (type === "seller") state.selectedSeller = input.value;
    if (type === "bank") state.selectedBank = input.value;
    if (type === "status") state.selectedStatus = input.value;
    renderApp();
  }));

  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.getAttribute("data-action");
    if (action === "toggle-sidebar") { state.sidebarOpen = !state.sidebarOpen; renderApp(); }
    if (action === "export") exportCurrentView();
    if (action === "export-pdf") exportCurrentView("pdf");
    if (action === "export-excel") exportCurrentView("excel");
    if (action === "new-sale") { state.modal = "new-sale"; state.modalData = null; renderApp(); }
    if (action === "new-seller") { state.modal = "new-seller"; state.modalData = null; renderApp(); }
    if (action === "my-sales") {
      if (profile.sellerId) {
        state.selectedSeller = profile.sellerId;
        state.activePage = "financeiro";
        renderApp();
      } else {
        showToast("Perfil não vinculado", "Vincule seu perfil ao seu cadastro de vendedor em Configurações.");
      }
    }
    if (action === "notifications") showToast("Central de alertas", "2 vendas pendentes e 1 operação em análise.");
    if (action === "refresh") showToast("Dados atualizados", "Os indicadores foram recalculados com sucesso.");
    if (action === "forgot-password") { state.modal = "forgot-password"; state.modalData = null; renderApp(); }
    if (action === "logout") {
      state.isAuthenticated = false;
      removeStorage(STORAGE_KEYS.auth);
      state.modal = null;
      state.modalData = null;
      renderApp();
    }
    if (action === "clear-filters") {
      state.selectedPeriod = "30";
      state.selectedSeller = "all";
      state.selectedBank = "all";
      state.selectedStatus = "all";
      state.searchTerm = "";
      renderApp();
    }
    if (action === "seller-detail" || action === "seller-history") {
      state.selectedSellerDetail = button.getAttribute("data-seller");
      renderApp();
    }
    if (action === "close-drawer") {
      state.selectedSellerDetail = null;
      renderApp();
    }
    if (action === "close-modal") {
      state.modal = null;
      state.modalData = null;
      renderApp();
    }
    if (action === "edit-sale") {
      state.modal = "edit-sale";
      state.modalData = parseSale(sales[findSaleIndexById(button.getAttribute("data-sale-id"))]);
      renderApp();
    }
    if (action === "delete-sale") {
      const saleId = button.getAttribute("data-sale-id");
      removeSaleRecord(saleId);
      renderApp();
      showToast("Venda excluída", "O registro foi removido com sucesso.");
    }
    if (action === "edit-seller") {
      state.modal = "edit-seller";
      state.modalData = sellers.find((seller) => seller.id === button.getAttribute("data-seller"));
      renderApp();
    }
    if (action === "delete-seller") {
      if (removeSellerRecord(button.getAttribute("data-seller"))) {
        renderApp();
        showToast("Vendedor excluído", "O cadastro do vendedor foi removido.");
      }
    }
    if (action === "reset-data") {
      resetCRMData();
      state.modal = null;
      state.modalData = null;
      state.selectedSellerDetail = null;
      renderApp();
      showToast("Dados limpos", "O sistema voltou para o estado inicial vazio.");
    }
    if (action === "sort-table") {
      const tableKey = button.getAttribute("data-table-key");
      const sortIndex = Number(button.getAttribute("data-sort-index"));
      const current = state.tableState[tableKey] ?? { page: 1, sortIndex: 0, sortDir: "desc" };
      state.tableState[tableKey] = {
        page: 1,
        sortIndex,
        sortDir: current.sortIndex === sortIndex && current.sortDir === "desc" ? "asc" : "desc",
      };
      renderApp();
    }
    if (action === "prev-page" || action === "next-page") {
      const tableKey = button.getAttribute("data-table-key");
      const current = state.tableState[tableKey] ?? { page: 1, sortIndex: 0, sortDir: "desc" };
      const tableShell = document.querySelector(`.table-shell[data-table-key="${tableKey}"]`);
      const rowCount = Number(tableShell?.getAttribute("data-row-count") ?? 0);
      const totalPages = Math.max(1, Math.ceil(rowCount / 6));
      state.tableState[tableKey] = {
        ...current,
        page: Math.min(totalPages, Math.max(1, current.page + (action === "next-page" ? 1 : -1))),
      };
      renderApp();
    }
  }));

  const drawer = document.getElementById("seller-drawer");
  if (drawer) {
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) {
        state.selectedSellerDetail = null;
        renderApp();
      }
    });
  }

  const modal = document.getElementById("app-modal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        state.modal = null;
        renderApp();
      }
    });
  }

  setupTables();
}

function renderApp() {
  const root = document.getElementById("app");
  root.innerHTML = state.isAuthenticated ? renderAppShell() : renderLogin();
  attachEvents();
}

renderApp();
