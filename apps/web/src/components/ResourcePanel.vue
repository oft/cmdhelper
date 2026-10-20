<script setup lang="ts">
import { computed } from 'vue';
import { assessResources, problemModel } from '@cmdhelper/core';
import DimensionSlider from './DimensionSlider.vue';
import {
  resources,
  resourceMode,
  selectedRoute,
  frequency,
  outcome,
  textMode,
  changeResource,
  resetRoute,
  chooseRoute,
} from '../state/problems.js';

const template = problemModel.templates[0]!;
const dimensions = [
  ...problemModel.resourceFields,
  {
    id: 'frequency',
    label: '使用频率',
    options: [
      { id: 'once', label: '仅这一次' },
      { id: 'repeat', label: '以后反复使用' },
    ],
  },
];
const statusLabels = {
  eligible: '可选择，待核实细节',
  pending: '需补充信息',
  excluded: '不符合当前投入',
};
const assessments = computed(() =>
  assessResources(resources, frequency.value)
    .filter((item) => textMode.value || item.id === 'tool')
    .map((item) => ({
      ...item,
      route: template.routes.find((route) => route.id === item.id)!,
      reasons: textMode.value
        ? item.reasons
        : [
            resources.toolReady === 'yes'
              ? '已有环境可减少准备，仍需核实具体方案的前置条件。'
              : '首次安装、连接与授权准备需计入本次投入。',
            frequency.value === 'repeat'
              ? '重复使用可摊薄首次准备，还需考虑维护成本。'
              : '单次任务应先比较已有方式与新建工具路线。',
          ],
    })),
);
const counts = computed(() =>
  Object.fromEntries(
    dimensions.map((dimension) => [
      dimension.id,
      dimension.options.map(
        (option) =>
          assessResources(
            dimension.id === 'frequency'
              ? resources
              : { ...resources, [dimension.id]: option.id },
            dimension.id === 'frequency' ? option.id : frequency.value,
          ).filter(
            (item) =>
              (textMode.value || item.id === 'tool') &&
              item.status === 'eligible',
          ).length,
      ),
    ]),
  ),
);
const chosen = computed(() =>
  template.routes.find((route) => route.id === selectedRoute.value),
);
const outcomeText = computed(() =>
  outcome.value === 'pass'
    ? '你已报告目标完成；网页未自动执行或核验。'
    : outcome.value === 'fail'
      ? '请重新输入或发送，并再次对照原文检查。'
      : '先实际操作，再核对目标文本。',
);
</script>
<template>
  <section class="resource-panel">
    <div class="resource-heading">
      <h2>先判断值得怎样做</h2>
      <span>问题模型 v{{ problemModel.version }}</span>
    </div>
    <label class="resource-mode"
      >问题类型<select
        id="resource-mode"
        v-model="resourceMode"
        @change="resetRoute"
      >
        <option value="tool">当前文件 / 设备 / 视频问题</option>
        <option value="text">示例：发送一句话到另一台设备</option>
      </select></label
    >
    <p>
      先比较投入，再深入工具细节。所有条件初始未知，按你的回答匹配，不估算虚假的分钟数或最优分数。
    </p>
    <form id="resource-fields" @submit.prevent>
      <DimensionSlider
        v-for="dimension in dimensions"
        :key="dimension.id"
        :dimension="dimension"
        :model-value="
          dimension.id === 'frequency'
            ? frequency
            : (resources[dimension.id] ?? 'unknown')
        "
        :counts="counts[dimension.id] ?? []"
        count-label="可选"
        @update:model-value="changeResource(dimension.id, $event)"
      />
    </form>
    <div id="resource-comparison">
      <div class="live-results" role="status" aria-live="polite">
        <strong>{{
          assessments.filter((item) => item.status === 'eligible').length
        }}</strong>
        条可选择路线
        <span
          >{{ assessments.length }} 条参与比较 ·
          {{ assessments.filter((item) => item.status === 'pending').length }}
          条待补充信息 ·
          {{ assessments.filter((item) => item.status === 'excluded').length }}
          条不符合投入</span
        >
      </div>
      <h3>
        {{ textMode ? '发送一句话：比较三条路线' : '当前工具路线的投入判断' }}
      </h3>
      <div class="resource-table-wrap">
        <table class="resource-table">
          <thead>
            <tr>
              <th>路线</th>
              <th>准备成本</th>
              <th>每次操作 / 维护</th>
              <th>当前判断</th>
              <th>选择</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in assessments" :key="item.id">
              <td>
                <strong>{{
                  textMode ? item.route.title : '使用当前候选工具方案'
                }}</strong>
              </td>
              <td>
                {{
                  textMode
                    ? item.route.cost.setup
                    : '取决于平台、安装、连接及授权现状'
                }}
              </td>
              <td>
                <template v-if="textMode"
                  >{{ item.route.cost.perUse }}<br /><small>{{
                    item.route.cost.maintenance
                  }}</small></template
                ><template v-else
                  >继续检查当前问题的执行步骤及维护要求</template
                >
              </td>
              <td>
                <b>{{ statusLabels[item.status] }}</b>
                <ul>
                  <li
                    v-for="text in [
                      ...item.blocked,
                      ...item.missing,
                      ...item.reasons,
                    ]"
                    :key="text"
                  >
                    {{ text }}
                  </li>
                </ul>
              </td>
              <td>
                <button
                  :data-route="item.id"
                  :disabled="item.status !== 'eligible'"
                  @click="chooseRoute(item.id)"
                >
                  {{ selectedRoute === item.id ? '已选择' : '选择路线' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="resource-footnote">
        顺序按适用条件和所选偏好调整，不代表全局最优。拒绝安装不等于工具不可用：已有环境就绪时仍可采用。
      </p>
    </div>
    <div id="resource-plan">
      <article v-if="chosen && textMode" class="resource-chosen">
        <h3>具体方案 · {{ chosen.title }}</h3>
        <p><b>目标：</b>{{ template.goal }}</p>
        <ol>
          <li v-for="step in chosen.steps" :key="step">{{ step }}</li>
        </ol>
        <div class="solution-states">
          <section>
            <h4>执行前</h4>
            <pre>{{ chosen.before }}</pre>
          </section>
          <section>
            <h4>执行后（成功时）</h4>
            <pre>{{ chosen.after }}</pre>
          </section>
        </div>
        <p><b>验收：</b>{{ chosen.acceptance }}</p>
        <template v-if="chosen.id !== 'tool'"
          ><label
            >实际完成后记录验收结果<select
              id="resource-outcome"
              v-model="outcome"
            >
              <option value="unknown">尚未验收</option>
              <option value="pass">已核对内容一致</option>
              <option value="fail">内容不一致，需要重新处理</option>
            </select></label
          >
          <p>{{ outcomeText }}</p></template
        >
        <p v-else>
          下一步：在下方逐层核实 SCP
          条件，然后进入命令助手；源路径填写保存后的文本文件。
        </p>
      </article>
      <p v-else-if="selectedRoute === 'tool'" class="resource-selected">
        已接受工具路线投入，继续下方问题树。修改投入条件后需重新选择。
      </p>
      <p v-else class="resource-selected">
        先补全影响路线的条件并选择方案，下方工具细节暂缓。
      </p>
    </div>
  </section>
</template>
