<script setup lang="ts">
import { ref } from "vue";
import { useAlarmUsageSetting } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import Plus from "~icons/ep/plus";
import Refresh from "~icons/ep/refresh";
import SwitchButton from "~icons/ep/switch-button";

defineOptions({
  name: "AlarmUsageSetting"
});

const formRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  goCreateRule,
  toggleEnabled,
  removeRule,
  loadRules
} = useAlarmUsageSetting();
</script>

<template>
  <div class="main">
    <el-alert
      class="mb-4 max-w-[960px]"
      type="info"
      :closable="false"
      show-icon
      title="报警用量设置"
      description="本页管理用电量、功率、余额等阈值类报警规则。新建或编辑完整规则请前往「报警规则配置」。"
    />

    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="规则名称" prop="ruleName">
        <el-input
          v-model="form.ruleName"
          placeholder="模糊搜索规则名称"
          clearable
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="启用状态" prop="enabled">
        <el-select
          v-model="form.enabled"
          placeholder="全部"
          clearable
          class="w-[150px]!"
        >
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
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

    <PureTableBar title="用量报警规则" :columns="columns" @refresh="loadRules">
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon(Plus)"
          @click="goCreateRule"
        >
          新建规则
        </el-button>
      </template>
      <template #default="{ size, dynamicColumns }">
        <pure-table
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
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(SwitchButton)"
              @click="toggleEnabled(row)"
            >
              {{ row.enabled === false ? "启用" : "停用" }}
            </el-button>
            <el-popconfirm title="确定删除该规则？" @confirm="removeRule(row)">
              <template #reference>
                <el-button
                  class="reset-margin outline-hidden! ml-2"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
