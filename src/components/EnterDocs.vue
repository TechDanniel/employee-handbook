<script setup lang="ts">
defineProps<{
  msg: string
}>()

const docsUrl = `${import.meta.env.BASE_URL}docs/`
</script>

<template>
  <h1>{{ msg }}</h1>
  <p>
    查看本站 VitePress 构建的文档：
    <a :href="docsUrl" target="_blank">Quick Start</a>
  </p>
</template>
