/**
 * API接口通用类型定义
 */

/** 基础响应结果类型 */
export interface Result<T = any> {
  code: number;
  /** 部分后端使用 message */
  message?: string;
  /** 部分后端使用 msg（如报警模块） */
  msg?: string;
  data?: T;
}

/** 新版基础响应结果类型（使用success字段） */
export interface ApiResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

/** 表格数据响应类型 */
export interface ResultTable<T = any> {
  code: number;
  message?: string;
  msg?: string;
  data?: {
    /** 列表数据 */
    list: T[];
    /** 总条目数 */
    total?: number;
    /** 每页显示条目个数 */
    pageSize?: number;
    /** 当前页数 */
    currentPage?: number;
  };
}

/** 新版表格数据响应类型（使用success字段） */
export interface ApiResultTable<T = any> {
  success: boolean;
  message: string;
  data?: {
    /** 列表数据 */
    content: T[];
    /** 总条目数 */
    totalElements?: number;
    /** 总页数 */
    totalPages?: number;
    /** 每页显示条目个数 */
    size?: number;
    /** 当前页数（从0开始） */
    number?: number;
  };
}

/** 实时数据响应类型 */
export interface RealTimeDataResult<T = any> {
  code: number;
  message: string;
  data?: {
    /** 实时数据列表 */
    dataList: T[];
    /** 采集器状态 */
    collectorStatus: any[];
    /** 更新时间 */
    updateTime: string;
  };
}

/** 报表数据响应类型 */
export interface ReportResult<T = any> {
  code: number;
  message: string;
  data?: {
    /** 报表数据 */
    reportData: T;
    /** 报表配置 */
    reportConfig: any;
    /** 生成时间 */
    generateTime: string;
  };
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  total?: number;
}

/** 排序参数 */
export interface SortParams {
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

/** 时间范围参数 */
export interface TimeRangeParams {
  startTime?: string;
  endTime?: string;
}

/** 通用查询参数 */
export interface QueryParams
  extends PaginationParams, SortParams, TimeRangeParams {
  [key: string]: any;
}

/** 用户信息类型 */
export interface UserInfo {
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 邮箱 */
  email: string;
  /** 联系电话 */
  phone: string;
  /** 简介 */
  description: string;
}

/** 用户登录结果 */
export interface UserResult {
  code: number;
  message: string;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: string[];
    /** 按钮级别权限 */
    permissions: string[];
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间 */
    expires: Date;
  };
}

/** 刷新token结果 */
export interface RefreshTokenResult {
  code: number;
  message: string;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间 */
    expires: Date;
  };
}

/** 报警事件类型（兼容后端 AlarmEventListItem 与旧 mock 字段） */
export interface AlarmEvent {
  id: number;
  ruleId?: number;
  alarmType: string;
  alarmLevel: string;
  alarmStatus?: string | number;
  meterNo?: string;
  meterId?: number;
  deviceId?: number;
  collectorId?: string;
  alarmValue?: number | string;
  /** 旧 mock / 部分页面 */
  deviceName?: string;
  deviceCode?: string;
  alarmContent?: string;
  alarmTime: string;
  processTime?: string;
  handledTime?: string;
  handledBy?: number;
  handlingRemark?: string;
  processor?: string;
  remark?: string;
}

/** 采集器信息 */
export interface CollectorInfo {
  id: number;
  name: string;
  code: string;
  location: string;
  status: number;
  lastCollectTime?: string;
  createTime: string;
  remark?: string;
}

/** 水表信息 */
export interface WaterMeterInfo {
  id: number;
  name: string;
  code: string;
  location: string;
  collectorId?: number;
  collectorName?: string;
  status: number;
  lastReading?: number;
  lastReadingTime?: string;
  createTime: string;
  remark?: string;
}

/** 标签信息 */
export interface TagInfo {
  id: number;
  name: string;
  category: string;
  color?: string;
  description?: string;
  createTime: string;
}

/** 报表模板信息 */
export interface ReportTemplate {
  id: number;
  name: string;
  type: string;
  description?: string;
  config: any;
  createTime: string;
  updateTime?: string;
}
