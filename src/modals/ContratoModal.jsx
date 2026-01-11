import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, parseCurrency } from "../utils/format";
import { addMonths, parseDate, toIsoDate } from "../utils/date";

const initialForm = {
  clientName: "",
  honorariumTypeId: "",
  areaId: "",
  subareaId: "",
  originId: "",
  paymentMethodId: "",
  totalValue: "",
  startDate: "",
  firstDueDate: "",
  installmentsCount: "1",
  status: "active",
  internalResponsible: "",
  notes: "",
};

function ContratoModal({ onClose, orgId, onCreated, mode = "create", contractId }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState({
    honorarium: [],
    areas: [],
    subareas: [],
    origins: [],
    payments: [],
  });

  useEffect(() => {
    const loadOptions = async () => {
      if (!orgId) return;
      const [honorariumRes, areasRes, subareasRes, originsRes, paymentsRes] =
        await Promise.all([
          supabase.from("honorarium_types").select("id, name").eq("org_id", orgId),
          supabase.from("law_areas").select("id, name").eq("org_id", orgId),
          supabase
            .from("law_subareas")
            .select("id, name, area_id")
            .eq("org_id", orgId),
          supabase.from("client_origins").select("id, name").eq("org_id", orgId),
          supabase.from("payment_methods").select("id, name").eq("org_id", orgId),
        ]);
      setOptions({
        honorarium: honorariumRes.data ?? [],
        areas: areasRes.data ?? [],
        subareas: subareasRes.data ?? [],
        origins: originsRes.data ?? [],
        payments: paymentsRes.data ?? [],
      });
    };
    loadOptions();
  }, [orgId]);

  useEffect(() => {
    if (!isEdit) {
      setForm(initialForm);
      return;
    }
    if (!contractId || !orgId) return;
    const loadContract = async () => {
      const { data } = await supabase
        .from("contracts")
        .select(
          "id, client_name, honorarium_type_id, area_id, subarea_id, origin_id, payment_method_id, total_value, start_date, status, internal_responsible, notes"
        )
        .eq("id", contractId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!data) return;
      const formattedTotal = data.total_value
        ? formatCurrency(data.total_value).replace("R$", "").trim()
        : "";
      setForm({
        clientName: data.client_name ?? "",
        honorariumTypeId: data.honorarium_type_id ?? "",
        areaId: data.area_id ?? "",
        subareaId: data.subarea_id ?? "",
        originId: data.origin_id ?? "",
        paymentMethodId: data.payment_method_id ?? "",
        totalValue: formattedTotal,
        startDate: data.start_date ?? "",
        firstDueDate: data.start_date ?? "",
        installmentsCount: "1",
        status: data.status ?? "active",
        internalResponsible: data.internal_responsible ?? "",
        notes: data.notes ?? "",
      });
    };
    loadContract();
  }, [isEdit, contractId, orgId]);

  const availableSubareas = useMemo(
    () => options.subareas.filter((item) => item.area_id === form.areaId),
    [options.subareas, form.areaId]
  );

  useEffect(() => {
    if (!form.subareaId) return;
    const exists = availableSubareas.some((item) => item.id === form.subareaId);
    if (!exists) {
      setForm((prev) => ({ ...prev, subareaId: "" }));
    }
  }, [availableSubareas, form.subareaId]);

  useEffect(() => {
    if (form.startDate && !form.firstDueDate) {
      setForm((prev) => ({ ...prev, firstDueDate: prev.startDate }));
    }
  }, [form.startDate, form.firstDueDate]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    if (field === "areaId") {
      setForm((prev) => ({ ...prev, areaId: value, subareaId: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.clientName || !form.honorariumTypeId || !form.areaId || !form.paymentMethodId) {
      setError("Preencha os campos obrigatórios.");
      return;
    }

    if (!form.totalValue || !form.startDate) {
      setError("Informe valor total e data de início.");
      return;
    }

    const totalValue = parseCurrency(form.totalValue);
    if (totalValue <= 0) {
      setError("Informe um valor total válido.");
      return;
    }

    if (isEdit) {
      if (!contractId) {
        setError("Contrato não encontrado.");
        return;
      }
      setLoading(true);
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          client_name: form.clientName,
          honorarium_type_id: form.honorariumTypeId,
          area_id: form.areaId,
          subarea_id: form.subareaId || null,
          origin_id: form.originId || null,
          payment_method_id: form.paymentMethodId,
          total_value: totalValue,
          start_date: form.startDate,
          status: form.status,
          internal_responsible: form.internalResponsible || null,
          notes: form.notes || null,
        })
        .eq("id", contractId)
        .eq("org_id", orgId);

      if (updateError) {
        setError("Não foi possível atualizar o contrato.");
        setLoading(false);
        return;
      }

      onCreated?.();
      onClose();
      setLoading(false);
      return;
    }

    const installmentsCount = Math.max(1, Number(form.installmentsCount || 1));
    if (!Number.isFinite(installmentsCount) || installmentsCount < 1) {
      setError("Quantidade de parcelas inválida.");
      return;
    }

    setLoading(true);
    const { data: contract, error: insertError } = await supabase
      .from("contracts")
      .insert({
        org_id: orgId,
        client_name: form.clientName,
        honorarium_type_id: form.honorariumTypeId,
        area_id: form.areaId,
        subarea_id: form.subareaId || null,
        origin_id: form.originId || null,
        payment_method_id: form.paymentMethodId,
        total_value: totalValue,
        start_date: form.startDate,
        status: form.status,
        internal_responsible: form.internalResponsible || null,
        notes: form.notes || null,
      })
      .select("id")
      .single();

    if (insertError || !contract?.id) {
      setError("Não foi possível salvar o contrato.");
      setLoading(false);
      return;
    }

    const baseDate = parseDate(form.firstDueDate || form.startDate);
    const totalCents = Math.round(totalValue * 100);
    const baseCents = Math.floor(totalCents / installmentsCount);
    const remainder = totalCents - baseCents * installmentsCount;

    const installmentsPayload = Array.from({ length: installmentsCount }, (_, index) => {
      const amountCents = baseCents + (index < remainder ? 1 : 0);
      const amount = amountCents / 100;
      const dueDate = toIsoDate(addMonths(baseDate, index));
      return {
        org_id: orgId,
        contract_id: contract.id,
        due_date: dueDate,
        amount,
        status: "open",
      };
    });

    const { error: installmentsError } = await supabase
      .from("contract_installments")
      .insert(installmentsPayload);

    if (installmentsError) {
      setError("Contrato salvo, mas não foi possível gerar as parcelas.");
      setLoading(false);
      return;
    }

    setForm(initialForm);
    onCreated?.();
    onClose();
    setLoading(false);
  };

  return (
    <Modal
      title={isEdit ? "Editar Contrato" : "Novo Contrato"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-btn" form="contrato-form" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </>
      }
    >
      <form id="contrato-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="field span-2">
          <span>Nome do Cliente *</span>
          <input
            type="text"
            placeholder="Nome completo do cliente"
            value={form.clientName}
            onChange={handleChange("clientName")}
            required
          />
        </label>
        <label className="field">
          <span>Tipo de Honorário *</span>
          <select
            value={form.honorariumTypeId}
            onChange={handleChange("honorariumTypeId")}
            required
          >
            <option value="">Selecione</option>
            {options.honorarium.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Área do Direito *</span>
          <select value={form.areaId} onChange={handleChange("areaId")} required>
            <option value="">Selecione a área</option>
            {options.areas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Subárea</span>
          <select value={form.subareaId} onChange={handleChange("subareaId")} disabled={!form.areaId}>
            <option value="">
              {form.areaId ? "Selecione a subárea" : "Selecione a área primeiro"}
            </option>
            {availableSubareas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Origem do Cliente</span>
          <select value={form.originId} onChange={handleChange("originId")}>
            <option value="">Selecione</option>
            {options.origins.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Forma de Pagamento *</span>
          <select
            value={form.paymentMethodId}
            onChange={handleChange("paymentMethodId")}
            required
          >
            <option value="">Selecione</option>
            {options.payments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Valor Total (R$) *</span>
          <input
            type="text"
            placeholder="0,00"
            value={form.totalValue}
            onChange={handleChange("totalValue")}
            disabled={isEdit}
            required
          />
        </label>
        {!isEdit && (
          <label className="field">
            <span>Parcelas *</span>
            <input
              type="number"
              min="1"
              value={form.installmentsCount}
              onChange={handleChange("installmentsCount")}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Data de Início *</span>
          <input
            type="date"
            value={form.startDate}
            onChange={handleChange("startDate")}
            disabled={isEdit}
            required
          />
        </label>
        {!isEdit && (
          <label className="field">
            <span>1º Vencimento *</span>
            <input
              type="date"
              value={form.firstDueDate}
              onChange={handleChange("firstDueDate")}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={handleChange("status")}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="closed">Encerrado</option>
          </select>
        </label>
        <label className="field">
          <span>Responsável Interno</span>
          <input
            type="text"
            placeholder="Nome do advogado responsável"
            value={form.internalResponsible}
            onChange={handleChange("internalResponsible")}
          />
        </label>
        <label className="field span-2">
          <span>Observações</span>
          <textarea
            rows="3"
            placeholder="Anotações sobre o contrato"
            value={form.notes}
            onChange={handleChange("notes")}
          />
        </label>
        {error && <div className="form-error span-2">{error}</div>}
      </form>
    </Modal>
  );
}

export default ContratoModal;
