import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import {
  deleteAlarmRule,
  getAlarmRuleList,
  saveAlarmRule,
  type AlarmRulePayload
} from "@/api/alarm";
import { alarmRuleRowToSavePayload } from "../rule-config/rule-detail-utils";
import type { PaginationProps } from "@pureadmin/table";

/** 用量/阈值类报警类型 */
export const USAGE_ALARM_TYPES = new Set([
  "electric_usage_abnormal",
  "electric_threshold_exceeded",
  "electric_power_abnormal",
  "electric_balance_low"
]);

function unwrapRuleList(res: Record<string, any>): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const d = res.data ?? res;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.records)) return d.records;
  return [];
}

function isUsageRule(row: Record<string, any>) {
  const type = String(row.alarmType ?? row.alarm_type ?? "");
  if (USAGE_ALARM_TYPES.has(type)) return true;
  return (
    row.metric != null || row.threshold != null || row.thresholdValue != null
  );
}

function formatThreshold(row: Record<string, any>) {
  const metric = row.metric ?? "—";
  const op = row.compareOp ?? row.compareType ?? "";
  const threshold = row.threshold ?? row.thresholdValue;
  if (threshold == null) return "—";
  return `${metric} ${op} ${threshold}`.trim();
}

export function useAlarmUsageSetting() {
  const router = useRouter();
  const loading = ref(false);
  const allRules = ref<Record<string, any>[]>([]);

  const form = reactive({
    ruleName: "",
    enabled: "" as "" | "true" | "false"
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const filteredRules = computed(() => {
    let list = allRules.value.filter(isUsageRule);
    if (form.ruleName.trim()) {
      const kw = form.ruleName.trim().toLowerCase();
      list = list.filter(row =>
        String(row.ruleName ?? "")
          .toLowerCase()
          .includes(kw)
      );
    }
    if (form.enabled === "true") {
      list = list.filter(row => row.enabled !== false);
    } else if (form.enabled === "false") {
      list = list.filter(row => row.enabled === false);
    }
    return list;
  });

  const dataList = computed(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredRules.value.slice(start, start + pagination.pageSize);
  });

  const columns: TableColumnList = [
    { label: "规则名称", prop: "ruleName", minWidth: 160 },
    {
      label: "报警类型",
      prop: "alarmType",
      minWidth: 150,
      formatter: ({ alarmType }) => getAlarmTypeLabel(alarmType)
    },
    {
      label: "用量条件",
      prop: "threshold",
      minWidth: 180,
      formatter: row => formatThreshold(row)
    },
    {
      label: "级别",
      prop: "alarmLevel",
      minWidth: 90,
      formatter: ({ alarmLevel }) => getAlarmLevelLabel(alarmLevel)
    },
    {
      label: "状态",
      prop: "enabled",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.enabled === false ? "info" : "success"}
          effect="plain"
        >
          {row.enabled === false ? "停用" : "启用"}
        </el-tag>
      )
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation",
      minWidth: 220
    }
  ];

  async function loadRules() {
    loading.value = true;
    try {
      const res = (await getAlarmRuleList({
        currentPage: 1,
        pageSize: 500
      })) as Record<string, any>;
      allRules.value = unwrapRuleList(res);
      pagination.total = filteredRules.value.length;
      pagination.currentPage = 1;
    } catch {
      allRules.value = [];
      pagination.total = 0;
      message("加载用量报警规则失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  function onSearch() {
    pagination.total = filteredRules.value.length;
    if (
      pagination.currentPage > 1 &&
      (pagination.currentPage - 1) * pagination.pageSize >= pagination.total
    ) {
      pagination.currentPage = 1;
    }
  }

  function resetForm(formEl?: { resetFields?: () => void }) {
    formEl?.resetFields?.();
    form.ruleName = "";
    form.enabled = "";
    onSearch();
  }

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    pagination.currentPage = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
  }

  function goCreateRule() {
    router.push({ path: "/alarm/rule-config" });
  }

  async function toggleEnabled(row: Record<string, any>) {
    const enabled = row.enabled === false;
    const payload: AlarmRulePayload = {
      ...alarmRuleRowToSavePayload(row),
      enabled
    };
    try {
      const res = (await saveAlarmRule(payload)) as Record<string, any>;
      const ok = res?.code === 0 || res?.success === true;
      if (ok) {
        message(enabled ? "已启用" : "已停用", { type: "success" });
        await loadRules();
      } else {
        message(String(res?.msg ?? res?.message ?? "操作失败"), {
          type: "warning"
        });
      }
    } catch {
      message("操作失败", { type: "error" });
    }
  }

  async function removeRule(row: Record<string, any>) {
    try {
      const res = (await deleteAlarmRule({ id: row.id })) as Record<
        string,
        any
      >;
      const ok = res?.code === 0 || res?.success === true;
      if (ok) {
        message("删除成功", { type: "success" });
        await loadRules();
      } else {
        message(String(res?.msg ?? res?.message ?? "删除失败"), {
          type: "warning"
        });
      }
    } catch {
      message("删除失败", { type: "error" });
    }
  }

  onMounted(() => {
    loadRules();
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
    goCreateRule,
    toggleEnabled,
    removeRule,
    loadRules
  };
}
