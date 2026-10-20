import { computed, reactive, ref } from 'vue';
import { commands, getCommand, getScenarioFields } from '@cmdhelper/core';
import type { Shell, Values } from '@cmdhelper/core';

// 页面切换后保留输入；刷新页面即清除，不持久化用户命令。
export const selectedCommandId = ref('scp');
export const searchQuery = ref('');
export const activeFieldId = ref('source');
export const shell = ref<Shell>('powershell');
export const valuesByCommand = reactive<Record<string, Values>>(
  Object.fromEntries(commands.map((command) => [command.id, {}])),
);
export const scenarioIds = reactive<Record<string, string>>(
  Object.fromEntries(
    commands.map((command) => [command.id, command.scenarios[0]!.id]),
  ),
);
export const selectedCommand = computed(() => {
  const command = getCommand(selectedCommandId.value);
  if (!command) throw new Error('未知命令');
  return command;
});
export const selectedScenario = computed(() =>
  selectedCommand.value.scenarios.find(
    (scenario) => scenario.id === scenarioIds[selectedCommandId.value],
  ),
);
export const fields = computed(() =>
  getScenarioFields(selectedCommand.value, selectedScenario.value),
);
export const values = computed(() => valuesByCommand[selectedCommandId.value]!);
export function selectCommand(commandId: string, scenarioId?: string) {
  const command = getCommand(commandId);
  if (!command) throw new Error('未知命令');
  selectedCommandId.value = commandId;
  if (scenarioId !== undefined) scenarioIds[commandId] = scenarioId;
  activeFieldId.value = fields.value[0]!.id;
}
export function resetValues() {
  valuesByCommand[selectedCommandId.value] = {};
}
