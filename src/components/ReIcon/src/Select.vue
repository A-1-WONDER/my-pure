<script setup lang="ts">
import { IconJson } from "@/components/ReIcon/data";
import { cloneDeep, isAllEmpty } from "@pureadmin/utils";
import { ref, computed, CSSProperties, watch } from "vue";
import Search from "~icons/ri/search-eye-line";

type ParameterCSSProperties = (item?: string) => CSSProperties | undefined;

defineOptions({
  name: "IconSelect"
});

const inputValue = defineModel({ type: String });

const iconList = ref(IconJson);
const icon = ref();
const currentActiveType = ref("ep:");
// 深拷贝图标数据，前端做搜索
const copyIconList = cloneDeep(iconList.value);
const totalPage = ref(0);
// 每页显示35个图标
const pageSize = ref(35);
const currentPage = ref(1);

// 搜索条件
const filterValue = ref("");

const tabsList = [
  {
    label: "Element Plus",
    name: "ep:"
  },
  {
    label: "Remix Icon",
    name: "ri:"
  },
  {
    label: "Font Awesome 5 Solid",
    name: "fa-solid:"
  }
];

const pageList = computed(() =>
  getIconBucket(currentActiveType.value)
    .filter(i => i.includes(filterValue.value))
    .slice(
      (currentPage.value - 1) * pageSize.value,
      currentPage.value * pageSize.value
    )
);

const iconItemStyle = computed((): ParameterCSSProperties => {
  return item => {
    if (inputValue.value === currentActiveType.value + item) {
      return {
        borderColor: "var(--el-color-primary)",
        color: "var(--el-color-primary)"
      };
    }
  };
});

function resolveIconType(iconValue: string) {
  const colonIndex = iconValue.indexOf(":");
  if (colonIndex > 0) {
    return {
      type: iconValue.substring(0, colonIndex + 1),
      name: iconValue.substring(colonIndex + 1)
    };
  }
  // eladmin 等后端常返回无冒号前缀的图标名（如 monitor、system）
  return { type: "ep:", name: iconValue };
}

function getIconBucket(type: string) {
  return copyIconList[type as keyof typeof copyIconList] ?? [];
}

function setVal() {
  if (isAllEmpty(inputValue.value)) return;
  const { type, name } = resolveIconType(String(inputValue.value));
  currentActiveType.value = tabsList.some(t => t.name === type) ? type : "ep:";
  icon.value = name;
}

function onBeforeEnter() {
  if (isAllEmpty(inputValue.value)) return;
  setVal();
  const bucket = getIconBucket(currentActiveType.value);
  const curIconIndex = bucket.findIndex(i => i === icon.value);
  if (curIconIndex >= 0) {
    currentPage.value = Math.ceil((curIconIndex + 1) / pageSize.value);
  }
}

function onAfterLeave() {
  filterValue.value = "";
}

function handleClick({ props }) {
  currentPage.value = 1;
  currentActiveType.value = props.name;
}

function onChangeIcon(item) {
  icon.value = item;
  inputValue.value = currentActiveType.value + item;
}

function onCurrentChange(page) {
  currentPage.value = page;
}

function onClear() {
  icon.value = "";
  inputValue.value = "";
}

watch(
  () => pageList.value,
  () =>
    (totalPage.value = getIconBucket(currentActiveType.value).filter(i =>
      i.includes(filterValue.value)
    ).length),
  { immediate: true }
);
watch(
  () => inputValue.value,
  val => {
    if (val) setVal();
  },
  { immediate: true }
);
watch(
  () => filterValue.value,
  () => (currentPage.value = 1)
);
</script>

<template>
  <div class="selector">
    <el-input v-model="inputValue" disabled>
      <template #append>
        <el-popover
          :width="350"
          trigger="click"
          popper-class="pure-popper"
          :popper-options="{
            placement: 'auto'
          }"
          @before-enter="onBeforeEnter"
          @after-leave="onAfterLeave"
        >
          <template #reference>
            <div
              class="w-[40px] h-[32px] cursor-pointer flex justify-center items-center"
            >
              <IconifyIconOffline v-if="!icon" :icon="Search" />
              <IconifyIconOnline v-else :icon="inputValue" />
            </div>
          </template>

          <el-input
            v-model="filterValue"
            class="px-2 pt-2"
            placeholder="搜索图标"
            clearable
          />

          <el-tabs v-model="currentActiveType" @tab-click="handleClick">
            <el-tab-pane
              v-for="(pane, index) in tabsList"
              :key="index"
              :label="pane.label"
              :name="pane.name"
            >
              <el-scrollbar height="220px">
                <ul class="flex flex-wrap px-2! ml-2!">
                  <li
                    v-for="(item, key) in pageList"
                    :key="key"
                    :title="item"
                    class="icon-item p-2 cursor-pointer mr-2 mt-1 flex justify-center items-center border border-[#e5e7eb]"
                    :style="iconItemStyle(item)"
                    @click="onChangeIcon(item)"
                  >
                    <IconifyIconOnline
                      :icon="currentActiveType + item"
                      width="20px"
                      height="20px"
                    />
                  </li>
                </ul>
                <el-empty
                  v-show="pageList.length === 0"
                  :description="`${filterValue} 图标不存在`"
                  :image-size="60"
                />
              </el-scrollbar>
            </el-tab-pane>
          </el-tabs>

          <div
            class="w-full h-9 flex items-center overflow-auto border-t border-[#e5e7eb]"
          >
            <el-pagination
              class="flex-auto ml-2"
              :total="totalPage"
              :current-page="currentPage"
              :page-size="pageSize"
              :pager-count="5"
              layout="pager"
              background
              size="small"
              @current-change="onCurrentChange"
            />
            <el-button
              class="justify-end mx-2!"
              type="danger"
              size="small"
              text
              bg
              @click="onClear"
            >
              清空
            </el-button>
          </div>
        </el-popover>
      </template>
    </el-input>
  </div>
</template>

<style lang="scss" scoped>
.icon-item {
  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    transform: scaleX(1.05);
    transition: all 0.4s;
  }
}

:deep(.el-tabs__nav-next) {
  font-size: 15px;
  line-height: 32px;
  box-shadow: -5px 0 5px -6px #ccc;
}

:deep(.el-tabs__nav-prev) {
  font-size: 15px;
  line-height: 32px;
  box-shadow: 5px 0 5px -6px #ccc;
}

:deep(.el-input-group__append) {
  padding: 0;
}

:deep(.el-tabs__item) {
  height: 30px;
  font-size: 12px;
  font-weight: normal;
  line-height: 30px;
}

:deep(.el-tabs__header),
:deep(.el-tabs__nav-wrap) {
  position: static;
  margin: 0;
  box-shadow: 0 2px 5px rgb(0 0 0 / 6%);
}

:deep(.el-tabs__nav-wrap::after) {
  height: 0;
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 24px;
}

:deep(.el-tabs__content) {
  margin-top: 4px;
}
</style>
