<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  loadCollectorOptions,
  type CollectorOption
} from "./stats-meter-utils";

defineOptions({
  name: "CollectorMultiSelect"
});

const model = defineModel<number[]>({ default: () => [] });

const options = ref<CollectorOption[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    options.value = await loadCollectorOptions();
  } catch (error) {
    console.error("加载采集器选项失败:", error);
    options.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <el-select
    v-model="model"
    multiple
    collapse-tags
    collapse-tags-tooltip
    clearable
    filterable
    :loading="loading"
    placeholder="全部采集器"
    class="w-[220px]!"
  >
    <el-option
      v-for="item in options"
      :key="item.id"
      :label="item.label"
      :value="item.id"
    />
  </el-select>
</template>
