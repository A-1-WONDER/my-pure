import dayjs from "dayjs";
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "@/utils/message";
import {
  deleteAlarmRule,
  getAlarmEventQueryList,
  getAlarmRuleList,
  saveAlarmRule,
  type AlarmRulePayload
} from "@/api/alarm";
import { getCollectorList } from "@/api/collector";
import { getMeterList } from "@/api/meters";
import {
  extractTargetIds,
  alarmRuleRowToSavePayload
} from "../rule-config/rule-detail-utils";
import type { PaginationProps } from "@pureadmin/table";
import { ElMessageBox } from "element-plus";

export type UsageViewMode = "monitor" | "add";

const USAGE_TYPES = new Set(["continuous_low_usage", "continuous_high_usage"]);

function unwrapList(res: Record<string, any>): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const d = res.data ?? res;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.records)) return d.records;
  if (Array.isArray(d)) return d;
  return [];
}

function isUsageRule(row: Record<string, any>) {
  const type = String(row.alarmType ?? row.conditionType ?? "");
  if (USAGE_TYPES.has(type)) return true;
  if (type.includes("usage") || type.includes("day_power")) return true;
  return String(row.metric ?? "") === "day_power";
}

/** 与后端评估一致：用量规则 targetIds 为空 = 应用到全部电能表 */
function usageRuleTargetIds(rule: Record<string, any>): number[] | "all" {
  const ids = extractTargetIds(rule);
  return ids.length === 0 ? "all" : ids;
}

function formatCompareOp(op: unknown) {
  const s = String(op ?? "");
  if (s === "lt") return "低于";
  if (s === "gt") return "高于";
  if (s === "qoq_up") return "环比上升";
  if (s === "qoq_down") return "环比下降";
  if (!s) return "—";
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s) ? "未识别" : s;
}

function formatTime(v: unknown) {
  if (v == null || v === "") return "—";
  const d = dayjs(v as string);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(v);
}

