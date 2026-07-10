import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import DetailDialog from "./detail-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted } from "vue";
import { getKeyList } from "@pureadmin/utils";
import {
  batchDeleteAlarmEvents,
  clearAllAlarmEvents,
  getAlarmEventQueryList,
  processAlarmEvent
} from "@/api/alarm-event-query";
import { getAlarmTypeLabel, getAlarmTypeTagType } from "../constants";

/** 兼容 { code: 0 } 与 { success: true }（mock/_util 与部分后端） */
function isAlarmListResponseOk(res: Record<string, any> | null | undefined) {
  if (!res) return false;
  if (res.code === 0) return true;
  if (res.success === true) return true;
  return false;
}

function resolveAlarmStatus(row: Record<string, any>) {
  const s = row.alarmStatus;
  const numMap: Record<number, { text: string; type: string }> = {
    0: { text: "未处理", type: "warning" },
    1: { text: "处理中", type: "primary" },
    2: { text: "已处理", type: "success" }
  };
  const strMap: Record<string, { text: string; type: string }> = {
    pending: { text: "未处理", type: "warning" },
    processing: { text: "处理中", type: "primary" },
    resolved: { text: "已处理", type: "success" },
    closed: { text: "已关闭", type: "info" },
    handled: { text: "已处理", type: "success" }
  };
  if (s === null || s === undefined || s === "") {
    return { text: "-", type: "info" };
  }
  if (typeof s === "number" && Number.isFinite(s)) {
    return numMap[s] ?? { text: String(s), type: "info" };
  }
  if (typeof s === "string" && /^\d+$/.test(s)) {
    const n = Number(s);
    return numMap[n] ?? { text: s, type: "info" };
  }
  if (typeof s === "string" && strMap[s]) {
    return strMap[s];
  }
  return { text: String(s), type: "info" };
}

