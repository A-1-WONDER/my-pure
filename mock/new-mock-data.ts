/* eslint-disable @typescript-eslint/no-unused-vars */
import { Random } from "mockjs";
import { resultSuccess } from "./_util";

// 采集器管理Mock数据
const collectorList = (pageSize: number, currentPage: number) => {
  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      name: `采集器${String(id).padStart(3, "0")}`,
      code: `COL${String(id).padStart(6, "0")}`,
      location: Random.county(true),
      status: Random.integer(0, 1),
      lastCollectTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      createTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      remark: Random.cparagraph(1, 3)
    };
  });
};

// 水表管理Mock数据
const waterMeterList = (pageSize: number, currentPage: number) => {
  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      meterNo: `WM${String(id).padStart(8, "0")}`,
      userName: Random.cname(),
      address: Random.county(true),
      currentReading: Random.float(0, 9999, 2, 2),
      status: Random.integer(1, 3),
      installTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      lastReadTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      remark: Random.cparagraph(1, 3)
    };
  });
};

// 添加表管理Mock数据
const meterAddList = (pageSize: number, currentPage: number) => {
  const meterTypes = ["water", "electric", "gas"];
  const communications = ["lora", "nbiot", "gprs", "rs485", "mbus"];

  return Array.from({ length: pageSize }).map((_, index) => {
    const id = (currentPage - 1) * pageSize + index + 1;
    return {
      id,
      meterType: meterTypes[Random.integer(0, meterTypes.length - 1)],
      meterNo: `MTR${String(id).padStart(8, "0")}`,
      manufacturer: Random.cword(3, 5) + "科技有限公司",
      model: `MODEL-${Random.integer(100, 999)}`,
      accuracy: Random.integer(1, 3),
      communication:
        communications[Random.integer(0, communications.length - 1)],
      addTime: Random.datetime("yyyy-MM-dd HH:mm:ss"),
      addUser: Random.cname(),
      status: Random.integer(0, 1),
      remark: Random.cparagraph(1, 3)
    };
  });
};

// 采集器管理API - 已迁移到 collector-mock.ts
// {
//   url: '/collector',
//   method: 'post',
//   response: ({ body }) => {
//     const { currentPage = 1, pageSize = 10 } = body;
//     const list = collectorList(pageSize, currentPage);
//     return resultSuccess({
//       list,
//       total: 156,
//       pageSize,
//       currentPage
//     });
//   }
// },

// 采集器管理-根据id查详情
// {
//   url: '/collector-detail',
//   method: 'post',
//   response: ({ body }) => {
//     const { id } = body;
//     const collector = collectorList(1, 1)[0];
//     collector.id = id;
//     return resultSuccess(collector);
//   }
// },

// 新增采集器
// {
//   url: '/collector-add',
//   method: 'post',
//   response: ({ body }) => {
//     return resultSuccess({
//       message: '新增采集器成功',
//       data: body
//     });
//   }
// },

// 编辑采集器
// {
//   url: '/collector-edit',
//   method: 'post',
//   response: ({ body }) => {
//     return resultSuccess({
//       message: '编辑采集器成功',
//       data: body
//     });
//   }
// },

// 删除采集器
// {
//   url: '/collector-delete',
//   method: 'post',
//   response: ({ body }) => {
//     return resultSuccess({
//       message: '删除采集器成功',
//       data: body
//     });
//   }
// },

export default [
  // 水表管理API
  {
    url: "/water-meter",
    method: "post",
    response: ({ body }) => {
      const { currentPage = 1, pageSize = 10 } = body;
      const list = waterMeterList(pageSize, currentPage);
      return resultSuccess({
        list,
        total: 234,
        pageSize,
        currentPage
      });
    }
  },

  // 水表管理-根据id查详情
  {
    url: "/water-meter-detail",
    method: "post",
    response: ({ body }) => {
      const { id } = body;
      const waterMeter = waterMeterList(1, 1)[0];
      waterMeter.id = id;
      return resultSuccess(waterMeter);
    }
  },

  // 新增水表
  {
    url: "/water-meter-add",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "新增水表成功",
        data: body
      });
    }
  },

  // 编辑水表
  {
    url: "/water-meter-edit",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "编辑水表成功",
        data: body
      });
    }
  },

  // 删除水表
  {
    url: "/water-meter-delete",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "删除水表成功",
        data: body
      });
    }
  },

  // 添加表管理API
  {
    url: "/meter-add",
    method: "post",
    response: ({ body }) => {
      const { currentPage = 1, pageSize = 10 } = body;
      const list = meterAddList(pageSize, currentPage);
      return resultSuccess({
        list,
        total: 189,
        pageSize,
        currentPage
      });
    }
  },

  // 添加表管理-根据id查详情
  {
    url: "/meter-add-detail",
    method: "post",
    response: ({ body }) => {
      const { id } = body;
      const meterAdd = meterAddList(1, 1)[0];
      meterAdd.id = id;
      return resultSuccess(meterAdd);
    }
  },

  // 新增表具
  {
    url: "/meter-add-new",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "新增表具成功",
        data: body
      });
    }
  },

  // 编辑表具
  {
    url: "/meter-add-edit",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "编辑表具成功",
        data: body
      });
    }
  },

  // 删除表具
  {
    url: "/meter-add-delete",
    method: "post",
    response: ({ body }) => {
      return resultSuccess({
        message: "删除表具成功",
        data: body
      });
    }
  }
];
