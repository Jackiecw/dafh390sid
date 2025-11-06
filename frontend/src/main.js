import { createApp } from 'vue'
import { createPinia } from 'pinia' // ⬅️ 【新增】1. 导入 Pinia
import './style.css'
import App from './App.vue'

import VCalendar from 'v-calendar'; // ⬅️ 【新增】 1. 导入
import 'v-calendar/style.css';     // ⬅️ 【新增】 2. 导入 CSS

const pinia = createPinia() // ⬅️ 【新增】2. 创建 Pinia 实例
const app = createApp(App)

app.use(pinia) // ⬅️ 【新增】3. 告诉 Vue 使用 Pinia
app.use(VCalendar, {}) // ⬅️ 【新增】 3. 注册插件
app.mount('#app')