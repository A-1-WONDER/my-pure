import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import DetailDialog from "./detail-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { getKeyList } from "@pureadmin/utils";
import {
  clearAllAlarmEvents,
  getAlarmEventQueryList
} from "@/api/alarm-event-query";
import type { AlarmEvent } from "@/api/types";

export function useAlarmEventQuery(tableRef: Ref) {
  const form = reactive({
    alarmType: "",
    alarmLevel: "",
    alarmStatus: "",
    alarmTime: ""
  });
  const dataList = ref<AlarmEvent[]>([]);
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
      minWidth: 80
    },
    {
      label: "报警类型",
      prop: "alarmType",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const typeMap = {
          device_fault: "设备故障",
          data_abnormal: "数据异常",
          communication_interrupt: "通信中断",
          threshold_exceed: "阈值超限"
        };
        const typeText = typeMap[row.alarmType] || row.alarmType;
        return (
          <el-tag size={props.size} type="warning" effect="plain">
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
          urgent: "紧急",
          important: "重要",
          normal: "一般",
          info: "提示"
        };
        const levelText = levelMap[row.alarmLevel] || row.alarmLevel;
        const levelColor =
          {
            urgent: "danger",
            important: "warning",
            normal: "primary",
            info: "info"
          }[row.alarmLevel] || "info";

        return (
          <el-tag size={props.size} type={levelColor} effect="plain">
            {levelText}
          </el-tag>
        );
      }
    },
    {
      label: "报警状态",
      prop: "alarmStatus",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const statusMap = {
          pending: "未处理",
          processing: "处理中",
          resolved: "已处理",
          closed: "已关闭"
        };
        const statusText = statusMap[row.alarmStatus] || row.alarmStatus;
        const statusColor =
          {
            pending: "danger",
            processing: "warning",
            resolved: "success",
            closed: "info"
          }[row.alarmStatus] || "info";

        return (
          <el-tag size={props.size} type={statusColor} effect="plain">
            {statusText}
          </el-tag>
        );
      }
    },
    {
      label: "设备名称",
      prop: "deviceName",
      minWidth: 140
    },
    {
      label: "设备编号",
      prop: "deviceCode",
      minWidth: 140
    },
    {
      label: "报警内容",
      prop: "alarmContent",
      minWidth: 180,
      showOverflowTooltip: true
    },
    {
      label: "报警时间",
      prop: "alarmTime",
      minWidth: 160,
      formatter: ({ alarmTime }) =>
        dayjs(alarmTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "处理时间",
      prop: "processTime",
      minWidth: 160,
      formatter: ({ processTime }) =>
        processTime ? dayjs(processTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "处理人员",
      prop: "processor",
      minWidth: 120,
      formatter: ({ processor }) => processor || "-"
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 140,
      showOverflowTooltip: true
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation"
    }
  ];

  function handleSizeChange(val: number) {
    console.log(`${val} items per page`);
  }

  function handleCurrentChange(val: number) {
    console.log(`current page: ${val}`);
  }

  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    tableRef.value.setAdaptive();
  }

  function onSelectionCancel() {
    selectedNum.value = 0;
    tableRef.value.getTableRef().clearSelection();
  }

  function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    message(`已删除序号为 ${getKeyList(curSelected, "id")} 的数据`, {
      type: "success"
    });
    tableRef.value.getTableRef().clearSelection();
    onSearch();
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
    addDialog({
      title: "处理报警事件",
      width: "40%",
      contentRenderer: () => EditForm,
      props: {
        data: row
      },
      closeCallBack: ({ options, index: _index }) => {
        if (options.props.data) {
          message("处理成功", { type: "success" });
          onSearch();
        }
      },
      on: {
        save: _data => {
          message("处理成功", { type: "success" });
          onSearch();
        },
        close: () => {
          // 关闭对话框
        }
      }
    });
  }

  function onBiz(row) {
    addDialog({
      title: "报警事件详情",
      width: "50%",
      contentRenderer: () => DetailDialog,
      props: {
        data: row
      },
      hideFooter: true
    });
  }

  async function onSearch() {
    loading.value = true;
    const { code, data } = await getAlarmEventQueryList(toRaw(form));
    if (code === 0) {
      dataList.value = data.list;
      pagination.total = data.total;
      pagination.pageSize = data.pageSize;
      pagination.currentPage = data.currentPage;
    }

    setTimeout(() => {
      loading.value = false;
    }, 500);
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
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
