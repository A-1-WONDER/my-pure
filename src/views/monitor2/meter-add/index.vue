<script setup lang="ts">
import { ref } from "vue";
import { useMeterAdd } from "./hook";
import { getPickerShortcuts } from "../utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import Edit from "~icons/ep/edit";
import Refresh from "~icons/ep/refresh";
import Download from "~icons/ep/download";

defineOptions({
  name: "Monitor2MeterAdd"
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
  clearAll,
  resetForm,
  onbatchDel,
  exportExcel,
  handleSizeChange,
  onSelectionCancel,
  handleCurrentChange,
  handleSelectionChange
} = useMeterAdd(tableRef);
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="表具类型" prop="meterType">
        <el-select
          v-model="form.meterType"
          placeholder="请选择表具类型"
          clearable
          class="w-[170px]!"
        >
          <el-option label="水表" value="water" />
          <el-option label="电表" value="electric" />
          <el-option label="气表" value="gas" />
        </el-select>
      </el-form-item>
      <el-form-item label="表具编号" prop="meterNo">
        <el-input
          v-model="form.meterNo"
          placeholder="请输入表具编号"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="生产厂家" prop="manufacturer">
        <el-input
          v-model="form.manufacturer"
          placeholder="请输入生产厂家"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="添加时间" prop="addTime">
        <el-date-picker
          v-model="form.addTime"
          :shortcuts="getPickerShortcuts()"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始日期时间"
          end-placeholder="结束日期时间"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          :loading="loading"
          @click="onSearch"
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

    <PureTableBar title="添加表管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-popconfirm title="确定要删除所有表具数据吗？" @confirm="clearAll">
          <template #reference>
            <el-button type="danger" :icon="useRenderIcon(Delete)">
              清空数据
            </el-button>
          </template>
        </el-popconfirm>
      </template>
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
          <el-popconfirm title="是否确认删除?" @confirm="onbatchDel">
            <template #reference>
              <el-button type="danger" text class="mr-1!"> 批量删除 </el-button>
            </template>
          </el-popconfirm>
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
          :pagination="{ ...pagination, size }"
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
