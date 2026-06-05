import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import BasicBusiness from "./basic-business.vue";
import Open1Dialog from "./open1-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted } from "vue";
import { getKeyList } from "@pureadmin/utils";
// import { getWaterMeterList } from "@/api/water-meter"; // TODO: 当后端API准备好后启用
import { utils, writeFile } from "xlsx";

export function useWaterMeter(tableRef: Ref) {
  const form = reactive({
    meterNo: "",
    userName: "",
    address: "",
    installTime: ""
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
      label: "水表编号",
      prop: "meterNo",
      minWidth: 120
    },
    {
      label: "用户名称",
      prop: "userName",
      minWidth: 120
    },
    {
      label: "安装地址",
      prop: "address",
      minWidth: 160
    },
    {
      label: "当前读数",
      prop: "currentReading",
      minWidth: 120,
      formatter: ({ currentReading }) => `${currentReading} m³`
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={
            row.status === 1
              ? "success"
              : row.status === 2
                ? "warning"
                : "danger"
          }
          effect="plain"
        >
          {row.status === 1 ? "正常" : row.status === 2 ? "告警" : "停用"}
        </el-tag>
      )
    },
    {
      label: "安装时间",
      prop: "installTime",
      minWidth: 180,
      formatter: ({ installTime }) =>
        dayjs(installTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "最后抄表时间",
      prop: "lastReadTime",
      minWidth: 180,
      formatter: ({ lastReadTime }) =>
        lastReadTime ? dayjs(lastReadTime).format("YYYY-MM-DD HH:mm:ss") : "-"
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
    console.log(`${val} items per page`);
  }

  function handleCurrentChange(val: number) {
    console.log(`current page: ${val}`);
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
          if (column.prop === "installTime" || column.prop === "lastReadTime") {
            // 格式化时间
            const time = item[column.prop];
            arr.push(time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-");
          } else if (column.prop === "currentReading") {
            // 处理读数
            arr.push(`${item[column.prop]} m³`);
          } else if (column.prop === "status") {
            // 处理状态
            const statusMap = { 1: "正常", 2: "告警", 3: "停用" };
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
    utils.book_append_sheet(workBook, workSheet, "水表管理");

    // 导出文件
    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    writeFile(workBook, `水表管理_${dateStr}.xlsx`);

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
    message("已删除所有水表数据", {
      type: "success"
    });
    onSearch();
  }

  function onEdit(row) {
    addDialog({
      title: "编辑水表",
      width: "40%",
      contentRenderer: () => EditForm,
      props: {
        data: row
      },
      closeCallBack: ({ options, index: _index }) => {
        if (options.props.data) {
          message("保存成功", { type: "success" });
          onSearch();
        }
      },
      on: {
        save: _data => {
          message("保存成功", { type: "success" });
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
    // const { code, data } = await getWaterMeterList(toRaw(form));

    // 模拟数据
    const mockData = [
      {
        id: 1,
        meterNo: "WM-001",
        userName: "张三",
        address: "北京市朝阳区建国门外大街1号",
        currentReading: 1256.8,
        status: 1,
        installTime: "2023-05-10 09:30:00",
        lastReadTime: "2024-01-20 10:15:00",
        remark: "居民用水，正常使用"
      },
      {
        id: 2,
        meterNo: "WM-002",
        userName: "李四",
        address: "北京市海淀区中关村大街27号",
        currentReading: 892.3,
        status: 2,
        installTime: "2023-06-15 14:20:00",
        lastReadTime: "2024-01-19 09:45:00",
        remark: "商业用水，水量异常"
      },
      {
        id: 3,
        meterNo: "WM-003",
        userName: "王五",
        address: "北京市东城区王府井大街88号",
        currentReading: 456.7,
        status: 1,
        installTime: "2023-07-20 11:10:00",
        lastReadTime: "2024-01-21 08:30:00",
        remark: "新安装用户"
      },
      {
        id: 4,
        meterNo: "WM-004",
        userName: "赵六",
        address: "北京市西城区金融大街33号",
        currentReading: 2100.5,
        status: 3,
        installTime: "2023-04-05 16:45:00",
        lastReadTime: "2023-12-25 10:00:00",
        remark: "已停用，用户搬迁"
      },
      {
        id: 5,
        meterNo: "WM-005",
        userName: "孙七",
        address: "北京市丰台区科技园区8号",
        currentReading: 1789.2,
        status: 1,
        installTime: "2023-08-12 13:25:00",
        lastReadTime: "2024-01-22 14:20:00",
        remark: "工业用水，用量较大"
      }
    ];

    // 应用搜索过滤
    let filteredData = mockData;

    if (form.meterNo) {
      filteredData = filteredData.filter(
        item =>
          item.meterNo &&
          item.meterNo.toLowerCase().includes(form.meterNo.toLowerCase())
      );
    }

    if (form.userName) {
      filteredData = filteredData.filter(
        item =>
          item.userName &&
          item.userName.toLowerCase().includes(form.userName.toLowerCase())
      );
    }

    if (form.address) {
      filteredData = filteredData.filter(
        item =>
          item.address &&
          item.address.toLowerCase().includes(form.address.toLowerCase())
      );
    }

    if (form.installTime) {
      // 这里简化处理，实际应该根据时间范围过滤
      filteredData = filteredData.filter(
        item => item.installTime && item.installTime.includes(form.installTime)
      );
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
