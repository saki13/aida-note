<script setup lang="ts">
import MainView from "./views/MainView.vue";
</script>

<template>
  <MainView />
</template>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}
body {
  font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif;
  overflow: hidden;
}
</style>
