import dayjs from "dayjs";
import { message } from "@/utils/message";
import {
  clearOperationLogs,
  getOperationLogsList
} from "@/api/system";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";

export function useRole(tableRef: Ref) {
  const form = reactive({
    module: "",
    operatingTime: ""
  });
  const dataList = ref([]);
  const loading = ref(true);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "序号",
      prop: "id",
      minWidth: 90
    },
    {
      label: "操作人员",
      prop: "username",
      minWidth: 100
    },
    {
      label: "请求方法",
      prop: "module",
      minWidth: 180,
      showOverflowTooltip: true
    },
    {
      label: "操作描述",
      prop: "summary",
      minWidth: 160,
      showOverflowTooltip: true
    },
    {
      label: "操作 IP",
      prop: "ip",
      minWidth: 120
    },
    {
      label: "操作地点",
      prop: "address",
      minWidth: 140,
      showOverflowTooltip: true
    },
    {
      label: "浏览器",
      prop: "browser",
      minWidth: 120,
      showOverflowTooltip: true
    },
    {
      label: "操作时间",
      prop: "operatingTime",
      minWidth: 180,
      formatter: ({ operatingTime }) =>
        operatingTime
          ? dayjs(operatingTime).format("YYYY-MM-DD HH:mm:ss")
          : "-"
    }
  ];

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    pagination.currentPage = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  function handleSelectionChange() {
    tableRef.value?.setAdaptive?.();
  }

  async function clearAll() {
    try {
      await clearOperationLogs();
      message("已清空操作日志", { type: "success" });
      onSearch();
    } catch {
      message("清空操作日志失败", { type: "error" });
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getOperationLogsList({
        ...toRaw(form),
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
      message("加载操作日志失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    pagination.currentPage = 1;
    onSearch();
  };

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    clearAll,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
