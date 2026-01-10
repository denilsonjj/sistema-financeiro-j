import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Select from "../components/Select";
import Icon from "../components/Icon";
import { expenseStatusOptions } from "../data/options";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, formatDate } from "../utils/format";
import { getMonthOptionsFromDates, isSameMonth, parseDate } from "../utils/date";

const statusMap = {
  paid: { label: "Paga", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
};

function Despesas({ onOpenModal, onEdit, orgId, dataVersion }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todas");

  useEffect(() => {
    const loadExpenses = async () => {
      if (!orgId) return;
      setLoading(true);
      const { data } = await supabase
        .from("expenses")
        .select(
          "id, description, expense_type, cost_type, amount, due_date, paid, expense_categories(name)"
        )
        .eq("org_id", orgId)
        .order("due_date", { ascending: true });
      setExpenses(data ?? []);
      setLoading(false);
    };
    loadExpenses();
  }, [orgId, dataVersion]);

  const monthOptions = useMemo(() => {
    const dates = expenses.map((expense) => parseDate(expense.due_date));
    const options = getMonthOptionsFromDates(dates);
    return [{ value: "all", label: "Todos os meses" }, ...options];
  }, [expenses]);

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

  const monthFilteredExpenses = useMemo(() => {
    if (!selectedMonthDate) return expenses;
    return expenses.filter((expense) => {
      const date = parseDate(expense.due_date);
      return date && isSameMonth(date, selectedMonthDate);
    });
  }, [expenses, selectedMonthDate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return monthFilteredExpenses.filter((expense) => {
      if (term && !expense.description.toLowerCase().includes(term)) {
        return false;
      }
      if (selectedStatus === "Pagas" && !expense.paid) return false;
      if (selectedStatus === "Pendentes" && expense.paid) return false;
      return true;
    });
  }, [monthFilteredExpenses, search, selectedStatus]);

  const totals = useMemo(() => {
    const total = monthFilteredExpenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const paid = monthFilteredExpenses
      .filter((item) => item.paid)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [monthFilteredExpenses]);

  const isAllMonths = selectedMonth === "all";

  const subtitle = loading
    ? "Carregando despesas..."
    : "Controle de gastos do escritório";

  const handleTogglePaid = async (expense) => {
    setActionError("");
    const nextPaid = !expense.paid;
    const paidAt = nextPaid ? expense.due_date : null;
    const { error } = await supabase
      .from("expenses")
      .update({ paid: nextPaid, paid_at: paidAt })
      .eq("id", expense.id);
    if (!error) {
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === expense.id ? { ...item, paid: nextPaid, paid_at: paidAt } : item
        )
      );
    } else {
      setActionError("Não foi possível atualizar o status da despesa.");
    }
  };

  const handleDelete = async (expenseId) => {
    const confirmed = window.confirm("Deseja excluir esta despesa?");
    if (!confirmed) return;
    setActionError("");
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("org_id", orgId);
    if (error) {
      setActionError("Não foi possível excluir a despesa.");
      return;
    }
    setExpenses((prev) => prev.filter((item) => item.id !== expenseId));
  };

  return (
    <section className="page">
      <PageHeader title="Despesas" subtitle={subtitle}>
        <div className="actions-row">
          <button type="button" className="primary-btn" onClick={onOpenModal}>
            <Icon name="plus" />
            Nova Despesa
          </button>
        </div>
      </PageHeader>

      <div className="stats-grid">
        <StatCard
          title={isAllMonths ? "Total Geral" : "Total do Mês"}
          value={formatCurrency(totals.total)}
          caption="Acumulado"
          icon="wallet"
        />
        <StatCard
          title="Pagas"
          value={formatCurrency(totals.paid)}
          caption={isAllMonths ? "Total pago" : "Este mês"}
          icon="check"
        />
        <StatCard
          title="Pendentes"
          value={formatCurrency(totals.pending)}
          caption={isAllMonths ? "Em aberto" : "Aguardando"}
          icon="clock"
        />
      </div>

      <div className="filter-bar">
        <div className="search">
          <Icon name="search" />
          <input
            type="text"
            placeholder="Buscar despesa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          options={monthOptions}
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
        <Select
          options={expenseStatusOptions}
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
        />
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th className="align-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7}>
                  <div className="empty-state">
                    <Icon name="receipt" />
                    <div>Nenhuma despesa encontrada</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((expense) => {
                const status = expense.paid ? statusMap.paid : statusMap.pending;
                return (
                  <tr key={expense.id}>
                    <td>{expense.description}</td>
                    <td>{expense.expense_categories?.name ?? "-"}</td>
                    <td>{expense.expense_type === "recurring" ? "Recorrente" : "Pontual"}</td>
                    <td>{formatDate(expense.due_date)}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td>
                      <span className={`pill ${status.tone}`}>{status.label}</span>
                    </td>
                    <td className="align-right">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onEdit?.(expense.id)}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleTogglePaid(expense)}
                        >
                          <Icon name="check" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Despesas;
