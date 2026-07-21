import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import BasicBusiness from "./basic-business.vue";
import Open1Dialog from "./open1-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted } from "vue";
import { getKeyList } from "@pureadmin/utils";
import {
  getCollectorList,
  editCollector,
  deleteCollectors
} from "@/api/collector";
import type { CollectorInfo } from "@/api/types";
import { utils, writeFile } from "xlsx";

export function useCollector(tableRef: Ref) {
  const form = reactive({
    name: "",
    code: "",
    location: "",
    createTime: null as string[] | null
  });

  function applyCollectorSearchParams(params: Record<string, unknown>) {
    if (form.name) params.collectorName = form.name;
    if (form.code) params.collectorNo = form.code;
    if (form.location) params.location = form.location;
    if (Array.isArray(form.createTime) && form.createTime.length === 2) {
      params.createTime = [
        dayjs(form.createTime[0]).format("YYYY-MM-DD HH:mm:ss"),
        dayjs(form.createTime[1]).format("YYYY-MM-DD HH:mm:ss")
      ];
    }
  }
  const dataList = ref<CollectorInfo[]>([]);
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
      label: "采集器名称",
      prop: "name",
      minWidth: 120
    },
    {
      label: "采集器编号",
      prop: "code",
      minWidth: 120
    },
    {
      label: "安装位置",
      prop: "location",
      minWidth: 140
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        // 状态映射：与电表管理保持一致
        const statusMap = {
          NORMAL: { text: "在线", type: "success" },
          FAULT: { text: "故障", type: "danger" },
          OFFLINE: { text: "离线", type: "warning" },
          // 兼容数字状态值
          1: { text: "正常", type: "success" },
          0: { text: "异常", type: "danger" }
        };

        // 获取状态值，优先使用字符串状态
        const statusValue = row.status;
        const status = statusMap[statusValue] || { text: "未知", type: "info" };

        return (
          <el-tag size={props.size} type={status.type} effect="plain">
            {status.text}
          </el-tag>
        );
      }
    },
    {
      label: "最后采集时间",
      prop: "lastCollectTime",
      minWidth: 180,
      formatter: ({ lastCollectTime }) =>
        lastCollectTime
          ? dayjs(lastCollectTime).format("YYYY-MM-DD HH:mm:ss")
          : "-"
    },
    {
      label: "创建时间",
      prop: "createTime",
      minWidth: 180,
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "备注",
      prop: "remark",
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
    pagination.currentPage = 1; // 每页条数改变时，重置到第一页
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

  // 导出Excel功能
  const exportExcel = () => {
    if (dataList.value.length === 0) {
      message("没有数据可以导出", { type: "warning" });
      return;
    }

    // 准备数据
    const res = dataList.value.map(item => {
      const arr = [];
      // 排除勾选列和操作列
      columns.forEach(column => {
        if (column.type !== "selection" && column.slot !== "operation") {
          if (
            column.prop === "lastCollectTime" ||
            column.prop === "createTime"
          ) {
            // 格式化时间
            const time = item[column.prop];
            arr.push(time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-");
          } else if (column.prop === "status") {
            // 处理状态 - 与显示逻辑保持一致
            const statusMap = {
              NORMAL: "在线",
              FAULT: "故障",
              OFFLINE: "离线",
              1: "正常",
              0: "异常"
            };
            arr.push(statusMap[item[column.prop]] || "未知");
          } else {
            arr.push(item[column.prop]);
          }
        }
      });
      return arr;
    });

    // 准备表头
    const titleList = [];
    columns.forEach(column => {
      if (column.type !== "selection" && column.slot !== "operation") {
        titleList.push(column.label);
      }
    });

    // 添加表头到数据
    res.unshift(titleList);

    // 创建Excel
    const workSheet = utils.aoa_to_sheet(res);
    const workBook = utils.book_new();
    utils.book_append_sheet(workBook, workSheet, "采集器管理");

    // 导出文件
    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    writeFile(workBook, `采集器管理_${dateStr}.xlsx`);

    message("导出成功", {
      type: "success"
    });
  };

  function onSelectionCancel() {
    selectedNum.value = 0;
    tableRef.value.getTableRef().clearSelection();
  }

  function buildCollectorPayload(
    row: Record<string, any>,
    saveData: Record<string, any>
  ) {
    return {
      id: row.id,
      collectorNo: saveData.code ?? row.code ?? row.collectorNo,
      collectorName: saveData.name ?? row.name ?? row.collectorName,
      installAddress: saveData.location ?? row.location ?? row.installAddress,
      status: saveData.status ?? row.status,
      remark: saveData.remark ?? row.remark,
      ipAddress: row.ipAddress,
      port: row.port,
      protocol: row.protocol,
      enabled: row.enabled,
      model: row.model
    };
  }

  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id")
      .map(id => Number(id))
      .filter(id => Number.isFinite(id));
    if (!ids.length) {
      message("请先选择要删除的采集器", { type: "warning" });
      return;
    }
    try {
      await deleteCollectors(ids);
      message(`已删除 ${ids.length} 条采集器数据`, { type: "success" });
      tableRef.value.getTableRef().clearSelection();
      selectedNum.value = 0;
      onSearch();
    } catch {
      message("删除失败", { type: "error" });
    }
  }

  async function clearAll() {
    try {
      const allIds: number[] = [];
      let page = 1;
      let total = 0;
      const params: Record<string, unknown> = { size: 200 };
      applyCollectorSearchParams(params);
      do {
        const result = await getCollectorList({ ...params, page });
        const items = result?.content ?? [];
        allIds.push(...items.map((item: { id: number }) => item.id));
        total = result?.totalElements ?? 0;
        page += 1;
      } while (allIds.length < total && page <= 50);
      if (!allIds.length) {
        message("暂无采集器数据", { type: "info" });
        return;
      }
      await deleteCollectors(allIds);
      message(`已删除全部 ${allIds.length} 条采集器数据`, { type: "success" });
      selectedNum.value = 0;
      onSearch();
    } catch {
      message("清空失败", { type: "error" });
    }
  }

  function onEdit(row) {
    addDialog({
      title: "编辑采集器",
      width: "40%",
      contentRenderer: () => EditForm,
      props: {
        data: row,
        onSave: async saveData => {
          try {
            await editCollector(buildCollectorPayload(row, saveData));
            message("采集器信息保存成功", { type: "success" });
            onSearch();
          } catch {
            message("保存失败", { type: "error" });
          }
        }
      },
      closeCallBack: () => {
        // 对话框关闭回调，可以在这里处理一些清理工作
      },
      on: {
        close: () => {
          // 关闭对话框
        }
      }
    });
  }

  function onDetail(row) {
    addDialog({
      title: "采集器详情",
      width: "60%",
      contentRenderer: () => BasicBusiness,
      props: {
        data: row
      },
      on: {
        submit: _payload => {
          message("提交修改成功", { type: "success" });
        },
        refresh: () => {
          onSearch();
          message("已刷新", { type: "success" });
        },
        open1: () => {
          message("正在打开界面...", { type: "info" });
          addDialog({
            title: "打开1界面",
            width: "40%",
            contentRenderer: () => Open1Dialog,
            hideFooter: true
          });
        },
        close: () => {
          // nothing
        }
      }
    });
  }

  async function onSearch(opts?: { resetPage?: boolean }) {
    if (opts?.resetPage) {
      pagination.currentPage = 1;
    }
    loading.value = true;
    try {
      const params: Record<string, unknown> = {
        page: pagination.currentPage,
        size: pagination.pageSize
      };
      applyCollectorSearchParams(params);

      const result = await getCollectorList(params);

      if (result && typeof result === "object") {
        const responseData = result as {
          content?: Record<string, unknown>[];
          totalElements?: number;
          size?: number;
          number?: number;
        };

        dataList.value = (responseData.content ?? []).map(item => ({
          id: item.id,
          name: item.collectorName || item.name,
          code: item.collectorNo || item.code,
          location: item.installAddress || item.location,
          status: item.status,
          lastCollectTime: item.lastCommunicationTime || item.lastCollectTime,
          createTime: item.createdAt || item.createTime,
          remark: item.remark,
          collectorName: item.collectorName,
          collectorNo: item.collectorNo,
          installAddress: item.installAddress,
          lastCommunicationTime: item.lastCommunicationTime,
          createdAt: item.createdAt,
          ipAddress: item.ipAddress,
          port: item.port,
          protocol: item.protocol,
          enabled: item.enabled,
          model: item.model
        }));

        pagination.total = responseData.totalElements ?? 0;
        pagination.pageSize = responseData.size ?? pagination.pageSize;
        if (responseData.number !== undefined) {
          pagination.currentPage = responseData.number + 1;
        }

        if (dataList.value.length === 0) {
          message("暂无采集器数据", { type: "info" });
        }
      } else {
        message("获取数据失败: 响应格式异常", { type: "error" });
        dataList.value = [];
        pagination.total = 0;
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("[collector] 列表加载失败:", error);
      }
      const backendMsg = error?.response?.data?.message;
      message(
        typeof backendMsg === "string" && backendMsg
          ? backendMsg
          : "网络请求失败，请检查网络连接",
        { type: "error" }
      );
      dataList.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.name = "";
    form.code = "";
    form.createTime = null;
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
    onDetail,
    clearAll,
    resetForm,
    onbatchDel,
    exportExcel,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
