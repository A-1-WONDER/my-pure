<script setup lang="ts">
import { ref } from "vue";
import { useAlarmUsageSetting } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Plus from "~icons/ep/plus";
import Back from "~icons/ep/back";

defineOptions({
  name: "AlarmUsageSetting"
});

const formRef = ref();
const addFormRef = ref();

const {
  activeView,
  loading,
  saving,
  filter,
  addForm,
  collectorOptions,
  ruleOptions,
  columns,
  dataList,
  pagination,
  usageSettingRows,
  usageSettingColumns,
  onSearch,
  resetFilter,
  handleSizeChange,
  handleCurrentChange,
  goMonitor,
  goAdd,
  submitAdd,
  resetAddForm,
  removeUsageSetting,
  loadAll
} = useAlarmUsageSetting();
</script>

<template>
  <div class="main usage-setting">
    <!-- 顶部二选一 -->
    <div class="usage-mode">
      <button
        type="button"
        class="usage-mode__item"
        :class="{ 'is-active': activeView === 'monitor' }"
        @click="goMonitor"
      >
        报警用量监测管理
      </button>
      <button
        type="button"
        class="usage-mode__item"
        :class="{ 'is-active': activeView === 'add' }"
        @click="goAdd"
      >
        添加报警用量参数设置
      </button>
    </div>

    <!-- 监测管理 -->
    <template v-if="activeView === 'monitor'">
      <el-form
        ref="formRef"
        :inline="true"
        :model="filter"
        class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
      >
        <el-form-item label="采集器" prop="collectorId">
          <el-select
            v-model="filter.collectorId"
            placeholder="全部"
            clearable
            filterable
            class="w-[200px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in collectorOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="报警设置" prop="ruleId">
          <el-select
            v-model="filter.ruleId"
            placeholder="全部"
            clearable
            filterable
            class="w-[200px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in ruleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="表通讯地址" prop="meterAddress">
          <el-input
            v-model="filter.meterAddress"
            placeholder="搜索表通讯地址"
            clearable
            class="w-[200px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="用户" prop="userName">
          <el-input
            v-model="filter.userName"
            placeholder="搜索用户姓名"
            clearable
            class="w-[180px]!"
            @keyup.enter="onSearch"
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
          <el-button :icon="useRenderIcon(Refresh)" @click="resetFilter">
            重置
          </el-button>
          <el-button @click="goAdd">立即去添加</el-button>
        </el-form-item>
      </el-form>

      <!-- 已添加的用量参数设置（原先只挂在电表「报警设置」列，空 targetIds 时会显示「未设置」） -->
      <div class="usage-rules-panel bg-bg_color">
        <div class="usage-rules-panel__head">
          <h3 class="usage-rules-panel__title">已配置的用量参数设置</h3>
          <el-button
            type="primary"
            link
            :icon="useRenderIcon(Plus)"
            @click="goAdd"
          >
            添加
          </el-button>
        </div>
        <el-empty
          v-if="!loading && usageSettingRows.length === 0"
          description="暂无用量参数设置，请点击上方「添加报警用量参数设置」"
          :image-size="72"
        />
        <pure-table
          v-else
          row-key="id"
          align-whole="center"
          table-layout="auto"
          :loading="loading"
          :data="usageSettingRows"
          :columns="usageSettingColumns"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
        >
          <template #usageSettingOps="{ row }">
            <el-button
              link
              type="danger"
              size="small"
              @click="removeUsageSetting(row)"
            >
              删除
            </el-button>
          </template>
        </pure-table>
      </div>

      <PureTableBar
        title="报警用量监测（按电表）"
        :columns="columns"
        @refresh="loadAll"
      >
        <template #buttons>
          <el-button :icon="useRenderIcon(Plus)" @click="goAdd">
            立即去添加
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
          />
        </template>
      </PureTableBar>
    </template>

    <!-- 添加参数设置 -->
    <template v-else>
      <div class="usage-add bg-bg_color">
        <h3 class="usage-add__title">添加报警用量参数设置</h3>
        <el-form
          ref="addFormRef"
          :model="addForm"
          label-width="120px"
          class="usage-add__form"
        >
          <el-form-item label="名称" required>
            <el-input
              v-model="addForm.name"
              placeholder="请填写用量报警设置名称"
              maxlength="64"
              clearable
              class="usage-add__control"
            />
          </el-form-item>
          <el-form-item label="选择设备类型">
            <el-select
              v-model="addForm.deviceType"
              disabled
              class="usage-add__control usage-add__control--sm"
            >
              <el-option label="电能表" value="electric_meter" />
            </el-select>
          </el-form-item>
          <el-form-item label="报警周期">
            <el-select
              v-model="addForm.period"
              disabled
              class="usage-add__control usage-add__control--sm"
            >
              <el-option label="天" value="day" />
            </el-select>
          </el-form-item>
          <el-form-item label="区间用量" required>
            <div class="usage-add__range">
              <el-select v-model="addForm.rangeOp" class="usage-add__op">
                <el-option label="低于" value="lt" />
                <el-option label="高于" value="gt" />
              </el-select>
              <el-input-number
                v-model="addForm.thresholdKwh"
                :min="0"
                :precision="2"
                :controls="false"
                placeholder="用量"
                class="usage-add__number"
              />
              <span class="usage-add__unit">千瓦时</span>
            </div>
          </el-form-item>
          <el-form-item label="报警静默期">
            <div class="usage-add__silence">
              <el-input-number
                v-model="addForm.silenceDays"
                :min="0"
                :precision="0"
                :controls="false"
                class="usage-add__number usage-add__number--sm"
              />
              <span class="usage-add__unit">天</span>
            </div>
            <div class="usage-add__hint">
              触发报警后一定时间内不再重复触发报警。
            </div>
          </el-form-item>
          <el-form-item label="应用到所有设备">
            <el-radio-group v-model="addForm.applyAll">
              <el-radio :label="true">是</el-radio>
              <el-radio :label="false" disabled>否（暂未开放）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item class="usage-add__actions">
            <el-button type="primary" :loading="saving" @click="submitAdd">
              添加
            </el-button>
            <el-button
              :icon="useRenderIcon(Back)"
              @click="
                () => {
                  resetAddForm();
                  goMonitor();
                }
              "
            >
              返回
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </template>
  </div>
