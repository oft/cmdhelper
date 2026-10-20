import { computed, reactive, ref } from 'vue';
import { problemCatalog } from '@cmdhelper/core';
import type { Evidence, EvidenceStatus } from '@cmdhelper/core';

export const coordinates = reactive({ ...problemCatalog.presets[0]!.values });
export const evidenceBySolution = reactive<Record<string, Evidence>>({});
export const resources = reactive<Record<string, string>>({});
export const resourceMode = ref('tool');
export const selectedRoute = ref('');
export const frequency = ref('once');
export const outcome = ref<EvidenceStatus>('unknown');
export const textMode = computed(() => resourceMode.value === 'text');
export const toolAllowed = computed(() => selectedRoute.value === 'tool');
export function clearEvidence() {
  for (const key of Object.keys(evidenceBySolution))
    delete evidenceBySolution[key];
}
export function changeCoordinate(id: string, value: string) {
  coordinates[id] = value;
  clearEvidence();
}
export function applyPreset(index: number) {
  const preset = problemCatalog.presets[index];
  if (!preset) return;
  Object.assign(coordinates, preset.values);
  clearEvidence();
}
export function changeResource(id: string, value: string) {
  if (id === 'frequency') frequency.value = value;
  else resources[id] = value;
  resetRoute();
}
export function resetRoute() {
  selectedRoute.value = '';
  outcome.value = 'unknown';
  clearEvidence();
}
export function chooseRoute(id: string) {
  selectedRoute.value = id;
  outcome.value = 'unknown';
  clearEvidence();
}
export function coordinateLabel(id: string, value: string | undefined) {
  return (
    problemCatalog.dimensions
      .find((dimension) => dimension.id === id)
      ?.options.find((option) => option.id === value)?.label ?? value
  );
}
