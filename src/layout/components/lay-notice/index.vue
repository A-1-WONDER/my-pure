<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { cloneDeep } from "@pureadmin/utils";
import { noticesData } from "./data";
import NoticeList from "./components/NoticeList.vue";
import BellIcon from "~icons/lucide/bell";
import { useAlarmNoticeStore } from "@/store/modules/alarmNotice";
import {
  startAlarmNoticePolling,
  stopAlarmNoticePolling
} from "@/utils/alarmNoticePoll";
import { message } from "@/utils/message";

const { t } = useI18n();

const alarmNoticeStore = useAlarmNoticeStore();
const { items: alarmNoticeItems, alarmUnreadCount } =
  storeToRefs(alarmNoticeStore);

function onNoticeDropdownVisible(visible: boolean) {
  if (visible) {
    alarmNoticeStore.markAlarmNoticesRead();
  }
}

function handleClearAlarmNotices() {
  if (alarmNoticeItems.value.length === 0) return;
  alarmNoticeStore.clearAlarmNotices();
  message("已清空通知", { type: "success" });
}

/** 合并框架默认通知数据与报警站内通知（报警在「通知」页签最前） */
const notices = computed(() => {
  const tabs = cloneDeep(noticesData);
  const notifyTab = tabs.find(item => item.key === "1");
  if (notifyTab) {
    notifyTab.list = [...alarmNoticeItems.value, ...(notifyTab.list ?? [])];
  }
  return tabs;
});

const activeKey = ref(noticesData[0]?.key);

const getLabel = computed(
  () => item =>
    t(item.name) + (item.list.length > 0 ? `(${item.list.length})` : "")
);

onMounted(() => {
  alarmNoticeStore.hydrateFromStorage();
  startAlarmNoticePolling(45000);
});

onBeforeUnmount(() => {
  stopAlarmNoticePolling();
});
</script>

<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
    @visible-change="onNoticeDropdownVisible"
  >
    <span
      :class="['dropdown-badge', 'navbar-bg-hover', 'select-none', 'mr-[7px]']"
    >
      <el-badge
        :value="alarmUnreadCount"
        :max="99"
        :hidden="alarmUnreadCount === 0"
      >
        <span class="header-notice-icon">
          <IconifyIconOffline :icon="BellIcon" />
        </span>
      </el-badge>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-tabs
          v-model="activeKey"
          :stretch="true"
          class="dropdown-tabs"
          :style="{ width: notices.length === 0 ? '200px' : '330px' }"
        >
          <el-empty
            v-if="notices.length === 0"
            :description="t('status.pureNoMessage')"
            :image-size="60"
          />
          <span v-else>
            <template v-for="item in notices" :key="item.key">
              <el-tab-pane :label="getLabel(item)" :name="`${item.key}`">
                <div
                  v-if="item.key === '1' && alarmNoticeItems.length > 0"
                  class="notice-clear-toolbar"
                >
                  <el-button
                    text
                    type="danger"
                    size="small"
                    @click.stop="handleClearAlarmNotices"
                  >
                    清空
                  </el-button>
                </div>
                <el-scrollbar max-height="330px">
                  <div class="noticeList-container">
                    <NoticeList :list="item.list" :emptyText="item.emptyText" />
                  </div>
                </el-scrollbar>
              </el-tab-pane>
            </template>
          </span>
        </el-tabs>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
/* ”铃铛“摇晃衰减动画 */
@keyframes pure-bell-ring {
  0%,
  100% {
    transform-origin: top;
  }

  15% {
    transform: rotateZ(10deg);
  }

  30% {
    transform: rotateZ(-10deg);
  }

  45% {
    transform: rotateZ(5deg);
  }

  60% {
    transform: rotateZ(-5deg);
  }

  75% {
    transform: rotateZ(2deg);
  }
}

.dropdown-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 48px;
  cursor: pointer;

  .header-notice-icon {
    font-size: 16px;
  }

  &:hover {
    .header-notice-icon svg {
      animation: pure-bell-ring 1s both;
    }
  }
}

.dropdown-tabs {
  .notice-clear-toolbar {
    display: flex;
    justify-content: flex-end;
    padding: 8px 24px 0;
  }

  .noticeList-container {
    padding: 15px 24px 0;
  }

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 36px;
  }
}
</style>
