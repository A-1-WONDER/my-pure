/* eslint-disable @typescript-eslint/no-unused-vars */
import { Random } from "mockjs";
import { resultSuccess } from "./_util";

// 电表管理Mock数据
const meterList = (pageSize: number, currentPage: number) => {
  const meterTypes = ["electric", "water", "gas", "heat"];
  const manufacturers = ["华为", "中兴", "华立", "威胜", "科陆", "林洋"];
  const models = [
    "DTSU666",
    "DTSU888",
    "DTSD666",
    "DTSD888",
    "DTSF666",
    "DTSF888"
  ];
  const communications = ["4G/NB", "LoRa", "NB-IoT", "GPRS", "RS485", "MBUS"];
  const statusList = ["NORMAL", "FAULT", "OFFLINE"]; // NORMAL:正常, FAULT:故障, OFFLINE:离线
  const relayStates = [0, 1]; // 0:关,1:开
  const batteryStates = [0, 1, 2]; // 0:正常,1:低电量,2:异常
  const electricMeterTypes = [
    "single-phase",
    "three-phase",
    "prepaid",
    "multiRate"
  ];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    const meterType = meterTypes[Random.integer(0, meterTypes.length - 1)];
    const status = statusList[Random.integer(0, statusList.length - 1)];

    // 如果是电表，使用具体的电表类型
    const finalMeterType =
      meterType === "electric"
        ? electricMeterTypes[Random.integer(0, electricMeterTypes.length - 1)]
        : meterType;

    return {
      id,
      meterNo: `EL${String(id).padStart(8, "0")}`,
      meterType: finalMeterType,
      manufacturer: manufacturers[Random.integer(0, manufacturers.length - 1)],
      model: models[Random.integer(0, models.length - 1)],
      accuracy: Random.float(0.5, 2.0, 1, 1),
      communication:
        communications[Random.integer(0, communications.length - 1)],
      installAddress: Random.county(true),
      userId: Random.integer(1, 100),
      collectorId: Random.integer(1, 50),
      status,
      installTime: Random.datetime("yyyy-MM-dd"),
      addUserId: Random.integer(1, 10),
      remark: Random.cparagraph(1, 2),
      relayState: relayStates[Random.integer(0, relayStates.length - 1)],
      batteryState: batteryStates[Random.integer(0, batteryStates.length - 1)],
      signalStrength: Random.integer(0, 100),
      paramId: Random.integer(1, 10).toString(),
      priceId: Random.integer(0, 5).toString(),
      purchaseCount: Random.integer(0, 100),
      datetimeId: `TZ${String(Random.integer(1, 100)).padStart(3, "0")}`,
      rate: Random.integer(1, 10),
      deviceModel: models[Random.integer(0, models.length - 1)],
      createdAt: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      updatedAt: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      // 扩展信息
      userName: Random.cname(),
      collectorName: `采集器${String(Random.integer(1, 50)).padStart(3, "0")}`
    };
  });
};

// 电表读数Mock数据
const readingList = (meterId: number, limit: number = 10) => {
  const readingTypes = ["auto", "manual", "remote", "scheduled"];
  const readingSources = ["COLLECTOR", "MANUAL", "REMOTE", "SYSTEM"];
  const dataQualities = ["GOOD", "FAIR", "POOR", "ERROR"];
  const readingTypeNames = [
    "正向有功总电能",
    "反向有功总电能",
    "正向无功总电能",
    "反向无功总电能"
  ];

  return Array.from({ length: limit }).map((_, index) => {
    const readingTime = Random.datetime("yyyy-MM-dd HH:mm:ss");
    const previousReadingTime = new Date(readingTime);
    previousReadingTime.setHours(previousReadingTime.getHours() - 1);

    const readingValue = Random.float(1000, 10000, 2, 2);
    const previousReadingValue = readingValue - Random.float(10, 100, 2, 2);

    return {
      id: index + 1,
      meterId,
      meterType: "electric",
      readingTime,
      readingValue,
      readingType: readingTypes[Random.integer(0, readingTypes.length - 1)],
      readingTypeId: Random.integer(1, 10),
      readingTypeName:
        readingTypeNames[Random.integer(0, readingTypeNames.length - 1)],
      readingSource:
        readingSources[Random.integer(0, readingSources.length - 1)],
      dataQuality: dataQualities[Random.integer(0, dataQualities.length - 1)],
      previousReadingValue,
      previousReadingTime: previousReadingTime
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, ""),
      calculatedUsage: readingValue - previousReadingValue,
      collectorId: Random.integer(1, 50),
      operator: Random.integer(1, 10),
      remark: Random.cparagraph(1, 2),
      createdAt: readingTime
    };
  });
};

