import { createApp } from 'vue'
import { createPinia } from 'pinia'

// ⬇️ --- 【修正】 导入 Toast UI Calendar 样式 ---
// (这个路径是正确的，因为它来自核心库 @toast-ui/calendar)
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
// ⬆️ --- 【修正】 ---

import './style.css' 
import App from './App.vue'

const pinia = createPinia() 
const app = createApp(App)

app.use(pinia) 
app.mount('#app')