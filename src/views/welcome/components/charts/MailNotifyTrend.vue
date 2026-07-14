<script setup lang="ts">
import { type PropType, computed, ref, watch, nextTick } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";

const props = defineProps({
  dates: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  success: {
    type: Array as PropType<number[]>,
    default: () => []
  },
  fail: {
    type: Array as PropType<number[]>,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  height: {
    type: Number,
    default: 120
  }
});

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const chartRef = ref();
const { setOptions } = useECharts(chartRef, {
  theme
});

const axisLabels = computed(() =>
  (props.dates || []).map(d => {
    const s = String(d ?? "");
    // 2026-07-14 -> 07-14
    return s.length >= 10 ? s.slice(5) : s;
  })
);

watch(
  () => [
    props.dates,
    props.success,
    props.fail,
    props.loading,
    props.height,
    isDark.value
  ],
  async () => {
    await nextTick();
    const compact = props.height < 160;
    setOptions({
      tooltip: {
        trigger: "axis"
      },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: compact ? 10 : 11 }
      },
      grid: {
        top: compact ? 8 : 12,
        left: 8,
        right: 8,
        bottom: compact ? 28 : 32,
        containLabel: true
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: axisLabels.value,
        axisLabel: {
          fontSize: compact ? 10 : 11,
          hideOverlap: true
        }
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: {
          fontSize: compact ? 10 : 11
        },
        splitLine: {
          lineStyle: {
            type: "dashed",
            opacity: 0.45
          }
        }
      },
      series: [
        {
          name: "发送成功",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: compact ? 4 : 5,
          data: props.success,
          itemStyle: { color: "#26ce83" },
          lineStyle: { color: "#26ce83", width: 2 }
        },
        {
          name: "发送失败",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: compact ? 4 : 5,
          data: props.fail,
          itemStyle: { color: "#e85f33" },
          lineStyle: { color: "#e85f33", width: 2 }
        }
      ]
    });
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    class="w-full"
    :style="{ height: `${height}px` }"
  />
</template>
