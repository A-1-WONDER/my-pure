import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import BasicBusiness from "./basic-business.vue";
import Open1Dialog from "./open1-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { getKeyList } from "@pureadmin/utils";
import { getCollectorList } from "@/api/collector";
import type { CollectorInfo } from "@/api/types";
import { utils, writeFile } from "xlsx";

export function useCollector(tableRef: Ref) {
  const form = reactive({
    name: "",
    code: "",
    createTime: ""
  });
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
    console.log(`【handleSizeChange】每页条数变化，新值: ${val}`);
    console.log(`【handleSizeChange】当前pagination:`, toRaw(pagination));
    pagination.pageSize = val;
    pagination.currentPage = 1; // 每页条数改变时，重置到第一页
    console.log(`【handleSizeChange】更新后的pagination:`, toRaw(pagination));
    onSearch();
  }

  function handleCurrentChange(val: number) {
    console.log(`【handleCurrentChange】分页变化，新页码: ${val}`);
    console.log(`【handleCurrentChange】当前pagination:`, toRaw(pagination));
    pagination.currentPage = val;
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

  function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    message(`已删除序号为 ${getKeyList(curSelected, "id")} 的数据`, {
      type: "success"
    });
    tableRef.value.getTableRef().clearSelection();
    onSearch();
  }

  function clearAll() {
    message("已删除所有采集器数据", {
      type: "success"
    });
    onSearch();
  }

  function onEdit(row) {
    console.log("编辑采集器，row对象:", row);
    console.log("row.id:", row.id);
    console.log("row.remark:", row.remark);

    addDialog({
      title: "编辑采集器",
      width: "40%",
      contentRenderer: () => EditForm,
      props: {
        data: row,
        onSave: saveData => {
          console.log("onSave回调被调用，接收到的数据:", saveData);
          console.log("saveData.remark:", saveData?.remark);
          console.log("当前行的id:", row.id);
          console.log("当前dataList:", dataList.value);

          // 更新本地数据
          const index = dataList.value.findIndex(item => {
            // 处理数字和字符串类型的id比较
            return String(item.id) === String(row.id);
          });
          console.log("找到的索引:", index);

          if (index !== -1) {
            console.log("更新前的数据备注:", dataList.value[index].remark);
            console.log("要更新的数据备注:", saveData.remark);

            // 保留原始数据的id，更新其他字段
            dataList.value[index] = {
              ...dataList.value[index],
              ...saveData
            };

            console.log("更新后的数据备注:", dataList.value[index].remark);

            // 确保id字段不被覆盖（保持原始id）
            dataList.value[index].id = row.id;

            // 触发响应式更新
            dataList.value = [...dataList.value];
            console.log(
              "更新后的dataList备注字段:",
              dataList.value.map(item => ({ id: item.id, remark: item.remark }))
            );
          } else {
            console.error("未找到对应的数据项，id:", row.id);
            console.error(
              "dataList中的id列表:",
              dataList.value.map(item => ({
                id: item.id,
                type: typeof item.id
              }))
            );
          }
          message("采集器信息保存成功", { type: "success" });
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
          console.log("open1 event received, opening Open1Dialog");
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

  async function onSearch() {
    loading.value = true;

    // 调试信息：打印请求参数
    console.log("=== 采集器管理调试信息 ===");
    console.log("1. 请求参数:", {
      ...toRaw(form),
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    console.log("2. 当前pagination:", toRaw(pagination));
    console.log("3. 导入的getCollectorList函数:", getCollectorList);

    try {
      // 调用真实后端API - 使用GET方法，查询参数
      // 将前端表单字段映射到后端字段，并过滤空值
      const params = {};
      if (form.name) params.collectorName = form.name; // 前端name对应后端collectorName
      if (form.code) params.collectorNo = form.code; // 前端code对应后端collectorNo
      // createTime字段可能需要特殊处理，暂时不传
      params.page = pagination.currentPage; // 后端从1开始（根据后端文档）
      params.size = pagination.pageSize; // 改为size
      console.log("4. 实际发送的请求参数:", params);

      const result = await getCollectorList(params);
      console.log("5. API响应结果:", result);

      // 处理Spring Data格式: {content: [...], totalElements: N, size: 10, number: 0, ...}
      // 注意：后端直接返回Spring Data格式，没有包装在{success, message, data}中
      if (result && typeof result === "object") {
        console.log("6. 数据解析成功，响应格式:", result);
        const responseData = result;

        // 将后端字段映射到前端字段
        dataList.value = (responseData?.content || []).map(item => {
          const mappedItem = {
            id: item.id,
            name: item.collectorName || item.name, // 采集器名称
            code: item.collectorNo || item.code, // 采集器编号
            location: item.installAddress || item.location, // 安装位置
            status: item.status,
            lastCollectTime: item.lastCommunicationTime || item.lastCollectTime, // 最后采集时间
            createTime: item.createdAt || item.createTime, // 创建时间
            remark: item.remark,
            // 保留原始字段以便调试
            collectorName: item.collectorName,
            collectorNo: item.collectorNo,
            installAddress: item.installAddress,
            lastCommunicationTime: item.lastCommunicationTime,
            createdAt: item.createdAt
          };

          // 添加其他可能需要的字段
          if (item.ipAddress !== undefined)
            mappedItem.ipAddress = item.ipAddress;
          if (item.port !== undefined) mappedItem.port = item.port;
          if (item.protocol !== undefined) mappedItem.protocol = item.protocol;
          if (item.enabled !== undefined) mappedItem.enabled = item.enabled;
          if (item.model !== undefined) mappedItem.model = item.model;

          return mappedItem;
        });

        pagination.total = responseData?.totalElements || 0;

        // 设置pageSize：优先使用响应中的size，否则使用当前pageSize
        pagination.pageSize = responseData?.size ?? pagination.pageSize;

        // 设置currentPage：优先使用响应中的number，否则使用请求参数中的page，否则保持当前值
        if (responseData?.number !== undefined) {
          // 后端返回的number从0开始，前端从1开始
          pagination.currentPage = responseData.number + 1;
        } else if (params.page !== undefined) {
          // 使用请求参数中的page（从1开始）
          pagination.currentPage = params.page;
        }
        // 否则保持当前的currentPage值

        console.log("7.1 响应数据:", {
          size: responseData?.size,
          number: responseData?.number,
          totalElements: responseData?.totalElements
        });
        console.log("7.2 请求参数:", params);
        console.log("7.3 更新前pagination:", {
          pageSize: pagination.pageSize,
          currentPage: pagination.currentPage,
          total: pagination.total
        });
        console.log("7. 更新后的pagination:", toRaw(pagination));
        console.log(
          "7.1 响应中的size:",
          responseData?.size,
          "number:",
          responseData?.number
        );
        console.log("7.2 请求参数中的page:", params.page);
        console.log("8. 更新后的dataList长度:", dataList.value.length);
        console.log("9. 映射后的第一条数据:", dataList.value[0]);

        // 如果数据为空，显示提示
        if (dataList.value.length === 0) {
          message("暂无采集器数据", { type: "info" });
        }
      } else {
        console.error("10. API返回异常响应:", result);
        // 处理API返回的错误
        message("获取数据失败: 响应格式异常", {
          type: "error"
        });
        dataList.value = [];
        pagination.total = 0;
      }
    } catch (error) {
      console.error("10. API调用异常:", error);
      console.error("11. 错误详情:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data,
        params: error.config?.params,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers
      });

      // 尝试解析响应数据
      if (error.response?.data) {
        try {
          const errorData =
            typeof error.response.data === "string"
              ? JSON.parse(error.response.data)
              : error.response.data;
          console.error("12. 响应数据解析:", errorData);
        } catch (parseError) {
          console.error("13. 响应数据解析失败:", parseError);
          console.error("14. 原始响应数据:", error.response.data);
        }
      }

      // 处理网络错误
      console.error("API调用失败:", error);

      let errorMsg = "网络请求失败，请检查网络连接";

      // 根据错误类型显示不同的提示
      if (error.response?.data?.message) {
        const backendMsg = error.response.data.message;

        if (backendMsg.includes("Table.*collector.*doesn't exist")) {
          errorMsg = "数据库表不存在，请联系后端创建collectors表";
        } else if (backendMsg.includes("SQL")) {
          errorMsg = "数据库查询错误，请检查数据库连接和表结构";
        } else {
          errorMsg = backendMsg;
        }
      }

      message(errorMsg, { type: "error" });
      dataList.value = [];
      pagination.total = 0;
    } finally {
      console.log("15. 请求完成，loading设置为false");
      loading.value = false;
      console.log("=== 调试信息结束 ===");
    }
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
