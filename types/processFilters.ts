import type { ProcessStatus } from "./process";

export interface ProcessFilters {
  statuses?: ProcessStatus[];
  dataInicio?: string; // yyyy-MM-dd, compara com opportunity.opening_date
  dataFim?: string; // yyyy-MM-dd
  valorMin?: number;
  valorMax?: number;
}
