import type { ProcessStatus } from "../types/process";

type StatusMeta = {
  label: string;
  /** Classe de fundo do badge. */
  badgeClass: string;
  /** Classe de texto do badge. */
  textClass: string;
};

/** Rótulos PT-BR e cores de cada status do processo. */
export const STATUS_META: Record<ProcessStatus, StatusMeta> = {
  SAVED: { label: "Salvo", badgeClass: "bg-slate-100", textClass: "text-slate-600" },
  ANALYZING: { label: "Analisando", badgeClass: "bg-blue-50", textClass: "text-blue-700" },
  DOCS_PENDING: {
    label: "Documentos pendentes",
    badgeClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  READY_TO_BID: {
    label: "Pronto para enviar",
    badgeClass: "bg-violet-50",
    textClass: "text-violet-700",
  },
  SUBMITTED: {
    label: "Proposta enviada",
    badgeClass: "bg-cyan-50",
    textClass: "text-cyan-700",
  },
  WON: { label: "Ganha", badgeClass: "bg-green-50", textClass: "text-green-700" },
  LOST: { label: "Perdida", badgeClass: "bg-rose-50", textClass: "text-rose-700" },
  ERROR: { label: "Erro na análise", badgeClass: "bg-red-50", textClass: "text-red-700" },
};
