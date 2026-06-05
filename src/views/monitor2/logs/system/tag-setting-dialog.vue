<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";

const emit = defineEmits(["close", "add-tag"]);

// 标签信息数据
const tagInfo = reactive({
  collectorNo: "",
  meterNo: "",
  relatedUser: ""
});

// 添加标签按钮点击
const handleAddTag = () => {
  if (!tagInfo.collectorNo || !tagInfo.meterNo || !tagInfo.relatedUser) {
    ElMessage.warning("请填写完整的标签信息");
    return;
  }

  emit("add-tag", { ...tagInfo });
  ElMessage.success("标签信息已提交");

  // 清空表单
  tagInfo.collectorNo = "";
  tagInfo.meterNo = "";
  tagInfo.relatedUser = "";
};

// 关闭弹窗
const handleClose = () => emit("close");
</script>

<template>
  <div class="tag-setting-dialog p-4">
    <h3 class="text-lg font-medium mb-4">标签信息</h3>

    <!-- 标签信息展示 -->
    <div class="tag-info mb-6 p-4 bg-gray-50 rounded">
      <div class="grid grid-cols-1 gap-3">
        <div class="flex items-center">
          <span class="w-24 text-gray-600">采集器号：</span>
          <span class="font-medium">C-2024001</span>
        </div>
        <div class="flex items-center">
          <span class="w-24 text-gray-600">表号：</span>
          <span class="font-medium">M-001234</span>
        </div>
        <div class="flex items-center">
          <span class="w-24 text-gray-600">关联用户：</span>
          <span class="font-medium">张三</span>
        </div>
      </div>
    </div>

    <!-- 添加标签表单 -->
    <div class="add-tag-form mb-6">
      <h4 class="text-md font-medium mb-3">填写标签信息</h4>
      <div class="grid grid-cols-1 gap-4">
        <el-input
          v-model="tagInfo.collectorNo"
          placeholder="请输入采集器号"
          clearable
        >
          <template #prepend>采集器号</template>
        </el-input>

        <el-input v-model="tagInfo.meterNo" placeholder="请输入表号" clearable>
          <template #prepend>表号</template>
        </el-input>

        <el-input
          v-model="tagInfo.relatedUser"
          placeholder="请输入关联用户"
          clearable
        >
          <template #prepend>关联用户</template>
        </el-input>
      </div>
    </div>

    <!-- 按钮区域 -->
    <div class="flex justify-between mt-6">
      <el-button type="primary" @click="handleAddTag"> 添加标签 </el-button>
      <el-button @click="handleClose"> 关闭 </el-button>
    </div>
  </div>
</template>

<style scoped>
.tag-setting-dialog {
  min-width: 400px;
}

.tag-info {
  border: 1px solid #e5e7eb;
}

.add-tag-form {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
