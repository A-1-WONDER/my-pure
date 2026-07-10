<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { message } from "@/utils/message";
import { getMine } from "@/api/user";
import { deviceDetection } from "@pureadmin/utils";

defineOptions({
  name: "AccountManagement"
});

const profile = ref({
  phone: "",
  email: ""
});

const maskedPhone = computed(() => {
  const phone = profile.value.phone?.trim();
  if (!phone) return "未绑定手机号";
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
});

const maskedEmail = computed(() => {
  const email = profile.value.email?.trim();
  if (!email) return "未绑定邮箱";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${head}***@${domain}`;
});

const list = computed(() => [
  {
    title: "账户密码",
    illustrate: "在线修改密码功能暂未开放",
    button: "暂未开放",
    disabled: true
  },
  {
    title: "绑定手机",
    illustrate: `当前手机号：${maskedPhone.value}（请在「个人信息」中修改）`,
    button: "去修改",
    action: "profile"
  },
  {
    title: "密保问题",
    illustrate: "暂未开通，后续可按需接入",
    button: "暂未开放",
    disabled: true
  },
  {
    title: "备用邮箱",
    illustrate: `当前邮箱：${maskedEmail.value}`,
    button: "暂未开放",
    disabled: true
  }
]);

function onClick(item: { title: string; disabled?: boolean; action?: string }) {
  if (item.disabled) {
    message(`${item.title}暂未开放`, { type: "info" });
    return;
  }
  if (item.action === "profile") {
    message("请在左侧切换到「个人信息」修改手机号", { type: "success" });
  }
}

onMounted(async () => {
  try {
    const { code, data } = await getMine();
    if (code === 0 && data) {
      profile.value.phone = data.phone;
      profile.value.email = data.email;
    }
  } catch {
    // ignore
  }
});
</script>

<template>
  <div
    :class="[
      'min-w-[180px]',
      deviceDetection() ? 'max-w-[100%]' : 'max-w-[70%]'
    ]"
  >
    <h3 class="my-8!">账户管理</h3>
    <div v-for="(item, index) in list" :key="index">
      <div class="flex items-center">
        <div class="flex-1">
          <p>{{ item.title }}</p>
          <el-text class="mx-1" type="info">{{ item.illustrate }}</el-text>
        </div>
        <el-button
          type="primary"
          text
          :disabled="item.disabled"
          @click="onClick(item)"
        >
          {{ item.button }}
        </el-button>
      </div>
      <el-divider />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.el-divider--horizontal {
  border-top: 0.1px var(--el-border-color) var(--el-border-style);
}
</style>
