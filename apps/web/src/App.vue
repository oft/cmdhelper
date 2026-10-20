<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AssistantPage from './pages/AssistantPage.vue';
import ProblemsPage from './pages/ProblemsPage.vue';
import ArticlesPage from './pages/ArticlesPage.vue';
import AboutPage from './pages/AboutPage.vue';
import { selectCommand } from './state/assistant.js';
const hash = ref(location.hash);
const route = computed(() => {
  const [page, slug] = hash.value.replace(/^#\/?/, '').split('/');
  return { page: page || 'assistant', slug: slug || '' };
});
const menu = [
  { id: 'assistant', label: '命令助手' },
  { id: 'problems', label: '问题导航' },
  { id: 'articles', label: '文章' },
  { id: 'about', label: '关于' },
];
function updateRoute() {
  hash.value = location.hash;
}
function openAssistant(entry: { command: string; scenario: string }) {
  selectCommand(entry.command, entry.scenario);
  location.hash = '/assistant';
}
onMounted(() => window.addEventListener('hashchange', updateRoute));
onUnmounted(() => window.removeEventListener('hashchange', updateRoute));
</script>
<template>
  <header>
    <a class="brand" href="#/assistant"
      ><span class="logo">&gt;_</span> cmdhelper</a
    >
    <nav aria-label="主导航">
      <a
        v-for="item in menu"
        :key="item.id"
        :href="`#/${item.id}`"
        :aria-current="route.page === item.id ? 'page' : undefined"
        >{{ item.label }}</a
      >
    </nav>
    <span class="header-note">少记参数，多做事情</span>
  </header>
  <main id="main">
    <AssistantPage v-if="route.page === 'assistant'" />
    <ProblemsPage
      v-else-if="route.page === 'problems'"
      @assistant="openAssistant"
    />
    <ArticlesPage v-else-if="route.page === 'articles'" :slug="route.slug" />
    <AboutPage v-else-if="route.page === 'about'" />
    <section v-else class="reading">
      <h1>页面不存在</h1>
      <a href="#/assistant">返回命令助手</a>
    </section>
  </main>
  <footer>
    cmdhelper / 开放的命令参考工具 <span>仅生成命令 · 不自动执行</span>
  </footer>
</template>
