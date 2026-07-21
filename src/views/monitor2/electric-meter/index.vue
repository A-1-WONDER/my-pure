<script setup lang="ts">
import { ref } from "vue";
import { ElMessageBox } from "element-plus";
import { useElectricMeter } from "./hook";
import { getPickerShortcuts } from "../utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Edit from "~icons/ep/edit";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";
import Switch from "~icons/ep/switch";
import ArrowDown from "~icons/ep/arrow-down";

defineOptions({
  name: "Monitor2ElectricMeter"
});

const formRef = ref();
const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  selectedNum,
  onSearch,
  onEdit,
  onBiz,
  resetForm,
  onBatchUpdateStatus,
  exportExcel,
  handleSizeChange,
  onSelectionCancel,
  handleCurrentChange,
  handleSelectionChange
} = useElectricMeter(tableRef);

const handleBatchStatusCommand = (command: string) => {
  const statusMap = {
    NORMAL: { value: "NORMAL", label: "在线" },
    FAULT: { value: "FAULT", label: "故障" },
    OFFLINE: { value: "OFFLINE", label: "离线" }
  };

  const status = statusMap[command] || { value: command, label: command };

  ElMessageBox.prompt(
    `请输入将电表状态更新为"${status.label}"的原因（可选）`,
    "批量更新状态",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPlaceholder: "请输入原因...",
      inputType: "textarea"
    }
  )
    .then(({ value }) => {
      onBatchUpdateStatus(status.value, value);
    })
    .catch(() => {
      // 用户取消操作
    });
};
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="标签" prop="meterNo">
        <el-input
          v-model="form.meterNo"
          placeholder="请输入电表标签"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="模糊搜索" prop="blurry">
        <el-input
          v-model="form.blurry"
          placeholder="表号关键词"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="在线状态" prop="status">
        <el-select
          v-model="form.status"
          placeholder="请选择在线状态"
          clearable
          class="w-[170px]!"
        >
          <el-option label="在线" value="NORMAL" />
          <el-option label="故障" value="FAULT" />
          <el-option label="离线" value="OFFLINE" />
        </el-select>
      </el-form-item>
      <el-form-item label="采集器" prop="collectorId">
        <el-input
          v-model="form.collectorId"
          placeholder="请输入采集器ID"
          clearable
          class="w-[170px]!"
          type="number"
        />
      </el-form-item>
      <el-form-item label="用户" prop="userId">
        <el-input
          v-model="form.userId"
          placeholder="请输入用户ID"
          clearable
          class="w-[170px]!"
          type="number"
        />
      </el-form-item>
      <el-form-item label="电表类型" prop="meterType">
        <el-select
          v-model="form.meterType"
          placeholder="请选择电表类型"
          clearable
          class="w-[170px]!"
        >
          <el-option label="单相" value="single-phase" />
          <el-option label="三相" value="three-phase" />
          <el-option label="预付费" value="prepaid" />
          <el-option label="多费率" value="multiRate" />
        </el-select>
      </el-form-item>
      <el-form-item label="启用" prop="enabled">
        <el-select
          v-model="form.enabled"
          placeholder="全部"
          clearable
          class="w-[120px]!"
        >
          <el-option label="启用" :value="true" />
          <el-option label="停用" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          :loading="loading"
          @click="onSearch({ resetPage: true })"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
        <el-button
          type="success"
          :icon="useRenderIcon(Download)"
          @click="exportExcel"
        >
          导出为Excel
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="电表管理" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <div
          v-if="selectedNum > 0"
          v-motion-fade
          class="bg-[var(--el-fill-color-light)] w-full h-[46px] mb-2 pl-4 flex items-center"
        >
          <div class="flex-auto">
            <span
              style="font-size: var(--el-font-size-base)"
              class="text-[rgba(42,46,54,0.5)] dark:text-[rgba(220,220,242,0.5)]"
            >
              已选 {{ selectedNum }} 项
            </span>
            <el-button type="primary" text @click="onSelectionCancel">
              取消选择
            </el-button>
          </div>
          <el-dropdown @command="handleBatchStatusCommand">
            <el-button type="warning" text class="mr-1!">
              批量更新状态<el-icon class="el-icon--right"
                ><arrow-down
              /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="NORMAL">在线</el-dropdown-item>
                <el-dropdown-item command="FAULT">故障</el-dropdown-item>
                <el-dropdown-item command="OFFLINE">离线</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <pure-table
          ref="tableRef"
          row-key="id"
          align-whole="center"
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="pagination"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @selection-change="handleSelectionChange"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Edit)"
              @click="onEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              class="reset-margin outline-hidden! ml-2"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Edit)"
              @click="onBiz(row)"
            >
              基本业务
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dropdown-menu__item i) {
  margin: 0;
}

.main-content {
  margin: 24px 24px 0 !important;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
