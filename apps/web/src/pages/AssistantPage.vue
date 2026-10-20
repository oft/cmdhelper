<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  commands,
  describeResult,
  generate,
  generateScenario,
  search,
} from '@cmdhelper/core';
import {
  selectedCommandId,
  searchQuery,
  activeFieldId,
  shell,
  scenarioIds,
  selectedCommand,
  selectedScenario,
  fields,
  values,
  selectCommand,
  resetValues,
} from '../state/assistant.js';
import FieldInput from '../components/FieldInput.vue';
import ParameterReference from '../components/ParameterReference.vue';
import ResultPanel from '../components/ResultPanel.vue';
const searchInput = ref<HTMLInputElement>();
const form = ref<HTMLFormElement>();
const status = ref('检查目标与路径后再执行');
const matches = computed(() => search(searchQuery.value));
const referenceField = computed(
  () =>
    fields.value.find((field) => field.id === activeFieldId.value) ??
    fields.value[0]!,
);
const preview = computed(() => {
  try {
    const command = selectedCommandId.value;
    const scenario = scenarioIds[command];
    return {
      valid: true,
      text: scenario
        ? generateScenario(command, scenario, values.value, shell.value)
        : generate(command, values.value, shell.value),
    };
  } catch (error) {
    return {
      valid: false,
      text: error instanceof Error ? error.message : String(error),
    };
  }
});
const result = computed(() =>
  describeResult(
    selectedCommandId.value,
    scenarioIds[selectedCommandId.value] ?? '',
    values.value,
    shell.value,
  ),
);
watch(preview, () => {
  status.value = '检查目标与路径后再执行';
});
async function changeScenario(event: Event) {
  scenarioIds[selectedCommandId.value] = (
    event.target as HTMLSelectElement
  ).value;
  resetValues();
  activeFieldId.value = fields.value[0]!.id;
  await nextTick();
  form.value?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();
}
async function copyCommand() {
  if (!preview.value.valid) return;
  try {
    await navigator.clipboard.writeText(preview.value.text);
    status.value = '已复制';
  } catch {
    status.value = '复制失败，请手动选择命令复制';
  }
}
function focusSearch(event: KeyboardEvent) {
  if (
    event.key === '/' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(
      document.activeElement?.tagName ?? '',
    )
  ) {
    event.preventDefault();
    searchInput.value?.focus();
  }
}
onMounted(() => window.addEventListener('keydown', focusSearch));
onUnmounted(() => window.removeEventListener('keydown', focusSearch));
</script>
<template>
  <div class="toolbar">
    <div>
      <h1>命令助手</h1>
      <span class="muted">选命令 → 填参数 → 复制使用</span>
    </div>
    <label class="search"
      >⌕
      <input
        id="search"
        ref="searchInput"
        v-model="searchQuery"
        aria-label="模糊搜索命令、参数与说明"
        placeholder="搜索命令、参数、说明…"
      /><kbd>/</kbd></label
    >
  </div>
  <div class="workspace">
    <aside class="commands">
      <div class="panel-title">
        命令库 <span>{{ commands.length }}</span>
      </div>
      <div id="results">
        <button
          v-for="match in matches"
          :key="match.command.id"
          class="command"
          :class="{ selected: selectedCommandId === match.command.id }"
          :data-command="match.command.id"
          @click="selectCommand(match.command.id)"
        >
          <strong>{{ match.command.id }}<span>↗</span></strong
          ><span>{{ match.command.title }}</span
          ><small v-if="searchQuery">{{
            match.matches.length
              ? match.matches
                  .map((field) => field.flag ?? field.label)
                  .join(' · ')
              : '命令说明匹配'
          }}</small>
        </button>
        <p v-if="!matches.length" class="empty">没有匹配的命令</p>
      </div>
      <div class="side-tip">
        搜索支持模糊匹配<br />试试「端口」「私钥」「递归」
      </div>
    </aside>
    <section class="editor">
      <div class="editor-head">
        <div>
          <h2>
            {{ selectedCommand.id }} <span>{{ selectedCommand.title }}</span>
          </h2>
          <p>{{ selectedCommand.description }}</p>
        </div>
        <button id="reset" class="quiet" @click="resetValues">重置</button>
      </div>
      <section class="scenarios">
        <label for="scenario">你想做什么？</label
        ><select
          id="scenario"
          :value="scenarioIds[selectedCommandId]"
          @change="changeScenario"
        >
          <option
            v-for="(scenario, index) in selectedCommand.scenarios"
            :key="scenario.id"
            :value="scenario.id"
          >
            {{ index + 1 }}. {{ scenario.title }}
          </option>
          <option v-if="!selectedCommand.scenarioOnly" value="">
            自定义参数
          </option>
        </select>
        <p>
          {{ selectedScenario?.description ?? '直接填写和调整全部命令参数。' }}
        </p>
      </section>
      <div class="section-label">
        {{ selectedScenario ? '填写任务信息' : '参数配置' }}
        <span>* 为必填</span>
      </div>
      <form id="fields" ref="form" @submit.prevent>
        <FieldInput
          v-for="field in fields"
          :key="`${selectedCommandId}/${field.id}`"
          :field="field"
          :model-value="
            selectedScenario?.defaults[field.id] ?? values[field.id]
          "
          :disabled="
            Boolean(
              selectedScenario &&
              Object.hasOwn(selectedScenario.defaults, field.id),
            )
          "
          @update:model-value="values[field.id] = $event"
          @focus="activeFieldId = field.id"
        />
      </form>
      <section class="output">
        <div class="output-head">
          <strong>生成的命令</strong
          ><select id="shell" v-model="shell" aria-label="目标 Shell">
            <option value="powershell">PowerShell</option>
            <option value="posix">POSIX / Bash</option>
          </select>
        </div>
        <pre id="preview" aria-live="polite">{{ preview.text }}</pre>
        <div class="output-bottom">
          <small id="status">{{ status }}</small
          ><button id="copy" :disabled="!preview.valid" @click="copyCommand">
            复制命令
          </button>
        </div>
      </section>
      <ResultPanel :result="result" :ready="preview.valid" />
    </section>
    <ParameterReference :command="selectedCommand" :field="referenceField" />
  </div>
</template>
