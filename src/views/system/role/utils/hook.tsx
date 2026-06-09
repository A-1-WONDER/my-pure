import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { transformI18n } from "@/plugins/i18n";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import type { PaginationProps } from "@pureadmin/table";
import { deviceDetection } from "@pureadmin/utils";
import {
  createRole,
  deleteRoles,
  getRoleList,
  getRoleMenuIds,
  getRolePermissionContext,
  updateRole,
  updateRoleMenus
} from "@/api/system";
import {
  checkedKeysToBackendMenuIds,
  collectRolePermissionTreeIds,
  type RolePermissionTreeNode
} from "@/utils/frontend-menu-tree";
import { type Ref, reactive, ref, onMounted, h, toRaw, watch } from "vue";

export function useRole(treeRef: Ref) {
  const form = reactive({
    name: "",
    code: ""
  });
  const curRow = ref();
  const formRef = ref();
  const dataList = ref([]);
  const treeIds = ref<Array<number | string>>([]);
  const treeData = ref<RolePermissionTreeNode[]>([]);
  const permissionTreeContext = ref<{
    tree: RolePermissionTreeNode[];
    menuIndex: Parameters<typeof checkedKeysToBackendMenuIds>[3];
  } | null>(null);
  const isShow = ref(false);
  const loading = ref(true);
  const saveMenuLoading = ref(false);
  const isLinkage = ref(false);
  const treeSearchValue = ref();
  const isExpandAll = ref(false);
  const isSelectAll = ref(false);
  const treeProps = {
    value: "id",
    label: "title",
    children: "children"
  };
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "角色编号",
      prop: "id"
    },
    {
      label: "角色名称",
      prop: "name"
    },
    {
      label: "角色级别",
      prop: "level",
      width: 90
    },
    {
      label: "数据权限",
      prop: "dataScope",
      minWidth: 100
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 160
    },
    {
      label: "创建时间",
      prop: "createTime",
      minWidth: 160,
      formatter: ({ createTime }) =>
        createTime ? dayjs(createTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 210,
      slot: "operation"
    }
  ];

  async function handleDelete(row) {
    try {
      await deleteRoles([row.id]);
      message(`已删除角色「${row.name}」`, { type: "success" });
      if (curRow.value?.id === row.id) {
        curRow.value = null;
        isShow.value = false;
      }
      onSearch();
    } catch {
      message("删除失败，请确认该角色未被用户使用", { type: "error" });
    }
  }

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
    console.log("handleSelectionChange", val);
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getRoleList({
        ...toRaw(form),
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      });
      if (code === 0 && data) {
        dataList.value = data.list;
        pagination.total = data.total;
        pagination.pageSize = data.pageSize;
        pagination.currentPage = data.currentPage;
      }
    } catch {
      message("加载角色列表失败，请确认已登录且具有角色查询权限", {
        type: "error"
      });
    } finally {
      setTimeout(() => {
        loading.value = false;
      }, 300);
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}角色`,
      props: {
        formInline: {
          id: row?.id,
          name: row?.name ?? "",
          remark: row?.remark ?? ""
        }
      },
      width: "40%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        FormRef.validate(async valid => {
          if (!valid) return;
          try {
            if (title === "新增") {
              await createRole(curData);
            } else {
              await updateRole(curData);
            }
            message(`已${title}角色「${curData.name}」`, { type: "success" });
            done();
            onSearch();
          } catch {
            message(`${title}失败，请检查角色名称是否重复或权限是否足够`, {
              type: "error"
            });
          }
        });
      }
    });
  }

  /** 菜单权限 */
  async function handleMenu(row?: any) {
    const { id } = row ?? {};
    if (id) {
      curRow.value = row;
      isShow.value = true;
      try {
        const { code, data } = await getRoleMenuIds({ id });
        if (code === 0) {
          treeRef.value.setCheckedKeys(data ?? []);
        }
      } catch {
        message("加载角色菜单权限失败", { type: "error" });
      }
    } else {
      curRow.value = null;
      isShow.value = false;
    }
  }

  /** 高亮当前权限选中行 */
  function rowStyle({ row: { id } }) {
    return {
      cursor: "pointer",
      background: id === curRow.value?.id ? "var(--el-fill-color-light)" : ""
    };
  }

  /** 菜单权限-保存 */
  async function handleSave() {
    if (!curRow.value?.id || !permissionTreeContext.value) return;

    const checkedKeys = treeRef.value.getCheckedKeys(false);
    const halfCheckedKeys = treeRef.value.getHalfCheckedKeys();
    const menuIds = checkedKeysToBackendMenuIds(
      checkedKeys,
      halfCheckedKeys,
      permissionTreeContext.value.tree,
      permissionTreeContext.value.menuIndex
    );

    saveMenuLoading.value = true;
    try {
      await updateRoleMenus(curRow.value.id, menuIds);
      message(`角色「${curRow.value.name}」的菜单权限已保存`, {
        type: "success"
      });
    } catch {
      message("保存菜单权限失败", { type: "error" });
    } finally {
      saveMenuLoading.value = false;
    }
  }

  const onQueryChanged = (query: string) => {
    treeRef.value!.filter(query);
  };

  const filterMethod = (query: string, node) => {
    const label = transformI18n(node.title) ?? node.title ?? "";
    return String(label).includes(query);
  };

  onMounted(async () => {
    onSearch();
    try {
      const ctx = await getRolePermissionContext();
      treeData.value = ctx.tree;
      treeIds.value = collectRolePermissionTreeIds(ctx.tree);
      permissionTreeContext.value = ctx;
    } catch {
      message("加载菜单权限树失败", { type: "error" });
    }
  });

  watch(isExpandAll, val => {
    val
      ? treeRef.value.setExpandedKeys(treeIds.value)
      : treeRef.value.setExpandedKeys([]);
  });

  watch(isSelectAll, val => {
    val
      ? treeRef.value.setCheckedKeys(treeIds.value)
      : treeRef.value.setCheckedKeys([]);
  });

  return {
    form,
    isShow,
    curRow,
    loading,
    columns,
    rowStyle,
    dataList,
    treeData,
    treeProps,
    isLinkage,
    pagination,
    isExpandAll,
    isSelectAll,
    treeSearchValue,
    saveMenuLoading,
    onSearch,
    resetForm,
    openDialog,
    handleMenu,
    handleSave,
    handleDelete,
    filterMethod,
    transformI18n,
    onQueryChanged,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
