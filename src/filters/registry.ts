import type { Filter } from "./types";
import { grayscaleFilter } from "./grayscale";

const filtersById = new Map<string, Filter>();

function registerFilter(filter: Filter): void {
  filtersById.set(filter.id, filter);
}

export function getFilter(id: string): Filter | undefined {
  return filtersById.get(id);
}

export function getAllFilters(): Filter[] {
  return Array.from(filtersById.values());
}

registerFilter(grayscaleFilter);
