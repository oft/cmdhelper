<script setup lang="ts">
import { computed } from 'vue';
import type {
  evaluateReadiness,
  ReadinessNode,
  EvidenceStatus,
} from '@cmdhelper/core';
import CheckBranch from './CheckBranch.vue';
import CheckList from './CheckList.vue';
const props = defineProps<{
  owner: string;
  checks: ReturnType<typeof evaluateReadiness>;
}>();
const emit = defineEmits<{ change: [id: string, status: EvidenceStatus] }>();
function findPriority(node: ReadinessNode, id: string): number | undefined {
  if (node.id === id) return node.priority;
  for (const child of node.children) {
    const priority = findPriority(child, id);
    if (priority !== undefined) return priority;
  }
}
const priority = computed(() =>
  props.checks.current
    ? findPriority(props.checks.tree, props.checks.current.id)
    : undefined,
);
</script>
<template>
  <section class="readiness">
    <h4>按问题树逐层检查</h4>
    <p class="check-disclaimer">
      所有状态由用户人工核实。先处理上层判断；上层变化会清除下层确认与验收。
    </p>
    <div class="priority-focus">
      <strong>{{
        checks.current
          ? `当前优先：L${priority} · ${checks.current.title}`
          : '前置条件已逐层确认'
      }}</strong>
      <p>
        {{
          checks.current?.status === 'blocked'
            ? '先解决这个阻塞，或修改条件、更换路线；暂不投入下层细节。'
            : checks.current
              ? '先完成本层检查，通过后展开下一层。'
              : '可以进入命令助手；实际执行后还需验收。'
        }}
      </p>
    </div>
    <ul class="check-tree">
      <CheckBranch
        :node="checks.tree"
        :owner="owner"
        @change="(id, status) => emit('change', id, status)"
      />
    </ul>
    <details class="acceptance">
      <summary>
        L4 / 执行后验收与失败处理 {{ checks.ready ? '' : '· 等待前置条件' }}
      </summary>
      <p>实际执行后再逐项检查。前置条件未全部确认时，暂不能记录验收通过。</p>
      <CheckList
        :items="checks.acceptance"
        :owner="owner"
        outcome
        :ready="checks.ready"
        @change="(id, status) => emit('change', id, status)"
      />
      <p>
        {{
          checks.complete
            ? '你已报告所有验收项通过；本工具未独立执行或检测。'
            : '完成条件：前置条件满足，并且实际操作后的验收项全部通过。'
        }}
      </p>
    </details>
  </section>
</template>
