import { createApp } from 'vue'
import { createPinia } from 'pinia' // ⬅️ 1. 导入 Pinia

// ⬇️ --- 【最终修正】 导入 FullCalendar 样式 (使用元包) ---
import 'fullcalendar/main.css'
// ⬆️ --- 【最终修正】 ---

import './style.css' // ⬅️ 导入你自己的样式
import App from './App.vue'

const pinia = createPinia() // ⬅️ 2. 创建 Pinia 实例
const app = createApp(App)

app.use(pinia) // ⬅️ 3. 告诉 Vue 使用 Pinia
app.mount('#app')