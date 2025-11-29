import { createApp } from 'vue';
import { createPinia } from 'pinia';

import './fullcalendar-core.css';
import './fullcalendar-daygrid.css';
import './fullcalendar-timegrid.css';
import './style.css';
import App from './App.vue';

import router from './router'; // ⬅️ Import router

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router); // ⬅️ Use router
app.mount('#app');
