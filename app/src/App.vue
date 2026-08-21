<script setup lang="ts">
import { NDialogProvider, NMessageProvider } from "naive-ui";
import MainView from "./views/MainView.vue";
</script>

<template>
  <n-dialog-provider>
    <n-message-provider>
      <MainView />
    </n-message-provider>
  </n-dialog-provider>
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
