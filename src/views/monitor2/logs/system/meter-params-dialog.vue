<template>
  <div class="meter-params-dialog p-4">
    <h3 class="text-lg font-medium mb-4">电表参数设置</h3>

    <div class="grid grid-cols-1 gap-4">
      <div class="param-item">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-700 font-medium">透支金额</span>
          <el-input
            v-model="params.overdraftAmount"
            placeholder="请输入透支金额"
            class="w-48"
          >
            <template #append>元</template>
          </el-input>
        </div>
      </div>

      <div class="param-item">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-700 font-medium">一级警报金额</span>
          <el-input
            v-model="params.firstAlertAmount"
            placeholder="请输入一级警报金额"
            class="w-48"
          >
            <template #append>元</template>
          </el-input>
        </div>
      </div>

      <div class="param-item">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-700 font-medium">二级警报金额</span>
          <el-input
            v-model="params.secondAlertAmount"
            placeholder="请输入二级警报金额"
            class="w-48"
          >
            <template #append>元</template>
          </el-input>
        </div>
      </div>

      <div class="param-item">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-700 font-medium">负荷限制功率</span>
          <el-input
            v-model="params.loadLimitPower"
            placeholder="请输入负荷限制功率"
            class="w-48"
          >
            <template #append>kW</template>
          </el-input>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-between">
      <el-button type="primary" @click="handleSave"> 保存设置 </el-button>
      <el-button @click="handleClose"> 关闭 </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";

const emit = defineEmits(["close", "save"]);

// 电表参数数据
const params = reactive({
  overdraftAmount: "",
  firstAlertAmount: "",
  secondAlertAmount: "",
  loadLimitPower: ""
});

// 保存设置
const handleSave = () => {
  // 验证输入
  if (
    !params.overdraftAmount ||
    !params.firstAlertAmount ||
    !params.secondAlertAmount ||
    !params.loadLimitPower
  ) {
    ElMessage.warning("请填写所有参数");
    return;
  }

  emit("save", { ...params });
  ElMessage.success("参数设置已保存");
};

// 关闭弹窗
const handleClose = () => emit("close");
</script>

<style scoped>
.meter-params-dialog {
  min-width: 450px;
}

.param-item {
  padding: 12px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
</style>
