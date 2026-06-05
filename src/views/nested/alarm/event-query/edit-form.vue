<template>
  <el-form :model="form" label-width="100px">
    <el-form-item label="报警ID">
      <el-input :model-value="String(props.data?.id ?? '-')" disabled />
    </el-form-item>
    <el-form-item label="当前状态">
      <el-input :model-value="currentStatusText" disabled />
    </el-form-item>
    <el-form-item label="处理人ID">
      <el-input-number
        v-model="form.handledBy"
        :min="1"
        :step="1"
        controls-position="right"
        class="w-full"
      />
    </el-form-item>
    <el-form-item label="处理结果" required>
      <el-input
        v-model="form.handlingResult"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="请输入处理结果"
      />
    </el-form-item>
    <el-form-item label="处理备注">
      <el-input
        v-model="form.remark"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="请输入处理备注（可选）"
      />
    </el-form-item>
    <el-form-item class="mb-0">
      <el-button type="primary" @click="submit">确定处理</el-button>
      <el-button @click="emit('close')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { message } from "@/utils/message";

const props = defineProps<{
  data?: Record<string, any>;
}>();

const emit = defineEmits(["save", "close"]);

const form = reactive({
  handledBy:
    props.data?.handledBy != null &&
    Number.isFinite(Number(props.data.handledBy))
      ? Number(props.data.handledBy)
      : undefined,
  handlingResult: "",
  remark: ""
});

const currentStatusText = computed(() => {
  const status = props.data?.alarmStatus;
  const statusMap: Record<string, string> = {
    "0": "未处理",
    "1": "已处理",
    "2": "已关闭",
    pending: "未处理",
    processing: "处理中",
    resolved: "已处理",
    closed: "已关闭"
  };
  if (status === null || status === undefined || status === "") return "-";
  return statusMap[String(status)] || String(status);
});

function submit() {
  const id = Number(props.data?.id);
  if (!Number.isFinite(id)) {
    message("报警ID无效，无法处理", { type: "warning" });
    return;
  }
  if (!form.handlingResult.trim()) {
    message("请填写处理结果", { type: "warning" });
    return;
  }
  emit("save", {
    id,
    handledBy: form.handledBy,
    handlingResult: form.handlingResult.trim(),
    remark: form.remark.trim() || undefined
  });
}
</script>
