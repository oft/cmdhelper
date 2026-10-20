<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(
  defineProps<{
    dimension: {
      id: string;
      label: string;
      options: { id: string; label: string }[];
    };
    modelValue: string;
    counts: (number | null)[];
    countLabel: string;
    disabled?: boolean;
  }>(),
  { disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const index = computed(() =>
  Math.max(
    0,
    props.dimension.options.findIndex(
      (option) => option.id === props.modelValue,
    ),
  ),
);
const selectedLabel = computed(
  () => props.dimension.options[index.value]?.label ?? '',
);
function update(event: Event) {
  const option =
    props.dimension.options[Number((event.target as HTMLInputElement).value)];
  if (option) emit('update:modelValue', option.id);
}
</script>
<template>
  <fieldset
    class="dimension-slider"
    :class="{ irrelevant: disabled }"
    :data-slider="dimension.id"
    :disabled="disabled"
  >
    <div class="dimension-heading">
      <label :for="`slider-${dimension.id}`">{{ dimension.label }}</label
      ><output :for="`slider-${dimension.id}`">{{ selectedLabel }}</output>
    </div>
    <input
      :id="`slider-${dimension.id}`"
      :name="dimension.id"
      type="range"
      min="0"
      :max="dimension.options.length - 1"
      step="1"
      :value="index"
      :aria-valuetext="selectedLabel"
      @input="update"
    />
    <div class="slider-stops" :style="{ '--stops': dimension.options.length }">
      <button
        v-for="(option, position) in dimension.options"
        :key="option.id"
        type="button"
        :data-stop="position"
        :aria-pressed="position === index"
        @click="emit('update:modelValue', option.id)"
      >
        <span>{{ option.label }}</span
        ><small :data-count="position">{{
          counts[position] === null
            ? '不适用'
            : `${counts[position]} ${countLabel}`
        }}</small>
      </button>
    </div>
  </fieldset>
</template>
