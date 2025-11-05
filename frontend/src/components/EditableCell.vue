<template>
  <div 
    @click="startEdit" 
    v-if="!isEditing" 
    :class="{'admin-editable': isAdmin}" 
    :title="isAdmin ? '点击编辑' : ''"
    class="editable-cell"
  >
    {{ displayText || placeholder || '&nbsp;' }}
  </div>

  <div v-else class="w-full">
    <input
      v-if="type === 'text'"
      ref="inputRef"
      v-model="currentValue"
      @blur="saveEdit"
      @keydown.enter.prevent="saveEdit"
      @keydown.esc.prevent="cancelEdit"
      class="editable-input"
    />
    
    <select
      v-else-if="type === 'user-select'"
      ref="inputRef"
      v-model="currentValue"
      @blur="saveEdit"
      @change="saveEdit"
      @keydown.esc.prevent="cancelEdit"
      class="editable-input"
    >
      <option :value="null">-- 无 --</option>
      <option v-for="user in options" :key="user.id" :value="user.id">
        {{ user.nickname }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue';

const props = defineProps({
  value: { // (String for text, Object for user-select)
    type: [String, Object],
    default: null
  },
  type: {
    type: String,
    default: 'text' // 'text' or 'user-select'
  },
  options: { // (User list for user-select)
    type: Array,
    default: () => []
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '-'
  }
});

const emit = defineEmits(['save']);

const isEditing = ref(false);
const currentValue = ref(null);
const inputRef = ref(null);

// (核心) 根据类型计算显示文本
const displayText = computed(() => {
  if (props.type === 'user-select') {
    return props.value?.nickname; // (显示 owner.nickname)
  }
  return props.value; // (显示 name 或 notes)
});

// (核心) 当组件加载或 props 变化时，设置内部值
function setInternalValue() {
  if (props.type === 'user-select') {
    currentValue.value = props.value?.id || null; // (v-model 绑定的是 owner.id)
  } else {
    currentValue.value = props.value;
  }
}

watch(() => props.value, setInternalValue, { immediate: true });

// (启动编辑)
const startEdit = async () => {
  if (!props.isAdmin) return;
  setInternalValue(); // (确保开始编辑时，值是最新的)
  isEditing.value = true;
  await nextTick();
  inputRef.value?.focus();
};

// (保存编辑)
const saveEdit = () => {
  isEditing.value = false;
  
  // (检查值是否真的改变了)
  const originalValue = (props.type === 'user-select') ? (props.value?.id || null) : props.value;
  if (currentValue.value === originalValue) {
    return;
  }
  
  // (如果值是空字符串，则发送 null)
  const valueToSend = currentValue.value === '' ? null : currentValue.value;
  emit('save', valueToSend);
};

// (取消编辑)
const cancelEdit = () => {
  isEditing.value = false;
};

</script>

<style scoped>
/* (修复 BUG 1: 确保空单元格也能被点击) */
.editable-cell {
  min-height: 24px; 
  padding: 4px; 
  margin: -4px; 
  border-radius: 4px;
  transition: background-color 0.2s;
  width: 100%;
  display: block;
}

.admin-editable {
  cursor: pointer;
}
.admin-editable:hover {
  background-color: #f3f4f6; 
  outline: 1px dashed #a8a29e; 
}

.editable-input {
  width: 100%;
  padding: 4px;
  margin: -4px; 
  border: 1px solid #4f46e5 !important;
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.3);
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  font-weight: inherit;
}
</style>