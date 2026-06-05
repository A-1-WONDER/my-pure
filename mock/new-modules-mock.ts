/* eslint-disable @typescript-eslint/no-unused-vars */
import { Random } from "mockjs";

// 告警规则Mock数据
const alarmRuleList = (pageSize: number, currentPage: number) => {
  const alarmTypes = [
    "水量异常",
    "通信异常",
    "设备故障",
    "数据异常",
    "电量异常"
  ];
  const alarmLevels = ["低", "中", "高"];
  const meterTypes = ["water", "electric", "gas"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      name: `告警规则${String(id).padStart(3, "0")}`,
      alarmType: alarmTypes[Random.integer(0, alarmTypes.length - 1)],
      alarmLevel: alarmLevels[Random.integer(0, alarmLevels.length - 1)],
      meterType: meterTypes[Random.integer(0, meterTypes.length - 1)],
      conditionType: Random.pick([">", "<", "=", ">=", "<="]),
      thresholdValue: Random.float(0, 1000, 2, 2),
      isEnabled: Random.boolean(),
      notifyMethods: Random.pick(["短信", "邮件", "站内信", "微信"]),
      remark: Random.cparagraph(1, 3),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      updatedTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 告警记录Mock数据
const alarmRecordList = (pageSize: number, currentPage: number) => {
  const alarmTypes = [
    "水量异常",
    "通信异常",
    "设备故障",
    "数据异常",
    "电量异常"
  ];
  const alarmLevels = ["低", "中", "高"];
  const statusList = ["未处理", "处理中", "已处理", "已忽略"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    const alarmTime = Random.datetime("yyyy-MM-dd HH:mm:ss");
    const handleTime = Random.boolean()
      ? Random.datetime("yyyy-MM-dd HH:mm:ss")
      : null;

    return {
      id,
      ruleId: Random.integer(1, 100),
      meterId: Random.integer(1, 1000),
      meterNo: `MTR${String(Random.integer(1, 1000)).padStart(8, "0")}`,
      meterType: Random.pick(["water", "electric", "gas", "heat"]),
      alarmType: alarmTypes[Random.integer(0, alarmTypes.length - 1)],
      alarmLevel: alarmLevels[Random.integer(0, alarmLevels.length - 1)],
      alarmValue: Random.float(0, 1000, 2, 2),
      alarmTime,
      status: statusList[Random.integer(0, statusList.length - 1)],
      handlerId: Random.boolean() ? Random.integer(1, 10) : null,
      handlerName: Random.boolean() ? Random.cname() : null,
      handleTime,
      handleRemark: Random.boolean() ? Random.cparagraph(1, 2) : null,
      createdTime: alarmTime
    };
  });
};

// 数据采集配置Mock数据
const dataCollectionConfigList = (pageSize: number, currentPage: number) => {
  const protocols = ["Modbus", "DL/T645", "CJ/T188", "MQTT", "HTTP"];
  const dataTypes = ["实时数据", "历史数据", "事件数据", "状态数据"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      name: `采集配置${String(id).padStart(3, "0")}`,
      collectorId: Random.integer(1, 50),
      collectorName: `采集器${String(Random.integer(1, 50)).padStart(3, "0")}`,
      protocol: protocols[Random.integer(0, protocols.length - 1)],
      dataType: dataTypes[Random.integer(0, dataTypes.length - 1)],
      pollingInterval: Random.integer(60, 3600),
      isEnabled: Random.boolean(),
      lastExecuteTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      successRate: Random.float(80, 100, 2, 2),
      remark: Random.cparagraph(1, 3),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      updatedTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 采集任务Mock数据
const collectionTaskList = (pageSize: number, currentPage: number) => {
  const taskTypes = ["定时任务", "实时任务", "手动任务"];
  const taskStatus = ["等待中", "运行中", "已完成", "失败", "暂停"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    const lastExecuteTime = Random.datetime("yyyy-MM-dd HH:mm:ss");
    const nextExecuteTime = Random.datetime("yyyy-MM-dd HH:mm:ss");

    return {
      id,
      name: `采集任务${String(id).padStart(3, "0")}`,
      taskType: taskTypes[Random.integer(0, taskTypes.length - 1)],
      collectorId: Random.integer(1, 50),
      collectorName: `采集器${String(Random.integer(1, 50)).padStart(3, "0")}`,
      cronExpression: Random.pick([
        "0 0 * * *",
        "0 */1 * * *",
        "0 */2 * * *",
        "0 */6 * * *"
      ]),
      priority: Random.integer(1, 10),
      taskStatus: taskStatus[Random.integer(0, taskStatus.length - 1)],
      lastExecuteTime,
      nextExecuteTime,
      successCount: Random.integer(0, 1000),
      failedCount: Random.integer(0, 100),
      avgExecuteTime: Random.integer(100, 5000),
      remark: Random.cparagraph(1, 3),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 标签分类Mock数据
const tagCategoryList = (pageSize: number, currentPage: number) => {
  const categoryTypes = ["区域", "类型", "状态", "用途", "优先级"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      name: `标签分类${String(id).padStart(3, "0")}`,
      type: categoryTypes[Random.integer(0, categoryTypes.length - 1)],
      color: Random.pick([
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7"
      ]),
      sort: Random.integer(1, 100),
      tagCount: Random.integer(0, 50),
      remark: Random.cparagraph(1, 2),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 标签Mock数据
const tagList = (pageSize: number, currentPage: number) => {
  const tagColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8"
  ];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      name: `标签${String(id).padStart(3, "0")}`,
      categoryId: Random.integer(1, 10),
      categoryName: `标签分类${String(Random.integer(1, 10)).padStart(3, "0")}`,
      color: tagColors[Random.integer(0, tagColors.length - 1)],
      meterCount: Random.integer(0, 100),
      sort: Random.integer(1, 100),
      remark: Random.cparagraph(1, 2),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 表具标签关联Mock数据
const meterTagRelationList = (pageSize: number, currentPage: number) => {
  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      meterId: Random.integer(1, 1000),
      meterNo: `MTR${String(Random.integer(1, 1000)).padStart(8, "0")}`,
      meterType: Random.pick(["water", "electric", "gas", "heat"]),
      tagId: Random.integer(1, 50),
      tagName: `标签${String(Random.integer(1, 50)).padStart(3, "0")}`,
      tagColor: Random.pick([
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7"
      ]),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 报表模板Mock数据
const reportTemplateList = (pageSize: number, currentPage: number) => {
  const reportTypes = [
    "水表报表",
    "电表报表",
    "气表报表",
    "热量表报表",
    "采集器报表",
    "告警报表",
    "能耗报表"
  ];
  const formats = ["Excel", "PDF", "Word", "HTML"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      name: `报表模板${String(id).padStart(3, "0")}`,
      reportType: reportTypes[Random.integer(0, reportTypes.length - 1)],
      format: formats[Random.integer(0, formats.length - 1)],
      isSystem: Random.boolean(),
      isEnabled: Random.boolean(),
      lastGenerateTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      generateCount: Random.integer(0, 100),
      remark: Random.cparagraph(1, 3),
      createdTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      updatedTime: Random.datetime("yyyy-MM-dd HH:mm:ss")
    };
  });
};

// 报表历史Mock数据
const reportHistoryList = (pageSize: number, currentPage: number) => {
  const reportTypes = [
    "水表报表",
    "电表报表",
    "气表报表",
    "热量表报表",
    "采集器报表",
    "告警报表",
    "能耗报表"
  ];
  const formats = ["Excel", "PDF", "Word", "HTML"];
  const statusList = ["生成中", "已完成", "失败", "已发送"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    const generateTime = Random.datetime("yyyy-MM-dd HH:mm:ss");

    return {
      id,
      templateId: Random.integer(1, 20),
      templateName: `报表模板${String(Random.integer(1, 20)).padStart(3, "0")}`,
      reportType: reportTypes[Random.integer(0, reportTypes.length - 1)],
      format: formats[Random.integer(0, formats.length - 1)],
      fileName: `report_${generateTime.replace(/[^0-9]/g, "")}.${formats[Random.integer(0, formats.length - 1)].toLowerCase()}`,
      fileSize: Random.integer(1024, 10485760),
      generateTime,
      status: statusList[Random.integer(0, statusList.length - 1)],
      downloadUrl: Random.boolean() ? `/download/report_${id}` : null,
      remark: Random.cparagraph(1, 2),
      createdTime: generateTime
    };
  });
};

/**
 * 该文件目前仅保留数据生成函数，避免 fake-server 加载时报错
 * 后续接入接口时可改为导出具体路由配置
 */
export default [];
