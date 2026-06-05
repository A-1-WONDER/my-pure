<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";

const props = defineProps({
  online: {
    type: Number,
    default: 0
  },
  offline: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  /** 图表区域高度（px），首页紧凑布局可改为 200～240 */
  height: {
    type: Number,
    default: 320
  }
});

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const chartRef = ref();
const { setOptions } = useECharts(chartRef, {
  theme
});

watch(
  () => [props.online, props.offline, props.loading, props.height],
  async () => {
    await nextTick();

    const total = props.online + props.offline;
    const compact = props.height < 280;
    setOptions({
      tooltip: {
        trigger: "item"
      },
      legend: {
        bottom: 0,
        icon: "circle",
        textStyle: { fontSize: compact ? 11 : 12 }
      },
      title: {
        text: total ? String(total) : "0",
        subtext: "采集器总数",
        left: "center",
        top: compact ? "36%" : "38%",
        textStyle: {
          fontSize: compact ? 22 : 28,
          fontWeight: 700
        },
        subtextStyle: {
          fontSize: compact ? 12 : 13
        }
      },
      series: [
        {
          name: "采集器在线情况",
          type: "pie",
          radius: compact ? ["52%", "72%"] : ["55%", "75%"],
          center: ["50%", compact ? "40%" : "42%"],
          avoidLabelOverlap: false,
          label: {
            formatter: "{b}\n{c}",
            fontSize: compact ? 11 : 12
          },
          itemStyle: {
            borderRadius: 8,
            borderColor: "#fff",
            borderWidth: 2
          },
          data: [
            {
              value: props.online,
              name: "在线",
              itemStyle: { color: "#26ce83" }
            },
            {
              value: props.offline,
              name: "离线",
              itemStyle: { color: "#e85f33" }
            }
          ]
        }
      ]
    });
  },
  {
    immediate: true
  }
);
</script>

<template>
  <div ref="chartRef" class="w-full" :style="{ height: `${height}px` }" />
</template>