</template>

<style lang="scss">
/* class 挂在页面根上（与布局注入的 main-content 同一节点），勿用 :has 后代选择 */
.main-content.usage-setting {
  margin: 24px 24px 0 !important;
}
</style>

<style lang="scss" scoped>
.usage-setting {
  box-sizing: border-box;

  /* 勿设 width:100%：根节点已有 main-content 外边距，100% 会撑破右侧留白 */
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 160px);
}

.usage-mode {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.usage-mode__item {
  min-width: 200px;
  padding: 14px 22px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition:
    color 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-5);
  }

  &.is-active {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
  }
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.usage-rules-panel {
  box-sizing: border-box;
  width: 100%;
  padding: 16px 20px 12px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.usage-rules-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.usage-rules-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.usage-add {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  padding: clamp(16px, 2vw, 28px) clamp(16px, 2.5vw, 32px)
    clamp(16px, 2vw, 24px);
  margin: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.usage-add__title {
  flex-shrink: 0;
  margin: 0 0 clamp(16px, 2vw, 24px);
  font-size: clamp(1rem, 0.4vw + 0.9rem, 1.15rem);
  font-weight: 600;
}

.usage-add__form {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  max-width: 100%;

  :deep(.el-form-item) {
    margin-bottom: clamp(14px, 1.5vw, 20px);
  }

  :deep(.el-form-item__content) {
    flex: 1;
    min-width: 0;
  }
}

.usage-add__control {
  width: 100%;
  max-width: min(560px, 100%);
}

.usage-add__control--sm {
  max-width: min(280px, 100%);
}

.usage-add__range,
.usage-add__silence {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.usage-add__op {
  width: min(120px, 100%);
}

.usage-add__number {
  width: min(220px, 100%);

  :deep(.el-input__wrapper) {
    width: 100%;
  }
}

.usage-add__number--sm {
  width: min(140px, 100%);
}

.usage-add__unit {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.usage-add__hint {
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.usage-add__actions {
  padding-top: clamp(8px, 1vw, 16px);
  margin-top: auto;
}
</style>
