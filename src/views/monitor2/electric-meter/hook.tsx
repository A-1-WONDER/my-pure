import dayjs from "dayjs";
import { h, type Ref, reactive, ref, onMounted, toRaw } from "vue";
import EditForm from "./edit-form.vue";
import BasicBusiness from "../meter-template/basic-business.vue";
import { message } from "@/utils/message";
import { addDialog, closeDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { getKeyList } from "@pureadmin/utils";
import {
  getMeterList,
  deleteMeters,
  batchUpdateMeterStatus,
  getElectricMeterDetails,
  simpleMeterApi,
  updateMeter,
  updateMeterReading
} from "@/api/meters";
import { getMeterTypeConfig } from "@/config/meter-types";
import { utils, writeFile } from "xlsx";

const electricMeterConfig = getMeterTypeConfig("electric");

export function useElectricMeter(tableRef: Ref) {
  const allowDemoFallback = !import.meta.env.PROD;
  const statusMap = {
    "0": { text: "在线", type: "success" },
    "1": { text: "未在线", type: "warning" },
    NORMAL: { text: "在线", type: "success" },
    ONLINE: { text: "在线", type: "success" },
    FAULT: { text: "故障", type: "danger" },
    ERROR: { text: "故障", type: "danger" },
    OFFLINE: { text: "离线", type: "warning" }
  };

  const getStatusDisplay = (statusValue?: string | number | null) => {
    if (
      statusValue === null ||
      statusValue === undefined ||
      statusValue === ""
    ) {
      return { text: "未知", type: "info" };
    }
    return (
      statusMap[String(statusValue).toUpperCase()] || {
        text: String(statusValue),
        type: "info"
      }
    );
  };

  const pickStatusValue = (row: Record<string, any>) => {
    if (
      row.laststatus !== null &&
      row.laststatus !== undefined &&
      row.laststatus !== ""
    ) {
      return row.laststatus;
    }
    if (
      row.lastStatus !== null &&
      row.lastStatus !== undefined &&
      row.lastStatus !== ""
    ) {
      return row.lastStatus;
    }
    return row.status;
  };

  const extractLastStatus = (response: Record<string, any>) => {
    return (
      response?.data?.laststatus ??
      response?.data?.lastStatus ??
      response?.data?.data?.laststatus ??
      response?.data?.data?.lastStatus ??
      response?.laststatus ??
      response?.lastStatus
    );
  };

  const loadLastStatusForMeters = async (meters: any[]) => {
    if (!meters.length) return meters;

    const detailResults = await Promise.allSettled(
      meters.map(async meter => {
        if (!meter?.id) return { id: meter?.id, laststatus: undefined };
        const response = await getElectricMeterDetails(meter.id);
        const laststatus = extractLastStatus(response);
        console.log("电表详情状态:", {
          meterId: meter.id,
          response,
          extractedLastStatus: laststatus
        });
        return {
          id: meter.id,
          laststatus
        };
      })
    );

    const lastStatusMap = new Map<number, string | number>();
    detailResults.forEach(result => {
      if (result.status !== "fulfilled") return;
      const { id, laststatus } = result.value;
      if (
        id !== null &&
        id !== undefined &&
        laststatus !== null &&
        laststatus !== undefined &&
        laststatus !== ""
      ) {
        lastStatusMap.set(id, laststatus);
      }
    });

    return meters.map(meter => ({
      ...meter,
      laststatus: lastStatusMap.get(meter.id),
      status:
        lastStatusMap.get(meter.id) !== undefined
          ? lastStatusMap.get(meter.id)
          : meter.status
    }));
  };

  const form = reactive({
    meterNo: "",
    blurry: "",
    meterType: undefined as string | undefined,
    status: undefined as string | undefined,
    collectorId: undefined as number | undefined,
    userId: undefined as number | undefined,
    enabled: undefined as boolean | undefined,
    page: 0,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);
  const selectedNum = ref(0);
  const selectedRows = ref([]);

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
      label: "序号",
      prop: "id",
      minWidth: 80
    },
    {
      label: "标签",
      prop: "meterNo",
      minWidth: 120
    },
    {
      label: "采集器",
      prop: "collectorId",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        const text =
          row.collectorName ||
          row.collectorNo ||
          (row.collectorId != null ? `采集器${row.collectorId}` : "-");
        return <span>{text}</span>;
      }
    },
    {
      label: "在线状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const status = getStatusDisplay(pickStatusValue(row));
        return (
          <el-tag size={props.size} type={status.type} effect="plain">
            {status.text}
          </el-tag>
        );
      }
    },
    {
      label: "通讯质量",
      prop: "signalStrength",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        const signal = row.signalStrength || 0;
        let type = "info";
        if (signal >= 80) type = "success";
        else if (signal >= 50) type = "warning";
        else type = "danger";

        return (
          <el-tag size="small" type={type} effect="plain">
            {signal}%
          </el-tag>
        );
      }
    },
    {
      label: "通讯地址",
      prop: "meterAddress",
      minWidth: 150
    },
    {
      label: "用户",
      prop: "userId",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        return <span>{row.remark || `用户${row.userId}`}</span>;
      }
    },
    {
      label: "电表类型",
      prop: "meterType",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        const typeMap = {
          electric: "电表",
          water: "水表",
          gas: "气表",
          heat: "热表",
          "single-phase": "单相",
          "three-phase": "三相",
          prepaid: "预付费",
          multiRate: "多费率"
        };
        return <span>{typeMap[row.meterType] || row.meterType}</span>;
      }
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 120,
      formatter: ({ remark }) => remark || "-"
    },
    {
      label: "累计用电量",
      prop: "totalPower",
      minWidth: 120,
      formatter: ({ totalPower }) => `${totalPower || 0} kWh`
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation",
      minWidth: 150
    }
  ];

  function handleSizeChange(val: number) {
    console.log(`【handleSizeChange】每页条数变化，新值: ${val}`);
    console.log(`【handleSizeChange】当前pagination:`, toRaw(pagination));
    pagination.pageSize = val;
    form.size = val;
    pagination.currentPage = 1; // 每页条数改变时，重置到第一页
    console.log(`【handleSizeChange】更新后的pagination:`, toRaw(pagination));
    onSearch();
  }

  function handleCurrentChange(val: number) {
    console.log(`【handleCurrentChange】分页变化，新页码: ${val}`);
    console.log(`【handleCurrentChange】当前pagination:`, toRaw(pagination));
    pagination.currentPage = val;
    form.page = val - 1; // 前端从1开始，后端从0开始
    console.log(
      `【handleCurrentChange】更新后的pagination:`,
      toRaw(pagination)
    );
    onSearch();
  }

  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    selectedRows.value = val;
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
          if (column.prop === "status") {
            // 处理在线状态
            arr.push(getStatusDisplay(pickStatusValue(item)).text);
          } else if (column.prop === "signalStrength") {
            // 处理通讯质量
            arr.push(`${item[column.prop] || 0}%`);
          } else if (column.prop === "collectorId") {
            // 处理采集器
            arr.push(
              item.collectorName ||
                item.collectorNo ||
                (item.collectorId != null ? `采集器${item.collectorId}` : "-")
            );
          } else if (column.prop === "userId") {
            // 处理用户
            arr.push(item.remark || `用户${item.userId}`);
          } else if (column.prop === "meterType") {
            // 处理电表类型
            const typeMap = {
              electric: "电表",
              water: "水表",
              gas: "气表",
              heat: "热表",
              "single-phase": "单相",
              "three-phase": "三相",
              prepaid: "预付费",
              multiRate: "多费率"
            };
            arr.push(typeMap[item[column.prop]] || item[column.prop]);
          } else if (column.prop === "totalPower") {
            // 处理累计用电量
            arr.push(`${item[column.prop] || 0} kWh`);
          } else {
            arr.push(item[column.prop] || "-");
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
    utils.book_append_sheet(workBook, workSheet, "电表管理");

    // 导出文件
    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    writeFile(workBook, `电表管理_${dateStr}.xlsx`);

    message("导出成功", {
      type: "success"
    });
  };

  function onSelectionCancel() {
    selectedNum.value = 0;
    selectedRows.value = [];
    tableRef.value.getTableRef().clearSelection();
  }

  async function onbatchDel() {
    if (selectedRows.value.length === 0) {
      message("请先选择要删除的电表", { type: "warning" });
      return;
    }

    try {
      const ids = getKeyList(selectedRows.value, "id");
      const { success, message: msg } = await deleteMeters(ids);
      if (success) {
        message(`已删除 ${ids.length} 个电表`, {
          type: "success"
        });
        onSelectionCancel();
        onSearch();
      } else {
        message(msg || "删除失败", { type: "error" });
      }
    } catch (error) {
      console.error("删除电表失败:", error);
      message("删除失败，请重试", { type: "error" });
    }
  }

  // 批量更新状态
  async function onBatchUpdateStatus(status: string, reason?: string) {
    if (selectedRows.value.length === 0) {
      message("请先选择要更新状态的电表", { type: "warning" });
      return;
    }

    try {
      const ids = getKeyList(selectedRows.value, "id");
      const {
        success,
        message: msg,
        data
      } = await batchUpdateMeterStatus({
        meterIds: ids,
        status: status,
        reason: reason
      });
      if (success) {
        message(`已更新 ${data?.updatedCount || ids.length} 个电表状态`, {
          type: "success"
        });
        onSelectionCancel();
        onSearch();
      } else {
        message(msg || "更新失败", { type: "error" });
      }
    } catch (error) {
      console.error("批量更新电表状态失败:", error);
      message("更新失败，请重试", { type: "error" });
    }
  }

  function clearAll() {
    message("已删除所有电表数据", {
      type: "success"
    });
    onSearch();
  }

  function buildMeterUpdatePayload(
    row: Record<string, any>,
    saveData: Record<string, any>
  ) {
    const statusRaw = saveData.status ?? row.status;
    const statusNum =
      statusRaw === "" || statusRaw === null || statusRaw === undefined
        ? row.status
        : Number(statusRaw);
    return {
      id: row.id,
      meterId: row.meterId ?? row.id,
      meterNo: saveData.meterNo ?? row.meterNo,
      meterType: row.meterType || "electric",
      installAddress:
        saveData.address ?? row.installAddress ?? row.address ?? "",
      meterAddress: row.meterAddress,
      remark: saveData.remark ?? row.remark,
      status: Number.isFinite(statusNum) ? statusNum : row.status,
      installTime: saveData.installTime || row.installTime,
      collectorId: row.collectorId,
      userId: row.userId,
      enabled: row.enabled,
      totalPower:
        saveData.currentReading === "" || saveData.currentReading == null
          ? row.totalPower
          : Number(saveData.currentReading)
    };
  }

  function onEdit(row) {
    addDialog({
      title: "编辑电表",
      width: "40%",
      hideFooter: true,
      appendToBody: true,
      destroyOnClose: true,
      contentRenderer: ({ options, index }) =>
        h(EditForm, {
          data: {
            ...row,
            address: row.installAddress ?? row.address ?? "",
            currentReading:
              row.totalPower != null && row.totalPower !== ""
                ? String(row.totalPower)
                : (row.currentReading ?? ""),
            userName:
              row.userName ??
              (row.userId != null && row.userId !== ""
                ? String(row.userId)
                : "")
          },
          onSave: async (saveData: Record<string, any>) => {
            try {
              await updateMeter(buildMeterUpdatePayload(row, saveData) as any);
              const reading = Number(saveData.currentReading);
              if (
                Number.isFinite(reading) &&
                row.id != null &&
                String(saveData.currentReading ?? "") !==
                  String(row.totalPower ?? "")
              ) {
                try {
                  await updateMeterReading(Number(row.id), {
                    readingValue: reading,
                    readingTime:
                      saveData.lastReadTime ||
                      dayjs().format("YYYY-MM-DD HH:mm:ss"),
                    readingType: "manual",
                    readingSource: "manual"
                  });
                } catch {
                  // 主档案已保存，读数接口失败不阻断
                }
              }
              message("保存成功", { type: "success" });
              closeDialog(options, index, { command: "sure" });
              await onSearch();
            } catch {
              message("保存失败", { type: "error" });
            }
          },
          onClose: () => {
            closeDialog(options, index, { command: "cancel" });
          }
        })
    });
  }

  function onBiz(row) {
    addDialog({
      title: "基本业务",
      width: "60%",
      appendToBody: true,
      destroyOnClose: true,
      closeOnClickModal: false,
      hideFooter: true,
      contentRenderer: () => BasicBusiness,
      props: {
        data: row,
        meterType: "electric",
        config: electricMeterConfig
      },
      on: {
        refresh: () => {
          onSearch();
          message("已刷新", { type: "success" });
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
      const requestParams: Record<string, unknown> = {
        page: pagination.currentPage,
        size: pagination.pageSize
      };
      if (form.meterNo) requestParams.meterNo = form.meterNo;
      if (form.blurry) requestParams.blurry = form.blurry;
      if (form.meterType) requestParams.meterType = form.meterType;
      if (form.status) requestParams.status = form.status;
      if (form.collectorId) requestParams.collectorId = form.collectorId;
      if (form.userId) requestParams.userId = form.userId;
      if (form.enabled !== undefined && form.enabled !== null) {
        requestParams.enabled = form.enabled;
      }

      console.log("发送的请求参数:", requestParams);

      // 首先尝试调用原版API
      let response;
      try {
        response = await getMeterList(requestParams);
        console.log("原版API响应:", response);
      } catch (primaryError) {
        if (!allowDemoFallback) throw primaryError;
        console.log("原版API调用失败，尝试简化版API:", primaryError);
        response = await simpleMeterApi.getMeterList(requestParams);
        console.log("简化版API响应:", response);
        if (response && response.success) {
          message("使用演示数据（简化版接口）", { type: "info" });
        }
      }

      if (response && response.success) {
        // 成功响应
        if (response.data) {
          // 有数据
          dataList.value = await loadLastStatusForMeters(
            response.data.content || []
          );
          pagination.total = response.data.totalElements || 0;

          // 设置pageSize：优先使用响应中的size，否则使用当前pageSize
          pagination.pageSize = response.data?.size ?? pagination.pageSize;

          // 设置currentPage：优先使用响应中的number，否则使用请求参数中的page，否则保持当前值
          if (response.data?.number !== undefined) {
            // 后端返回的number从0开始，前端从1开始
            pagination.currentPage = response.data.number + 1;
          } else if (requestParams.page !== undefined) {
            // 使用请求参数中的page（从1开始）
            pagination.currentPage = Number(requestParams.page) || 1;
          }
          // 否则保持当前的currentPage值

          // 如果数据为空，显示提示
          if (dataList.value.length === 0) {
            message("暂无电表数据", { type: "info" });
          }
        } else {
          // 数据字段为空
          dataList.value = [];
          pagination.total = 0;
          pagination.pageSize = 10;
          pagination.currentPage = 1;
          message("暂无电表数据", { type: "info" });
        }
      } else {
        // 业务逻辑失败
        const errorMsg = response?.message || "查询失败";
        message(errorMsg, { type: "error" });
        dataList.value = [];
        pagination.total = 0;
        pagination.currentPage = 1;

        // 如果是数据库连接问题，给出友好提示
        if (errorMsg.includes("数据库") || errorMsg.includes("连接")) {
          console.error("数据库连接问题:", errorMsg);
        }
      }
    } catch (error) {
      // 网络或系统错误
      console.error("查询电表列表失败:", error);

      let errorMsg = "查询失败，请重试";
      if (error.message?.includes("Network Error")) {
        errorMsg = "网络连接失败，请检查后端服务是否运行";
      } else if (error.message?.includes("timeout")) {
        errorMsg = "请求超时，请检查网络连接";
      }

      message(errorMsg, { type: "error" });
      dataList.value = [];
      pagination.total = 0;
      pagination.currentPage = 1;
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.meterNo = "";
    form.blurry = "";
    form.meterType = undefined;
    form.status = undefined;
    form.collectorId = undefined;
    form.userId = undefined;
    form.enabled = undefined;
    form.page = 0;
    form.size = 10;
    pagination.currentPage = 1;
    pagination.pageSize = 10;
    pagination.total = 0;
    onSearch();
  };

  onMounted(() => {
    onSearch();
  });

  // 状态选项：用于下拉选择
  const statusOptions = [
    { label: "正常", value: "NORMAL" },
    { label: "故障", value: "FAULT" },
    { label: "离线", value: "OFFLINE" }
  ];

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
    onBatchUpdateStatus,
    exportExcel,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange,
    statusOptions
  };
}
