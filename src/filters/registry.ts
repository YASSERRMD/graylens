import type { Filter } from "./types";
import { grayscaleFilter } from "./grayscale";
import { invertFilter } from "./invert";
import { sepiaFilter } from "./sepia";
import { thresholdFilter } from "./threshold";
import { brightnessContrastFilter } from "./brightness-contrast";
import { boxBlurFilter } from "./box-blur";
import { sobelFilter } from "./sobel";

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
registerFilter(invertFilter);
registerFilter(sepiaFilter);
registerFilter(thresholdFilter);
registerFilter(brightnessContrastFilter);
registerFilter(boxBlurFilter);
registerFilter(sobelFilter);
