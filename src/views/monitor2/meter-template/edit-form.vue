<template>
  <div class="meter-edit-form p-4">
    <h3 class="text-lg font-medium mb-4">编辑{{ config.name }}</h3>
    <el-form ref="formRef" :model="form" label-width="100px">
      <el-form-item :label="config.name + '编号'" prop="meterNo">
        <el-input
          v-model="form.meterNo"
          :placeholder="'请输入' + config.name + '编号'"
          clearable
        />
      </el-form-item>
      <el-form-item label="用户名称" prop="userName">
        <el-input
          v-model="form.userName"
          placeholder="请输入用户名称"
          clearable
        />
      </el-form-item>
      <el-form-item label="安装地址" prop="address">
        <el-input
          v-model="form.address"
          placeholder="请输入安装地址"
          clearable
        />
      </el-form-item>
      <el-form-item label="当前读数" prop="currentReading">
        <el-input
          v-model="form.currentReading"
          :placeholder="'请输入当前读数'"
          clearable
        >
          <template #append>{{ config.unit }}</template>
        </el-input>
      </el-form-item>

      <!-- 动态渲染额外字段 -->
      <template v-for="field in config.extraFields" :key="field.prop">
        <el-form-item :label="field.label" :prop="field.prop">
          <el-input
            v-model="form[field.prop]"
            :placeholder="'请输入' + field.label"
            clearable
          >
            <template #append>{{ getFieldUnit(field) }}</template>
          </el-input>
        </el-form-item>
      </template>

      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="请选择状态">
          <el-option label="正常" :value="1" />
          <el-option label="告警" :value="2" />
          <el-option label="停用" :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item label="安装时间" prop="installTime">
        <el-date-picker
          v-model="form.installTime"
          type="datetime"
          placeholder="选择安装时间"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item label="最后抄表时间" prop="lastReadTime">
        <el-date-picker
          v-model="form.lastReadTime"
          type="datetime"
          placeholder="选择最后抄表时间"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSave">保存</el-button>
        <el-button @click="onCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  meterType: {
    type: String,
    default: "water"
  },
  config: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["save", "close"]);

const getFieldUnit = (field: { formatter?: unknown }) => {
  const fmt = field?.formatter;
  if (typeof fmt === "function") {
    const out = fmt("");
    return typeof out === "string" ? out.replace(/[0-9.]/g, "").trim() : "";
  }
  if (typeof fmt === "string") {
    return fmt.replace(/[0-9.]/g, "").trim();
  }
  return "";
};

const formRef = ref();
const form = reactive({
  id: "",
  meterNo: "",
  userName: "",
  address: "",
  currentReading: "",
  status: "",
  installTime: "",
  lastReadTime: "",
  remark: ""
});

// 初始化表单数据
onMounted(() => {
  if (props.data) {
    Object.assign(form, props.data);

    // 确保额外字段有值
    props.config.extraFields.forEach(field => {
      if (!form[field.prop] && props.data[field.prop] !== undefined) {
        form[field.prop] = props.data[field.prop];
      }
    });
  }
});

const onSave = () => {
  if (!form.meterNo || !form.userName) {
    ElMessage.warning("请填写必填字段");
    return;
  }

  // 触发保存事件
  emit("save", { ...form });
  ElMessage.success("保存成功");
};

const onCancel = () => {
  emit("close");
};
</script>

<style scoped>
.meter-edit-form {
  min-width: 500px;
}
</style>
