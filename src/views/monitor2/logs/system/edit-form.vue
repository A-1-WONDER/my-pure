<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { ElMessage } from "element-plus";

defineProps({
  data: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["save", "close"]);

const form = reactive({
  type: "",
  relation: null,
  code: "2534",
  remark: ""
});

const typeOptions = [
  { label: "单相", value: "single" },
  { label: "双相", value: "double" },
  { label: "三项", value: "three" }
];

// 生成关联下拉选项 (1-300)
const relationOptions = ref<Array<{ label: string; value: number }>>([]);

// 初始化关联选项
const initRelationOptions = () => {
  relationOptions.value = Array.from({ length: 300 }, (_, i) => ({
    label: String(i + 1),
    value: i + 1
  }));
};

const handleSave = () => {
  if (!form.type) {
    ElMessage.warning("请选择类型");
    return;
  }
  if (form.relation === null) {
    ElMessage.warning("请选择关联");
    return;
  }
  emit("save", { ...form });
};

const handleClose = () => {
  emit("close");
};

watch(
  () => undefined,
  () => {
    initRelationOptions();
  },
  { immediate: true }
);
</script>

<template>
  <div class="edit-form-container p-4">
    <el-form :model="form" label-width="100px">
      <el-form-item label="类型">
        <el-select v-model="form.type" placeholder="请选择">
          <el-option
            v-for="item in typeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="关联">
        <el-select v-model="form.relation" placeholder="请选择" filterable>
          <el-option
            v-for="item in relationOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="号码">
        <el-input v-model="form.code" disabled />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          rows="4"
          placeholder="请输入备注"
        />
      </el-form-item>

      <el-form-item label="排序值">
        <el-input v-model="form.remark" type="textarea" placeholder="请输入" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSave"> 保存 </el-button>
        <el-button @click="handleClose"> 返回 </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
.edit-form-container {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-select) {
    width: 100%;
  }

  :deep(.el-input) {
    width: 100%;
  }
}
</style>
