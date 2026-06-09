import dayjs from "dayjs";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, h, reactive, ref, onMounted, toRaw } from "vue";
import {
  clearErrorLogs,
  getSystemLogsDetail,
  getSystemLogsList
} from "@/api/system";
import { useCopyToClipboard } from "@pureadmin/utils";
import Info from "~icons/ri/question-line";

export function useRole(tableRef: Ref) {
  const form = reactive({
    module: "",
    requestTime: ""
  });
  const dataList = ref([]);
  const loading = ref(true);
  const { copied, update } = useCopyToClipboard();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "用户名",
      prop: "username",
      minWidth: 100
    },
    {
      label: "描述",
      prop: "summary",
      minWidth: 140,
      showOverflowTooltip: true
    },
    {
      headerRenderer: () => (
        <span class="flex-c">
          请求方法
          <iconifyIconOffline
            icon={Info}
            class="ml-1 cursor-help"
            v-tippy={{
              content: "双击单元格可复制"
            }}
          />
        </span>
      ),
      prop: "method",
      minWidth: 180,
      showOverflowTooltip: true
    },
    {
      label: "IP 地址",
      prop: "ip",
      minWidth: 120
    },
    {
      label: "地点",
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
      label: "请求耗时",
      prop: "takesTime",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.takesTime < 1000 ? "success" : "warning"}
          effect="plain"
        >
          {row.takesTime} ms
        </el-tag>
      )
    },
    {
      label: "发生时间",
      prop: "requestTime",
      minWidth: 180,
      formatter: ({ requestTime }) =>
        requestTime ? dayjs(requestTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 90,
      slot: "operation"
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

  function handleCellDblclick({ method }, { property }) {
    if (property !== "method") return;
    update(method);
    copied.value
      ? message(`${method} 已拷贝`, { type: "success" })
      : message("拷贝失败", { type: "warning" });
  }

  async function clearAll() {
    try {
      await clearErrorLogs();
      message("已清空异常日志", { type: "success" });
      onSearch();
    } catch {
      message("清空异常日志失败", { type: "error" });
    }
  }

  async function onDetail(row) {
    try {
      const { code, data } = await getSystemLogsDetail({ id: row.id });
      if (code !== 0) return;
      const exception = (data as { exception?: string })?.exception ?? "无异常详情";
      addDialog({
        title: "异常日志详情",
        width: "70%",
        hideFooter: true,
        contentRenderer: () =>
          h(
            "pre",
            {
              style:
                "max-height: 70vh; overflow: auto; white-space: pre-wrap; word-break: break-all; margin: 0; padding: 12px; background: var(--el-fill-color-light); border-radius: 4px;"
            },
            exception
          )
      });
    } catch {
      message("加载异常详情失败", { type: "error" });
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getSystemLogsList({
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
      message("加载异常日志失败", { type: "error" });
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
    onDetail,
    clearAll,
    resetForm,
    handleSizeChange,
    handleCellDblclick,
    handleCurrentChange,
    handleSelectionChange
  };
}
