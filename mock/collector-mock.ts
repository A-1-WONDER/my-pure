/* eslint-disable @typescript-eslint/no-unused-vars */
import { Random } from "mockjs";
import { resultSuccess } from "./_util";

// 采集器管理Mock数据 - 匹配后端接口格式
const collectorList = (pageSize: number, currentPage: number) => {
  const statusList = [0, 1]; // 0:异常, 1:正常
  const protocols = ["TCP", "UDP", "HTTP", "MQTT", "CoAP"];
  const models = ["V1.0", "V2.0", "V3.0", "V4.0", "V5.0"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    const status = 1; // 所有采集器状态都设置为正常

    return {
      id,
      collectorNo: `COL${String(id).padStart(6, "0")}`, // 采集器编号
      collectorName: `采集器${String(id).padStart(3, "0")}`, // 采集器名称
      installAddress: Random.county(true), // 安装位置
      status, // 状态：1-正常, 0-异常
      lastCommunicationTime: Random.datetime("yyyy-MM-dd HH:mm:ss"), // 最后通信时间
      ipAddress: `192.168.${Random.integer(1, 255)}.${Random.integer(1, 255)}`, // IP地址
      port: Random.integer(8000, 9000), // 端口号
      protocol: protocols[Random.integer(0, protocols.length - 1)], // 通信协议
      remark: Random.cparagraph(1, 3), // 备注
      enabled: true, // 所有采集器都启用
      model: models[Random.integer(0, models.length - 1)], // 采集器型号
      createdAt: Random.datetime("yyyy-MM-dd HH:mm:ss"), // 创建时间
      updatedAt: Random.datetime("yyyy-MM-dd HH:mm:ss") // 更新时间
    };
  });
};

export default [
  // 采集器列表查询 - 匹配后端接口
  {
    url: "/api/collectors",
    method: "get",
    response: ({ query }) => {
      const page = parseInt(query.page) || 1; // 后端从1开始
      const size = parseInt(query.size) || 10;

      console.log("【mock/collector-mock.ts】采集器列表查询参数:", query);
      console.log("【mock/collector-mock.ts】page:", page, "size:", size);

      const list = collectorList(size, page);

      // 根据查询参数过滤
      let filteredList = list;

      // 采集器编号查询
      if (query.collectorNo) {
        filteredList = filteredList.filter(item =>
          item.collectorNo.includes(query.collectorNo)
        );
      }

      // 采集器名称查询
      if (query.collectorName) {
        filteredList = filteredList.filter(item =>
          item.collectorName.includes(query.collectorName)
        );
      }

      // 模糊查询（编号、名称、IP）
      if (query.blurry) {
        filteredList = filteredList.filter(
          item =>
            item.collectorNo.includes(query.blurry) ||
            item.collectorName.includes(query.blurry) ||
            item.ipAddress.includes(query.blurry)
        );
      }

      // IP地址查询
      if (query.ipAddress) {
        filteredList = filteredList.filter(item =>
          item.ipAddress.includes(query.ipAddress)
        );
      }

      // 状态查询
      if (query.status !== undefined) {
        filteredList = filteredList.filter(
          item => item.status === parseInt(query.status)
        );
      }

      // 是否启用查询
      if (query.enabled !== undefined) {
        const enabled = query.enabled === "true" || query.enabled === true;
        filteredList = filteredList.filter(item => item.enabled === enabled);
      }

      // 通信协议查询
      if (query.protocol) {
        filteredList = filteredList.filter(
          item => item.protocol === query.protocol
        );
      }

      // 总数据量
      const totalElements = 156; // 模拟总数据量

      // 直接返回Spring Data格式
      return {
        content: filteredList,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
        size,
        number: page - 1 // Spring Data格式，number从0开始
      };
    }
  },

  // 获取采集器详情
  {
    url: "/api/collectors/:id",
    method: "get",
    response: ({ query }) => {
      const id = parseInt(query.id);
      const collector = collectorList(1, 1)[0];
      collector.id = id;

      return resultSuccess(collector);
    }
  },

  // 根据编号查询采集器
  {
    url: "/api/collectors/no/:collectorNo",
    method: "get",
    response: ({ query }) => {
      const collectorNo = query.collectorNo;
      const collector = collectorList(1, 1)[0];
      collector.collectorNo = collectorNo;

      return resultSuccess(collector);
    }
  },

  // 获取采集器状态
  {
    url: "/api/collectors/:id/status",
    method: "get",
    response: ({ query }) => {
      const id = parseInt(query.id);

      return resultSuccess({
        collectorId: id,
        collectorNo: `COL${String(id).padStart(6, "0")}`,
        status: 1, // 正常状态
        statusDescription: "正常",
        lastCommunicationTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
        meterCount: Random.integer(1, 20),
        todayDataCount: Random.integer(50, 200)
      });
    }
  },

  // 获取采集器数据
  {
    url: "/api/collectors/:id/data",
    method: "get",
    response: ({ query }) => {
      const id = parseInt(query.id);
      const limit = parseInt(query.limit) || 10;

      const dataList = Array.from({ length: limit }).map((_, index) => ({
        dataTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
        dataType: "METER_READING",
        dataValue: Random.float(0, 1000, 2, 2),
        dataQuality: "GOOD",
        meterId: Random.integer(1, 100)
      }));

      return resultSuccess(dataList);
    }
  },

  // 获取采集历史
  {
    url: "/api/collectors/:id/history",
    method: "get",
    response: ({ query }) => {
      const id = parseInt(query.id);

      const historyList = Array.from({ length: 24 }).map((_, index) => ({
        time: `2024-01-15 ${String(index).padStart(2, "0")}:00:00`,
        dataCount: Random.integer(50, 100),
        successCount: Random.integer(45, 95),
        failCount: Random.integer(0, 5),
        avgResponseTime: Random.integer(100, 300),
        status: "NORMAL"
      }));

      return resultSuccess(historyList);
    }
  },

  // 新增采集器
  {
    url: "/api/collectors",
    method: "post",
    response: ({ body }) => {
      return resultSuccess(
        {
          id: Random.integer(1000, 9999)
        },
        "创建成功"
      );
    }
  },

  // 修改采集器
  {
    url: "/api/collectors/:id",
    method: "put",
    response: ({ body }) => {
      return resultSuccess(null, "更新成功");
    }
  },

  // 删除采集器
  {
    url: "/api/collectors/:id",
    method: "delete",
    response: ({ body }) => {
      return resultSuccess(null, "删除成功");
    }
  },

  // 重启采集器
  {
    url: "/api/collectors/:id/restart",
    method: "post",
    response: ({ body }) => {
      return resultSuccess(null, "重启成功");
    }
  },

  // 导出采集器数据
  {
    url: "/api/collectors/download",
    method: "get",
    response: () => {
      return resultSuccess({
        url: "/download/collectors.xlsx",
        filename: `采集器数据_${new Date().toISOString().slice(0, 10)}.xlsx`
      });
    }
  },

  // 导入采集器数据
  {
    url: "/api/collectors/import",
    method: "post",
    response: () => {
      return resultSuccess(
        {
          successCount: 50,
          failedCount: 2,
          failedItems: [
            { row: 3, reason: "采集器编号重复" },
            { row: 7, reason: "IP地址格式错误" }
          ]
        },
        "导入成功"
      );
    }
  }
];
