<script setup lang="ts">
import type { Field } from '@cmdhelper/core';
defineProps<{
  field: Field;
  modelValue: string | boolean | undefined;
  disabled: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string | boolean];
  focus: [];
}>();
function update(event: Event) {
  const input = event.target as HTMLInputElement;
  emit(
    'update:modelValue',
    input.type === 'checkbox' ? input.checked : input.value,
  );
}
</script>
<template>
  <div
    class="field"
    :class="{ 'check-field': field.kind === 'boolean' }"
    :data-field="field.id"
  >
    <label :for="`f-${field.id}`"
      ><code v-if="field.flag">{{ field.flag }}</code> {{ field.label }}
      <b v-if="field.required">*</b></label
    >
    <input
      v-if="field.kind === 'boolean'"
      :id="`f-${field.id}`"
      type="checkbox"
      :checked="modelValue === true"
      :disabled="disabled"
      @change="update"
      @focus="emit('focus')"
    />
    <input
      v-else
      :id="`f-${field.id}`"
      autocomplete="off"
      :placeholder="field.placeholder"
      :value="modelValue ?? ''"
      :required="field.required"
      :disabled="disabled"
      @input="update"
      @focus="emit('focus')"
    />
    <small>{{ field.description }}</small>
  </div>
</template>
