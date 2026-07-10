<script setup lang="ts">
import { message } from "@/utils/message";
import { onMounted, reactive, ref } from "vue";
import { type UserInfo, getMine, updateMine } from "@/api/user";
import { uploadUserAvatar } from "@/api/system";
import { getToken, setToken } from "@/utils/auth";
import { normalizeAvatarUrl } from "@/api/eladmin-system-adapter";
import { useUserStoreHook } from "@/store/modules/user";
import type { FormInstance, FormRules } from "element-plus";
import ReCropperPreview from "@/components/ReCropperPreview";
import { deviceDetection } from "@pureadmin/utils";
import uploadLine from "~icons/ri/upload-line";

defineOptions({
  name: "Profile"
});

const imgSrc = ref("");
const cropperBlob = ref<Blob>();
const cropRef = ref();
const uploadRef = ref();
const isShow = ref(false);
const saving = ref(false);
const userInfoFormRef = ref<FormInstance>();

const userInfos = reactive({
  id: undefined as number | undefined,
  avatar: "",
  username: "",
  nickname: "",
  email: "",
  phone: "",
  gender: "男"
});

const phonePattern = /^1[3-9]\d{9}$/;

const rules = reactive<FormRules>({
  nickname: [{ required: true, message: "昵称必填", trigger: "blur" }],
  phone: [
    { required: true, message: "手机号必填", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        const phone = String(value ?? "").trim();
        if (!phone) {
          callback(new Error("手机号必填"));
          return;
        }
        if (!phonePattern.test(phone)) {
          callback(new Error("请输入正确的手机号码"));
          return;
        }
        callback();
      },
      trigger: "blur"
    }
  ]
});

function queryEmail(queryString, callback) {
  const emailList = [
    { value: "@qq.com" },
    { value: "@126.com" },
    { value: "@163.com" }
  ];
  let results = [];
  const queryList = emailList.map(item => ({
    value: queryString.split("@")[0] + item.value
  }));
  results = queryString
    ? queryList.filter(
        item =>
          item.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
      )
    : queryList;
  callback(results);
}

const onChange = uploadFile => {
  const reader = new FileReader();
  reader.onload = e => {
    imgSrc.value = e.target.result as string;
    isShow.value = true;
  };
  reader.readAsDataURL(uploadFile.raw);
};

const handleClose = () => {
  cropRef.value.hidePopover();
  uploadRef.value.clearFiles();
  isShow.value = false;
};

const onCropper = ({ blob }) => (cropperBlob.value = blob);

function syncProfileCache(profile: Partial<UserInfo>) {
  const token = getToken();
  if (!token?.accessToken) return;
  setToken({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expires: new Date(token.expires),
    username: profile.username || token.username || userInfos.username,
    nickname: profile.nickname || token.nickname || userInfos.nickname,
    avatar: profile.avatar || token.avatar || userInfos.avatar,
    roles: token.roles,
    permissions: token.permissions
  });
  if (profile.nickname) {
    useUserStoreHook().SET_NICKNAME(profile.nickname);
  }
  if (profile.avatar) {
    useUserStoreHook().SET_AVATAR(profile.avatar);
  }
}

const handleSubmitImage = async () => {
  if (!cropperBlob.value) {
    message("请先裁剪头像", { type: "warning" });
    return;
  }
  try {
    const res = await uploadUserAvatar(cropperBlob.value, "avatar.png");
    const avatarName = String(res?.avatar ?? "");
    const avatarUrl = normalizeAvatarUrl(avatarName);
    if (!avatarUrl) {
      message("头像上传成功，但地址解析失败", { type: "warning" });
      return;
    }
    userInfos.avatar = avatarUrl;
    syncProfileCache({ avatar: avatarUrl, nickname: userInfos.nickname });
    message("更新头像成功", { type: "success" });
    handleClose();
  } catch (error: unknown) {
    message(error instanceof Error ? error.message : "更新头像失败", {
      type: "error"
    });
  }
};

const onSubmit = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  try {
    await formEl.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const { code, data, message: msg } = await updateMine(userInfos);
    if (code === 0) {
      if (data) {
        Object.assign(userInfos, data);
        syncProfileCache(data);
      }
      message("更新信息成功", { type: "success" });
    } else {
      message(String(msg || "更新失败"), { type: "error" });
    }
  } catch (error: unknown) {
    console.error("更新个人信息失败:", error);
    message(
      error instanceof Error ? error.message : "更新失败，请检查网络或接口",
      { type: "error" }
    );
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    const { code, data } = await getMine();
    if (code === 0 && data) {
      Object.assign(userInfos, data);
    }
  } catch (error) {
    console.error("加载个人信息失败:", error);
    message("加载个人信息失败", { type: "error" });
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
    <h3 class="my-8!">个人信息</h3>
    <el-form
      ref="userInfoFormRef"
      label-position="top"
      :rules="rules"
      :model="userInfos"
    >
      <el-form-item label="头像">
        <el-avatar :size="80" :src="userInfos.avatar" />
        <el-upload
          ref="uploadRef"
          accept="image/*"
          action="#"
          :limit="1"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="onChange"
        >
          <el-button plain class="ml-4!">
            <IconifyIconOffline :icon="uploadLine" />
            <span class="ml-2">更新头像</span>
          </el-button>
        </el-upload>
      </el-form-item>
      <el-form-item label="用户名">
        <el-input v-model="userInfos.username" disabled />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="userInfos.nickname" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-autocomplete
          v-model="userInfos.email"
          :fetch-suggestions="queryEmail"
          :trigger-on-focus="false"
          placeholder="邮箱由系统维护"
          clearable
          disabled
          class="w-full"
        />
        <p class="mt-2 text-xs text-[var(--el-text-color-secondary)]">
          邮箱修改暂未开放，如需变更请联系管理员。
        </p>
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="userInfos.phone"
          placeholder="请输入手机号"
          clearable
          maxlength="11"
        />
        <p class="mt-2 text-xs text-[var(--el-text-color-secondary)]">
          手机号作为账户联系方式在此维护（原「密保手机」入口已合并至此）。
        </p>
      </el-form-item>
      <el-button
        type="primary"
        :loading="saving"
        @click="onSubmit(userInfoFormRef)"
      >
        更新信息
      </el-button>
    </el-form>
    <el-dialog
      v-model="isShow"
      width="40%"
      title="编辑头像"
      destroy-on-close
      :closeOnClickModal="false"
      :before-close="handleClose"
      :fullscreen="deviceDetection()"
    >
      <ReCropperPreview ref="cropRef" :imgSrc="imgSrc" @cropper="onCropper" />
      <template #footer>
        <div class="dialog-footer">
          <el-button bg text @click="handleClose">取消</el-button>
          <el-button bg text type="primary" @click="handleSubmitImage">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
