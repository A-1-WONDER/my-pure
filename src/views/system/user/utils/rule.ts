import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { isPhone, isEmail } from "@pureadmin/utils";

/** 自定义表单规则校验 */
export const formRules = reactive(<FormRules>{
  nickname: [{ required: true, message: "用户昵称为必填项", trigger: "blur" }],
  username: [{ required: true, message: "用户名称为必填项", trigger: "blur" }],
  parentId: [
    { required: true, message: "请选择归属部门", trigger: "change" },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback(new Error("请选择归属部门"));
        } else {
          callback();
        }
      },
      trigger: "change"
    }
  ],
  phone: [
    { required: true, message: "手机号为必填项", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (!isPhone(value)) {
          callback(new Error("请输入正确的手机号码格式"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  email: [
    { required: true, message: "邮箱为必填项", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (!isEmail(value)) {
          callback(new Error("请输入正确的邮箱格式"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  roleIds: [
    {
      type: "array",
      required: true,
      min: 1,
      message: "请至少选择一个角色",
      trigger: "change"
    }
  ],
  jobIds: [
    {
      type: "array",
      required: true,
      min: 1,
      message: "请至少选择一个岗位",
      trigger: "change"
    }
  ]
});
