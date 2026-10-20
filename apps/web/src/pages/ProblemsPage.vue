<script setup lang="ts">
import { computed } from 'vue';
import {
  problemCatalog,
  matchProblems,
  evaluateReadiness,
  updateReadinessEvidence,
} from '@cmdhelper/core';
import type { EvidenceStatus } from '@cmdhelper/core';
import {
  coordinates,
  evidenceBySolution,
  textMode,
  toolAllowed,
  changeCoordinate,
  applyPreset,
} from '../state/problems.js';
import ResourcePanel from '../components/ResourcePanel.vue';
import DimensionSlider from '../components/DimensionSlider.vue';
import SolutionCard from '../components/SolutionCard.vue';
import ProblemMap from '../components/ProblemMap.vue';
const emit = defineEmits<{
  assistant: [entry: { command: string; scenario: string }];
}>();
const activeCoordinates = computed(() =>
  textMode.value
    ? { ...problemCatalog.presets[0]!.values, time: 'once' }
    : coordinates,
);
const matches = computed(() =>
  matchProblems(activeCoordinates.value).map((solution) => ({
    ...solution,
    checks: evaluateReadiness(
      solution.id,
      evidenceBySolution[solution.id],
      activeCoordinates.value,
    ),
  })),
);
function irrelevant(id: string) {
  if (id === 'connection') return coordinates.space === 'local';
  if (id === 'quality')
    return coordinates.object !== 'video' || coordinates.goal !== 'convert';
  return false;
}
const counts = computed(() =>
  Object.fromEntries(
    problemCatalog.dimensions.map((dimension) => [
      dimension.id,
      dimension.options.map((option) =>
        irrelevant(dimension.id)
          ? null
          : matchProblems({ ...coordinates, [dimension.id]: option.id }).length,
      ),
    ]),
  ),
);
function updateEvidence(
  solutionId: string,
  checkId: string,
  status: EvidenceStatus,
) {
  evidenceBySolution[solutionId] = updateReadinessEvidence(
    solutionId,
    evidenceBySolution[solutionId] ?? {},
    checkId,
    status,
  );
}
function openAssistant(solutionId: string) {
  const solution = matches.value.find((item) => item.id === solutionId);
  if (!toolAllowed.value || !solution?.checks.ready || !solution.assistant)
    return;
  const entry = { ...solution.assistant };
  if (entry.command === 'scp' && activeCoordinates.value.object === 'directory')
    entry.scenario = 'upload-directory';
  emit('assistant', entry);
}
</script>
<template>
  <div class="problem-intro">
    <h1>问题导航 <span class="prototype">初步探索</span></h1>
    <p>先描述对象与变化，再找适合的工具。</p>
  </div>
  <div id="resource-root"><ResourcePanel /></div>
  <div v-show="!textMode" class="problem-presets">
    <span>试一个问题</span
    ><button
      v-for="(preset, index) in problemCatalog.presets"
      :key="index"
      :data-preset="index"
      @click="applyPreset(index)"
    >
      {{ preset.title }}
    </button>
  </div>
  <div class="problem-layout" :class="{ 'text-problem': textMode }">
    <aside v-show="!textMode" class="problem-coordinates">
      <div class="panel-title">01 / 给问题定位</div>
      <form id="coordinates" @submit.prevent>
        <DimensionSlider
          v-for="dimension in problemCatalog.dimensions"
          :key="dimension.id"
          :dimension="dimension"
          :model-value="coordinates[dimension.id] ?? ''"
          :counts="counts[dimension.id] ?? []"
          count-label="候选"
          :disabled="irrelevant(dimension.id)"
          @update:model-value="changeCoordinate(dimension.id, $event)"
        />
      </form>
      <p class="coordinate-note">
        设备和文件是对象；位置、频率、表示方式描述变化。连接和质量要求约束可行方案。
      </p>
    </aside>
    <section v-show="!textMode || toolAllowed" class="problem-main">
      <ProblemMap
        v-show="!textMode"
        :coordinates="coordinates"
        :total="matches.length"
        :matched="
          matches.filter((solution) => solution.status === 'matched').length
        "
        :ready="matches.filter((solution) => solution.checks.ready).length"
      />
      <div id="problem-solutions">
        <h2 class="candidate-title">
          02 / 候选方案 <span>{{ matches.length }} 个 · 按适用规则匹配</span>
        </h2>
        <div v-if="!matches.length" class="no-solution">
          <h3>当前坐标尚无收录方案</h3>
          <p>
            请检查对象与目标是否对应，例如“视频文件 → 同一台设备 → 改变格式 /
            编码”。目前无法联网的跨设备传输、定时编排等问题还需补充方案。
          </p>
        </div>
        <SolutionCard
          v-for="solution in matches"
          :key="solution.id"
          :solution="solution"
          :tool-allowed="toolAllowed"
          @change="(id, status) => updateEvidence(solution.id, id, status)"
          @assistant="openAssistant(solution.id)"
        />
      </div>
    </section>
  </div>
  <details class="problem-model">
    <summary>这个导航如何组织问题？</summary>
    <p>
      对象 → 当前状态 → 目标状态 → 约束 →
      候选方案。一个工具可以覆盖多个问题，一个问题也可能需要多个工具。
    </p>
    <ul>
      <li>空间：对象位于哪台设备，是否需要跨设备移动数据。</li>
      <li>时间：单次处理，还是反复发生；将来可增加历史版本、定时和延迟。</li>
      <li>表示：内容不变但换容器，还是改变编码、分辨率等属性。</li>
      <li>约束：连接、权限、平台、质量、成本和可用工具。</li>
    </ul>
    <p>
      当前仅覆盖少量常用任务规则。未匹配表示资料尚未覆盖，不能推断现实中无解；也不会把候选方案当作全局最优。
    </p>
  </details>
</template>