export function useAlarmUsageSetting() {
  const activeView = ref<UsageViewMode>("monitor");
  const loading = ref(false);
  const saving = ref(false);

  const collectors = ref<Record<string, any>[]>([]);
  const meters = ref<Record<string, any>[]>([]);
  const usageRules = ref<Record<string, any>[]>([]);
  /** meterId → 最近报警时间 */
  const lastAlarmMap = ref<Record<number, string>>({});

  const filter = reactive({
    collectorId: "" as "" | number | string,
    ruleId: "" as "" | number | string,
    meterAddress: "",
    userName: ""
  });

  const appliedFilter = reactive({
    collectorId: "" as "" | number | string,
    ruleId: "" as "" | number | string,
    meterAddress: "",
    userName: ""
  });

  const addForm = reactive({
    name: "",
    deviceType: "electric_meter",
    period: "day",
    rangeOp: "lt" as "lt" | "gt",
    thresholdKwh: undefined as number | undefined,
    silenceDays: 1,
    /** "1"=全部设备，"0"=指定电表 */
    applyAll: "1" as "1" | "0",
    targetIds: [] as number[],
    /** 指定设备时可选：按采集器缩小候选表 */
    filterCollectorId: "" as "" | number | string
  });

  const togglingEnabledId = ref<number | null>(null);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const collectorOptions = computed(() => {
    return collectors.value.map(c => ({
      value: Number(c.id ?? c.collectorId),
      label: String(
        c.collectorNo ?? c.code ?? c.collectorCode ?? c.name ?? c.id ?? ""
      )
    }));
  });

  const ruleOptions = computed(() =>
    usageRules.value.map(r => ({
      value: Number(r.id),
      label: String(r.ruleName ?? `规则${r.id}`)
    }))
  );

  const collectorNoById = computed(() => {
    const map: Record<number, string> = {};
    for (const c of collectors.value) {
      const id = Number(c.id ?? c.collectorId);
      if (!Number.isFinite(id)) continue;
      map[id] = String(
        c.collectorNo ?? c.code ?? c.collectorCode ?? c.name ?? id
      );
    }
    return map;
  });

  /** 添加页：可选电表（可按采集器过滤） */
  const meterSelectOptions = computed(() => {
    const cid = addForm.filterCollectorId;
    const cidNum =
      cid !== "" && cid != null && Number.isFinite(Number(cid))
        ? Number(cid)
        : null;
    return meters.value
      .filter(m => {
        if (cidNum == null) return true;
        return Number(m.collectorId) === cidNum;
      })
      .map(m => {
        const id = Number(m.id);
        const no = String(m.meterNo ?? m.meterAddress ?? id);
        const user = String(m.userName ?? m.username ?? "").trim();
        const cName =
          collectorNoById.value[Number(m.collectorId)] ||
          (m.collectorId != null ? `采集器${m.collectorId}` : "");
        const parts = [no];
        if (user) parts.push(user);
        if (cName) parts.push(cName);
        return { id, label: parts.join(" / ") };
      })
      .filter(o => Number.isFinite(o.id));
  });

  /** meterId → 绑定的用量规则名 */
  const ruleNameByMeterId = computed(() => {
    const map: Record<number, string> = {};
    const append = (mid: number, name: string) => {
      if (!Number.isFinite(mid) || !name) return;
      if (!map[mid]) map[mid] = name;
      else if (!map[mid].includes(name)) map[mid] = `${map[mid]}、${name}`;
    };
    for (const rule of usageRules.value) {
      const name = String(rule.ruleName ?? "");
      const targets = usageRuleTargetIds(rule);
      if (targets === "all") {
        for (const m of meters.value) {
          append(Number(m.id), name);
        }
      } else {
        for (const id of targets) append(id, name);
      }
    }
    return map;
  });

  /** 已配置的用量参数设置列表（用户添加后应能在此直接看到） */
  const usageSettingRows = computed(() =>
    usageRules.value.map(r => {
      const targets = usageRuleTargetIds(r);
      const silenceMin = Number(r.silenceMinutes ?? 0);
      const silenceDays = Number.isFinite(silenceMin)
        ? Math.round((silenceMin / 1440) * 100) / 100
        : 0;
      return {
        id: r.id,
        ruleName: String(r.ruleName ?? "—"),
        rangeText: `${formatCompareOp(r.compareOp)} ${r.threshold ?? "—"} 千瓦时`,
        silenceDays,
        scopeText:
          targets === "all"
            ? `全部电能表（${meters.value.length}）`
            : `指定 ${targets.length} 块表`,
        enabled: r.enabled !== false,
        createTime: r.createTime ?? r.updateTime ?? ""
      };
    })
  );

  const usageSettingColumns: TableColumnList = [
    { label: "序号", type: "index", width: 70 },
    { label: "设置名称", prop: "ruleName", minWidth: 160 },
    { label: "区间用量", prop: "rangeText", minWidth: 140 },
    {
      label: "静默期",
      prop: "silenceDays",
      width: 100,
      formatter: row => `${row.silenceDays} 天`
    },
    { label: "应用范围", prop: "scopeText", minWidth: 140 },
    {
      label: "状态",
      prop: "enabled",
      width: 90,
      formatter: row => (row.enabled ? "启用" : "停用")
    },
    {
      label: "操作",
      fixed: "right",
      width: 160,
      slot: "usageSettingOps"
    }
  ];

  const filteredRows = computed(() => {
    let list = meters.value.slice();
    const cid = appliedFilter.collectorId;
    if (cid !== "" && cid != null) {
      const n = Number(cid);
      list = list.filter(m => Number(m.collectorId) === n);
    }
    const rid = appliedFilter.ruleId;
    if (rid !== "" && rid != null) {
      const rule = usageRules.value.find(r => Number(r.id) === Number(rid));
      if (rule) {
        const targets = usageRuleTargetIds(rule);
        if (targets !== "all") {
          const ids = new Set(targets);
          list = list.filter(m => ids.has(Number(m.id)));
        }
      } else {
        list = [];
      }
    }
    const addr = appliedFilter.meterAddress.trim().toLowerCase();
    if (addr) {
      list = list.filter(m => {
        const a = String(
          m.meterNo ?? m.meterAddress ?? m.communication ?? ""
        ).toLowerCase();
        return a.includes(addr);
      });
    }
    const user = appliedFilter.userName.trim().toLowerCase();
    if (user) {
      list = list.filter(m =>
        String(m.userName ?? m.username ?? "")
          .toLowerCase()
          .includes(user)
      );
    }
    return list;
  });

  const dataList = computed(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredRows.value.slice(start, start + pagination.pageSize);
  });

  const columns: TableColumnList = [
    {
      label: "序号",
      type: "index",
      width: 70,
      index: (i: number) =>
        (pagination.currentPage - 1) * pagination.pageSize + i + 1
    },
    {
      label: "采集器编号",
      prop: "collectorNo",
      minWidth: 140,
      formatter: row => {
        const cid = Number(row.collectorId);
        return collectorNoById.value[cid] || (row.collectorId ?? "—");
      }
    },
    {
      label: "通讯地址",
      prop: "meterNo",
      minWidth: 160,
      formatter: row =>
        String(row.meterNo ?? row.meterAddress ?? row.communication ?? "—") ||
        "—"
    },
    {
      label: "用戶",
      prop: "userName",
      minWidth: 120,
      formatter: row => String(row.userName ?? row.username ?? "—") || "—"
    },
    {
      label: "报警设置",
      prop: "alarmSetting",
      minWidth: 160,
      formatter: row => {
        const mid = Number(row.id);
        return ruleNameByMeterId.value[mid] || "未设置";
      }
    },
    {
      label: "最近报警时间",
      prop: "lastAlarmTime",
      minWidth: 170,
      formatter: row => {
        const mid = Number(row.id);
        return formatTime(lastAlarmMap.value[mid]);
      }
    },
    {
      label: "创建时间",
      prop: "createTime",
      minWidth: 170,
      formatter: row =>
        formatTime(row.createTime ?? row.createdAt ?? row.installTime)
    }
  ];

  async function loadCollectors() {
    try {
      const res = (await getCollectorList({
        page: 1,
        pageSize: 10000
      })) as Record<string, any>;
      collectors.value = unwrapList(res);
    } catch {
      collectors.value = [];
      message("加载采集器失败", { type: "warning" });
    }
  }

  async function loadMeters() {
    try {
      const res = (await getMeterList({
        page: 1,
        size: 10000,
        meterType: "electric"
      })) as Record<string, any>;
      let list = unwrapList(res);
      if (!list.length) {
        const res2 = (await getMeterList({
          page: 1,
          size: 10000
        })) as Record<string, any>;
        list = unwrapList(res2);
      }
      // 优先电能表
      const electric = list.filter(m => {
        const t = String(m.meterType ?? m.type ?? "").toLowerCase();
        return !t || t.includes("electric") || t === "1" || t.includes("电");
      });
      meters.value = electric.length ? electric : list;
    } catch {
      meters.value = [];
      message("加载电表失败", { type: "warning" });
    }
  }

  async function loadUsageRules() {
    try {
      const res = (await getAlarmRuleList({
        currentPage: 1,
        pageSize: 500
      })) as Record<string, any>;
      usageRules.value = unwrapList(res).filter(isUsageRule);
    } catch {
      usageRules.value = [];
    }
  }

  async function loadRecentAlarms() {
    try {
      const res = (await getAlarmEventQueryList({
        alarmType: "",
        alarmLevel: "",
        alarmStatus: "",
        alarmTime: "",
        pageSize: 200,
        currentPage: 1
      })) as Record<string, any>;
      const ok = res?.code === 0 || res?.success === true;
      const list = ok ? unwrapList(res) : [];
      const map: Record<number, string> = {};
      for (const ev of list) {
        const type = String(ev.alarmType ?? "");
        const isUsage =
          USAGE_TYPES.has(type) ||
          type.includes("usage") ||
          type.includes("day_power");
        if (!isUsage && type) {
          // 仍记录用量相关；若类型未知也按表号挂最近时间，避免空列
        }
        const mid = Number(ev.deviceId ?? ev.meterId ?? ev.targetId);
        const time = ev.alarmTime ?? ev.createTime;
        if (!Number.isFinite(mid) || !time) continue;
        const prev = map[mid];
        if (!prev || dayjs(time).isAfter(dayjs(prev))) {
          map[mid] = String(time);
        }
      }
      // 再按 meterNo 匹配
      const byNo: Record<string, string> = {};
      for (const ev of list) {
        const no = String(ev.meterNo ?? "").trim();
        const time = ev.alarmTime ?? ev.createTime;
        if (!no || !time) continue;
        if (!byNo[no] || dayjs(time).isAfter(dayjs(byNo[no]))) {
          byNo[no] = String(time);
        }
      }
      for (const m of meters.value) {
        const mid = Number(m.id);
        const no = String(m.meterNo ?? "").trim();
        if (Number.isFinite(mid) && !map[mid] && no && byNo[no]) {
          map[mid] = byNo[no];
        }
      }
      lastAlarmMap.value = map;
    } catch {
      lastAlarmMap.value = {};
    }
  }

  async function loadAll() {
    loading.value = true;
    try {
      await Promise.all([loadCollectors(), loadMeters(), loadUsageRules()]);
      await loadRecentAlarms();
      pagination.total = filteredRows.value.length;
      pagination.currentPage = 1;
    } finally {
      loading.value = false;
    }
  }

  function onSearch() {
    appliedFilter.collectorId = filter.collectorId;
    appliedFilter.ruleId = filter.ruleId;
    appliedFilter.meterAddress = filter.meterAddress;
    appliedFilter.userName = filter.userName;
    pagination.total = filteredRows.value.length;
    pagination.currentPage = 1;
  }

  function resetFilter() {
    filter.collectorId = "";
    filter.ruleId = "";
    filter.meterAddress = "";
    filter.userName = "";
    onSearch();
  }

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    pagination.currentPage = 1;
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
  }

  function goMonitor() {
    activeView.value = "monitor";
  }

  function goAdd() {
    activeView.value = "add";
  }

  function resetAddForm() {
    addForm.name = "";
    addForm.deviceType = "electric_meter";
    addForm.period = "day";
    addForm.rangeOp = "lt";
    addForm.thresholdKwh = undefined;
    addForm.silenceDays = 1;
    addForm.applyAll = "1";
    addForm.targetIds = [];
    addForm.filterCollectorId = "";
  }

  async function submitAdd() {
    const name = addForm.name.trim();
    if (!name) {
      message("请填写用量报警设置名称", { type: "warning" });
      return;
    }
    if (
      addForm.thresholdKwh == null ||
      !Number.isFinite(Number(addForm.thresholdKwh))
    ) {
      message("请填写区间用量（千瓦时）", { type: "warning" });
      return;
    }
    const silenceDays = Number(addForm.silenceDays);
    if (!Number.isFinite(silenceDays) || silenceDays < 0) {
      message("请填写有效的报警静默期（天）", { type: "warning" });
      return;
    }

    const applyAll = String(addForm.applyAll) !== "0";
    let targetIds: number[] = [];
    if (!applyAll) {
      targetIds = (addForm.targetIds || [])
        .map(v => Number(v))
        .filter(n => Number.isFinite(n));
      if (targetIds.length === 0) {
        message("请至少选择一块电能表", { type: "warning" });
        return;
      }
    }

    // 空 targetIds = 全部电能表；非空 = 指定设备
    const payload: AlarmRulePayload = {
      ruleName: name,
      targetType: "electric_meter",
      targetIds,
      alarmType:
        addForm.rangeOp === "lt"
          ? "continuous_low_usage"
          : "continuous_high_usage",
      alarmLevel: "important",
      enabled: true,
      metric: "day_power",
      compareOp: addForm.rangeOp,
      threshold: Number(addForm.thresholdKwh),
      sustainType: "times",
      sustainValue: 1,
      silenceMinutes: Math.round(silenceDays * 1440)
    };

    saving.value = true;
    try {
      const res = (await saveAlarmRule(payload)) as Record<string, any>;
      const ok =
        Number(res?.code) === 0 ||
        res?.success === true ||
        Number(res?.data?.code) === 0;
      if (ok) {
        message(
          applyAll
            ? "添加成功（已应用到全部电能表）"
            : `添加成功（已绑定 ${targetIds.length} 块表）`,
          { type: "success" }
        );
        resetAddForm();
        activeView.value = "monitor";
        await loadAll();
      } else {
        message(String(res?.msg ?? res?.message ?? "添加失败"), {
          type: "warning"
        });
      }
    } catch (error: any) {
      const detail =
        error?.response?.data?.msg ??
        error?.response?.data?.message ??
        error?.message;
      message(detail ? `添加失败：${detail}` : "添加失败", { type: "error" });
    } finally {
      saving.value = false;
    }
  }

  async function toggleUsageSettingEnabled(row: {
    id?: number | string;
    enabled?: boolean;
    ruleName?: string;
  }) {
    const id = Number(row?.id);
    if (!Number.isFinite(id) || togglingEnabledId.value === id) return;
    const rule = usageRules.value.find(r => Number(r.id) === id);
    if (!rule) {
      message("未找到该用量设置", { type: "warning" });
      return;
    }
    const currentlyEnabled = row.enabled !== false;
    const nextEnabled = !currentlyEnabled;
    const actionLabel = nextEnabled ? "启用" : "禁用";
    try {
      await ElMessageBox.confirm(
        `确认${actionLabel}用量参数「${row.ruleName ?? id}」？`,
        `${actionLabel}确认`,
        { type: "warning" }
      );
    } catch {
      return;
    }
    togglingEnabledId.value = id;
    try {
      const payload = alarmRuleRowToSavePayload(rule, { enabled: nextEnabled });
      const res = (await saveAlarmRule(payload)) as Record<string, any>;
      const ok = Number(res?.code) === 0 || res?.success === true;
      if (ok) {
        message(`已${actionLabel}`, { type: "success" });
        await loadUsageRules();
      } else {
        message(String(res?.msg ?? res?.message ?? `${actionLabel}失败`), {
          type: "warning"
        });
      }
    } catch (error: any) {
      const detail =
        error?.response?.data?.msg ??
        error?.response?.data?.message ??
        error?.message;
      message(detail ? `${actionLabel}失败：${detail}` : `${actionLabel}失败`, {
        type: "error"
      });
    } finally {
      togglingEnabledId.value = null;
    }
  }

  async function removeUsageSetting(row: { id?: number | string }) {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) return;
    try {
      await ElMessageBox.confirm(
        `确认删除用量参数「${(row as any).ruleName ?? id}」？`,
        "删除确认",
        { type: "warning" }
      );
    } catch {
      return;
    }
    try {
      const res = (await deleteAlarmRule({ id })) as Record<string, any>;
      const ok = res?.code === 0 || res?.success === true;
      if (ok) {
        message("已删除", { type: "success" });
        await loadAll();
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
    loadAll();
  });

  return {
    activeView,
    loading,
    saving,
    togglingEnabledId,
    filter,
    addForm,
    collectorOptions,
    ruleOptions,
    meterSelectOptions,
    columns,
    dataList,
    pagination,
    usageSettingRows,
    usageSettingColumns,
    onSearch,
    resetFilter,
    handleSizeChange,
    handleCurrentChange,
    goMonitor,
    goAdd,
    submitAdd,
    resetAddForm,
    removeUsageSetting,
    toggleUsageSettingEnabled,
    loadAll
  };
}
