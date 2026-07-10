import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import BasicBusiness from "./basic-business.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { getKeyList } from "@pureadmin/utils";
import {
  getMeterList,
  simpleMeterApi,
  updateMeter,
  deleteMeters
} from "@/api/meters";
import { getMeterTypeConfig } from "@/config/meter-types";
import { utils, writeFile } from "xlsx";

// 表类型配置
const meterTypeConfig = {
  water: {
    name: "水表",
    unit: "m³",
    mockData: [
      {
        id: 1,
        meterNo: "WM00000001",
        meterType: "water",
        collectorId: 1,
        collectorName: "采集器001",
        collectorNo: "COL000001",
        status: "NORMAL",
        signalStrength: 92,
        meterAddress: "000011111111",
        userId: 1,
        userName: "张三",
        address: "北京市朝阳区建国门外大街1号",
        totalPower: 1256.8,
        remainingAmount: 156.3,
        installTime: "2023-05-10 09:30:00",
        lastReadTime: "2024-01-20 10:15:00",
        remark: "居民用水，正常使用"
      }
    ]
  },
  electric: {
    name: "电表",
    unit: "kWh",
    mockData: [
      {
        id: 1,
        meterNo: "EL00000001",
        meterType: "single-phase",
        collectorId: 1,
        collectorName: "采集器001",
        collectorNo: "COL000001",
        status: "NORMAL",
        signalStrength: 85,
        meterAddress: "000012345678",
        userId: 1,
        userName: "张三",
        address: "北京市朝阳区建国门外大街1号",
        voltage: 220.5,
        current: 15.2,
        totalPower: 12568.5,
        remainingAmount: 256.8,
        temperature: 25.5,
        installTime: "2023-05-10 09:30:00",
        lastReadTime: "2024-01-20 10:15:00",
        remark: "居民用电，正常使用"
      },
      {
        id: 2,
        meterNo: "EL00000002",
        meterType: "three-phase",
        collectorId: 2,
        collectorName: "采集器002",
        collectorNo: "COL000002",
        status: "OFFLINE",
        signalStrength: 35,
        meterAddress: "000023456789",
        userId: 2,
        userName: "李四",
        address: "北京市海淀区中关村大街2号",
        voltage: 380.0,
        current: 25.8,
        totalPower: 8567.2,
        remainingAmount: 128.5,
        temperature: 28.0,
        installTime: "2023-06-15 14:20:00",
        lastReadTime: "2024-01-19 09:30:00",
        remark: "商业用电，信号较弱"
      },
      {
        id: 3,
        meterNo: "EL00000003",
        meterType: "prepaid",
        collectorId: 1,
        collectorName: "采集器001",
        collectorNo: "COL000001",
        status: "FAULT",
        signalStrength: 90,
        meterAddress: "000034567890",
        userId: 3,
        userName: "王五",
        address: "北京市西城区金融街3号",
        voltage: 220.0,
        current: 12.5,
        totalPower: 4567.8,
        remainingAmount: 45.2,
        temperature: 22.5,
        installTime: "2023-07-20 10:45:00",
        lastReadTime: "2024-01-18 16:20:00",
        remark: "预付费电表，故障待修"
      }
    ]
  },
  gas: {
    name: "气表",
    unit: "m³",
    mockData: [
      {
        id: 1,
        meterNo: "GM00000001",
        meterType: "gas",
        collectorId: 3,
        collectorName: "采集器003",
        collectorNo: "COL000003",
        status: "NORMAL",
        signalStrength: 78,
        meterAddress: "000022222222",
        userId: 1,
        userName: "张三",
        address: "北京市朝阳区建国门外大街1号",
        totalPower: 456.7,
        remainingAmount: 89.5,
        installTime: "2023-05-10 09:30:00",
        lastReadTime: "2024-01-20 10:15:00",
        remark: "居民用气，正常使用"
      }
    ]
  }
};

function mergeMeterConfig(type: string) {
  const base = meterTypeConfig[type] || meterTypeConfig.water;
  try {
    const meta = getMeterTypeConfig(type);
    return {
      ...base,
      name: meta.name,
      unit: meta.unit,
      icon: meta.icon,
      extraFields: meta.extraFields ?? []
    };
  } catch {
    return {
      ...base,
      extraFields: [] as Array<{
        label: string;
        prop: string;
        formatter: string;
      }>
    };
  }
}

