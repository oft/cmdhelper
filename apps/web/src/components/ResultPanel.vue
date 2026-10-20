<script setup lang="ts">
import type { describeResult } from '@cmdhelper/core';
defineProps<{ result: ReturnType<typeof describeResult>; ready: boolean }>();
const states = [
  { key: 'before', label: '执行前' },
  { key: 'after', label: '执行后' },
] as const;
</script>
<template>
  <section class="result-explanation" aria-label="执行结果说明">
    <div class="result-heading">
      <strong>结果说明</strong><span>成功执行后的预计变化</span>
    </div>
    <div id="result-state" class="muted">
      {{
        ready
          ? '以下按连接与传输成功说明，实际文件状态未检测。'
          : '请补全有效参数；下方展示当前场景的变化说明。'
      }}
    </div>
    <div id="result-details" class="result-grid">
      <section
        v-for="state in states"
        :key="state.key"
        :class="`result-${state.key}`"
      >
        <h3>{{ state.label }}</h3>
        <ul>
          <li v-for="text in result[state.key]" :key="text">{{ text }}</li>
        </ul>
      </section>
    </div>
    <div id="result-example">
      <article v-if="result.example" class="worked-example">
        <h3>示例 · {{ result.example.title }}</h3>
        <ul class="example-assumptions">
          <li v-for="text in result.example.assumptions" :key="text">
            {{ text }}
          </li>
        </ul>
        <h4>示例命令 <span>独立示例，不是上方当前命令</span></h4>
        <pre class="example-command">{{ result.example.command }}</pre>
        <div class="example-process">
          <h4>执行过程</h4>
          <ol>
            <li v-for="text in result.example.steps" :key="text">{{ text }}</li>
          </ol>
        </div>
        <div class="example-comparison">
          <section>
            <h4>执行前 · 位置与内容</h4>
            <pre class="tree">{{ result.example.before }}</pre>
          </section>
          <section>
            <h4>执行后 · 位置与内容</h4>
            <pre class="tree">{{ result.example.after }}</pre>
          </section>
        </div>
        <h4>变化要点</h4>
        <ul class="takeaways">
          <li v-for="text in result.example.takeaways" :key="text">
            {{ text }}
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
