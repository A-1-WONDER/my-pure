<script setup lang="ts">
import dayjs from "dayjs";
import { getMineLogs } from "@/api/user";
import { message } from "@/utils/message";
import { reactive, ref, onMounted } from "vue";
import { deviceDetection } from "@pureadmin/utils";
import type { PaginationProps } from "@pureadmin/table";

defineOptions({
  name: "SecurityLog"
});

const loading = ref(true);
const dataList = ref([]);
const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true,
  layout: "prev, pager, next"
});
const columns: TableColumnList = [
  {
    label: "详情",
    prop: "summary",
    minWidth: 140
  },
  {
    label: "IP 地址",
    prop: "ip",
    minWidth: 100
  },
  {
    label: "地点",
    prop: "address",
    minWidth: 140
  },
  {
    label: "浏览器类型",
    prop: "browser",
    minWidth: 100
  },
  {
    label: "时间",
    prop: "operatingTime",
    minWidth: 180,
    formatter: ({ operatingTime }) =>
      operatingTime ? dayjs(operatingTime).format("YYYY-MM-DD HH:mm:ss") : "-"
  }
];

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getMineLogs({
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (code === 0 && data) {
      dataList.value = data.list;
      pagination.total = data.total;
      pagination.pageSize = data.pageSize;
      pagination.currentPage = data.currentPage;
    }
  } catch {
    message("加载安全日志失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function handleCurrentChange(page: number) {
  pagination.currentPage = page;
  onSearch();
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div
    :class="[
      'min-w-[180px]',
      deviceDetection() ? 'max-w-[100%]' : 'max-w-[70%]'
    ]"
  >
    <h3 class="my-8!">安全日志</h3>
    <pure-table
      row-key="id"
      table-layout="auto"
      :loading="loading"
      :data="dataList"
      :columns="columns"
      :pagination="pagination"
      @page-current-change="handleCurrentChange"
    />
  </div>
</template>
