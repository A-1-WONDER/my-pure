#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 命令行参数
const args = process.argv.slice(2);
const meterType = args[0]; // 表类型：water, electric, gas, etc.
const meterName = args[1]; // 表名称：水表、电表、气表

if (!meterType || !meterName) {
  console.error("Usage: node create-meter-page.js <meterType> <meterName>");
  console.error("Example: node create-meter-page.js gas 气表");
  process.exit(1);
}

// 配置
const config = {
  meterType,
  meterName,
  // 根据表类型设置图标
  icon:
    {
      water: "ri:water-flash-line",
      electric: "ri:flashlight-line",
      gas: "ri:fire-line"
    }[meterType] || "ri:meter-line",
  // 根据表类型设置单位
  unit:
    {
      water: "m³",
      electric: "kWh",
      gas: "m³"
    }[meterType] || "单位",
  // 额外字段配置
  extraFields:
    {
      water: [],
      electric: [
        { label: "电压", prop: "voltage", formatter: "V" },
        { label: "电流", prop: "current", formatter: "A" },
        { label: "功率", prop: "power", formatter: "kW" }
      ],
      gas: [
        { label: "压力", prop: "pressure", formatter: "kPa" },
        { label: "流量", prop: "flowRate", formatter: "m³/h" },
        { label: "温度", prop: "temperature", formatter: "°C" }
      ]
    }[meterType] || []
};

console.log(`创建${meterName}管理页面...`);
console.log("配置:", config);

// 1. 创建页面目录
const pageDir = path.join(
  __dirname,
  "..",
  "src",
  "views",
  "monitor2",
  `${meterType}-meter`
);
if (!fs.existsSync(pageDir)) {
  fs.mkdirSync(pageDir, { recursive: true });
  console.log(`✓ 创建目录: ${pageDir}`);
}

// 2. 创建主页面文件
const indexPath = path.join(pageDir, "index.vue");
const indexContent = `
<script setup lang="ts">
import { ref } from "vue";
import MeterTemplate from "../meter-template/index.vue";

const meterType = "${meterType}";
const meterName = "${meterName}";
const icon = "${config.icon}";
</script>

<template>
  <MeterTemplate 
    :meter-type="meterType" 
    :meter-name="meterName" 
    :icon="icon" 
  />
</template>

<style scoped>
/* 页面样式 */
</style>
`;

fs.writeFileSync(indexPath, indexContent.trim());
console.log(`✓ 创建主页面: ${indexPath}`);

// 3. 创建路由配置（添加到现有路由）
const routeConfig = `
    {
      path: "/monitor2/${meterType}-meter",
      component: () => import("@/views/monitor2/${meterType}-meter/index.vue"),
      name: "Monitor2${meterName.charAt(0).toUpperCase() + meterName.slice(1)}Meter",
      meta: {
        title: "${meterName}管理",
        icon: "${config.icon}",
        keepAlive: true,
        roles: ["admin"]
      }
    },`;

console.log("\n路由配置:");
console.log(routeConfig);
console.log("\n请将以上路由配置添加到 src/router/modules/monitor2.ts 文件中。");

// 4. 创建API文件（如果需要）
const apiDir = path.join(__dirname, "..", "src", "api");
const apiPath = path.join(apiDir, `${meterType}-meter.ts`);

if (!fs.existsSync(apiPath)) {
  const apiContent = `import { createMeterApi } from "./meter-template";

export const ${meterType}MeterApi = createMeterApi("${meterType}");

// 导出所有方法
const {
  getMeterList,
  exportMeterData,
  addMeter,
  editMeter,
  deleteMeter,
  getMeterStatus,
  getMeterDetail,
  getMeterStatistics,
  getMeterAlarms,
  importMeterData,
  getMeterByNo
} = ${meterType}MeterApi;

export {
  getMeterList,
  exportMeterData,
  addMeter,
  editMeter,
  deleteMeter,
  getMeterStatus,
  getMeterDetail,
  getMeterStatistics,
  getMeterAlarms,
  importMeterData,
  getMeterByNo
};
`;

  fs.writeFileSync(apiPath, apiContent.trim());
  console.log(`✓ 创建API文件: ${apiPath}`);
}

console.log("\n✅ 页面创建完成！");
console.log("下一步：");
console.log(`1. 将路由配置添加到 src/router/modules/monitor2.ts`);
console.log(`2. 如果需要自定义页面，可以修改 ${pageDir}/index.vue`);
console.log(`3. 如果需要自定义API，可以修改 ${apiPath}`);
console.log(
  `4. 如果需要自定义表配置，可以修改 src/views/monitor2/meter-template/hook.tsx 中的 meterTypeConfig`
);
