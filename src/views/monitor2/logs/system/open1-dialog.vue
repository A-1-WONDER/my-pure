<script setup lang="ts">
import { ElMessage } from "element-plus";
const emit = defineEmits(["close"]);

const handleSelect = () => {
  ElMessage.info("已选择（演示）");
};

const handleStart = () => {
  ElMessage.success("已开始（演示）");
};

const handleClear = () => {
  ElMessage.warning("已清空（演示）");
};

const handleClose = () => emit("close");
</script>

<template>
  <div class="open1-dialog p-4">
    <div class="flex items-center gap-2 mb-4">
      <el-button size="small" @click="handleSelect">选择</el-button>
      <el-button size="small" type="primary" @click="handleStart"
        >开始</el-button
      >
      <el-popconfirm title="确定要清空吗？" @confirm="handleClear">
        <template #reference>
          <el-button size="small">清空</el-button>
        </template>
      </el-popconfirm>
    </div>

    <div>
      <!-- 这里可以放置更多内容 -->
      <p>这是“打开1界面”的演示弹窗内容区域。</p>
    </div>

    <div class="mt-4 text-right">
      <el-button @click="handleClose">关闭</el-button>
    </div>
  </div>
</template>

<style scoped>
.open1-dialog {
  min-width: 360px;
}
</style>
