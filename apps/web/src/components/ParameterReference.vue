<script setup lang="ts">
import type { Command, Field } from '@cmdhelper/core';
defineProps<{ command: Command; field: Field }>();
</script>
<template>
  <aside id="reference" class="reference">
    <div class="panel-title">使用说明 <span>参考</span></div>
    <div class="ref-body">
      <div class="eyebrow">
        {{ command.id.toUpperCase() }} / {{ field.flag ?? field.id }}
      </div>
      <h3>{{ field.label }}</h3>
      <p>{{ field.description }}</p>
      <template v-if="field.placeholder"
        ><div class="example-label">填写示例</div>
        <code class="example">{{ field.placeholder }}</code></template
      >
      <hr />
      <h3>使用提示</h3>
      <ul class="reference-notes">
        <li v-for="note in command.notes" :key="note">{{ note }}</li>
      </ul>
      <hr />
      <a :href="command.source" target="_blank" rel="noreferrer">官方手册 ↗</a>
      <p class="muted">聚焦左侧参数，可查看对应说明。</p>
    </div>
  </aside>
</template>