export default [
  // 电表列表查询
  {
    url: "/api/meters",
    method: "get",
    response: ({ query }) => {
      const page = parseInt(query.page) || 0;
      const size = parseInt(query.size) || 10;
      const currentPage = page + 1; // 后端从0开始，mock从1开始

      const list = meterList(size, currentPage);

      // 根据查询参数过滤
      let filteredList = list;

      if (query.meterNo) {
        filteredList = filteredList.filter(item =>
          item.meterNo.includes(query.meterNo)
        );
      }

      if (query.meterType) {
        filteredList = filteredList.filter(
          item => item.meterType === query.meterType
        );
      }

      if (query.status !== undefined) {
        filteredList = filteredList.filter(
          item => item.status === query.status
        );
      }

      if (query.collectorId) {
        filteredList = filteredList.filter(
          item => item.collectorId === parseInt(query.collectorId)
        );
      }

      if (query.userId) {
        filteredList = filteredList.filter(
          item => item.userId === parseInt(query.userId)
        );
      }

      return resultSuccess({
        content: filteredList,
        totalElements: 100,
        totalPages: Math.ceil(100 / size),
        size,
        number: page
      });
    }
  },

  // 创建电表
  {
    url: "/api/meters",
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

  // 更新电表
  {
    url: "/api/meters/:id",
    method: "put",
    response: ({ body }) => {
      return resultSuccess(null, "更新成功");
    }
  },

  // 删除电表
  {
    url: "/api/meters",
    method: "delete",
    response: ({ body }) => {
      return resultSuccess(null, "删除成功");
    }
  },

  // 获取电表详情
  {
    url: "/api/meters/:id",
    method: "get",
    response: ({ query }) => {
      const id = parseInt(query.id);
      const meter = meterList(1, 1)[0] as Record<string, any>;
      meter.id = id;

      // 添加扩展信息
      meter.userName = Random.cname();
      meter.collectorName = `采集器${String(Random.integer(1, 50)).padStart(3, "0")}`;
      meter.readings = readingList(id, 5);

      return resultSuccess(meter);
    }
  },

  // 批量更新电表状态
  {
    url: "/api/meters/batch-status",
    method: "put",
    response: ({ body }) => {
      return resultSuccess(
        {
          updatedCount: body.ids.length
        },
        "批量更新成功"
      );
    }
  },

  // 获取电表读数列表
  {
    url: "/api/meters/:meterId/readings",
    method: "get",
    response: ({ query }) => {
      const meterId = parseInt(query.meterId);
      const limit = parseInt(query.limit) || 10;

      let readings = readingList(meterId, limit);

      // 根据时间范围过滤
      if (query.startTime && query.endTime) {
        readings = readings.filter(item => {
          const readingTime = new Date(item.readingTime);
          const startTime = new Date(query.startTime);
          const endTime = new Date(query.endTime);
          return readingTime >= startTime && readingTime <= endTime;
        });
      }

      return resultSuccess(readings);
    }
  },

  // 更新电表读数
  {
    url: "/api/meters/:meterId/readings",
    method: "post",
    response: ({ body }) => {
      return resultSuccess(
        {
          readingId: Random.integer(1000, 9999),
          calculatedUsage: Random.float(10, 100, 2, 2)
        },
        "更新成功"
      );
    }
  },

  // 电表统计信息
  {
    url: "/api/meters/statistics",
    method: "get",
    response: () => {
      return resultSuccess({
        totalCount: 100,
        onlineCount: 85,
        offlineCount: 15,
        electricCount: 60,
        waterCount: 30,
        gasCount: 8,
        heatCount: 2,
        todayReadings: 120,
        monthReadings: 3600,
        yearReadings: 43200
      });
    }
  },

  // 电表类型统计
  {
    url: "/api/meters/statistics/type",
    method: "get",
    response: () => {
      return resultSuccess({
        electric: 60,
        water: 30,
        gas: 8,
        heat: 2
      });
    }
  },

  // 电表状态统计
  {
    url: "/api/meters/statistics/status",
    method: "get",
    response: () => {
      return resultSuccess({
        enabled: 85,
        disabled: 10,
        stopped: 5
      });
    }
  },

  // 导出电表数据
  {
    url: "/api/meters/download",
    method: "get",
    response: () => {
      return resultSuccess({
        url: "/download/meters.xlsx",
        filename: `电表数据_${new Date().toISOString().slice(0, 10)}.xlsx`
      });
    }
  },

  // 导入电表数据
  {
    url: "/api/meters/import",
    method: "post",
    response: () => {
      return resultSuccess(
        {
          successCount: 50,
          failedCount: 2,
          failedItems: [
            { row: 3, reason: "表具编号重复" },
            { row: 7, reason: "采集器ID不存在" }
          ]
        },
        "导入成功"
      );
    }
  },

  // 根据编号查询电表
  {
    url: "/api/meters/no/:meterNo",
    method: "get",
    response: ({ query }) => {
      const meterNo = query.meterNo;
      const meter = meterList(1, 1)[0];
      meter.meterNo = meterNo;

      return resultSuccess(meter);
    }
  }
];
