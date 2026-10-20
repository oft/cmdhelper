<script setup lang="ts">
import { computed } from 'vue';
import { articles } from '@articles';
const props = defineProps<{ slug: string }>();
const article = computed(() =>
  articles.find((item) => item.slug === props.slug),
);
</script>
<template>
  <article v-if="slug && article" class="reading">
    <a href="#/articles">← 所有文章</a>
    <p class="muted">{{ article.date }}</p>
    <h1>{{ article.title }}</h1>
    <template v-for="(section, index) in article.sections" :key="index"
      ><h2>{{ section.heading }}</h2>
      <p>{{ section.text }}</p></template
    >
  </article>
  <section v-else-if="slug" class="reading">文章不存在</section>
  <section v-else class="reading">
    <div class="eyebrow">GUIDES</div>
    <h1>使用笔记</h1>
    <p class="muted">把常用操作讲清楚。</p>
    <a
      v-for="item in articles"
      :key="item.slug"
      class="article"
      :href="`#/articles/${item.slug}`"
      ><time>{{ item.date }}</time>
      <h2>{{ item.title }} ↗</h2>
      <p>{{ item.summary }}</p></a
    >
  </section>
</template>
