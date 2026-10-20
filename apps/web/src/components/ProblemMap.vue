<script setup lang="ts">
import { computed } from 'vue';
import type { Coordinates } from '@cmdhelper/core';
import { coordinateLabel } from '../state/problems.js';
const props = defineProps<{
  coordinates: Coordinates;
  total: number;
  matched: number;
  ready: number;
}>();
const remote = computed(() => props.coordinates.space !== 'local');
const goalOutcomes: Record<string, string> = {
  transfer: '得到内容副本',
  convert: '得到目标格式 / 编码',
  operate: '远程命令环境',
  access: '远程服务访问入口',
  sync: '同步后的仓库提交',
  inspect: '仓库状态信息',
  stage: '暂存区中的变更',
  record: '新的本地提交',
  query: '接口响应',
  submit: '接口处理结果',
};
</script>
<template>
  <div id="problem-map">
    <div class="live-results" role="status" aria-live="polite">
      <strong>{{ total }}</strong> 个候选方案
      <span
        >其中 {{ matched }} 个符合所选条件 · {{ ready }} 个前置检查通过</span
      >
    </div>
    <div class="coordinate-summary">
      问题坐标
      <code>{{
        ['object', 'space', 'goal', 'time']
          .map((key) => coordinateLabel(key, coordinates[key]))
          .join(' / ')
      }}</code>
    </div>
    <div class="state-map">
      <section>
        <h2>当前状态</h2>
        <div class="device-box">
          <span>{{
            coordinates.space === 'incoming'
              ? '设备 A · 远程'
              : remote
                ? '设备 A · 本机'
                : '同一台设备'
          }}</span
          ><strong>{{ coordinateLabel('object', coordinates.object) }}</strong
          ><small>{{
            coordinates.goal === 'transfer'
              ? '源内容'
              : coordinates.goal === 'convert'
                ? '原内容 / 格式'
                : '本地操作入口'
          }}</small>
        </div>
      </section>
      <div class="state-arrow">
        <span>{{ coordinateLabel('goal', coordinates.goal) }}</span
        >→
      </div>
      <section>
        <h2>目标状态</h2>
        <div class="device-box target-box">
          <span>{{
            coordinates.space === 'incoming'
              ? '设备 B · 本机'
              : remote
                ? '设备 B · 远程'
                : '同一台设备'
          }}</span
          ><strong>{{
            goalOutcomes[coordinates.goal ?? ''] ?? '目标状态'
          }}</strong
          ><small>{{ coordinateLabel('time', coordinates.time) }}</small>
        </div>
      </section>
    </div>
  </div>
</template>
