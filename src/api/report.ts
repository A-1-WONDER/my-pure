import { http } from "@/utils/http";
import type { Result, ResultTable, ReportResult } from "@/api/types";

/** 获取报表模板列表 */
export const getReportTemplateList = (data?: object) => {
  return http.request<ResultTable>("post", "/report-template", { data });
};

/** 获取报表模板详情 */
export const getReportTemplateDetail = (data?: object) => {
  return http.request<Result>("post", "/report-template-detail", { data });
};

/** 新增报表模板 */
export const addReportTemplate = (data?: object) => {
  return http.request<Result>("post", "/report-template-add", { data });
};

/** 编辑报表模板 */
export const editReportTemplate = (data?: object) => {
  return http.request<Result>("post", "/report-template-edit", { data });
};

/** 删除报表模板 */
export const deleteReportTemplate = (data?: object) => {
  return http.request<Result>("post", "/report-template-delete", { data });
};

/** 生成水表使用报表 */
export const generateWaterMeterReport = (data?: object) => {
  return http.request<ReportResult>("post", "/report-water-meter-generate", {
    data
  });
};

/** 生成电表使用报表 */
export const generateElectricMeterReport = (data?: object) => {
  return http.request<ReportResult>("post", "/report-electric-meter-generate", {
    data
  });
};

/** 生成气表使用报表 */
export const generateGasMeterReport = (data?: object) => {
  return http.request<ReportResult>("post", "/report-gas-meter-generate", {
    data
  });
};

/** 生成采集器运行报表 */
export const generateCollectorReport = (data?: object) => {
  return http.request<ReportResult>("post", "/report-collector-generate", {
    data
  });
};

/** 生成告警统计报表 */
export const generateAlarmReport = (data?: object) => {
  return http.request<ReportResult>("post", "/report-alarm-generate", { data });
};

/** 生成能耗分析报表 */
export const generateEnergyConsumptionReport = (data?: object) => {
  return http.request<ReportResult>(
    "post",
    "/report-energy-consumption-generate",
    { data }
  );
};

/** 生成设备运行报表 */
export const generateDeviceOperationReport = (data?: object) => {
  return http.request<ReportResult>(
    "post",
    "/report-device-operation-generate",
    { data }
  );
};

/** 生成月度汇总报表 */
export const generateMonthlySummaryReport = (data?: object) => {
  return http.request<ReportResult>(
    "post",
    "/report-monthly-summary-generate",
    { data }
  );
};

/** 生成年度统计报表 */
export const generateAnnualStatisticsReport = (data?: object) => {
  return http.request<ReportResult>(
    "post",
    "/report-annual-statistics-generate",
    { data }
  );
};

/** 获取报表历史记录 */
export const getReportHistoryList = (data?: object) => {
  return http.request<ResultTable>("post", "/report-history", { data });
};

/** 获取报表历史详情 */
export const getReportHistoryDetail = (data?: object) => {
  return http.request<Result>("post", "/report-history-detail", { data });
};

/** 导出报表为Excel */
export const exportReportToExcel = (data?: object) => {
  return http.request<Result>("post", "/report-export-excel", { data });
};

/** 导出报表为PDF */
export const exportReportToPDF = (data?: object) => {
  return http.request<Result>("post", "/report-export-pdf", { data });
};

/** 导出报表为Word */
export const exportReportToWord = (data?: object) => {
  return http.request<Result>("post", "/report-export-word", { data });
};

/** 发送报表到邮箱 */
export const sendReportToEmail = (data?: object) => {
  return http.request<Result>("post", "/report-send-email", { data });
};

/** 定时生成报表配置 */
export const scheduleReportGeneration = (data?: object) => {
  return http.request<Result>("post", "/report-schedule", { data });
};

/** 获取报表统计 */
export const getReportStatistics = (data?: object) => {
  return http.request<Result>("post", "/report-statistics", { data });
};

/** 获取报表趋势分析 */
export const getReportTrendAnalysis = (data?: object) => {
  return http.request<Result>("post", "/report-trend-analysis", { data });
};

/** 预览报表 */
export const previewReport = (data?: object) => {
  return http.request<ReportResult>("post", "/report-preview", { data });
};

/** 复制报表模板 */
export const copyReportTemplate = (data?: object) => {
  return http.request<Result>("post", "/report-template-copy", { data });
};

/** 导入报表模板 */
export const importReportTemplate = (data?: object) => {
  return http.request<Result>("post", "/report-template-import", { data });
};

/** 导出报表模板 */
export const exportReportTemplate = (data?: object) => {
  return http.request<Result>("post", "/report-template-export", { data });
};

/** 清理历史报表 */
export const cleanHistoryReports = (data?: object) => {
  return http.request<Result>("post", "/report-clean-history", { data });
};
