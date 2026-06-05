import dayjs from "dayjs";
import MeterEditForm from "./meter-edit-form.vue";
import BasicBusiness from "./basic-business.vue";
import Open1Dialog from "./open1-dialog.vue";
import TagSettingDialog from "./tag-setting-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted } from "vue";
import { getKeyList } from "@pureadmin/utils";
// import { getMeterDataList } from "@/api/system"; // TODO: 当后端API准备好后启用
import { utils, writeFile } from "xlsx";

export function useRole(tableRef: Ref) {
  const form = reactive({
    collectorNo: "",
    meterNo: "",
    user: "",
    onlineStatus: "",
    meterType: "",
    status: ""
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
      label: "序号",
      prop: "index",
      minWidth: 80,
      cellRenderer: ({ index }) => {
        const currentPage = pagination.currentPage;
        const pageSize = pagination.pageSize;
        return (currentPage - 1) * pageSize + index + 1;
      }
    },
    {
      label: "标签",
      prop: "tag",
      minWidth: 120,
      cellRenderer: ({ row, props }) => (
        <div class="flex items-center gap-2">
          <span>{row.tag || "未设置"}</span>
          <el-button
            size={props.size}
            type="primary"
            link
            onClick={() => onTagSetting(row)}
          >
            设置标签
          </el-button>
        </div>
      )
    },
    {
      label: "采集器",
      prop: "collector",
      minWidth: 100
    },
    {
      label: "在线状态",
      prop: "onlineStatus",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.onlineStatus === "在线" ? "success" : "danger"}
          effect="plain"
        >
          {row.onlineStatus || "离线"}
        </el-tag>
      )
    },
    {
      label: "通讯地址",
      prop: "address",
      minWidth: 140
    },
    {
      label: "用户",
      prop: "user",
      minWidth: 100
    },
    {
      label: "电表类型",
      prop: "meterType",
      minWidth: 100
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 120
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.status === "正常" ? "success" : "warning"}
          effect="plain"
        >
          {row.status || "未知"}
        </el-tag>
      )
    },
    {
      label: "累计用电量",
      prop: "totalPower",
      minWidth: 120,
      formatter: ({ totalPower }) => `${totalPower || 0} kWh`
    },
    {
      label: "剩余金额",
      prop: "remainingAmount",
      minWidth: 120,
      formatter: ({ remainingAmount }) => `¥${remainingAmount || 0}`
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

  // 标签设置功能
  function onTagSetting(row) {
    addDialog({
      title: "设置标签",
      width: "500px",
      contentRenderer: () => TagSettingDialog,
      props: {
        data: row
      },
      on: {
        "add-tag": tagData => {
          message(
            `已添加标签：采集器号=${tagData.collectorNo}, 表号=${tagData.meterNo}, 用户=${tagData.relatedUser}`,
            {
              type: "success"
            }
          );
          // 这里可以调用API保存标签信息
        },
        close: () => {
          // 关闭对话框
        }
      }
    });
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
          if (column.prop === "totalPower") {
            arr.push(`${item[column.prop] || 0} kWh`);
          } else if (column.prop === "remainingAmount") {
            arr.push(`¥${item[column.prop] || 0}`);
          } else if (
            column.prop === "onlineStatus" ||
            column.prop === "status"
          ) {
            arr.push(item[column.prop] || "未知");
          } else {
            arr.push(item[column.prop] || "");
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
    utils.book_append_sheet(workBook, workSheet, "系统日志");

    // 导出文件
    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    writeFile(workBook, `系统日志_${dateStr}.xlsx`);

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
    message("已删除所有日志数据", {
      type: "success"
    });
    onSearch();
  }

  function onEdit(row) {
    console.log("onEdit被调用，row对象:", row);
    console.log("row.id:", row.id);

    addDialog({
      title: "编辑电表信息",
      width: "50%",
      contentRenderer: () => MeterEditForm,
      props: {
        data: row,
        onSave: saveData => {
          console.log("onSave回调被调用，接收到的数据:", saveData);
          console.log("saveData.remark:", saveData?.remark);
          console.log("当前行的id:", row.id);
          console.log("当前dataList:", dataList.value);

          // 更新本地数据 - 处理id类型转换
          const index = dataList.value.findIndex(item => {
            // 处理数字和字符串类型的id比较
            return String(item.id) === String(row.id);
          });
          console.log("找到的索引:", index);

          if (index !== -1) {
            // 处理数字字段转换
            const updatedData = {
              ...saveData,
              totalPower: saveData.totalPower
                ? parseFloat(saveData.totalPower)
                : 0,
              remainingAmount: saveData.remainingAmount
                ? parseFloat(saveData.remainingAmount)
                : 0
            };

            console.log("更新前的数据备注:", dataList.value[index].remark);
            console.log("要更新的数据备注:", updatedData.remark);

            // 保留原始数据的id，更新其他字段
            dataList.value[index] = {
              ...dataList.value[index],
              ...updatedData
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
          message("电表信息保存成功", { type: "success" });
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

  function onBiz(row) {
    addDialog({
      title: "基本业务",
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

    // 使用模拟数据，不调用API
    // TODO: 当后端API准备好后，替换为真实的API调用
    // const { code, data } = await getMeterDataList(toRaw(form));

    // 模拟数据
    const mockData = [
      {
        id: 1,
        tag: "电表001",
        collector: "采集器A",
        onlineStatus: "在线",
        address: "北京市朝阳区",
        user: "张三",
        meterType: "智能电表",
        remark: "正常使用",
        status: "正常",
        totalPower: 1250.5,
        remainingAmount: 356.8
      },
      {
        id: 2,
        tag: "电表002",
        collector: "采集器B",
        onlineStatus: "离线",
        address: "北京市海淀区",
        user: "李四",
        meterType: "普通电表",
        remark: "需要维护",
        status: "异常",
        totalPower: 890.2,
        remainingAmount: 120.5
      },
      {
        id: 3,
        tag: "电表003",
        collector: "采集器C",
        onlineStatus: "在线",
        address: "北京市东城区",
        user: "王五",
        meterType: "智能电表",
        remark: "新安装",
        status: "正常",
        totalPower: 450.8,
        remainingAmount: 280.3
      },
      {
        id: 4,
        tag: "电表004",
        collector: "采集器D",
        onlineStatus: "在线",
        address: "北京市西城区",
        user: "赵六",
        meterType: "智能电表",
        remark: "商业用电",
        status: "正常",
        totalPower: 3200.7,
        remainingAmount: 520.1
      },
      {
        id: 5,
        tag: "电表005",
        collector: "采集器E",
        onlineStatus: "离线",
        address: "北京市丰台区",
        user: "孙七",
        meterType: "普通电表",
        remark: "长期未使用",
        status: "维护中",
        totalPower: 150.3,
        remainingAmount: 85.2
      }
    ];

    // 应用搜索过滤
    let filteredData = mockData;

    if (form.collectorNo) {
      filteredData = filteredData.filter(
        item =>
          item.collector &&
          item.collector.toLowerCase().includes(form.collectorNo.toLowerCase())
      );
    }

    if (form.meterNo) {
      filteredData = filteredData.filter(
        item =>
          item.tag &&
          item.tag.toLowerCase().includes(form.meterNo.toLowerCase())
      );
    }

    if (form.user) {
      filteredData = filteredData.filter(
        item =>
          item.user && item.user.toLowerCase().includes(form.user.toLowerCase())
      );
    }

    if (form.onlineStatus) {
      filteredData = filteredData.filter(
        item => item.onlineStatus === form.onlineStatus
      );
    }

    if (form.meterType) {
      filteredData = filteredData.filter(
        item =>
          item.meterType &&
          item.meterType.toLowerCase().includes(form.meterType.toLowerCase())
      );
    }

    if (form.status) {
      filteredData = filteredData.filter(item => item.status === form.status);
    }

    dataList.value = filteredData;
    pagination.total = filteredData.length;
    pagination.pageSize = 10;
    pagination.currentPage = 1;

    setTimeout(() => {
      loading.value = false;
    }, 300);
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
    onTagSetting,
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
