<template>
  <div class="electric-meter-edit-form p-4">
    <h3 class="text-lg font-medium mb-4">编辑电表</h3>
    <el-form ref="formRef" :model="form" label-width="100px">
      <el-form-item label="电表编号" prop="meterNo">
        <el-input
          v-model="form.meterNo"
          placeholder="请输入电表编号"
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
          placeholder="请输入当前读数"
          clearable
        >
          <template #append>kWh</template>
        </el-input>
      </el-form-item>
      <el-form-item label="电压" prop="voltage">
        <el-input v-model="form.voltage" placeholder="请输入电压" clearable>
          <template #append>V</template>
        </el-input>
      </el-form-item>
      <el-form-item label="电流" prop="current">
        <el-input v-model="form.current" placeholder="请输入电流" clearable>
          <template #append>A</template>
        </el-input>
      </el-form-item>
      <el-form-item label="功率" prop="power">
        <el-input v-model="form.power" placeholder="请输入功率" clearable>
          <template #append>kW</template>
        </el-input>
      </el-form-item>
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
  }
});

const emit = defineEmits(["save", "close"]);

const formRef = ref();
const form = reactive({
  id: "",
  meterNo: "",
  userName: "",
  address: "",
  currentReading: "",
  voltage: "",
  current: "",
  power: "",
  status: "",
  installTime: "",
  lastReadTime: "",
  remark: ""
});

// 初始化表单数据
onMounted(() => {
  if (props.data) {
    Object.assign(form, props.data);
    if (!form.address) {
      form.address =
        (props.data as any).installAddress || (props.data as any).address || "";
    }
    if (!form.currentReading && (props.data as any).totalPower != null) {
      form.currentReading = String((props.data as any).totalPower);
    }
  }
});

const onSave = () => {
  if (!form.meterNo) {
    ElMessage.warning("请填写电表编号");
    return;
  }

  emit("save", { ...form });
};

const onCancel = () => {
  emit("close");
};
</script>

<style scoped>
.electric-meter-edit-form {
  min-width: 500px;
}
</style>
