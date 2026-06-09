import dayjs from "dayjs";
import { message } from "@/utils/message";
import {
  deleteMeterReadingRecords,
  getMeterReadingRecords,
  type MeterReadingRecord
} from "@/api/system";
import type { PaginationProps } from "@pureadmin/table";
import {
  type Ref,
  reactive,
  ref,
  onMounted,
  onUnmounted,
  toRaw
} from "vue";

const formatAgoPrecise = (ts?: string | null) => {
  if (!ts) return "—";
  const d = dayjs(ts);
  if (!d.isValid()) return "—";
  let sec = dayjs().diff(d, "second");
  if (sec < 0) sec = 0;
  if (sec < 1) return "刚刚";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}小时${m}分${s}秒前`;
  if (m > 0) return `${m}分${s}秒前`;
  return `${s}秒前`;
};

const formatDuration = (ms?: number) => {
  if (ms == null || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
};

function DualLineCell({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div class="flex flex-col items-center leading-tight">
      <span>{primary || "—"}</span>
      <span class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
        {secondary || "—"}
      </span>
    </div>
  );
}

export function useMeterReading(tableRef: Ref) {
  const form = reactive({
    blurry: "",
    readingTime: ""
  });
  const dataList = ref<MeterReadingRecord[]>([]);
  const loading = ref(true);
  const timeTick = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "采集器编号",
      prop: "collectorNo",
      minWidth: 140,
      cellRenderer: ({ row }) => (
        <DualLineCell primary={row.collectorNo} secondary={row.deviceNo} />
      )
    },
    {
      label: "通讯地址",
      prop: "meterAddress",
      minWidth: 140,
      cellRenderer: ({ row }) => (
        <DualLineCell primary={row.meterAddress} secondary={row.deviceNo} />
      )
    },
    {
      label: "用户",
      prop: "userRemark",
      minWidth: 120,
      showOverflowTooltip: true,
      formatter: ({ userRemark }) => userRemark || "—"
    },
    {
      label: "功能",
      prop: "functionType",
      minWidth: 130,
      formatter: ({ functionType }) => functionType || "—"
    },
    {
      label: "结果",
      prop: "resultValue",
      minWidth: 120,
      formatter: ({ resultValue }) =>
        resultValue != null ? `${resultValue} kWh` : "—"
    },
    {
      label: "完成时间",
      prop: "finishedTime",
      minWidth: 150,
      cellRenderer: ({ row }) => {
        void timeTick.value;
        return <span>{formatAgoPrecise(row.finishedTime)}</span>;
      }
    },
    {
      label: "用时",
      prop: "durationMs",
      minWidth: 90,
      formatter: ({ durationMs }) => formatDuration(durationMs)
    },
    {
      label: "命令发送次数",
      prop: "sendCount",
      minWidth: 110,
      formatter: ({ sendCount }) => (sendCount != null ? String(sendCount) : "—")
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation",
      minWidth: 90
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

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getMeterReadingRecords({
        ...toRaw(form),
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      });
      if (code === 0 && data) {
        dataList.value = data.list ?? [];
        pagination.total = data.total ?? 0;
        pagination.pageSize = data.pageSize ?? pagination.pageSize;
        pagination.currentPage = data.currentPage ?? pagination.currentPage;
      } else {
        dataList.value = [];
        pagination.total = 0;
      }
    } catch {
      dataList.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl: { resetFields?: () => void } | undefined) {
    if (!formEl) return;
    formEl.resetFields?.();
    pagination.currentPage = 1;
    onSearch();
  }

  async function handleDelete(row: MeterReadingRecord) {
    try {
      await deleteMeterReadingRecords([row.id]);
      message("删除成功", { type: "success" });
      onSearch();
    } catch {
      message("删除失败", { type: "error" });
    }
  }

  onMounted(() => {
    onSearch();
    timer = setInterval(() => {
      timeTick.value += 1;
    }, 1000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handleDelete
  };
}
