import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/couple-app/', // GitHub repo 이름. repo가 username.github.io면 '/'
})
