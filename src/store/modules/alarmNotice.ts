import { defineStore } from "pinia";
import type { ListItem } from "@/layout/components/lay-notice/data";
import { storageLocal } from "@pureadmin/utils";
import { responsiveStorageNameSpace } from "@/config";

const storageKeyItems = () =>
  `${responsiveStorageNameSpace()}alarm-notice-items`;

const MAX_ITEMS = 50;

export const useAlarmNoticeStore = defineStore("pure-alarm-notice", {
  state: () => ({
    /** 报警类站内通知（新在前），与 lay-notice「通知」页签合并展示 */
    items: [] as ListItem[]
  }),
  getters: {
    alarmNoticeCount: state => state.items.length,
    /** 未读报警条数，用于铃铛角标；打开下拉阅读后清零 */
    alarmUnreadCount: state => state.items.filter(i => i.read !== true).length
  },
  actions: {
    hydrateFromStorage() {
      const raw = storageLocal().getItem<ListItem[]>(storageKeyItems());
      const arr = Array.isArray(raw) ? raw : [];
      const seen = new Set<string>();
      const deduped: ListItem[] = [];
      for (const it of arr) {
        const k = it.alarmEventId;
        if (k && seen.has(k)) continue;
        if (k) seen.add(k);
        deduped.push(it);
        if (deduped.length >= MAX_ITEMS) break;
      }
      this.items = deduped.slice(0, MAX_ITEMS);
    },
    persistItems() {
      storageLocal().setItem(storageKeyItems(), this.items.slice(0, MAX_ITEMS));
    },
    /** 新报警推到列表最前；同一 alarmEventId 仅保留最新一条 */
    prependAlarmNotice(item: ListItem) {
      const incoming: ListItem = { ...item, read: false };
      const id = incoming.alarmEventId;
      const rest =
        id != null && id !== ""
          ? this.items.filter(i => i.alarmEventId !== id)
          : this.items;
      this.items = [incoming, ...rest].slice(0, MAX_ITEMS);
      this.persistItems();
    },
    /** 用户已打开通知面板，全部标为已读并隐藏角标 */
    markAlarmNoticesRead() {
      if (!this.items.some(i => i.read !== true)) return;
      this.items = this.items.map(i => ({ ...i, read: true }));
      this.persistItems();
    },
    /** 清空报警通知（不影响已记录的事件 ID，避免重复弹同一历史事件） */
    clearAlarmNotices() {
      this.items = [];
      this.persistItems();
    }
  }
});
