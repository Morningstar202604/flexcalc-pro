import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/scenario', name: 'Scenario', component: () => import('../views/ScenarioView.vue') },
    { path: '/planning', name: 'Planning', component: () => import('../views/PlanningView.vue') },
    { path: '/rights', name: 'Rights', component: () => import('../views/RightsView.vue') },
    { path: '/policy', name: 'Policy', component: () => import('../views/PolicyView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ]
})
