/**
 * 报警类型字典：与后端 alarmType 字符串约定一致；未列出的类型在表格中回退显示原始值。
 */

export type AlarmTypeTagType =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type AlarmTypeGroupKey =
  | "meter"
  | "collector"
  | "communication"
  | "data";

export interface AlarmTypeDef {
  value: string;
  label: string;
  /** 事件查询下拉里分组 */
  group: AlarmTypeGroupKey;
  /** 规则配置：对象选「电表」时可选 */
  meterRule: boolean;
  /** 规则配置：对象选「采集器」时可选 */
  collectorRule: boolean;
  tagType: AlarmTypeTagType;
}

export const ALARM_TYPE_DEFS: AlarmTypeDef[] = [
  // —— 表计类（电表及细分场景）
  {
    value: "electric_meter",
    label: "电表异常（通用）",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "warning"
  },
  {
    value: "electric_power_abnormal",
    label: "电表·功率/负荷异常",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "warning"
  },
  {
    value: "electric_usage_abnormal",
    label: "电表·用电量异常",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "warning"
  },
  {
    value: "electric_threshold_exceeded",
    label: "电表·阈值超限",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "danger"
  },
  {
    value: "electric_reading_fail",
    label: "电表·抄表失败",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "danger"
  },
  {
    value: "electric_balance_low",
    label: "电表·余额不足",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "warning"
  },
  {
    value: "meter_offline",
    label: "电表·离线",
    group: "meter",
    meterRule: true,
    collectorRule: false,
    tagType: "info"
  },

  // —— 采集器类
  {
    value: "collector",
    label: "采集器异常（通用）",
    group: "collector",
    meterRule: false,
    collectorRule: true,
    tagType: "info"
  },
  {
    value: "collector_offline",
    label: "采集器·离线",
    group: "collector",
    meterRule: false,
    collectorRule: true,
    tagType: "info"
  },
  {
    value: "collector_fault",
    label: "采集器·故障",
    group: "collector",
    meterRule: false,
    collectorRule: true,
    tagType: "danger"
  },
  {
    value: "collector_restart_fail",
    label: "采集器·重启失败",
    group: "collector",
    meterRule: false,
    collectorRule: true,
    tagType: "warning"
  },
  {
    value: "collector_no_data_long",
    label: "采集器·长时间无数据",
    group: "collector",
    meterRule: false,
    collectorRule: true,
    tagType: "warning"
  },

  // —— 通信类
  {
    value: "communication",
    label: "通信异常（通用）",
    group: "communication",
    meterRule: true,
    collectorRule: true,
    tagType: "success"
  },
  {
    value: "communication_timeout",
    label: "通信·超时",
    group: "communication",
    meterRule: true,
    collectorRule: true,
    tagType: "warning"
  },
  {
    value: "communication_interrupted",
    label: "通信·中断",
    group: "communication",
    meterRule: true,
    collectorRule: true,
    tagType: "danger"
  },
  {
    value: "signal_weak",
    label: "通信·信号弱",
    group: "communication",
    meterRule: true,
    collectorRule: true,
    tagType: "warning"
  },

  // —— 数据类
  {
    value: "data",
    label: "数据异常（通用）",
    group: "data",
    meterRule: true,
    collectorRule: true,
    tagType: "warning"
  },
  {
    value: "data_anomaly",
    label: "数据·异常值",
    group: "data",
    meterRule: true,
    collectorRule: true,
    tagType: "warning"
  },
  {
    value: "data_jump",
    label: "数据·跳变",
    group: "data",
    meterRule: true,
    collectorRule: true,
    tagType: "danger"
  },
  {
    value: "data_missing",
    label: "数据·缺失",
    group: "data",
    meterRule: true,
    collectorRule: true,
    tagType: "info"
  },
  {
    value: "data_delay",
    label: "数据·延迟过大",
    group: "data",
    meterRule: true,
    collectorRule: true,
    tagType: "warning"
  }
];

const labelMap = new Map(ALARM_TYPE_DEFS.map(d => [d.value, d.label]));
const tagMap = new Map(ALARM_TYPE_DEFS.map(d => [d.value, d.tagType]));
const groupMap = new Map(ALARM_TYPE_DEFS.map(d => [d.value, d.group]));

const ALARM_GROUP_LABELS: Record<AlarmTypeGroupKey | "other", string> = {
  meter: "表计类",
  collector: "采集器类",
  communication: "通信类",
  data: "数据类",
  other: "其他"
};

/** 饼图等汇总展示用的大类顺序与配色索引 */
export const ALARM_GROUP_ORDER: (AlarmTypeGroupKey | "other")[] = [
  "meter",
  "collector",
  "communication",
  "data",
  "other"
];

export function getAlarmTypeLabel(value: string): string {
  return labelMap.get(value) ?? value;
}

export function getAlarmTypeGroup(value: string): AlarmTypeGroupKey | "other" {
  return groupMap.get(value) ?? "other";
}

export function getAlarmGroupLabel(value: string): string {
  return ALARM_GROUP_LABELS[getAlarmTypeGroup(value)];
}

export function getAlarmLevelLabel(value: string): string {
  const map: Record<string, string> = {
    normal: "一般",
    important: "重要",
    urgent: "紧急"
  };
  return map[value] ?? value;
}

export function getAlarmTypeTagType(value: string): AlarmTypeTagType {
  return tagMap.get(value) ?? "info";
}

/** 事件查询：按分组取选项 */
export function getAlarmTypesByGroup(): Record<
  AlarmTypeGroupKey,
  AlarmTypeDef[]
> {
  const init: Record<AlarmTypeGroupKey, AlarmTypeDef[]> = {
    meter: [],
    collector: [],
    communication: [],
    data: []
  };
  for (const d of ALARM_TYPE_DEFS) {
    init[d.group].push(d);
  }
  return init;
}

/** 规则配置：电表对象下可选 alarmType */
export function getAlarmTypesForMeterRule(): AlarmTypeDef[] {
  return ALARM_TYPE_DEFS.filter(d => d.meterRule);
}

/** 规则配置：采集器对象下可选 alarmType */
export function getAlarmTypesForCollectorRule(): AlarmTypeDef[] {
  return ALARM_TYPE_DEFS.filter(d => d.collectorRule);
}
