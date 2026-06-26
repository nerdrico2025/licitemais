import { useEffect, useState } from "react";

import { fetchOpportunityDetail } from "../services/pncp";
import type { BiddingOpportunity } from "../types/opportunity";

/**
 * Status do enriquecimento efêmero do detalhe:
 * - idle    : não há o que enriquecer (valor já veio, ou sem numeroControlePNCP);
 * - loading : consultando o detalhe;
 * - done    : detalhe respondeu (estimatedValue pode ser número OU null se o
 *             próprio detalhe não informa o valor);
 * - error   : timeout/erro de rede/HTTP — não conseguimos consultar.
 */
type EnrichStatus = "idle" | "loading" | "done" | "error";

type EnrichState = {
  status: EnrichStatus;
  estimatedValue: number | null;
  proposalDeadline: string | null;
};

const IDLE: EnrichState = {
  status: "idle",
  estimatedValue: null,
  proposalDeadline: null,
};

/**
 * Enriquecimento sob demanda do valor/prazo na tela de DETALHES.
 *
 * Dispara apenas quando o valor NÃO veio na listagem (ex.: resultados de
 * /api/search, que não trazem valor) E temos o `pncp_control_number`. O
 * resultado vive só nesta tela/sessão: NÃO persiste no banco e NÃO invalida o
 * cache da lista (enriquecimento efêmero). Falha é silenciosa (sem toast).
 *
 * NUNCA usar na lista — seria 1 fetch por card visível e quebraria o 3G.
 */
export function useOpportunityDetail(
  opportunity: BiddingOpportunity | undefined,
): EnrichState {
  const controlNumber = opportunity?.pncp_control_number ?? null;
  const needsEnrich =
    !!opportunity && opportunity.estimated_value == null && !!controlNumber;

  const [state, setState] = useState<EnrichState>(IDLE);

  useEffect(() => {
    if (!needsEnrich || !controlNumber) {
      setState(IDLE);
      return;
    }

    let active = true;
    setState({ status: "loading", estimatedValue: null, proposalDeadline: null });

    fetchOpportunityDetail(controlNumber)
      .then((res) => {
        if (!active) return;
        setState({
          status: "done",
          estimatedValue: res.estimatedValue,
          proposalDeadline: res.proposalDeadline,
        });
      })
      .catch(() => {
        if (!active) return;
        // Erro silencioso: a UI mostra "A consultar".
        setState({ status: "error", estimatedValue: null, proposalDeadline: null });
      });

    return () => {
      active = false;
    };
  }, [needsEnrich, controlNumber]);

  return state;
}
