import type { ProcessStatus } from "../types/process";

/** Colunas do Kanban, na ordem de exibição. */
export const KANBAN_COLUMNS: ProcessStatus[] = [
  "SAVED",
  "ANALYZING",
  "DOCS_PENDING",
  "READY_TO_BID",
  "SUBMITTED",
  "WON",
  "LOST",
];

export const STATUS_LABELS: Record<ProcessStatus, string> = {
  SAVED: "Salvo",
  ANALYZING: "Analisando",
  DOCS_PENDING: "Docs. Pendentes",
  READY_TO_BID: "Pronto p/ Enviar",
  SUBMITTED: "Enviado",
  WON: "Ganhou",
  LOST: "Perdeu",
  ERROR: "Erro",
};

export const STATUS_BADGE_CLASSES: Record<ProcessStatus, string> = {
  SAVED: "bg-gray-100 text-gray-700",
  ANALYZING: "bg-blue-100 text-blue-700",
  DOCS_PENDING: "bg-amber-100 text-amber-700",
  READY_TO_BID: "bg-indigo-100 text-indigo-700",
  SUBMITTED: "bg-purple-100 text-purple-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  ERROR: "bg-red-100 text-red-700",
};

/** Status que exigem confirmação antes de aplicar (mudança irreversível). */
export const STATUS_REQUIRES_CONFIRMATION: ProcessStatus[] = ["WON", "LOST"];

/** Todos os status, incluindo ERROR (fora das colunas do Kanban). */
export const ALL_STATUSES: ProcessStatus[] = [...KANBAN_COLUMNS, "ERROR"];

export const CHECKLIST_TYPE_LABELS: Record<string, string> = {
  Habilitacao: "Habilitação",
  Financeiro: "Financeiro",
  Proposta: "Proposta",
  Tecnico: "Técnico",
};

export const CHECKLIST_TYPE_BADGE_CLASSES: Record<string, string> = {
  Habilitacao: "bg-violet-100 text-violet-700",
  Financeiro: "bg-emerald-100 text-emerald-700",
  Proposta: "bg-sky-100 text-sky-700",
  Tecnico: "bg-orange-100 text-orange-700",
};
