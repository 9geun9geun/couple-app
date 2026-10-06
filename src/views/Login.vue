<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const id = ref('')
const pw = ref('')
const error = ref('')
const loading = ref(false)
const domain = import.meta.env.VITE_EMAIL_DOMAIN || 'example.com'

async function login() {
  error.value = ''
  loading.value = true
  const raw = id.value.trim()
  const email = raw.includes('@') ? raw : `${raw}@${domain}`
  const { error: e } = await supabase.auth.signInWithPassword({ email, password: pw.value })
  loading.value = false
  if (e) {
    error.value = '아이디 또는 비밀번호가 맞지 않아요.'
    return
  }
  router.replace('/')
}
</script>

<template>
  <main class="login">
    <form class="login-card" @submit.prevent="login">
      <h1>우리의 기록</h1>
      <label>
        아이디
        <input v-model="id" autocomplete="username" autocapitalize="none" spellcheck="false" required />
      </label>
      <label>
        비밀번호
        <input v-model="pw" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="primary" :disabled="loading">{{ loading ? '들어가는 중…' : '들어가기' }}</button>
    </form>
  </main>
</template>
