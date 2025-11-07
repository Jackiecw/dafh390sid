import { createApp } from 'vue'
import { createPinia } from 'pinia' // ⬅️ 【新增】1. 导入 Pinia
import './style.css'
import App from './App.vue'

// ⬇️ 【删除】
// import VCalendar from 'v-calendar'; 
// import 'v-calendar/style.css';     
// ⬆️ 【删除】

const pinia = createPinia() // ⬅️ 【新增】2. 创建 Pinia 实例
const app = createApp(App)

app.use(pinia) // ⬅️ 【新增】3. 告诉 Vue 使用 Pinia
// ⬇️ 【删除】
// app.use(VCalendar, {}) 
// ⬆️ 【删除】
app.mount('#app')