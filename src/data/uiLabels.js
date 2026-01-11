export const labelGroups = [
  {
    title: "Dashboard - Cards",
    items: [
      { key: "dashboard.card.revenue.title", label: "Faturamento" },
      { key: "dashboard.card.expenses.title", label: "Despesas Mês" },
      { key: "dashboard.card.result.title", label: "Resultado" },
      { key: "dashboard.card.ticket.title", label: "Ticket Médio" },
      { key: "dashboard.card.future.title", label: "Receita Futura" },
      { key: "dashboard.card.overdue.title", label: "Contratos em Atraso" },
    ],
  },
  {
    title: "Dashboard - Gráficos",
    items: [
      { key: "dashboard.chart.revenue.title", label: "Faturamento Mensal" },
      { key: "dashboard.chart.area.title", label: "Receita por Área do Direito" },
      { key: "dashboard.chart.honorarium.title", label: "Receita por Tipo de Honorário" },
      { key: "dashboard.chart.subarea.title", label: "Receita por Subárea do Direito" },
      { key: "dashboard.chart.overdue.title", label: "Parcelas em Atraso" },
    ],
  },
  {
    title: "Relatórios - Resumo",
    items: [
      { key: "reports.card.totalReceived.title", label: "Total Recebido" },
      { key: "reports.card.totalExpenses.title", label: "Total Despesas" },
      { key: "reports.card.result.title", label: "Resultado Líquido" },
      { key: "reports.card.receivables.title", label: "Recebíveis Futuros" },
    ],
  },
  {
    title: "Relatórios - Gráficos",
    items: [
      { key: "reports.chart.compare.title", label: "Comparativo Mensal" },
      { key: "reports.chart.result.title", label: "Resultado Líquido Mensal" },
      { key: "reports.chart.honorarium.title", label: "Por Tipo de Honorário" },
      { key: "reports.chart.area.title", label: "Por Área do Direito" },
      { key: "reports.chart.subarea.title", label: "Por Subárea do Direito" },
      { key: "reports.chart.origin.title", label: "Por Origem do Cliente" },
    ],
  },
];

export const defaultLabels = labelGroups.reduce((acc, group) => {
  group.items.forEach((item) => {
    acc[item.key] = item.label;
  });
  return acc;
}, {});

export const getLabel = (labels, key, fallback) =>
  labels?.[key] ?? defaultLabels[key] ?? fallback ?? "";
