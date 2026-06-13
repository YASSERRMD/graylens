export type FilterKind = "fragment" | "compute";

export interface UniformParam {
  name: string;
  type: "f32";
  default: number;
  min: number;
  max: number;
}

export interface Filter {
  id: string;
  displayName: string;
  kind: FilterKind;
  wgslSource: string;
  uniformParams: UniformParam[];
}

export interface FilterInstance {
  filter: Filter;
  uniformValues: Record<string, number>;
}

export function createFilterInstance(
  filter: Filter,
  overrides?: Record<string, number>
): FilterInstance {
  const uniformValues: Record<string, number> = {};
  for (const param of filter.uniformParams) {
    uniformValues[param.name] = overrides?.[param.name] ?? param.default;
  }
  return { filter, uniformValues };
}
