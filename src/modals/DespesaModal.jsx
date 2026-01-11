import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { supabase } from "../lib/supabaseClient";
import { formatCurrency, parseCurrency } from "../utils/format";
import { addMonths, parseDate, toIsoDate } from "../utils/date";

const initialForm = {
  expenseType: "one_time",
  description: "",
  categoryId: "",
  costType: "",
  amount: "",
  dueDate: "",
  paid: false,
  notes: "",
  recurrenceCount: "12",
};

function DespesaModal({ onClose, orgId, onCreated, mode = "create", expenseId }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!orgId) return;
      const { data } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("org_id", orgId);
      setCategories(data ?? []);
    };
    loadCategories();
  }, [orgId]);

  useEffect(() => {
    if (!isEdit) {
      setForm(initialForm);
      return;
    }
    if (!expenseId || !orgId) return;
    const loadExpense = async () => {
      const { data } = await supabase
        .from("expenses")
        .select(
          "id, description, category_id, expense_type, cost_type, amount, due_date, paid, notes"
        )
        .eq("id", expenseId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!data) return;
      const formattedAmount = data.amount
        ? formatCurrency(data.amount).replace("R$", "").trim()
        : "";
      setForm({
        expenseType: data.expense_type ?? "one_time",
        description: data.description ?? "",
        categoryId: data.category_id ?? "",
        costType: data.cost_type ?? "",
        amount: formattedAmount,
        dueDate: data.due_date ?? "",
        paid: Boolean(data.paid),
        notes: data.notes ?? "",
        recurrenceCount: "1",
      });
    };
    loadExpense();
  }, [isEdit, expenseId, orgId]);

  const handleChange = (field) => (event) => {
    const value = field === "paid" ? event.target.checked : event.target.value;
    setForm((prev) => {
      if (field === "expenseType" && value === "recurring" && !prev.recurrenceCount) {
        return { ...prev, expenseType: value, recurrenceCount: "12" };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.description || !form.categoryId || !form.amount || !form.dueDate) {
      setError("Preencha os campos obrigatórios.");
      return;
    }

    const amount = parseCurrency(form.amount);
    if (amount <= 0) {
      setError("Informe um valor válido.");
      return;
    }

    const baseDate = parseDate(form.dueDate);
    if (!baseDate) {
      setError("Informe uma data válida.");
      return;
    }

    setLoading(true);
    if (isEdit) {
      if (!expenseId) {
        setError("Despesa não encontrada.");
        setLoading(false);
        return;
      }
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          description: form.description,
          category_id: form.categoryId,
          expense_type: form.expenseType,
          cost_type: form.costType || null,
          amount,
          due_date: form.dueDate,
          paid: form.paid,
          paid_at: form.paid ? form.dueDate : null,
          notes: form.notes || null,
        })
        .eq("id", expenseId)
        .eq("org_id", orgId);

      if (updateError) {
        setError("Não foi possível atualizar a despesa.");
        setLoading(false);
        return;
      }
    } else if (form.expenseType === "recurring") {
      const recurrenceCount = Math.max(1, Number(form.recurrenceCount || 1));
      if (!Number.isFinite(recurrenceCount) || recurrenceCount < 1) {
        setError("Quantidade de meses inválida.");
        setLoading(false);
        return;
      }

      const payload = Array.from({ length: recurrenceCount }, (_, index) => {
        const dueDate = toIsoDate(addMonths(baseDate, index));
        const isFirst = index === 0;
        const paid = isFirst ? form.paid : false;
        return {
          org_id: orgId,
          description: form.description,
          category_id: form.categoryId,
          expense_type: form.expenseType,
          cost_type: form.costType || null,
          amount,
          due_date: dueDate,
          paid,
          paid_at: paid ? dueDate : null,
          notes: form.notes || null,
        };
      });

      const { error: insertError } = await supabase.from("expenses").insert(payload);
      if (insertError) {
        setError("Não foi possível salvar a despesa.");
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("expenses").insert({
        org_id: orgId,
        description: form.description,
        category_id: form.categoryId,
        expense_type: form.expenseType,
        cost_type: form.costType || null,
        amount,
        due_date: form.dueDate,
        paid: form.paid,
        paid_at: form.paid ? form.dueDate : null,
        notes: form.notes || null,
      });

      if (insertError) {
        setError("Não foi possível salvar a despesa.");
        setLoading(false);
        return;
      }
    }

    setForm(initialForm);
    onCreated?.();
    onClose();
    setLoading(false);
  };

  return (
    <Modal
      title={isEdit ? "Editar Despesa" : "Nova Despesa"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-btn" form="despesa-form" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </>
      }
    >
      <form id="despesa-form" className="form-grid" onSubmit={handleSubmit}>
        <div className="field span-2">
          <span>Tipo de Despesa *</span>
          <div className="radio-group">
            <label className="radio-card">
              <input
                type="radio"
                name="tipo-despesa"
                value="one_time"
                checked={form.expenseType === "one_time"}
                onChange={handleChange("expenseType")}
              />
              <div>
                <strong>Pontual</strong>
                <span>Despesa única, não se repete</span>
              </div>
            </label>
            <label className="radio-card">
              <input
                type="radio"
                name="tipo-despesa"
                value="recurring"
                checked={form.expenseType === "recurring"}
                onChange={handleChange("expenseType")}
              />
              <div>
                <strong>Recorrente</strong>
                <span>Despesa que se repete mensalmente</span>
              </div>
            </label>
          </div>
        </div>
        <label className="field span-2">
          <span>Descrição *</span>
          <input
            type="text"
            placeholder="Ex: Aluguel do escritório"
            value={form.description}
            onChange={handleChange("description")}
            required
          />
        </label>
        <label className="field">
          <span>Categoria *</span>
          <select value={form.categoryId} onChange={handleChange("categoryId")} required>
            <option value="">Selecione</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo</span>
          <input
            type="text"
            placeholder="Fixa, Variável..."
            value={form.costType}
            onChange={handleChange("costType")}
          />
        </label>
        <label className="field">
          <span>Valor (R$) *</span>
          <input
            type="text"
            placeholder="0,00"
            value={form.amount}
            onChange={handleChange("amount")}
            required
          />
        </label>
        <label className="field">
          <span>Data de Vencimento *</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={handleChange("dueDate")}
            required
          />
        </label>
        {!isEdit && form.expenseType === "recurring" && (
          <label className="field">
            <span>Repetir por (meses) *</span>
            <input
              type="number"
              min="1"
              value={form.recurrenceCount}
              onChange={handleChange("recurrenceCount")}
              required
            />
          </label>
        )}
        <div className="field span-2">
          <span>Despesa Paga</span>
          <div className="switch-row">
            <span>Marque se já foi paga</span>
            <label className="switch">
              <input type="checkbox" checked={form.paid} onChange={handleChange("paid")} />
              <span className="slider"></span>
            </label>
          </div>
        </div>
        <label className="field span-2">
          <span>Observações</span>
          <textarea
            rows="3"
            placeholder="Anotações sobre a despesa"
            value={form.notes}
            onChange={handleChange("notes")}
          />
        </label>
        {error && <div className="form-error span-2">{error}</div>}
      </form>
    </Modal>
  );
}

export default DespesaModal;
