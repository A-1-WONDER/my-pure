<template>
  <div class="collector-edit-form p-4">
    <h3 class="text-lg font-medium mb-4">编辑采集器</h3>

    <el-form :model="form" label-width="100px">
      <!-- 采集器ID -->
      <el-form-item label="采集器ID">
        <el-input v-model="form.id" disabled />
      </el-form-item>

      <!-- 采集器名称 -->
      <el-form-item label="采集器名称">
        <el-input
          v-model="form.name"
          placeholder="请输入采集器名称"
          clearable
        />
      </el-form-item>

      <!-- 采集器编号 -->
      <el-form-item label="采集器编号">
        <el-input
          v-model="form.code"
          placeholder="请输入采集器编号"
          clearable
        />
      </el-form-item>

      <!-- 安装位置 -->
      <el-form-item label="安装位置">
        <el-input
          v-model="form.location"
          placeholder="请输入安装位置"
          clearable
        />
      </el-form-item>

      <!-- 状态 -->
      <el-form-item label="状态">
        <el-select v-model="form.status" placeholder="请选择状态">
          <el-option label="正常" :value="1" />
          <el-option label="异常" :value="0" />
        </el-select>
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          rows="4"
          placeholder="请输入备注信息"
          clearable
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSave"> 保存 </el-button>
        <el-button @click="handleClose"> 返回 </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
// 采集器编辑表单组件
import { reactive, watch } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  onSave: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(["save", "close"]);

const form = reactive({
  id: "",
  name: "",
  code: "",
  location: "",
  status: 1,
  remark: ""
});

// 当props.data变化时更新表单
watch(
  () => props.data,
  newData => {
    console.log("编辑表单接收到数据:", newData);
    console.log("newData.remark:", newData?.remark);
    if (newData) {
      Object.assign(form, {
        id: newData.id || "",
        name: newData.name || "",
        code: newData.code || "",
        location: newData.location || "",
        status: newData.status !== undefined ? newData.status : 1,
        remark: newData.remark || ""
      });
      console.log("表单更新完成，备注字段:", form.remark);
    }
  },
  { immediate: true }
);

const handleSave = () => {
  console.log("保存按钮点击，表单数据:", form);
  console.log("form.remark:", form.remark);

  if (!form.name || !form.code) {
    ElMessage.warning("请填写采集器名称和编号");
    return;
  }

  // 正确解构Proxy对象
  const saveData = {
    id: form.id,
    name: form.name,
    code: form.code,
    location: form.location,
    status: form.status,
    remark: form.remark
  };

  console.log("调用onSave回调，数据:", saveData);

  if (props.onSave) {
    props.onSave(saveData);
  } else {
    console.warn("onSave回调函数未提供");
    emit("save", saveData);
  }

  ElMessage.success("采集器信息已保存");
};

const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
.collector-edit-form {
  min-width: 500px;
}
</style>
