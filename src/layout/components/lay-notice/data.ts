import { $t } from "@/plugins/i18n";

export interface ListItem {
  avatar: string;
  title: string;
  datetime: string;
  type: string;
  description: string;
  status?: "primary" | "success" | "warning" | "info" | "danger";
  extra?: string;
  /** 报警事件去重用：同一 id/组合键在站内通知中只保留一条 */
  alarmEventId?: string;
  /** 报警类：false 为未读（显示角标）；true/undefined 为已读 */
  read?: boolean;
}

export interface TabItem {
  key: string;
  name: string;
  list: ListItem[];
  emptyText: string;
}

export const noticesData: TabItem[] = [
  {
    key: "1",
    name: $t("status.pureNotify"),
    list: [],
    emptyText: $t("status.pureNoNotify")
  },
  {
    key: "2",
    name: $t("status.pureMessage"),
    list: [],
    emptyText: $t("status.pureNoMessage")
  },
  {
    key: "3",
    name: $t("status.pureTodo"),
    list: [],
    emptyText: $t("status.pureNoTodo")
  }
];
