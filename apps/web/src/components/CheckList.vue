<script setup lang="ts">
import type { AnnotatedCheck, EvidenceStatus } from '@cmdhelper/core';
withDefaults(
  defineProps<{
    items: AnnotatedCheck[];
    owner: string;
    outcome?: boolean;
    ready?: boolean;
  }>(),
  { outcome: false, ready: false },
);
const emit = defineEmits<{ change: [id: string, status: EvidenceStatus] }>();
function update(id: string, event: Event) {
  emit(
    'change',
    id,
    (event.target as HTMLSelectElement).value as EvidenceStatus,
  );
}
</script>
<template>
  <ul class="condition-list">
    <li
      v-for="item in items"
      :key="item.id"
      class="condition-row"
      :class="item.status"
    >
      <div class="condition-top">
        <strong>{{ item.label }}</strong
        ><label class="condition-status"
          >{{ outcome ? '检查结果' : '条件状态'
          }}<select
            :data-owner="owner"
            :data-check="item.id"
            :value="item.status"
            :disabled="outcome && !ready"
            @change="update(item.id, $event)"
          >
            <option value="unknown">待确认</option>
            <option value="pass">
              {{ outcome ? '已检查通过' : '已确认满足' }}
            </option>
            <option value="fail">{{ outcome ? '检查失败' : '不满足' }}</option>
          </select></label
        >
      </div>
      <small>{{ item.scope }} · 用户手动确认</small>
      <p><b>如何检查：</b>{{ item.verify }}</p>
      <p v-if="item.status !== 'pass'" class="condition-remedy">
        <b>不满足时：</b>{{ item.remedy }}
      </p>
    </li>
  </ul>
</template>
