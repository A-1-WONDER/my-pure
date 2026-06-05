<script setup lang="ts">
import { ref } from "vue";
import { useAlarmEventQuery } from "../event-query/hook";
import { getPickerShortcuts } from "../../utils";
import { getAlarmTypesByGroup, type AlarmTypeGroupKey } from "../constants";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import Edit from "~icons/ep/edit";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "AlarmUsageSetting"
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
  handleSizeChange,
  onSelectionCancel,
  handleCurrentChange,
  handleSelectionChange
} = useAlarmEventQuery(tableRef);

const alarmTypeByGroup = getAlarmTypesByGroup();
const alarmTypeGroupOrder: AlarmTypeGroupKey[] = [
  "meter",
  "collector",
  "communication",
  "data"
];
const alarmGroupLabels: Record<AlarmTypeGroupKey, string> = {
  meter: "电表类",
  collector: "采集器类",
  communication: "通信类",
  data: "数据类"
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
      <el-form-item label="报警类型" prop="alarmType">
        <el-select
          v-model="form.alarmType"
          placeholder="请选择报警类型"
          clearable
          filterable
          class="w-[280px]!"
        >
          <el-option-group
            v-for="key in alarmTypeGroupOrder"
            :key="key"
            :label="alarmGroupLabels[key]"
          >
            <el-option
              v-for="item in alarmTypeByGroup[key]"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-form-item label="报警级别" prop="alarmLevel">
        <el-select
          v-model="form.alarmLevel"
          placeholder="请选择报警级别"
          clearable
          class="w-[170px]!"
        >
          <el-option label="一般" value="normal" />
          <el-option label="重要" value="important" />
          <el-option label="紧急" value="urgent" />
        </el-select>
      </el-form-item>
      <el-form-item label="报警状态" prop="alarmStatus">
        <el-select
          v-model="form.alarmStatus"
          placeholder="请选择报警状态"
          clearable
          class="w-[170px]!"
        >
          <el-option label="未处理" value="pending" />
          <el-option label="处理中" value="processing" />
          <el-option label="已处理" value="resolved" />
          <el-option label="已关闭" value="closed" />
        </el-select>
      </el-form-item>
      <el-form-item label="报警时间" prop="alarmTime">
        <el-date-picker
          v-model="form.alarmTime"
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
      </el-form-item>
    </el-form>

    <PureTableBar title="报警用量设置" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-popconfirm
          title="确定要删除所有报警事件数据吗？"
          @confirm="clearAll"
        >
          <template #reference>
            <el-button type="danger" :icon="useRenderIcon(Delete)">
              清空数据
            </el-button>
          </template>
        </el-popconfirm>
      </template>
      <template #default="{ size, dynamicColumns }">
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
              处理
            </el-button>
            <el-button
              class="reset-margin outline-hidden! ml-2"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Edit)"
              @click="onBiz(row)"
            >
              详情
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

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