export function useMeterTemplate(tableRef: Ref, meterType: string) {
  const config = mergeMeterConfig(meterType);
  const allowDemoFallback = !import.meta.env.PROD;

  const form = reactive({
    meterNo: "",
    meterType: undefined as string | undefined,
    status: undefined as string | undefined,
    collectorId: undefined as number | undefined,
    userId: undefined as number | undefined,
    page: 0,
    size: 10
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

  // 动态生成表格列
  const generateColumns = () => {
    const baseColumns = [
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
        cellRenderer: scope => {
          return (
            <span>
              {scope.row.collectorNo ||
                scope.row.collectorName ||
                `采集器${scope.row.collectorId || ""}`}
            </span>
          );
        }
      },
      {
        label: "在线状态",
        prop: "status",
        minWidth: 100,
        cellRenderer: scope => {
          const statusMap = {
            NORMAL: { text: "在线", type: "success" },
            FAULT: { text: "故障", type: "danger" },
            OFFLINE: { text: "离线", type: "warning" }
          };
          const status = statusMap[scope.row.status] || {
            text: "未知",
            type: "info"
          };
          return (
            <el-tag size={scope.props.size} type={status.type} effect="plain">
              {status.text}
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
        cellRenderer: scope => {
          return (
            <span>
              {scope.row.remark ||
                scope.row.userInfo?.userName ||
                scope.row.userName ||
                `用户${scope.row.userId || ""}`}
            </span>
          );
        }
      },
      {
        label: "电表类型",
        prop: "meterType",
        minWidth: 100,
        cellRenderer: scope => {
          const typeMap = {
            "single-phase": "单相",
            "three-phase": "三相",
            prepaid: "预付费",
            multiRate: "多费率"
          };
          return (
            <span>{typeMap[scope.row.meterType] || scope.row.meterType}</span>
          );
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
        formatter: ({ totalPower }) =>
          `${totalPower || 0} ${config.unit || "kWh"}`
      },
      {
        label: "剩余金额",
        prop: "remainingAmount",
        minWidth: 100,
        formatter: ({ remainingAmount }) => `¥${remainingAmount || 0}`
      },
      {
        label: "其他",
        prop: "otherInfo",
        minWidth: 120,
        cellRenderer: scope => {
          const info = [];
          if (scope.row.voltage) info.push(`${scope.row.voltage}V`);
          if (scope.row.current) info.push(`${scope.row.current}A`);
          if (scope.row.temperature) info.push(`${scope.row.temperature}°C`);
          return <span>{info.join(" / ") || "-"}</span>;
        }
      },
      {
        label: "操作",
        fixed: "right",
        slot: "operation",
        minWidth: 150
      }
    ];

    return baseColumns;
  };

  const columns = generateColumns();

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
    tableRef.value.setAdaptive();
  }

  // 导出Excel功能
  const exportExcel = () => {
    if (dataList.value.length === 0) {
      message(`没有${config.name}数据可以导出`, { type: "warning" });
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
            const statusMap = {
              NORMAL: "在线",
              FAULT: "故障",
              OFFLINE: "离线"
            };
            arr.push(statusMap[item[column.prop]] || "未知");
          } else if (column.prop === "collectorId") {
            // 处理采集器
            arr.push(
              item.collectorNo ||
                item.collectorName ||
                `采集器${item.collectorId || ""}`
            );
          } else if (column.prop === "userId") {
            // 处理用户
            arr.push(
              item.remark ||
                item.userInfo?.userName ||
                item.userName ||
                `用户${item.userId || ""}`
            );
          } else if (column.prop === "meterType") {
            // 处理电表类型
            const typeMap = {
              "single-phase": "单相",
              "three-phase": "三相",
              prepaid: "预付费",
              multiRate: "多费率"
            };
            arr.push(typeMap[item[column.prop]] || item[column.prop]);
          } else if (column.prop === "totalPower") {
            // 处理累计用电量
            arr.push(`${item[column.prop] || 0} ${config.unit || "kWh"}`);
          } else if (column.prop === "remainingAmount") {
            // 处理剩余金额
            arr.push(`¥${item[column.prop] || 0}`);
          } else if (column.prop === "otherInfo") {
            // 处理其他信息
            const info = [];
            if (item.voltage) info.push(`${item.voltage}V`);
            if (item.current) info.push(`${item.current}A`);
            if (item.temperature) info.push(`${item.temperature}°C`);
            arr.push(info.join(" / ") || "-");
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
    utils.book_append_sheet(workBook, workSheet, `${config.name}管理`);

    // 导出文件
    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    writeFile(workBook, `${config.name}管理_${dateStr}.xlsx`);

    message("导出成功", {
      type: "success"
    });
  };

  function onSelectionCancel() {
    selectedNum.value = 0;
    tableRef.value.getTableRef().clearSelection();
  }

  function buildMeterUpdatePayload(
    row: Record<string, any>,
    saveData: Record<string, any>
  ) {
    return {
      id: row.id,
      meterId: row.meterId ?? row.id,
      meterNo: saveData.meterNo ?? row.meterNo,
      meterType: row.meterType || meterType,
      installAddress: saveData.address ?? row.installAddress ?? row.address,
      remark: saveData.remark ?? row.remark,
      status: saveData.status ?? row.status,
      installTime: saveData.installTime ?? row.installTime,
      collectorId: row.collectorId,
      userId: row.userId,
      enabled: row.enabled
    };
  }

  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id")
      .map(id => Number(id))
      .filter(id => Number.isFinite(id));
    if (!ids.length) {
      message(`请先选择要删除的${config.name}`, { type: "warning" });
      return;
    }
    try {
      await deleteMeters(ids);
      message(`已删除 ${ids.length} 条${config.name}数据`, { type: "success" });
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
      const baseParams = {
        meterType: meterType,
        meterNo: form.meterNo || "",
        status: form.status || "",
        collectorId: form.collectorId || "",
        userId: form.userId || "",
        size: 200
      };
      do {
        const response = await getMeterList({ ...baseParams, page });
        const items = response?.content ?? response?.data?.content ?? [];
        allIds.push(...items.map((item: { id: number }) => item.id));
        total = response?.totalElements ?? response?.data?.totalElements ?? 0;
        page += 1;
      } while (allIds.length < total && page <= 50);
      if (!allIds.length) {
        message(`暂无${config.name}数据`, { type: "info" });
        return;
      }
      await deleteMeters(allIds);
      message(`已删除全部 ${allIds.length} 条${config.name}数据`, {
        type: "success"
      });
      selectedNum.value = 0;
      onSearch();
    } catch {
      message("清空失败", { type: "error" });
    }
  }

  function onEdit(row) {
    try {
      addDialog({
        title: `编辑${config.name}`,
        width: "40%",
        contentRenderer: () => EditForm,
        props: {
          data: row,
          meterType: meterType,
          config: config
        },
        closeCallBack: ({ options, index: _index }) => {
          if (options.props.data) {
            message("保存成功", { type: "success" });
            onSearch();
          }
        },
        on: {
          save: async saveData => {
            try {
              await updateMeter(buildMeterUpdatePayload(row, saveData));
              message("保存成功", { type: "success" });
              onSearch();
            } catch {
              message("保存失败", { type: "error" });
            }
          },
          close: () => {
            // 关闭对话框
          }
        }
      });
    } catch (error) {
      console.error("打开编辑弹窗失败:", error);
      message(`打开编辑${config.name}失败，请查看控制台日志`, {
        type: "error"
      });
    }
  }

  function onBiz(row) {
    try {
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
          meterType: meterType,
          config: config
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
    } catch (error) {
      console.error("打开基本业务弹窗失败:", error);
      message("打开基本业务失败，请查看控制台日志", { type: "error" });
    }
  }

  async function onSearch() {
    loading.value = true;

    try {
      // 准备请求参数，确保传递所有字段
      const requestParams = {
        meterNo: form.meterNo || "",
        meterType: form.meterType || "",
        status: form.status || "",
        collectorId: form.collectorId || "",
        userId: form.userId || "",
        page: pagination.currentPage, // 使用pagination的currentPage
        size: pagination.pageSize // 使用pagination的pageSize
      };

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
          message(`使用${config.name}演示数据（简化版接口）`, { type: "info" });
        }
      }

      // 处理响应数据
      if (response) {
        // 判断响应格式
        if (response.success !== undefined) {
          // 格式1: {success: true, data: {...}}
          if (response.success && response.data) {
            dataList.value = response.data.content || [];
            pagination.total = response.data.totalElements || 0;

            // 设置pageSize：优先使用响应中的size，否则使用当前pageSize
            pagination.pageSize = response.data?.size ?? pagination.pageSize;

            // 设置currentPage：优先使用响应中的number，否则使用请求参数中的page，否则保持当前值
            if (response.data?.number !== undefined) {
              // 后端返回的number从0开始，前端从1开始
              pagination.currentPage = response.data.number + 1;
            } else if (requestParams.page !== undefined) {
              // 使用请求参数中的page（从1开始）
              pagination.currentPage = requestParams.page;
            }
            // 否则保持当前的currentPage值
          } else {
            // 业务逻辑失败
            const errorMsg = response?.message || "查询失败";
            message(errorMsg, { type: "error" });
            dataList.value = [];
            pagination.total = 0;
            pagination.currentPage = 1;
          }
        } else if (response.content !== undefined) {
          // 格式2: 直接返回Spring Data格式 {content: [], totalElements: 0, ...}
          dataList.value = response.content || [];
          pagination.total = response.totalElements || 0;

          // 设置pageSize：优先使用响应中的size，否则使用当前pageSize
          pagination.pageSize = response?.size ?? pagination.pageSize;

          // 设置currentPage：优先使用响应中的number，否则使用请求参数中的page，否则保持当前值
          if (response?.number !== undefined) {
            // 后端返回的number从0开始，前端从1开始
            pagination.currentPage = response.number + 1;
          } else if (requestParams.page !== undefined) {
            // 使用请求参数中的page（从1开始）
            pagination.currentPage = requestParams.page;
          }
          // 否则保持当前的currentPage值
        } else {
          // 未知格式
          console.warn("未知的响应格式:", response);
          dataList.value = [];
          pagination.total = 0;
        }

        // 如果数据为空，显示提示
        if (dataList.value.length === 0) {
          message(`暂无${config.name}数据`, { type: "info" });
        }
      } else {
        // 响应为空
        message("查询失败，响应为空", { type: "error" });
        dataList.value = [];
        pagination.total = 0;
      }
    } catch (error) {
      // 网络或系统错误
      console.error(`查询${config.name}列表失败:`, error);
      console.error("错误详情:", error.response?.data);

      // 如果后端数据库表不存在或表结构不完整，使用mock数据
      if (
        error.response?.data?.message?.includes(
          "Table.*meter.*doesn't exist"
        ) ||
        error.response?.data?.message?.includes("Unknown column 'is_deleted'")
      ) {
        console.log("数据库表结构问题，使用mock数据");

        // 使用模拟数据
        let filteredData = [...config.mockData];

        if (form.meterNo) {
          filteredData = filteredData.filter(
            item =>
              item.meterNo &&
              item.meterNo.toLowerCase().includes(form.meterNo.toLowerCase())
          );
        }

        if (form.status) {
          filteredData = filteredData.filter(
            item => item.status === form.status
          );
        }

        if (form.meterType) {
          filteredData = filteredData.filter(
            item => item.meterType === form.meterType
          );
        }

        if (form.collectorId) {
          filteredData = filteredData.filter(
            item => item.collectorId === form.collectorId
          );
        }

        if (form.userId) {
          filteredData = filteredData.filter(
            item => item.userId === form.userId
          );
        }

        dataList.value = filteredData;
        pagination.total = filteredData.length;
        pagination.pageSize = 10;
        pagination.currentPage = 1;
        form.page = 0;
        form.size = 10;

        message(`数据库表结构不完整，使用演示数据`, { type: "warning" });
      } else {
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
      }
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.meterNo = "";
    form.meterType = undefined;
    form.status = undefined;
    form.collectorId = undefined;
    form.userId = undefined;
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
    exportExcel,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
