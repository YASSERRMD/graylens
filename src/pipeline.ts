import type { FilterInstance } from "./filters/types";

export interface PipelineState {
  instances: FilterInstance[];
}

export function createPipelineState(): PipelineState {
  return { instances: [] };
}

export function addFilter(
  state: PipelineState,
  instance: FilterInstance
): void {
  state.instances.push(instance);
}

export function removeFilter(
  state: PipelineState,
  index: number
): void {
  state.instances.splice(index, 1);
}

export function moveFilter(
  state: PipelineState,
  fromIndex: number,
  toIndex: number
): void {
  if (
    fromIndex < 0 ||
    fromIndex >= state.instances.length ||
    toIndex < 0 ||
    toIndex >= state.instances.length
  ) {
    return;
  }
  const [item] = state.instances.splice(fromIndex, 1);
  state.instances.splice(toIndex, 0, item);
}

export function clearPipeline(state: PipelineState): void {
  state.instances = [];
}