export function useAlarmEventQuery(tableRef: Ref) {
  const form = reactive({
    alarmType: "",
    alarmLevel: "",
    alarmStatus: "",
    alarmTime: null as [Date, Date] | [string, string] | null,
    deviceId: "",
    meterNo: "",
    collectorId: ""
  });
  const dataList = ref([]);
  const loading = ref(true);
  const selectedNum = ref(0);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "勾选列",
      type: "selection",
      fixed: "left",
      reserveSelection: true
    },
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "规则ID",
      prop: "ruleId",
      minWidth: 90
    },
    {
      label: "报警类型",
      prop: "alarmType",
      minWidth: 140,
      cellRenderer: ({ row, props }) => {
        const typeText = getAlarmTypeLabel(row.alarmType);
        const typeColor = getAlarmTypeTagType(row.alarmType);
        return (
          <el-tag size={props.size} type={typeColor} effect="plain">
            {typeText}
          </el-tag>
        );
      }
    },
    {
      label: "报警级别",
      prop: "alarmLevel",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const levelMap = {
          normal: "一般",
          important: "重要",
          urgent: "紧急"
        };
        const levelText = levelMap[row.alarmLevel] || row.alarmLevel;
        const levelColor =
          {
            normal: "info",
            important: "warning",
            urgent: "danger"
          }[row.alarmLevel] || "info";

        return (
          <el-tag size={props.size} type={levelColor} effect="plain">
            {levelText}
          </el-tag>
        );
      }
    },
    {
      label: "表号",
      prop: "meterNo",
      minWidth: 120
    },
    {
      label: "设备ID",
      prop: "deviceId",
      minWidth: 100
    },
    {
      label: "电表主键",
      prop: "meterId",
      minWidth: 100
    },
    {
      label: "采集器",
      prop: "collectorId",
      minWidth: 110
    },
    {
      label: "报警值",
      prop: "alarmValue",
      minWidth: 100,
      formatter: ({ alarmValue }) =>
        alarmValue !== null && alarmValue !== undefined
          ? String(alarmValue)
          : "-"
    },
    {
      label: "报警状态",
      prop: "alarmStatus",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const { text, type } = resolveAlarmStatus(row);
        return (
          <el-tag size={props.size} type={type as any} effect="plain">
            {text}
          </el-tag>
        );
      }
    },
    {
      label: "报警时间",
      prop: "alarmTime",
      minWidth: 180,
      formatter: ({ alarmTime }) => {
        if (!alarmTime) return "-";
        const d = dayjs(alarmTime);
        return d.isValid()
          ? d.format("YYYY-MM-DD HH:mm:ss")
          : String(alarmTime);
      }
    },
    {
      label: "处理人",
      prop: "handledBy",
      minWidth: 100,
      formatter: ({ handledBy }) =>
        handledBy !== null && handledBy !== undefined && handledBy !== ""
          ? String(handledBy)
          : "-"
    },
    {
      label: "处理时间",
      prop: "handledTime",
      minWidth: 180,
      formatter: ({ handledTime }) => {
        if (!handledTime) return "-";
        const d = dayjs(handledTime);
        return d.isValid()
          ? d.format("YYYY-MM-DD HH:mm:ss")
          : String(handledTime);
      }
    },
    {
      label: "处理备注",
      prop: "handlingRemark",
      minWidth: 140
    },
    {
      label: "操作",
      fixed: "right",
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

  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    tableRef.value.setAdaptive();
  }

  function onSelectionCancel() {
    selectedNum.value = 0;
    tableRef.value.getTableRef().clearSelection();
  }

  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id")
      .map(id => Number(id))
      .filter(id => Number.isFinite(id));
    if (!ids.length) {
      message("请先选择要删除的报警事件", { type: "warning" });
      return;
    }
    try {
      const res = (await batchDeleteAlarmEvents(ids)) as Record<string, any>;
      const ok = res?.code === 0 || res?.success === true;
      if (ok) {
        message(`已删除 ${ids.length} 条报警事件`, { type: "success" });
        tableRef.value.getTableRef().clearSelection();
        selectedNum.value = 0;
        await onSearch();
      } else {
        message(String(res?.msg ?? res?.message ?? "删除失败"), {
          type: "warning"
        });
      }
    } catch {
      message("删除失败", { type: "error" });
    }
  }

  async function clearAll() {
    try {
      const res = (await clearAllAlarmEvents()) as Record<string, any>;
      const ok = res?.code === 0 || res?.success === true;
      if (ok) {
        message("已清空报警事件数据", { type: "success" });
        selectedNum.value = 0;
        try {
          tableRef.value?.getTableRef?.()?.clearSelection?.();
        } catch {
          /* noop */
        }
        pagination.currentPage = 1;
        await onSearch();
      } else {
        message(String(res?.msg ?? res?.message ?? "清空失败"), {
          type: "warning"
        });
      }
    } catch (e) {
      console.error("清空报警事件失败:", e);
      message("清空失败，请确认后端已实现 POST /alarm-event-clear-all", {
        type: "error"
      });
    }
  }

  function onEdit(row) {
    const alarmStatus = Number(row?.alarmStatus);
    if (alarmStatus === 1) {
      message("该报警事件已处理，无需重复处理", { type: "info" });
      return;
    }
    if (alarmStatus === 2) {
      message("该报警事件已关闭，无法再处理", { type: "warning" });
      return;
    }
    addDialog({
      title: "处理报警事件",
      width: "50%",
      hideFooter: true,
      contentRenderer: () => EditForm,
      props: {
        data: row
      },
      closeCallBack: ({ options }) => {
        if (options.props.data) {
          onSearch();
        }
      },
      on: {
        save: async payload => {
          try {
            const res = (await processAlarmEvent(payload)) as Record<
              string,
              any
            >;
            const ok = res?.code === 0 || res?.success === true;
            if (!ok) {
              message(String(res?.msg ?? res?.message ?? "处理失败"), {
                type: "warning"
              });
              return;
            }
            message("处理成功", { type: "success" });
            onSearch();
          } catch (error) {
            console.error("处理报警事件失败:", error);
            message("处理失败，请稍后重试", { type: "error" });
          }
        },
        close: () => {}
      }
    });
  }

  function onBiz(row) {
    addDialog({
      title: "报警事件详情",
      width: "60%",
      contentRenderer: () => DetailDialog,
      props: {
        data: row
      },
      hideFooter: true
    });
  }

  async function onSearch(opts?: { resetPage?: boolean }) {
    if (opts?.resetPage) {
      pagination.currentPage = 1;
    }
    loading.value = true;
    try {
      const payload: Record<string, unknown> = {
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize
      };
      if (form.alarmType) payload.alarmType = form.alarmType;
      if (form.alarmLevel) payload.alarmLevel = form.alarmLevel;
      if (form.alarmStatus !== "" && form.alarmStatus != null) {
        payload.alarmStatus = form.alarmStatus;
      }
      if (form.deviceId) payload.deviceId = form.deviceId;
      if (form.meterNo) payload.meterNo = form.meterNo;
      if (form.collectorId) payload.collectorId = form.collectorId;
      if (
        form.alarmTime &&
        Array.isArray(form.alarmTime) &&
        form.alarmTime.length === 2
      ) {
        payload.alarmTime = [
          dayjs(form.alarmTime[0]).format("YYYY-MM-DD HH:mm:ss"),
          dayjs(form.alarmTime[1]).format("YYYY-MM-DD HH:mm:ss")
        ];
      }

      const res = (await getAlarmEventQueryList(payload)) as Record<
        string,
        any
      >;
      const data = res?.data as Record<string, any> | undefined;

      if (isAlarmListResponseOk(res) && data) {
        const list = data.list ?? data.content ?? [];
        dataList.value = Array.isArray(list) ? list : [];
        pagination.total = Number(data.total ?? data.totalElements ?? 0) || 0;
        if (data.pageSize != null) pagination.pageSize = data.pageSize;
        if (data.size != null) pagination.pageSize = data.size;
        if (data.currentPage != null) {
          pagination.currentPage = data.currentPage;
        } else if (
          data.number != null &&
          Number.isFinite(Number(data.number))
        ) {
          pagination.currentPage = Number(data.number) + 1;
        }
      } else {
        const errMsg = res?.msg ?? res?.message ?? "查询失败";
        message(String(errMsg), { type: "warning" });
        dataList.value = [];
      }
    } catch (e) {
      console.error("报警事件查询失败:", e);
      message("报警事件查询失败", { type: "error" });
      dataList.value = [];
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.alarmTime = null;
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
    selectedNum,
    onSearch,
    onEdit,
    onBiz,
    clearAll,
    resetForm,
    onbatchDel,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
