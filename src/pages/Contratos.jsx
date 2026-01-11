import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, formatDate } from "../utils/format";

const statusMap = {
  active: { label: "Ativo", tone: "success" },
  paused: { label: "Pausado", tone: "warning" },
  closed: { label: "Encerrado", tone: "neutral" },
};

function Contratos({ onOpenModal, onEdit, orgId, dataVersion }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const loadContracts = async () => {
      if (!orgId) return;
      setLoading(true);
      const { data } = await supabase
        .from("contracts")
        .select(
          "id, client_name, total_value, start_date, status, honorarium_types(name), law_areas(name), law_subareas(name)"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      setContracts(data ?? []);
      setLoading(false);
    };
    loadContracts();
  }, [orgId, dataVersion]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contracts;
    return contracts.filter((contract) =>
      contract.client_name.toLowerCase().includes(term)
    );
  }, [contracts, search]);

  const subtitle = loading
    ? "Carregando contratos..."
    : `${filtered.length} contratos cadastrados`;

  const handleDelete = async (contractId) => {
    const confirmed = window.confirm(
      "Deseja excluir este contrato? As parcelas vinculadas serão removidas."
    );
    if (!confirmed) return;
    setActionError("");
    const { error: installmentsError } = await supabase
      .from("contract_installments")
      .delete()
      .eq("contract_id", contractId)
      .eq("org_id", orgId);
    if (installmentsError) {
      setActionError("Não foi possível excluir as parcelas do contrato.");
      return;
    }
    const { error: deleteError } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contractId)
      .eq("org_id", orgId);
    if (deleteError) {
      setActionError("Não foi possível excluir o contrato.");
      return;
    }
    setContracts((prev) => prev.filter((item) => item.id !== contractId));
  };

  return (
    <section className="page">
      <PageHeader title="Contratos" subtitle={subtitle}>
        <div className="actions-row">
          <button type="button" className="primary-btn" onClick={onOpenModal}>
            <Icon name="plus" />
            Novo Contrato
          </button>
        </div>
      </PageHeader>

      <div className="filter-bar">
        <div className="search">
          <Icon name="search" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Área / Subárea</th>
              <th>Valor</th>
              <th>Início</th>
              <th>Status</th>
              <th className="align-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7}>
                  <div className="empty-state">
                    <Icon name="doc" />
                    <div>Nenhum contrato encontrado</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((contract) => {
                const status = statusMap[contract.status] ?? {
                  label: contract.status,
                  tone: "neutral",
                };
                const areaLabel = contract.law_areas?.name ?? "-";
                const subareaLabel = contract.law_subareas?.name;
                const areaText = subareaLabel
                  ? `${areaLabel} / ${subareaLabel}`
                  : areaLabel;
                return (
                  <tr key={contract.id}>
                    <td>{contract.client_name}</td>
                    <td>{contract.honorarium_types?.name ?? "-"}</td>
                    <td>{areaText}</td>
                    <td>{formatCurrency(contract.total_value)}</td>
                    <td>{formatDate(contract.start_date)}</td>
                    <td>
                      <span className={`pill ${status.tone}`}>{status.label}</span>
                    </td>
                    <td className="align-right">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onEdit?.(contract.id)}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => handleDelete(contract.id)}
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

export default Contratos;
