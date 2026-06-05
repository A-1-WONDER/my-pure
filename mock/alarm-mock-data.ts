/* eslint-disable @typescript-eslint/no-unused-vars */
import { Random } from "mockjs";
import { resultSuccess } from "./_util";

// 报警事件查询Mock数据
const alarmEventQueryList = (pageSize: number, currentPage: number) => {
  const alarmTypes = [
    "electric_meter",
    "electric_power_abnormal",
    "collector",
    "communication",
    "data"
  ];
  const alarmLevels = ["normal", "important", "urgent"];
  const alarmStatuses = ["pending", "processing", "resolved", "closed"];
  const deviceNames = [
    "智能电表001",
    "智能电表002",
    "采集器003",
    "采集器004",
    "智能电表005"
  ];
  const handlers = ["张三", "李四", "王五", "赵六", "钱七"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    const alarmType = alarmTypes[Random.integer(0, alarmTypes.length - 1)];
    const alarmLevel = alarmLevels[Random.integer(0, alarmLevels.length - 1)];
    const alarmStatus =
      alarmStatuses[Random.integer(0, alarmStatuses.length - 1)];

    return {
      id,
      alarmType,
      alarmLevel,
      deviceName: deviceNames[Random.integer(0, deviceNames.length - 1)],
      deviceCode: `DEV${String(id).padStart(6, "0")}`,
      alarmContent: Random.cparagraph(1, 2),
      alarmStatus,
      alarmTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      handler:
        alarmStatus === "pending"
          ? ""
          : handlers[Random.integer(0, handlers.length - 1)],
      handleTime:
        alarmStatus === "pending" ? "" : Random.datetime("yyyy-MM-dd HH:mm:ss"),
      remark: Random.cparagraph(1, 3)
    };
  });
};

/** Mock：清空后查询返回空列表，直至重启 dev 服务 */
let alarmEventQueryMockCleared = false;

export default [
  // 清空全部报警事件（需在查询 mock 之前注册亦可，此处放查询前便于阅读）
  {
    url: "/alarm-event-clear-all",
    method: "post",
    response: () => {
      alarmEventQueryMockCleared = true;
      return resultSuccess({ cleared: true });
    }
  },
  // 报警事件查询API
  {
    url: "/alarm-event-query",
    method: "post",
    response: ({ body }) => {
      const { currentPage = 1, pageSize = 10 } = body;
      if (alarmEventQueryMockCleared) {
        return resultSuccess({
          list: [],
          total: 0,
          pageSize,
          currentPage
        });
      }
      const list = alarmEventQueryList(pageSize, currentPage);
      return resultSuccess({
        list,
        total: 245,
        pageSize,
        currentPage
      });
    }
  },

  // 报警事件详情API
  {
    url: "/alarm-event-detail",
    method: "post",
    response: ({ body }) => {
      const { id } = body;
      const alarmEvent = alarmEventQueryList(1, 1)[0];
      alarmEvent.id = id;
      return resultSuccess(alarmEvent);
    }
  },

  // 处理报警事件API
  {
    url: "/alarm-event-handle",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "处理报警事件成功",
        data: body
      });
    }
  },

  // 系统报警设置API
  {
    url: "/alarm-system-setting",
    method: "post",
    response: ({ body }) => {
      const alarmTypes = [
        {
          id: 1,
          name: "水表异常报警",
          description: "水表读数异常、通信中断等",
          enabled: true,
          level: "urgent",
          notifyMethods: ["sms", "email", "app"]
        },
        {
          id: 2,
          name: "电表异常报警",
          description: "电表读数异常、过载等",
          enabled: true,
          level: "important",
          notifyMethods: ["sms", "app"]
        },
        {
          id: 3,
          name: "气表异常报警",
          description: "气表读数异常、泄漏等",
          enabled: true,
          level: "urgent",
          notifyMethods: ["sms", "email", "app"]
        },
        {
          id: 4,
          name: "采集器异常报警",
          description: "采集器通信中断、数据异常等",
          enabled: true,
          level: "important",
          notifyMethods: ["email", "app"]
        },
        {
          id: 5,
          name: "通信异常报警",
          description: "网络通信中断、延迟等",
          enabled: false,
          level: "normal",
          notifyMethods: ["app"]
        },
        {
          id: 6,
          name: "数据异常报警",
          description: "数据格式错误、数据缺失等",
          enabled: true,
          level: "normal",
          notifyMethods: ["email"]
        }
      ];

      return resultSuccess({
        alarmTypes,
        silentHours: 2,
        maxRetries: 3
      });
    }
  },

  // 保存系统报警设置API
  {
    url: "/alarm-system-setting-save",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "保存系统报警设置成功",
        data: body
      });
    }
  },

  // 报警用量统计API
  {
    url: "/alarm-usage-stats",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        totalAlarms: 1245,
        todayAlarms: 23,
        pendingAlarms: 15,
        resolvedAlarms: 1200,
        avgResponseTime: "2.5小时",
        alarmRate: "3.2%",
        alarmTypeDistribution: [
          { type: "水表异常", count: 450, percentage: 36.1 },
          { type: "电表异常", count: 320, percentage: 25.7 },
          { type: "气表异常", count: 280, percentage: 22.5 },
          { type: "采集器异常", count: 120, percentage: 9.6 },
          { type: "通信异常", count: 50, percentage: 4.0 },
          { type: "数据异常", count: 25, percentage: 2.0 }
        ],
        alarmLevelDistribution: [
          { level: "紧急", count: 180, color: "#f56c6c" },
          { level: "重要", count: 420, color: "#e6a23c" },
          { level: "一般", count: 645, color: "#409eff" }
        ]
      });
    }
  },

  // 保存报警用量设置API
  {
    url: "/alarm-usage-setting-save",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "保存报警用量设置成功",
        data: body
      });
    }
  }
];
