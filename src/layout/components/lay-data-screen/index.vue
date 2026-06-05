<script setup lang="ts">
import { useRouter } from "vue-router";
import Tv2Line from "~icons/ri/tv-2-line";

const router = useRouter();

function openDataScreen() {
  router.push("/data-screen");
}
</script>

<template>
  <div
    class="data-screen-container w-[40px] h-[48px] flex-c cursor-pointer navbar-bg-hover hover:[&>svg]:animate-scale-bounce"
    title="数据可视化大屏"
    @click="openDataScreen"
  >
    <IconifyIconOffline :icon="Tv2Line" />
  </div>
</template>
