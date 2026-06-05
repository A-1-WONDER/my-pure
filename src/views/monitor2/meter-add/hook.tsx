import dayjs from "dayjs";
import EditForm from "./edit-form.vue";
import BasicBusiness from "./basic-business.vue";
import Open1Dialog from "./open1-dialog.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted } from "vue";
import { getKeyList } from "@pureadmin/utils";
// import { getMeterAddList } from "@/api/meter-add"; // TODO: 当后端API准备好后启用
import { utils, writeFile } from "xlsx";

export function useMeterAdd(tableRef: Ref) {
  const form = reactive({
    meterType: "",
    meterNo: "",
    manufacturer: "",
    addTime: ""
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
      label: "表具类型",
      prop: "meterType",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const typeMap = {
          water: "水表",
          electric: "电表",
          gas: "气表"
        };
        const typeText = typeMap[row.meterType] || row.meterType;
        const typeColor =
          {
            water: "primary",
            electric: "warning",
            gas: "success"
          }[row.meterType] || "info";

        return (
          <el-tag size={props.size} type={typeColor} effect="plain">
            {typeText}
          </el-tag>
        );
      }
    },
    {
      label: "表具编号",
      prop: "meterNo",
      minWidth: 140
    },
    {
      label: "生产厂家",
      prop: "manufacturer",
      minWidth: 140
    },
    {
      label: "型号规格",
      prop: "model",
      minWidth: 120
    },
    {
      label: "精度等级",
      prop: "accuracy",
      minWidth: 100,
      formatter: ({ accuracy }) => `${accuracy} 级`
    },
    {
      label: "通信方式",
      prop: "communication",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const commMap = {
          lora: "LoRa",
          nbiot: "NB-IoT",
          gprs: "GPRS",
          rs485: "RS485",
          mbus: "MBus"
        };
        return (
          <el-tag size={props.size} type="info" effect="plain">
            {commMap[row.communication] || row.communication}
          </el-tag>
        );
      }
    },
    {
      label: "添加时间",
      prop: "addTime",
      minWidth: 180,
      formatter: ({ addTime }) => dayjs(addTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "添加人员",
      prop: "addUser",
      minWidth: 120
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.status === 1 ? "success" : "warning"}
          effect="plain"
        >
          {row.status === 1 ? "已启用" : "未启用"}
        </el-tag>
      )
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
          if (column.prop === "addTime") {
            // 格式化时间
            arr.push(dayjs(item[column.prop]).format("YYYY-MM-DD HH:mm:ss"));
          } else if (column.prop === "accuracy") {
            // 处理精度
            arr.push(`${item[column.prop]} 级`);
          } else if (column.prop === "meterType") {
            // 处理表具类型
            const typeMap = {
              water: "水表",
              electric: "电表",
              gas: "气表"
            };
            arr.push(typeMap[item[column.prop]] || item[column.prop]);
          } else if (column.prop === "communication") {
            // 处理通信方式
            const commMap = {
              lora: "LoRa",
              nbiot: "NB-IoT",
              gprs: "GPRS",
              rs485: "RS485",
              mbus: "MBus"
            };
            arr.push(commMap[item[column.prop]] || item[column.prop]);
          } else if (column.prop === "status") {
            // 处理状态
            arr.push(item[column.prop] === 1 ? "已启用" : "未启用");
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
    utils.book_append_sheet(workBook, workSheet, "添加表管理");

    // 导出文件
    const dateStr = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    writeFile(workBook, `添加表管理_${dateStr}.xlsx`);

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
    message("已删除所有表具数据", {
      type: "success"
    });
    onSearch();
  }

  function onEdit(row) {
    addDialog({
      title: "编辑表具",
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
    // const { code, data } = await getMeterAddList(toRaw(form));

    // 模拟数据
    const mockData = [
      {
        id: 1,
        meterType: "electric",
        meterNo: "EM-20240001",
        manufacturer: "华为技术有限公司",
        model: "DTZY71-Z",
        accuracy: 1,
        communication: "nbiot",
        addTime: "2024-01-15 10:30:00",
        addUser: "张三",
        status: 1,
        remark: "智能电表，支持远程抄表"
      },
      {
        id: 2,
        meterType: "water",
        meterNo: "WM-20240002",
        manufacturer: "宁波水表股份有限公司",
        model: "LXS-15E",
        accuracy: 2,
        communication: "lora",
        addTime: "2024-01-16 14:20:00",
        addUser: "李四",
        status: 1,
        remark: "旋翼式水表"
      },
      {
        id: 3,
        meterType: "gas",
        meterNo: "GM-20240003",
        manufacturer: "金卡智能集团",
        model: "G2.5",
        accuracy: 1.5,
        communication: "gprs",
        addTime: "2024-01-17 09:15:00",
        addUser: "王五",
        status: 0,
        remark: "物联网燃气表"
      },

      {
        id: 5,
        meterType: "electric",
        meterNo: "EM-20240005",
        manufacturer: "威胜集团",
        model: "DTSY341",
        accuracy: 0.5,
        communication: "rs485",
        addTime: "2024-01-19 11:30:00",
        addUser: "孙七",
        status: 1,
        remark: "三相四线电子式电能表"
      }
    ];

    // 应用搜索过滤
    let filteredData = mockData;

    if (form.meterType) {
      filteredData = filteredData.filter(
        item =>
          item.meterType &&
          item.meterType.toLowerCase().includes(form.meterType.toLowerCase())
      );
    }

    if (form.meterNo) {
      filteredData = filteredData.filter(
        item =>
          item.meterNo &&
          item.meterNo.toLowerCase().includes(form.meterNo.toLowerCase())
      );
    }

    if (form.manufacturer) {
      filteredData = filteredData.filter(
        item =>
          item.manufacturer &&
          item.manufacturer
            .toLowerCase()
            .includes(form.manufacturer.toLowerCase())
      );
    }

    if (form.addTime) {
      // 这里简化处理，实际应该根据时间范围过滤
      filteredData = filteredData.filter(
        item => item.addTime && item.addTime.includes(form.addTime)
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
