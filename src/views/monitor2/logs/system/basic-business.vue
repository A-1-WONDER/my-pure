<script setup lang="ts">
import { reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import MeterParamsDialog from "./meter-params-dialog.vue";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(["submit", "close", "refresh"]);

// 当前激活的选项卡
const activeTab = ref("openAccount");

// 开户信息
const openAccountInfo = reactive({
  collectorNo: props.data.collectorNo || "C-2024001",
  address: props.data.address || "北京市朝阳区",
  meterStatus: "已开户",
  openTime: "30天前",
  openAmount: "500.00",
  openRemark: "",
  totalPower: "1250.5",
  powerSyncTime: "2024-01-22 10:30:00",
  remainingAmount: "356.8",
  amountSyncTime: "2024-01-22 10:30:00"
});

// 基本信息（用于其他选项卡）
const basicInfo = reactive({
  collectorNo: props.data.collectorNo || "C-2024001",
  collectorStatus: props.data.collectorStatus || "已连接",
  address: props.data.address || "北京市朝阳区",
  meterType: props.data.meterType || "智能电表",
  meterParams: "默认参数设置",
  overloadDelay: props.data.overloadDelay || "30",
  electricityPrice: props.data.electricityPrice || "0.65",
  additionalPriceDesc: props.data.additionalPriceDesc || ""
});

// 附加价格说明表格数据
const priceTableData = ref([
  { time: "00:00-08:00", price: "0.35", desc: "谷时电价" },
  { time: "08:00-12:00", price: "0.65", desc: "平时电价" },
  { time: "12:00-18:00", price: "0.85", desc: "峰时电价" },
  { time: "18:00-22:00", price: "0.65", desc: "平时电价" },
  { time: "22:00-24:00", price: "0.35", desc: "谷时电价" }
]);

// 新增价格行数据
const newPriceRow = reactive({
  time: "",
  price: "",
  desc: ""
});

// 打开电表参数设置弹窗
const openMeterParamsDialog = () => {
  addDialog({
    title: "电表参数设置",
    width: "500px",
    contentRenderer: () => MeterParamsDialog,
    on: {
      save: paramsData => {
        ElMessage.success(
          `参数已保存：透支金额=${paramsData.overdraftAmount}元，一级警报=${paramsData.firstAlertAmount}元，二级警报=${paramsData.secondAlertAmount}元，负荷限制=${paramsData.loadLimitPower}kW`
        );
        // 这里可以调用API保存参数
      },
      close: () => {
        // 关闭对话框
      }
    }
  });
};

// 添加价格行
const addPriceRow = () => {
  if (!newPriceRow.time || !newPriceRow.price) {
    ElMessage.warning("请填写时间和价格");
    return;
  }

  priceTableData.value.push({
    time: newPriceRow.time,
    price: newPriceRow.price,
    desc: newPriceRow.desc || ""
  });

  // 清空表单
  newPriceRow.time = "";
  newPriceRow.price = "";
  newPriceRow.desc = "";

  ElMessage.success("价格行已添加");
};

// 删除价格行
const deletePriceRow = (index: number) => {
  priceTableData.value.splice(index, 1);
  ElMessage.success("价格行已删除");
};

function onSubmit() {
  emit("submit", { ...basicInfo, priceTable: priceTableData.value });
}

function onClose() {
  emit("close");
}

function onRefresh() {
  emit("refresh");
}
</script>

<template>
  <div class="basic-business">
    <!-- 头部标题 -->
    <div class="header p-4 border-b">
      <h3 class="text-lg font-medium">基本业务信息</h3>
    </div>

    <!-- Element Plus Tabs 组件 -->
    <el-tabs v-model="activeTab" class="tabs-container">
      <el-tab-pane label="开户" name="openAccount">
        <div
          class="tab-content overflow-y-auto"
          :style="{ maxHeight: '500px' }"
        >
          <div class="grid grid-cols-1 gap-4">
            <!-- 采集器编号 -->
            <div class="p-3 border rounded">
              <span class="text-gray-700 font-medium">采集器编号：</span>
              <span class="ml-2 font-semibold">{{
                openAccountInfo.collectorNo
              }}</span>
            </div>

            <!-- 地址 -->
            <div class="p-3 border rounded">
              <span class="text-gray-700 font-medium">地址：</span>
              <span class="ml-2">{{ openAccountInfo.address }}</span>
            </div>

            <!-- 电表状态 -->
            <div class="p-3 border rounded">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-gray-700 font-medium">电表状态：</span>
                  <el-tag type="success" size="small">
                    {{ openAccountInfo.meterStatus }}
                  </el-tag>
                </div>
                <span class="text-gray-500 text-sm">
                  已于 {{ openAccountInfo.openTime }} 开户
                </span>
              </div>
            </div>

            <!-- 开户金额 -->
            <div class="p-3 border rounded">
              <span class="text-gray-700 font-medium">开户金额：</span>
              <span class="ml-2 font-semibold text-green-600"
                >¥{{ openAccountInfo.openAmount }}</span
              >
            </div>

            <!-- 开户备注 -->
            <div class="p-3 border rounded">
              <div class="mb-2">
                <span class="text-gray-700 font-medium">开户备注：</span>
              </div>
              <el-input
                v-model="openAccountInfo.openRemark"
                type="textarea"
                rows="3"
                placeholder="请输入开户备注信息"
                clearable
              />
            </div>

            <!-- 当前总电量 -->
            <div class="p-3 border rounded">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-gray-700 font-medium">当前总电量：</span>
                  <span class="ml-2 font-semibold text-blue-600"
                    >{{ openAccountInfo.totalPower }} kWh</span
                  >
                </div>
                <span class="text-gray-500 text-sm">
                  同步时间：{{ openAccountInfo.powerSyncTime }}
                </span>
              </div>
            </div>

            <!-- 当前剩余金额 -->
            <div class="p-3 border rounded">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-gray-700 font-medium">当前剩余金额：</span>
                  <span class="ml-2 font-semibold text-green-600"
                    >¥{{ openAccountInfo.remainingAmount }}</span
                  >
                </div>
                <span class="text-gray-500 text-sm">
                  同步时间：{{ openAccountInfo.amountSyncTime }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="充值" name="recharge">
        <div
          class="tab-content overflow-y-auto"
          :style="{ maxHeight: '500px' }"
        >
          <div class="text-center py-8 text-gray-500">
            <p class="text-lg mb-2">充值功能</p>
            <p>充值功能正在开发中，敬请期待...</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="操作记录" name="operationLog">
        <div
          class="tab-content overflow-y-auto"
          :style="{ maxHeight: '500px' }"
        >
          <div class="text-center py-8 text-gray-500">
            <p class="text-lg mb-2">操作记录</p>
            <p>操作记录功能正在开发中，敬请期待...</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="用电量统计" name="powerStatistics">
        <div
          class="tab-content overflow-y-auto"
          :style="{ maxHeight: '500px' }"
        >
          <div class="text-center py-8 text-gray-500">
            <p class="text-lg mb-2">用电量统计</p>
            <p>用电量统计功能正在开发中，敬请期待...</p>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="运行数据" name="runningData">
        <div
          class="tab-content overflow-y-auto"
          :style="{ maxHeight: '500px' }"
        >
          <div class="text-center py-8 text-gray-500">
            <p class="text-lg mb-2">运行数据</p>
            <p>运行数据功能正在开发中，敬请期待...</p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 底部按钮区域 -->
    <div class="footer p-4 border-t">
      <div class="flex gap-2">
        <el-button type="primary" @click="onSubmit">提交修改</el-button>
        <el-button @click="onClose">返回</el-button>
        <el-button @click="onRefresh">刷新</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-business {
  display: flex;
  flex-direction: column;
  width: 750px;
  max-height: 650px;
  overflow: hidden;
}

.header {
  flex-shrink: 0;
  background-color: #f9fafb;
}

.tabs-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-tabs) {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-tabs__header) {
  flex-shrink: 0;
  margin: 0;
}

:deep(.el-tabs__content) {
  flex: 1;
  padding: 0 !important;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
  padding: 0;
  margin: 0;
}

.tab-content {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  padding: 16px;
  margin: 0;
  overflow: hidden auto;
  scrollbar-color: #c1c1c1 #f1f1f1;
  scrollbar-width: thin;
}

.footer {
  flex-shrink: 0;
}

.border {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

/* 自定义滚动条样式 - 紧贴右边 */
.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track {
  margin: 0;
  background: #f1f1f1;
  border-radius: 0;
}

.tab-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border: none;
  border-radius: 3px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 优化选项卡样式，避免右侧空白 */
:deep(.el-tabs__nav-wrap) {
  padding: 0 20px;
}

:deep(.el-tabs__nav) {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

:deep(.el-tabs__item) {
  flex: 1;
  padding: 0 8px;
  margin: 0;
  text-align: center;
}

/* 确保内容填满空间 */
:deep(.el-tabs__content) > .el-tab-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  margin: 0;
}

/* 填满空间，消除空白 */
:deep(.el-tabs) > .el-tabs__content {
  height: calc(100% - 40px); /* 减去选项卡头高度 */
}
</style>
