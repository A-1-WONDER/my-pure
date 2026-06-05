<template>
  <div class="meter-edit-form p-4">
    <h3 class="text-lg font-medium mb-4">编辑电表信息</h3>

    <el-form :model="form" label-width="120px">
      <el-form-item label="标签">
        <el-input v-model="form.tag" placeholder="请输入标签" clearable />
      </el-form-item>

      <el-form-item label="采集器">
        <el-input
          v-model="form.collector"
          placeholder="请输入采集器"
          clearable
        />
      </el-form-item>

      <el-form-item label="在线状态">
        <el-select v-model="form.onlineStatus" placeholder="请选择在线状态">
          <el-option label="在线" value="在线" />
          <el-option label="离线" value="离线" />
        </el-select>
      </el-form-item>

      <el-form-item label="通讯地址">
        <el-input
          v-model="form.address"
          placeholder="请输入通讯地址"
          clearable
        />
      </el-form-item>

      <el-form-item label="用户">
        <el-input v-model="form.user" placeholder="请输入用户" clearable />
      </el-form-item>

      <el-form-item label="电表类型">
        <el-input
          v-model="form.meterType"
          placeholder="请输入电表类型"
          clearable
        />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注"
        />
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="form.status" placeholder="请选择状态">
          <el-option label="正常" value="正常" />
          <el-option label="异常" value="异常" />
          <el-option label="维护中" value="维护中" />
        </el-select>
      </el-form-item>

      <el-form-item label="累计用电量">
        <el-input v-model="form.totalPower" placeholder="请输入累计用电量">
          <template #append>kWh</template>
        </el-input>
      </el-form-item>

      <el-form-item label="剩余金额">
        <el-input v-model="form.remainingAmount" placeholder="请输入剩余金额">
          <template #append>元</template>
        </el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSave"> 保存 </el-button>
        <el-button @click="handleClose"> 返回 </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
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

const emit = defineEmits(["submit", "close"]);

const form = reactive({
  id: "",
  tag: "",
  collector: "",
  onlineStatus: "",
  address: "",
  user: "",
  meterType: "",
  remark: "",
  status: "",
  totalPower: "",
  remainingAmount: ""
});

// 当props.data变化时更新表单
watch(
  () => props.data,
  newData => {
    console.log("props.data变化，新数据:", newData);
    console.log("newData.id:", newData?.id);
    console.log("newData.id类型:", typeof newData?.id);
    console.log("newData.remark:", newData?.remark);
    if (newData) {
      // 确保id被正确传递
      form.id = newData.id || "";
      form.tag = newData.tag || "";
      form.collector = newData.collector || "";
      form.onlineStatus = newData.onlineStatus || "";
      form.address = newData.address || "";
      form.user = newData.user || "";
      form.meterType = newData.meterType || "";
      form.remark = newData.remark || "";
      form.status = newData.status || "";
      form.totalPower = newData.totalPower ? String(newData.totalPower) : "";
      form.remainingAmount = newData.remainingAmount
        ? String(newData.remainingAmount)
        : "";
      console.log("表单更新后:", form);
      console.log("form.id类型:", typeof form.id);
    }
  },
  { immediate: true }
);

const handleSave = () => {
  console.log("保存按钮点击，表单数据:", form);
  console.log("form.remark:", form.remark);

  if (!form.tag || !form.collector || !form.user) {
    ElMessage.warning("请填写必填字段");
    return;
  }

  // 正确解构Proxy对象
  const saveData = {
    id: form.id,
    tag: form.tag,
    collector: form.collector,
    onlineStatus: form.onlineStatus,
    address: form.address,
    user: form.user,
    meterType: form.meterType,
    remark: form.remark,
    status: form.status,
    totalPower: form.totalPower,
    remainingAmount: form.remainingAmount
  };

  console.log("调用onSave回调，数据:", saveData);

  if (props.onSave) {
    props.onSave(saveData);
  } else {
    console.warn("onSave回调函数未提供");
    emit("close", saveData);
  }

  ElMessage.success("电表信息已保存");
};

const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
.meter-edit-form {
  min-width: 500px;
}
</style>
