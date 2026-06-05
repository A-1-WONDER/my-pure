// 表类型配置
// 在这里添加新的表类型，系统会自动生成对应的页面

export interface MeterTypeConfig {
  type: string; // 表类型：water, electric, gas, etc.
  name: string; // 表名称：水表、电表、气表
  unit: string; // 单位：m³, kWh, etc.
  icon: string; // 图标
  extraFields: Array<{
    label: string; // 字段标签
    prop: string; // 字段属性名
    formatter: string; // 格式化显示（单位）
  }>;
  apiPath?: string; // API路径，默认为 /api/{type}-meter
}

// 所有表类型配置
export const meterTypes: MeterTypeConfig[] = [
  {
    type: "water",
    name: "水表",
    unit: "m³",
    icon: "ri:water-flash-line",
    extraFields: []
  },
  {
    type: "electric",
    name: "电表",
    unit: "kWh",
    icon: "ri:flashlight-line",
    extraFields: [
      { label: "电压", prop: "voltage", formatter: "V" },
      { label: "电流", prop: "current", formatter: "A" },
      { label: "功率", prop: "power", formatter: "kW" }
    ]
  },
  {
    type: "gas",
    name: "气表",
    unit: "m³",
    icon: "ri:fire-line",
    extraFields: [
      { label: "压力", prop: "pressure", formatter: "kPa" },
      { label: "流量", prop: "flowRate", formatter: "m³/h" },
      { label: "温度", prop: "temperature", formatter: "°C" }
    ]
  }
];

// 根据表类型获取配置
export function getMeterTypeConfig(type: string): MeterTypeConfig {
  const config = meterTypes.find(m => m.type === type);
  if (!config) {
    throw new Error(`未找到表类型配置: ${type}`);
  }
  return config;
}

// 获取所有表类型
export function getAllMeterTypes(): string[] {
  return meterTypes.map(m => m.type);
}

// 获取所有表名称
export function getAllMeterNames(): string[] {
  return meterTypes.map(m => m.name);
}

// 生成路由配置
export function generateRouteConfig(type: string) {
  const config = getMeterTypeConfig(type);
  return {
    path: `/monitor2/${type}-meter`,
    component: () => import(`@/views/monitor2/meter-template/index.vue`),
    name: `Monitor2${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Meter`,
    meta: {
      title: `${config.name}管理`,
      icon: config.icon,
      keepAlive: true,
      roles: ["admin"]
    }
  };
}

// 生成所有路由配置
export function generateAllRouteConfigs() {
  return meterTypes.map(type => generateRouteConfig(type.type));
}
