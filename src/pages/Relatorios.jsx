import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatCard from "../components/StatCard";
import Card from "../components/Card";
import LegendItem from "../components/LegendItem";
import BarChart from "../components/charts/BarChart";
import LineChart from "../components/charts/LineChart";
import Donut from "../components/charts/Donut";
import { reportOptions } from "../data/options";
import { getLabel } from "../data/uiLabels";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency } from "../utils/format";
import { getLastMonths, getMonthKey, parseDate } from "../utils/date";

function Relatorios({ orgId, dataVersion, labels }) {
  const [period, setPeriod] = useState(reportOptions[0]);
  const [contracts, setContracts] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [subareas, setSubareas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!orgId) return;
      setLoading(true);
      const [contractsRes, installmentsRes, receiptsRes, expensesRes, subareasRes] =
        await Promise.all([
          supabase
            .from("contracts")
            .select(
              "id, total_value, subarea_id, honorarium_types(name), law_areas(name), client_origins(name)"
            )
            .eq("org_id", orgId),
          supabase
            .from("contract_installments")
            .select("id, due_date, amount, status")
            .eq("org_id", orgId),
          supabase
            .from("manual_receipts")
            .select("id, amount, received_date")
            .eq("org_id", orgId),
          supabase
            .from("expenses")
            .select("id, amount, due_date")
            .eq("org_id", orgId),
          supabase.from("law_subareas").select("id, name").eq("org_id", orgId),
        ]);

      setContracts(contractsRes.data ?? []);
      setInstallments(installmentsRes.data ?? []);
      setReceipts(receiptsRes.data ?? []);
      setExpenses(expensesRes.data ?? []);
      setSubareas(subareasRes.data ?? []);
      setLoading(false);
    };
    loadData();
  }, [orgId, dataVersion]);

  const reportData = useMemo(() => {
    const monthsCount = period.includes("3") ? 3 : 6;
    const months = getLastMonths(monthsCount);
    const monthIndex = new Map(months.map((item, index) => [item.key, index]));

    const revenueByMonth = months.map(() => 0);
    const expenseByMonth = months.map(() => 0);

    const addToMonth = (dateValue, amount, target) => {
      const date = parseDate(dateValue);
      if (!date) return;
      const key = getMonthKey(date);
      const index = monthIndex.get(key);
      if (index === undefined) return;
      target[index] += Number(amount || 0);
    };

    installments
      .filter((item) => item.status === "paid")
      .forEach((item) => addToMonth(item.due_date, item.amount, revenueByMonth));
    receipts.forEach((item) => addToMonth(item.received_date, item.amount, revenueByMonth));
    expenses.forEach((item) => addToMonth(item.due_date, item.amount, expenseByMonth));

    const totalReceived = revenueByMonth.reduce((sum, value) => sum + value, 0);
    const totalExpenses = expenseByMonth.reduce((sum, value) => sum + value, 0);
    const resultTotal = totalReceived - totalExpenses;

    const receivables = installments
      .filter((item) => item.status !== "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const chartData = months.map((item, index) => ({
      label: item.label,
      receita: revenueByMonth[index] ?? 0,
      despesa: expenseByMonth[index] ?? 0,
    }));

    const resultSeries = months.map((item, index) => ({
      label: item.label,
      value: (revenueByMonth[index] ?? 0) - (expenseByMonth[index] ?? 0),
    }));

    const honorariumTotals = {};
    const areaTotals = {};
    const originTotals = {};
    const subareaTotals = {};

    const subareaMap = new Map(subareas.map((sub) => [sub.id, sub.name]));

    contracts.forEach((contract) => {
      const value = Number(contract.total_value || 0);
      const honorarium = contract.honorarium_types?.name ?? "Outro";
      const area = contract.law_areas?.name ?? "Outro";
      const origin = contract.client_origins?.name ?? "Outro";
      const subarea = contract.subarea_id
        ? subareaMap.get(contract.subarea_id) ?? "Outros"
        : "Outros";

      honorariumTotals[honorarium] = (honorariumTotals[honorarium] || 0) + value;
      areaTotals[area] = (areaTotals[area] || 0) + value;
      originTotals[origin] = (originTotals[origin] || 0) + value;
      subareaTotals[subarea] = (subareaTotals[subarea] || 0) + value;
    });

    const buildSegments = (source, palette) => {
      const entries = Object.entries(source);
      if (entries.length === 0) {
        return [{ label: "Sem dados", value: 1, color: "#d0d7e6" }];
      }
      return entries.map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));
    };

    return {
      totalReceived,
      totalExpenses,
      resultTotal,
      receivables,
      chartData,
      resultSeries,
      honorariumSegments: buildSegments(honorariumTotals, ["#1c3fa8", "#4e78dd", "#9fbaf7"]),
      areaSegments: buildSegments(areaTotals, ["#1c3fa8", "#2d58c8", "#4e78dd", "#7aa0f1"]),
      originSegments: buildSegments(originTotals, ["#1c3fa8", "#2d58c8", "#4e78dd", "#7aa0f1"]),
      subareaSegments: buildSegments(subareaTotals, ["#0f2e7a", "#1c3fa8", "#2f66e0", "#6e95ef"]),
    };
  }, [period, contracts, installments, receipts, expenses, subareas]);

  return (
    <section className="page">
      <PageHeader
        title="Relatórios"
        subtitle={loading ? "Carregando dados..." : "Análise financeira detalhada"}
      >
        <div className="actions-row">
          <Select
            value={period}
            options={reportOptions}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </div>
      </PageHeader>

      <div className="stats-grid">
        <StatCard
          title={getLabel(labels, "reports.card.totalReceived.title", "Total Recebido")}
          value={formatCurrency(reportData.totalReceived)}
          caption="Acumulado"
          icon="money"
        />
        <StatCard
          title={getLabel(labels, "reports.card.totalExpenses.title", "Total Despesas")}
          value={formatCurrency(reportData.totalExpenses)}
          caption="Acumulado"
          icon="trend"
        />
        <StatCard
          title={getLabel(labels, "reports.card.result.title", "Resultado Líquido")}
          value={formatCurrency(reportData.resultTotal)}
          caption={reportData.resultTotal >= 0 ? "Positivo" : "Negativo"}
          icon="target"
        />
        <StatCard
          title={getLabel(labels, "reports.card.receivables.title", "Recebíveis Futuros")}
          value={formatCurrency(reportData.receivables)}
          caption="Projetado"
          icon="users"
        />
      </div>

      <Card
        title={getLabel(labels, "reports.chart.compare.title", "Comparativo Mensal")}
        icon="chart"
      >
        <BarChart data={reportData.chartData} />
        <div className="legend">
          <LegendItem color="var(--primary)" label="Receita" />
          <LegendItem color="var(--danger)" label="Despesa" />
        </div>
      </Card>

      <Card
        title={getLabel(labels, "reports.chart.result.title", "Resultado Líquido Mensal")}
        icon="line"
      >
        <LineChart data={reportData.resultSeries} lineColor="#1aa972" />
      </Card>

      <div className="grid-3">
        <Card
          title={getLabel(labels, "reports.chart.honorarium.title", "Por Tipo de Honorário")}
        >
          <Donut segments={reportData.honorariumSegments} />
        </Card>
        <Card title={getLabel(labels, "reports.chart.area.title", "Por Área do Direito")}>
          <Donut segments={reportData.areaSegments} />
        </Card>
        <Card
          title={getLabel(labels, "reports.chart.subarea.title", "Por Subárea do Direito")}
        >
          <Donut segments={reportData.subareaSegments} />
        </Card>
        <Card title={getLabel(labels, "reports.chart.origin.title", "Por Origem do Cliente")}>
          <Donut segments={reportData.originSegments} />
        </Card>
      </div>
    </section>
  );
}

export default Relatorios;
