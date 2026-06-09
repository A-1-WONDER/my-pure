import "./reset.css";
import dayjs from "dayjs";
import roleForm from "../form/role.vue";
import editForm from "../form/index.vue";
import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import userAvatar from "@/assets/user.jpg";
import { usePublicHooks } from "../../hooks";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import ReCropperPreview from "@/components/ReCropperPreview";
import type { FormItemProps, RoleFormItemProps } from "../utils/types";
import {
  getKeyList,
  hideTextAtIndex,
  deviceDetection,
  storageLocal
} from "@pureadmin/utils";
import {
  assignUserRoles,
  createUser,
  deleteUsers,
  getAllJobList,
  getAllRoleList,
  getDeptList,
  getRoleIds,
  getUserList,
  resetUserPassword,
  updateUserRecord,
  uploadUserAvatar
} from "@/api/system";
import { userKey, type DataInfo } from "@/utils/auth";
import { ElMessageBox } from "element-plus";
import { type Ref, h, ref, toRaw, computed, reactive, onMounted } from "vue";

export function useUser(tableRef: Ref, treeRef: Ref) {
  const form = reactive({
    // 左侧部门树的id
    deptId: "",
    username: "",
    phone: "",
    status: ""
  });
  const formRef = ref();
  const dataList = ref([]);
  const loading = ref(true);
  // 上传头像信息
  const avatarInfo = ref();
  const switchLoadMap = ref({});
  const { switchStyle } = usePublicHooks();
  const higherDeptOptions = ref();
  const treeData = ref([]);
  const treeLoading = ref(true);
  const selectedNum = ref(0);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "勾选列", // 如果需要表格多选，此处label必须设置
      type: "selection",
      fixed: "left",
      reserveSelection: true // 数据刷新后保留选项
    },
    {
      label: "用户编号",
      prop: "id",
      width: 90
    },
    {
      label: "用户头像",
      prop: "avatar",
      cellRenderer: ({ row }) => (
        <el-image
          fit="cover"
          preview-teleported={true}
          src={row.avatar || userAvatar}
          preview-src-list={Array.of(row.avatar || userAvatar)}
          class="w-[24px] h-[24px] rounded-full align-middle"
        />
      ),
      width: 90
    },
    {
      label: "用户名称",
      prop: "username",
      minWidth: 130
    },
    {
      label: "用户昵称",
      prop: "nickname",
      minWidth: 130
    },
    {
      label: "性别",
      prop: "sex",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.sex === 1 ? "danger" : null}
          effect="plain"
        >
          {row.sex === 1 ? "女" : "男"}
        </el-tag>
      )
    },
    {
      label: "部门",
      prop: "dept.name",
      minWidth: 90
    },
    {
      label: "手机号码",
      prop: "phone",
      minWidth: 90,
      formatter: ({ phone }) => hideTextAtIndex(phone, { start: 3, end: 6 })
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.status}
          active-value={1}
          inactive-value={0}
          active-text="已启用"
          inactive-text="已停用"
          inline-prompt
          style={switchStyle.value}
          onChange={() => onChange(scope as any)}
        />
      )
    },
    {
      label: "创建时间",
      minWidth: 90,
      prop: "createTime",
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 180,
      slot: "operation"
    }
  ];
  const buttonClass = computed(() => {
    return [
      "h-[20px]!",
      "reset-margin",
      "text-gray-500!",
      "dark:text-white!",
      "dark:hover:text-primary!"
    ];
  });
  const roleOptions = ref([]);
  const jobOptions = ref([]);

  function getApiErrorMessage(error: unknown, fallback: string) {
    const err = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return err?.response?.data?.message ?? err?.message ?? fallback;
  }

  function getCurrentUsername() {
    return storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "";
  }

  async function onChange({ row, index }) {
    ElMessageBox.confirm(
      `确认要<strong>${
        row.status === 0 ? "停用" : "启用"
      }</strong><strong style='color:var(--el-color-primary)'>${
        row.username
      }</strong>用户吗?`,
      "系统提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(async () => {
        switchLoadMap.value[index] = Object.assign(
          {},
          switchLoadMap.value[index],
          {
            loading: true
          }
        );
        try {
          await updateUserRecord(row, {
            enabled: row.status === 1
          });
          message("已成功修改用户状态", { type: "success" });
        } catch (error) {
          row.status === 0 ? (row.status = 1) : (row.status = 0);
          message(getApiErrorMessage(error, "修改用户状态失败"), {
            type: "error"
          });
        } finally {
          switchLoadMap.value[index] = Object.assign(
            {},
            switchLoadMap.value[index],
            {
              loading: false
            }
          );
        }
      })
      .catch(() => {
        row.status === 0 ? (row.status = 1) : (row.status = 0);
      });
  }

  function handleUpdate(row) {
    console.log(row);
  }

  async function handleDelete(row) {
    try {
      await deleteUsers([row.id]);
      message(`已删除用户 ${row.username}`, { type: "success" });
      onSearch();
    } catch (error) {
      message(getApiErrorMessage(error, "删除用户失败"), { type: "error" });
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

  /** 当CheckBox选择项发生变化时会触发该事件 */
  function handleSelectionChange(val) {
    selectedNum.value = val?.length ?? 0;
    tableRef.value?.setAdaptive?.();
  }

  /** 取消选择 */
  function onSelectionCancel() {
    selectedNum.value = 0;
    // 用于多选表格，清空用户的选择
    tableRef.value.getTableRef().clearSelection();
  }

  /** 批量删除 */
  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id") as number[];
    if (!ids.length) return;
    try {
      await deleteUsers(ids);
      message(`已删除 ${ids.length} 个用户`, { type: "success" });
      tableRef.value.getTableRef().clearSelection();
      onSearch();
    } catch (error) {
      message(getApiErrorMessage(error, "批量删除失败"), { type: "error" });
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getUserList({
        ...toRaw(form),
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      });
      if (code === 0 && data) {
        dataList.value = data.list ?? [];
        pagination.total = data.total;
        pagination.pageSize = data.pageSize;
        pagination.currentPage = data.currentPage;
      }
    } catch {
      message("加载用户列表失败，请确认已登录且具有用户查询权限", {
        type: "error"
      });
    } finally {
      setTimeout(() => {
        loading.value = false;
      }, 500);
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.deptId = "";
    treeRef.value.onTreeReset();
    onSearch();
  };

  function onTreeSelect({ id, selected }) {
    form.deptId = selected ? id : "";
    onSearch();
  }

  function formatHigherDeptOptions(treeList) {
    // 根据返回数据的status字段值判断追加是否禁用disabled字段，返回处理后的树结构，用于上级部门级联选择器的展示（实际开发中也是如此，不可能前端需要的每个字段后端都会返回，这时需要前端自行根据后端返回的某些字段做逻辑处理）
    if (!treeList || !treeList.length) return;
    const newTreeList = [];
    for (let i = 0; i < treeList.length; i++) {
      treeList[i].disabled = treeList[i].status === 0 ? true : false;
      formatHigherDeptOptions(treeList[i].children);
      newTreeList.push(treeList[i]);
    }
    return newTreeList;
  }

  function openDialog(
    title = "新增",
    row?: FormItemProps & Record<string, any>
  ) {
    addDialog({
      title: `${title}用户`,
      props: {
        formInline: {
          title,
          id: row?.id,
          higherDeptOptions: formatHigherDeptOptions(higherDeptOptions.value),
          parentId: row?.dept?.id ?? row?.parentId ?? 0,
          nickname: row?.nickname ?? "",
          username: row?.username ?? "",
          password: row?.password ?? "",
          phone: row?.phone ?? "",
          email: row?.email ?? "",
          sex: row?.sex ?? 0,
          status: row?.status ?? 1,
          remark: row?.remark ?? "",
          roleIds: row?.roleIds ?? row?.roles?.map(item => item.id) ?? [],
          jobIds: row?.jobIds ?? row?.jobs?.map(item => item.id) ?? [],
          roleOptions: roleOptions.value ?? [],
          jobOptions: jobOptions.value ?? []
        }
      },
      width: "46%",
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
              await createUser(curData);
              message(`已新增用户 ${curData.username}`, { type: "success" });
            } else {
              await updateUserRecord(
                { ...row, ...curData, id: curData.id ?? row?.id },
                {
                  deptId: Number(curData.parentId),
                  nickname: curData.nickname,
                  username: curData.username,
                  phone: String(curData.phone),
                  email: curData.email,
                  sex: curData.sex,
                  enabled: Number(curData.status) === 1,
                  roleIds: curData.roleIds,
                  jobIds: curData.jobIds
                }
              );
              message(`已修改用户 ${curData.username}`, { type: "success" });
            }
            done();
            onSearch();
          } catch (error) {
            message(getApiErrorMessage(error, `${title}用户失败`), {
              type: "error"
            });
          }
        });
      }
    });
  }

  const cropRef = ref();
  /** 上传头像 */
  function handleUpload(row) {
    addDialog({
      title: "裁剪、上传头像",
      width: "40%",
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
      contentRenderer: () =>
        h(ReCropperPreview, {
          ref: cropRef,
          imgSrc: row.avatar || userAvatar,
          onCropper: info => (avatarInfo.value = info)
        }),
      beforeSure: async done => {
        if (row.username !== getCurrentUsername()) {
          message("后端仅支持修改当前登录用户自己的头像", { type: "warning" });
          done();
          return;
        }
        const blob = avatarInfo.value?.blob as Blob | undefined;
        if (!blob) {
          message("请先裁剪头像", { type: "warning" });
          return;
        }
        try {
          await uploadUserAvatar(blob);
          message("头像上传成功", { type: "success" });
          done();
          onSearch();
        } catch (error) {
          message(getApiErrorMessage(error, "头像上传失败"), { type: "error" });
        }
      },
      closeCallBack: () => cropRef.value.hidePopover()
    });
  }

  /** 重置密码（后端固定重置为 123456） */
  function handleReset(row) {
    ElMessageBox.confirm(
      `确认将用户 ${row.username} 的密码重置为 123456 吗？`,
      "重置密码",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(async () => {
        try {
          await resetUserPassword([row.id]);
          message(`已重置 ${row.username} 的密码为 123456`, {
            type: "success"
          });
        } catch (error) {
          message(getApiErrorMessage(error, "重置密码失败"), { type: "error" });
        }
      })
      .catch(() => undefined);
  }

  /** 分配角色 */
  async function handleRole(row) {
    // 选中的角色列表
    const ids = (await getRoleIds({ userId: row.id })).data ?? [];
    addDialog({
      title: `分配 ${row.username} 用户的角色`,
      props: {
        formInline: {
          username: row?.username ?? "",
          nickname: row?.nickname ?? "",
          roleOptions: roleOptions.value ?? [],
          ids
        }
      },
      width: "400px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(roleForm),
      beforeSure: async (done, { options }) => {
        const curData = options.props.formInline as RoleFormItemProps;
        try {
          await assignUserRoles(row, curData.ids ?? []);
          message(`已更新 ${row.username} 的角色`, { type: "success" });
          done();
          onSearch();
        } catch (error) {
          message(getApiErrorMessage(error, "分配角色失败"), { type: "error" });
        }
      }
    });
  }

  onMounted(async () => {
    treeLoading.value = true;
    onSearch();

    try {
      const { code, data } = await getDeptList();
      if (code === 0 && data) {
        higherDeptOptions.value = handleTree(data);
        treeData.value = handleTree(data);
      }
    } catch {
      message("加载部门树失败", { type: "error" });
    }

    treeLoading.value = false;

    try {
      roleOptions.value = (await getAllRoleList()).data ?? [];
    } catch {
      roleOptions.value = [];
    }

    try {
      jobOptions.value = (await getAllJobList()).data ?? [];
    } catch {
      jobOptions.value = [];
    }
  });

  return {
    form,
    loading,
    columns,
    dataList,
    treeData,
    treeLoading,
    selectedNum,
    pagination,
    buttonClass,
    deviceDetection,
    onSearch,
    resetForm,
    onbatchDel,
    openDialog,
    onTreeSelect,
    handleUpdate,
    handleDelete,
    handleUpload,
    handleReset,
    handleRole,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
