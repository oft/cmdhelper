<script setup lang="ts">
import type { ReadinessNode, EvidenceStatus } from '@cmdhelper/core';
import CheckList from './CheckList.vue';
defineProps<{ node: ReadinessNode; owner: string }>();
const emit = defineEmits<{ change: [id: string, status: EvidenceStatus] }>();
const labels = {
  locked: '暂缓处理',
  blocked: '当前阻塞',
  pending: '当前待确认',
  passed: '已通过',
};
</script>
<template>
  <li class="check-branch" :class="node.status">
    <div class="branch-heading">
      <span class="level-badge">L{{ node.priority }}</span
      ><strong>{{ node.title }}</strong
      ><span>{{ labels[node.status] }}</span>
    </div>
    <p class="branch-reason">{{ node.reason }}</p>
    <p v-if="node.status === 'locked'" class="deferred-note">
      上层尚未通过，暂不展开此层检查，避免提前处理细节。
    </p>
    <CheckList
      v-else
      :items="node.items"
      :owner="owner"
      @change="(id, status) => emit('change', id, status)"
    />
    <ul v-if="node.children.length" class="check-children">
      <CheckBranch
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :owner="owner"
        @change="(id, status) => emit('change', id, status)"
      />
    </ul>
  </li>
</template>
