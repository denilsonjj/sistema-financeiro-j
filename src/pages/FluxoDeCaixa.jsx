import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatCard from "../components/StatCard";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, formatDate } from "../utils/format";
import { getMonthOptionsFromDates, isSameMonth, parseDate } from "../utils/date";

const statusMap = {
  open: { label: "Em aberto", tone: "neutral" },
  paid: { label: "Paga", tone: "success" },
  overdue: { label: "Atrasada", tone: "danger" },
};

function FluxoDeCaixa({ onOpenModal, onEditManual, orgId, dataVersion }) {
  const [tab, setTab] = useState("parcelas");
  const [installments, setInstallments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!orgId) return;
      setLoading(true);
      const { data: installmentsData } = await supabase
        .from("contract_installments")
        .select("id, due_date, amount, status, contracts(client_name)")
        .eq("org_id", orgId)
        .order("due_date", { ascending: true });
      const { data: receiptsData } = await supabase
        .from("manual_receipts")
        .select("id, description, amount, received_date")
        .eq("org_id", orgId)
        .order("received_date", { ascending: false });
      setInstallments(installmentsData ?? []);
      setReceipts(receiptsData ?? []);
      setLoading(false);
    };
    loadData();
  }, [orgId, dataVersion]);

  const normalizedInstallments = useMemo(() => {
    const today = new Date();
    return installments.map((item) => {
      if (item.status === "paid") {
        return { ...item, effectiveStatus: "paid" };
      }
      const dueDate = parseDate(item.due_date);
      if (dueDate && dueDate < today) {
        return { ...item, effectiveStatus: "overdue" };
      }
      return { ...item, effectiveStatus: item.status ?? "open" };
    });
  }, [installments]);

  const monthOptions = useMemo(() => {
    const dates = [
      ...installments.map((item) => parseDate(item.due_date)),
      ...receipts.map((item) => parseDate(item.received_date)),
    ];
    const options = getMonthOptionsFromDates(dates);
    return [{ value: "all", label: "Todos os meses" }, ...options];
  }, [installments, receipts]);

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

  const filteredInstallments = useMemo(() => {
    if (!selectedMonthDate) return normalizedInstallments;
    return normalizedInstallments.filter((item) => {
      const date = parseDate(item.due_date);
      return date && isSameMonth(date, selectedMonthDate);
    });
  }, [normalizedInstallments, selectedMonthDate]);

  const filteredReceipts = useMemo(() => {
    if (!selectedMonthDate) return receipts;
    return receipts.filter((item) => {
      const date = parseDate(item.received_date);
      return date && isSameMonth(date, selectedMonthDate);
    });
  }, [receipts, selectedMonthDate]);

  const totals = useMemo(() => {
    const predicted = filteredInstallments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const receivedInstallments = filteredInstallments
      .filter((item) => item.effectiveStatus === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const receivedReceipts = filteredReceipts.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const open = filteredInstallments
      .filter((item) => item.effectiveStatus === "open")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const overdue = filteredInstallments
      .filter((item) => item.effectiveStatus === "overdue")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      predicted,
      received: receivedInstallments + receivedReceipts,
      open,
      overdue,
      counts: {
        installments: filteredInstallments.length,
        receipts: filteredReceipts.length,
        open: filteredInstallments.filter((item) => item.effectiveStatus === "open")
          .length,
        paid: filteredInstallments.filter((item) => item.effectiveStatus === "paid")
          .length,
        overdue: filteredInstallments.filter((item) => item.effectiveStatus === "overdue")
          .length,
      },
    };
  }, [filteredInstallments, filteredReceipts]);

  const rows = useMemo(() => {
    if (tab === "manuais") {
      return filteredReceipts.map((item) => ({
        id: item.id,
        isInstallment: false,
        client: item.description,
        installment: "-",
        date: formatDate(item.received_date),
        amount: formatCurrency(item.amount),
        status: { label: "Recebido", tone: "success" },
      }));
    }

    const filtered = filteredInstallments.filter((item) => {
      if (tab === "aberto") return item.effectiveStatus === "open";
      if (tab === "pagas") return item.effectiveStatus === "paid";
      if (tab === "atrasadas") return item.effectiveStatus === "overdue";
      return true;
    });

    return filtered.map((item, index) => {
      const status = statusMap[item.effectiveStatus] ?? {
        label: item.effectiveStatus,
        tone: "neutral",
      };
      return {
        id: item.id,
        isInstallment: true,
        effectiveStatus: item.effectiveStatus,
        client: item.contracts?.client_name ?? "-",
        installment: `${index + 1}a`,
        date: formatDate(item.due_date),
        amount: formatCurrency(item.amount),
        status,
      };
    });
  }, [tab, filteredInstallments, filteredReceipts]);

  const isAllMonths = selectedMonth === "all";

  const handleTogglePaid = async (row) => {
    if (!row.isInstallment) return;
    setActionError("");
    const nextStatus = row.effectiveStatus === "paid" ? "open" : "paid";
    const paidAt = nextStatus === "paid" ? new Date().toISOString().slice(0, 10) : null;
    const { error } = await supabase
      .from("contract_installments")
      .update({ status: nextStatus, paid_at: paidAt })
      .eq("id", row.id);
    if (!error) {
      setInstallments((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: nextStatus, paid_at: paidAt } : item
        )
      );
    } else {
      setActionError("Não foi possível atualizar a parcela.");
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    const confirmed = window.confirm("Deseja excluir esta entrada manual?");
    if (!confirmed) return;
    setActionError("");
    const { error } = await supabase
      .from("manual_receipts")
      .delete()
      .eq("id", receiptId)
      .eq("org_id", orgId);
    if (error) {
      setActionError("Não foi possível excluir a entrada manual.");
      return;
    }
    setReceipts((prev) => prev.filter((item) => item.id !== receiptId));
  };

  return (
    <section className="page">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle={loading ? "Carregando dados..." : "Controle de entradas e recebimentos"}
      >
        <div className="actions-row">
          <button type="button" className="success-btn" onClick={onOpenModal}>
            <Icon name="plus" />
            Entrada Manual
          </button>
          <Select
            options={monthOptions}
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </div>
      </PageHeader>

      <div className="stats-grid">
        <StatCard
          title="Previsto"
          value={formatCurrency(totals.predicted)}
          caption={isAllMonths ? "Total do período" : "Total do mês"}
          icon="money"
        />
        <StatCard
          title="Recebido"
          value={formatCurrency(totals.received)}
          caption={isAllMonths ? "Total recebido" : "Já pago"}
          icon="check"
        />
        <StatCard
          title="Em Aberto"
          value={formatCurrency(totals.open)}
          caption={isAllMonths ? "Em aberto" : "Aguardando"}
          icon="clock"
        />
        <StatCard
          title="Em Atraso"
          value={formatCurrency(totals.overdue)}
          caption={`${totals.counts.overdue} parcela(s)`}
          icon="alert"
          tone="danger"
        />
      </div>

      <div className="tabs">
        {[
          { id: "parcelas", label: "Parcelas", count: totals.counts.installments },
          { id: "manuais", label: "Entradas Manuais", count: totals.counts.receipts },
          { id: "aberto", label: "Em Aberto", count: totals.counts.open },
          { id: "pagas", label: "Pagas", count: totals.counts.paid },
          { id: "atrasadas", label: "Atrasadas", count: totals.counts.overdue },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>{tab === "manuais" ? "Descrição" : "Cliente"}</th>
              <th>Parcela</th>
              <th>{tab === "manuais" ? "Recebimento" : "Vencimento"}</th>
              <th>Valor</th>
              <th>Status</th>
              <th className="align-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={6}>
                  <div className="empty-state">
                    <Icon name="receipt" />
                    <div>Nenhum registro encontrado</div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.client}</td>
                  <td>{row.installment}</td>
                  <td>{row.date}</td>
                  <td>{row.amount}</td>
                  <td>
                    <span className={`pill ${row.status.tone}`}>{row.status.label}</span>
                  </td>
                  <td className="align-right">
                    <div className="table-actions">
                      {row.isInstallment ? (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleTogglePaid(row)}
                        >
                          <Icon name="check" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => onEditManual?.(row.id)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDeleteReceipt(row.id)}
                          >
                            <Icon name="trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default FluxoDeCaixa;
