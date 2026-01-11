import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatCard from "../components/StatCard";
import Card from "../components/Card";
import LineChart from "../components/charts/LineChart";
import Donut from "../components/charts/Donut";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, formatDate } from "../utils/format";
import { getLabel } from "../data/uiLabels";
import {
  formatMonthLabel,
  getLastMonths,
  getMonthKey,
  getMonthOptionsFromDates,
  isSameMonth,
  parseDate,
} from "../utils/date";

function Dashboard({ orgId, dataVersion, labels }) {
  const [contracts, setContracts] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subareas, setSubareas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!orgId) return;
      setLoading(true);
      const [
        contractsRes,
        installmentsRes,
        receiptsRes,
        expensesRes,
        areasRes,
        subareasRes,
      ] = await Promise.all([
        supabase
          .from("contracts")
          .select(
            "id, total_value, start_date, subarea_id, honorarium_types(name), law_areas(name)"
          )
          .eq("org_id", orgId),
        supabase
          .from("contract_installments")
          .select(
            "id, contract_id, due_date, amount, status, contracts(client_name, area_id, subarea_id, honorarium_types(name))"
          )
          .eq("org_id", orgId),
        supabase
          .from("manual_receipts")
          .select("id, amount, received_date, area_id, subarea_id")
          .eq("org_id", orgId),
        supabase
          .from("expenses")
          .select("id, amount, due_date")
          .eq("org_id", orgId),
        supabase.from("law_areas").select("id, name").eq("org_id", orgId),
        supabase.from("law_subareas").select("id, name, area_id").eq("org_id", orgId),
      ]);

      setContracts(contractsRes.data ?? []);
      setInstallments(installmentsRes.data ?? []);
      setReceipts(receiptsRes.data ?? []);
      setExpenses(expensesRes.data ?? []);
      setAreas(areasRes.data ?? []);
      setSubareas(subareasRes.data ?? []);
      setLoading(false);
    };
    loadData();
  }, [orgId, dataVersion]);

  const monthOptions = useMemo(() => {
    const dates = [
      ...installments.map((item) => parseDate(item.due_date)),
      ...receipts.map((item) => parseDate(item.received_date)),
      ...expenses.map((item) => parseDate(item.due_date)),
    ];
    const options = getMonthOptionsFromDates(dates);
    return [{ value: "all", label: "Todos os meses" }, ...options];
  }, [installments, receipts, expenses]);

  useEffect(() => {
    if (monthOptions.length === 0) return;
    if (!selectedMonth || !monthOptions.some((option) => option.value === selectedMonth)) {
      setSelectedMonth("all");
    }
  }, [monthOptions, selectedMonth]);

  const selectedMonthDate = useMemo(
    () =>
      selectedMonth === "all"
        ? null
        : monthOptions.find((option) => option.value === selectedMonth)?.date ?? null,
    [monthOptions, selectedMonth]
  );

  const dashboardData = useMemo(() => {
    const today = new Date();
    const isAllMonths = selectedMonth === "all";
    const referenceDate = selectedMonthDate ?? today;
    const currentKey = getMonthKey(referenceDate);
    const months = isAllMonths
      ? getMonthOptionsFromDates([
          ...installments.map((item) => parseDate(item.due_date)),
          ...receipts.map((item) => parseDate(item.received_date)),
          ...expenses.map((item) => parseDate(item.due_date)),
        ]).map((option) => ({
          key: option.value,
          label: formatMonthLabel(option.date),
          date: option.date,
        }))
      : getLastMonths(6, referenceDate);
    const monthIndex = new Map(months.map((item, index) => [item.key, index]));

    const revenueByMonth = months.map(() => 0);
    const addToMonth = (dateValue, amount) => {
      const date = parseDate(dateValue);
      if (!date) return;
      const key = getMonthKey(date);
      const index = monthIndex.get(key);
      if (index === undefined) return;
      revenueByMonth[index] += Number(amount || 0);
    };

    const paidInstallments = installments.filter((item) => item.status === "paid");
    paidInstallments.forEach((item) => addToMonth(item.due_date, item.amount));
    receipts.forEach((item) => addToMonth(item.received_date, item.amount));

    const revenueCurrent = isAllMonths
      ? revenueByMonth.reduce((sum, value) => sum + value, 0)
      : revenueByMonth[monthIndex.get(currentKey)] ?? 0;

    const expensesCurrent = isAllMonths
      ? expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      : expenses.reduce((sum, item) => {
          const date = parseDate(item.due_date);
          if (!date) return sum;
          return getMonthKey(date) === currentKey
            ? sum + Number(item.amount || 0)
            : sum;
        }, 0);

    const resultCurrent = revenueCurrent - expensesCurrent;

    const contractsForTicket = isAllMonths
      ? contracts
      : contracts.filter((contract) => {
          const date = parseDate(contract.start_date);
          return date && selectedMonthDate && isSameMonth(date, selectedMonthDate);
        });
    const totalContractValue = contractsForTicket.reduce(
      (sum, item) => sum + Number(item.total_value || 0),
      0
    );
    const ticket = contractsForTicket.length
      ? totalContractValue / contractsForTicket.length
      : 0;

    const overdueInstallments = installments.filter((item) => {
      if (item.status === "paid") return false;
      const due = parseDate(item.due_date);
      return due && due < today;
    });

    const overdueContracts = new Set(overdueInstallments.map((item) => item.contract_id));

    const futureReceivable = installments
      .filter((item) => item.status !== "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const isInSelectedMonth = (value) => {
      if (isAllMonths || !selectedMonthDate) return true;
      const date = parseDate(value);
      if (!date) return false;
      return isSameMonth(date, selectedMonthDate);
    };

    const areaMap = new Map(areas.map((area) => [area.id, area.name]));
    const subareaMap = new Map(subareas.map((sub) => [sub.id, sub.name]));

    const areaTotals = {};
    const subareaTotals = {};
    paidInstallments
      .filter((item) => isInSelectedMonth(item.due_date))
      .forEach((item) => {
        const areaId = item.contracts?.area_id;
        if (areaId) {
          const name = areaMap.get(areaId) ?? "Outros";
          areaTotals[name] = (areaTotals[name] || 0) + Number(item.amount || 0);
        }
      });
    receipts
      .filter((item) => isInSelectedMonth(item.received_date))
      .forEach((item) => {
        if (item.area_id) {
          const name = areaMap.get(item.area_id) ?? "Outros";
          areaTotals[name] = (areaTotals[name] || 0) + Number(item.amount || 0);
        }
        if (item.subarea_id) {
          const name = subareaMap.get(item.subarea_id) ?? "Outros";
          subareaTotals[name] = (subareaTotals[name] || 0) + Number(item.amount || 0);
        }
      });

    contractsForTicket.forEach((contract) => {
      if (!contract.subarea_id) return;
      const name = subareaMap.get(contract.subarea_id) ?? "Outros";
      subareaTotals[name] = (subareaTotals[name] || 0) + Number(contract.total_value || 0);
    });

    const areaPalette = ["#1c3fa8", "#2d58c8", "#4e78dd", "#7aa0f1", "#9fbaf7"];
    const areaSegments = Object.entries(areaTotals).map(([label, value], index) => ({
      label,
      value,
      color: areaPalette[index % areaPalette.length],
    }));

    const subareaSegments = Object.entries(subareaTotals).map(([label, value], index) => ({
      label,
      value,
      color: ["#0f2e7a", "#1c3fa8", "#2f66e0", "#6e95ef"][index % 4],
    }));

    const honorariumTotals = {};
    paidInstallments
      .filter((item) => isInSelectedMonth(item.due_date))
      .forEach((item) => {
        const label = item.contracts?.honorarium_types?.name ?? "Outro";
        honorariumTotals[label] = (honorariumTotals[label] || 0) + Number(item.amount || 0);
      });

    const honorariumSegments = Object.entries(honorariumTotals).map(
      ([label, value], index) => ({
        label,
        value,
        color: ["#1c3fa8", "#4572d9", "#88a9f0"][index % 3],
      })
    );

    const chartData = months.map((item, index) => ({
      label: item.label,
      value: revenueByMonth[index] ?? 0,
    }));

    const overdueList = overdueInstallments.slice(0, 4).map((item) => ({
      name: item.contracts?.client_name ?? "-",
      date: formatDate(item.due_date),
      value: formatCurrency(item.amount),
    }));

    const selectedLabel =
      monthOptions.find((option) => option.value === selectedMonth)?.label ?? null;

    return {
      currentLabel: selectedLabel ?? formatMonthLabel(referenceDate),
      revenueCurrent,
      futureReceivable,
      expensesCurrent,
      resultCurrent,
      isAllMonths,
      ticket,
      overdueContracts: overdueContracts.size,
      overdueInstallments: overdueInstallments.length,
      chartData,
      areaSegments,
      subareaSegments,
      honorariumSegments,
      overdueList,
    };
  }, [
    contracts,
    installments,
    receipts,
    expenses,
    areas,
    subareas,
    selectedMonthDate,
    monthOptions,
    selectedMonth,
  ]);

  const areaSegments =
    dashboardData.areaSegments.length > 0
      ? dashboardData.areaSegments
      : [{ label: "Sem dados", value: 1, color: "#d0d7e6" }];

  const subareaSegments =
    dashboardData.subareaSegments.length > 0
      ? dashboardData.subareaSegments
      : [{ label: "Sem dados", value: 1, color: "#d0d7e6" }];

  const honorariumSegments =
    dashboardData.honorariumSegments.length > 0
      ? dashboardData.honorariumSegments
      : [{ label: "Sem dados", value: 1, color: "#d0d7e6" }];

  return (
    <section className="page">
      <PageHeader
        title="Dashboard"
        subtitle={
          loading
            ? "Carregando dados..."
            : `Visão geral de ${dashboardData.currentLabel}`
        }
      >
        <Select
          options={monthOptions}
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
      </PageHeader>

      <div className="stats-grid">
        <StatCard
          title={getLabel(labels, "dashboard.card.revenue.title", "Faturamento")}
          value={formatCurrency(dashboardData.revenueCurrent)}
          caption={dashboardData.isAllMonths ? "Total" : "Este mês"}
          icon="money"
          delay="0s"
        />
        <StatCard
          title={getLabel(
            labels,
            "dashboard.card.expenses.title",
            dashboardData.isAllMonths ? "Despesas" : "Despesas Mês"
          )}
          value={formatCurrency(dashboardData.expensesCurrent)}
          caption={dashboardData.isAllMonths ? "Total" : "Este mês"}
          icon="wallet"
          delay="0.1s"
        />
        <StatCard
          title={getLabel(labels, "dashboard.card.result.title", "Resultado")}
          value={formatCurrency(dashboardData.resultCurrent)}
          caption={dashboardData.resultCurrent >= 0 ? "Positivo" : "Negativo"}
          icon="target"
          delay="0.15s"
        />
        <StatCard
          title={getLabel(labels, "dashboard.card.ticket.title", "Ticket Médio")}
          value={formatCurrency(dashboardData.ticket)}
          caption={dashboardData.isAllMonths ? "Média geral" : "No mês"}
          icon="users"
          delay="0.2s"
        />
        <StatCard
          title={getLabel(labels, "dashboard.card.future.title", "Receita Futura")}
          value={formatCurrency(dashboardData.futureReceivable)}
          caption="Prevista"
          icon="trend"
          delay="0.25s"
        />
        <StatCard
          title={getLabel(labels, "dashboard.card.overdue.title", "Contratos em Atraso")}
          value={String(dashboardData.overdueContracts)}
          caption={`${dashboardData.overdueInstallments} parcelas`}
          icon="calendar"
          tone="danger"
          delay="0.3s"
        />
      </div>

      <div className="grid-2">
        <Card
          title={getLabel(labels, "dashboard.chart.revenue.title", "Faturamento Mensal")}
        >
          <LineChart data={dashboardData.chartData} />
        </Card>
        <Card
          title={getLabel(labels, "dashboard.chart.area.title", "Receita por Área do Direito")}
        >
          <Donut segments={areaSegments} />
        </Card>
      </div>

      <div className="grid-3">
        <Card
          title={getLabel(
            labels,
            "dashboard.chart.honorarium.title",
            "Receita por Tipo de Honorário"
          )}
        >
          <Donut segments={honorariumSegments} />
        </Card>
        <Card
          title={getLabel(
            labels,
            "dashboard.chart.subarea.title",
            "Receita por Subárea do Direito"
          )}
        >
          <Donut segments={subareaSegments} />
        </Card>
        <Card
          title={getLabel(labels, "dashboard.chart.overdue.title", "Parcelas em Atraso")}
        >
          <div className="overdue-list">
            {dashboardData.overdueList.length === 0 ? (
              <div className="empty-state">
                <Icon name="receipt" />
                <div>Nenhuma parcela em atraso</div>
              </div>
            ) : (
              dashboardData.overdueList.map((item) => (
                <div key={`${item.name}-${item.date}`} className="overdue-item">
                  <div>
                    <div className="overdue-name">{item.name}</div>
                    <div className="overdue-date">Venc: {item.date}</div>
                  </div>
                  <div className="overdue-value">{item.value}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Dashboard;
