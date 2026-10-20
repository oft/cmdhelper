<script setup lang="ts">
import { problemCatalog } from '@cmdhelper/core';
import type {
  matchProblems,
  evaluateReadiness,
  EvidenceStatus,
} from '@cmdhelper/core';
import { coordinateLabel } from '../state/problems.js';
import ReadinessPanel from './ReadinessPanel.vue';
defineProps<{
  solution: ReturnType<typeof matchProblems>[number] & {
    checks: ReturnType<typeof evaluateReadiness>;
  };
  toolAllowed: boolean;
}>();
const emit = defineEmits<{
  change: [id: string, status: EvidenceStatus];
  assistant: [];
}>();
</script>
<template>
  <article class="solution-card">
    <div class="solution-heading">
      <h3>{{ solution.title }}</h3>
      <span class="match-badge" :class="solution.status">{{
        solution.checks.complete
          ? '用户报告已完成'
          : solution.checks.status === 'blocked'
            ? '前置条件不满足'
            : solution.checks.ready
              ? '前置条件已人工确认'
              : '待检查条件'
      }}</span>
    </div>
    <p>{{ solution.reason }}</p>
    <div v-if="solution.missing.length" class="missing-condition">
      <strong>还缺少的条件</strong>
      <ul>
        <li v-for="missing in solution.missing" :key="missing.dimension">
          {{
            problemCatalog.dimensions.find(
              (dimension) => dimension.id === missing.dimension,
            )?.label
          }}
          当前：{{
            coordinateLabel(missing.dimension, missing.actual)
          }}；需要：{{
            missing.expected
              .map((value) => coordinateLabel(missing.dimension, value))
              .join(' / ')
          }}。
        </li>
      </ul>
      <p>条件确认前，不能据此认定方案可执行。</p>
    </div>
    <ReadinessPanel
      v-if="toolAllowed"
      :owner="solution.id"
      :checks="solution.checks"
      @change="(id, status) => emit('change', id, status)"
    />
    <div v-else class="priority-focus">
      <strong>当前优先：确认投入与路线</strong>
      <p>先在上方比较并选择路线，暂不展开工具条件检查。</p>
    </div>
    <div class="solution-states">
      <section>
        <h4>执行前</h4>
        <pre>{{ solution.before }}</pre>
      </section>
      <section>
        <h4>执行后（成功时）</h4>
        <pre>{{ solution.after }}</pre>
      </section>
    </div>
    <h4>解决步骤</h4>
    <ol>
      <li v-for="text in solution.steps" :key="text">{{ text }}</li>
    </ol>
    <h4>选择前要了解</h4>
    <ul>
      <li v-for="text in solution.tradeoffs" :key="text">{{ text }}</li>
    </ul>
    <div class="solution-actions">
      <button
        v-if="solution.assistant"
        :data-solution="solution.id"
        :disabled="!toolAllowed || !solution.checks.ready"
        @click="emit('assistant')"
      >
        进入命令助手 →</button
      ><span v-else class="muted">已收录方案 · 参数编辑器待补充</span
      ><a :href="solution.source" target="_blank" rel="noreferrer"
        >官方文档 ↗</a
      >
    </div>
  </article>
</template>
