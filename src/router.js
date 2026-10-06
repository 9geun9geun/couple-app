import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from './lib/supabase'
import Login from './views/Login.vue'
import Timeline from './views/Timeline.vue'
import Letters from './views/Letters.vue'

const router = createRouter({
  history: createWebHashHistory(), // GitHub Pages 새로고침 404 방지
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Timeline, meta: { auth: true } },
    { path: '/letters', component: Letters, meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (to.meta.auth && !session) return '/login'
  if (to.path === '/login' && session) return '/'
})

export default router
