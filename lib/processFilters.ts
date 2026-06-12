import type { UserProcessWithOpportunity } from "../types/process";
import type { ProcessFilters } from "../types/processFilters";

export function applyProcessFilters(
  processes: UserProcessWithOpportunity[],
  filters: ProcessFilters,
): UserProcessWithOpportunity[] {
  return processes.filter((process) => {
    if (filters.statuses && !filters.statuses.includes(process.status)) {
      return false;
    }

    const value = process.opportunity?.estimated_value;
    if (filters.valorMin != null && (value == null || value < filters.valorMin)) {
      return false;
    }
    if (filters.valorMax != null && (value == null || value > filters.valorMax)) {
      return false;
    }

    const openingDate = process.opportunity?.opening_date;
    if (filters.dataInicio && (!openingDate || openingDate < filters.dataInicio)) {
      return false;
    }
    if (filters.dataFim && (!openingDate || openingDate > `${filters.dataFim}T23:59:59`)) {
      return false;
    }

    return true;
  });
}

export function countActiveFilters(filters: ProcessFilters): number {
  return [
    filters.statuses?.length ? filters.statuses : undefined,
    filters.valorMin,
    filters.valorMax,
    filters.dataInicio,
    filters.dataFim,
  ].filter((value) => value != null).length;
}
