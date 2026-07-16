import { addDialog } from "@/components/ReDialog";
import MeterStatDetailDialog from "./meter-stat-detail-dialog.vue";
import {
  METER_STAT_PERIOD_META,
  type OpenMeterStatDetailOptions
} from "./meter-stat-period";

/** 日/月/年/小时统计共用：打开电表明细弹窗 */
export function openMeterStatDetailDialog(opts: OpenMeterStatDetailOptions) {
  const meta = METER_STAT_PERIOD_META[opts.period];
  addDialog({
    title: meta.buildTitle(opts.date, opts.hour),
    width: "90%",
    fullscreenIcon: true,
    contentRenderer: () => MeterStatDetailDialog,
    props: {
      period: opts.period,
      date: opts.date,
      hour: opts.hour,
      totalConsumption: opts.totalConsumption,
      meterStats: opts.meterStats,
      meterType: opts.meterType ?? ""
    }
  });
}
