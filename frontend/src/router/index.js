import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Lazy load components
const Dashboard = () => import('../components/Dashboard.vue');
const Login = () => import('../components/Login.vue');

// Existing Components
const DashboardHome = () => import('../components/DashboardHome.vue');
const CalendarPage = () => import('../components/CalendarPage.vue');
const WeeklyReportPage = () => import('../components/WeeklyReportPage.vue');
const SalesDashboard = () => import('../components/SalesDashboard.vue');
const SalesDataPage = () => import('../components/SalesDataPage.vue');
const DataImport = () => import('../components/DataImport.vue');
const ImportHistory = () => import('../components/ImportHistory.vue');
const OnSaleProductsPage = () => import('../components/OnSaleProductsPage.vue');
const ProductManagement = () => import('../components/ProductManagement.vue');
const OperationsCenter = () => import('../components/OperationsCenter.vue');
const FinancePage = () => import('../components/FinancePage.vue');
const LogisticsPage = () => import('../components/LogisticsPage.vue');
const CommonLinks = () => import('../components/CommonLinks.vue');
const StoreManagement = () => import('../components/StoreManagement.vue');
const UserManagement = () => import('../components/UserManagement.vue');
const ProfileManagement = () => import('../components/ProfileManagement.vue');

// Performance Module
const PerformanceDashboard = () => import('../views/performance/PerformanceDashboard.vue');
const PerformanceTemplateList = () => import('../views/performance/PerformanceTemplateList.vue');
const PerformanceDetail = () => import('../views/performance/PerformanceDetail.vue');

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/',
        component: Dashboard,
        meta: { requiresAuth: true },
        children: [
            { path: '', component: DashboardHome },
            { path: 'calendar', component: CalendarPage },
            { path: 'reports', component: WeeklyReportPage },

            // Sales
            { path: 'sales/dashboard', component: SalesDashboard },
            { path: 'sales/data', component: SalesDataPage },
            { path: 'sales/import', component: DataImport },
            { path: 'sales/history', component: ImportHistory },

            // Operations
            { path: 'products/on-sale', component: OnSaleProductsPage },
            { path: 'products/catalog', component: ProductManagement },
            { path: 'operations', component: OperationsCenter },
            { path: 'finance', component: FinancePage },
            { path: 'logistics', component: LogisticsPage },

            // Resources
            { path: 'links', component: CommonLinks },

            // Management
            { path: 'admin/stores', component: StoreManagement },
            { path: 'admin/users', component: UserManagement },

            // Profile
            { path: 'profile', component: ProfileManagement },

            // Performance Module
            { path: 'performance', component: PerformanceDashboard },
            { path: 'performance/templates', component: PerformanceTemplateList },
            { path: 'performance/reviews/:id', component: PerformanceDetail }
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
        next('/login');
    } else {
        next();
    }
});

export default router;
