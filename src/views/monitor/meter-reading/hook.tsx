import dayjs from "dayjs";
import { message } from "@/utils/message";
import {
  deleteMeterReadingRecords,
  getMeterReadingRecords,
  type MeterReadingRecord
} from "@/api/system";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";

const readingTypeLabel: Record<string, string> = {
  auto: "自动抄表",
  manual: "手动录入"
};

export function useMeterReading(_tableRef: Ref) {
  const form = reactive({
    meterId: "",
    readingType: "",
    readingTime: ""
  });
  const dataList = ref<MeterReadingRecord[]>([]);
  const loading = ref(true);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "表具ID",
      prop: "meterId",
      minWidth: 100
    },
    {
      label: "读数值",
      prop: "readingValue",
      minWidth: 120,
      formatter: ({ readingValue }) =>
        readingValue != null ? `${readingValue} kWh` : "—"
    },
    {
      label: "读数类型",
      prop: "readingType",
      minWidth: 110,
      formatter: ({ readingType }) =>
        readingTypeLabel[readingType] ?? readingType ?? "—"
    },
    {
      label: "读数时间",
      prop: "readingTime",
      minWidth: 170,
      formatter: ({ readingTime }) =>
        readingTime ? dayjs(readingTime).format("YYYY-MM-DD HH:mm:ss") : "—"
    },
    {
      label: "采集器ID",
      prop: "collectorId",
      minWidth: 100,
      formatter: ({ collectorId }) =>
        collectorId != null ? String(collectorId) : "—"
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 140,
      showOverflowTooltip: true,
      formatter: ({ remark }) => remark || "—"
    },
    {
      label: "创建时间",
      prop: "createdAt",
      minWidth: 170,
      formatter: ({ createdAt }) =>
        createdAt ? dayjs(createdAt).format("YYYY-MM-DD HH:mm:ss") : "—"
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
      message("查询抄表数据失败", { type: "error" });
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
