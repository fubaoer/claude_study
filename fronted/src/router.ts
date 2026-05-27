import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Users from './pages/Users.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/users',
    name: 'Users',
    component: Users
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
