<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { todayStr, daysSince, formatKDate } from '../lib/date'
import WriteLetter from '../components/WriteLetter.vue'

const router = useRouter()
const me = ref(null)
const letters = ref([])
const loading = ref(true)
const error = ref('')
const showWrite = ref(false)
const opened = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  const { data: { user } } = await supabase.auth.getUser()
  me.value = user?.id ?? null

  // 잠긴 편지는 RLS가 letter_bodies를 안 돌려줘서 body가 null로 옴
  const { data, error: e } = await supabase
    .from('letters')
    .select('id, title, unlock_date, author, created_at, letter_bodies(body)')
    .order('unlock_date', { ascending: true })

  if (e) {
    error.value = '편지를 불러오지 못했어요. 새로고침해 주세요.'
    loading.value = false
    return
  }
  letters.value = data.map((l) => {
    const b = Array.isArray(l.letter_bodies) ? l.letter_bodies[0] : l.letter_bodies
    return { ...l, body: b?.body ?? null }
  })
  loading.value = false
}

const received = computed(() => letters.value.filter((l) => l.author !== me.value))
const sent = computed(() => letters.value.filter((l) => l.author === me.value))

function daysLeft(l) {
  return daysSince(todayStr(), l.unlock_date) - 1
}

async function remove(l) {
  if (!confirm('이 편지를 삭제할까요? 되돌릴 수 없어요.')) return
  const { error: e } = await supabase.from('letters').delete().eq('id', l.id)
  if (e) {
    alert('편지를 삭제하지 못했어요. 다시 시도해 주세요.')
    return
  }
  letters.value = letters.value.filter((x) => x.id !== l.id)
}

async function onSaved() {
  showWrite.value = false
  await load()
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

function onKey(e) {
  if (e.key === 'Escape') opened.value = null
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="page">
    <header class="hero hero-small">
      <nav class="topnav">
        <router-link to="/">타임라인</router-link>
        <button class="link-btn" @click="logout">로그아웃</button>
      </nav>
      <h1 class="page-title">편지함</h1>
      <p class="hero-since">정해진 날이 돼야 열리는 편지</p>
    </header>

    <div class="toolbar">
      <button class="primary" @click="showWrite = true">편지 쓰기</button>
    </div>

    <p v-if="loading" class="status">불러오는 중…</p>
    <p v-else-if="error" class="status error">{{ error }}</p>

    <template v-else>
      <section class="letter-section">
        <h2 class="section-title">받은 편지</h2>
        <p v-if="!received.length" class="status">아직 받은 편지가 없어요.</p>
        <div v-else class="letters-grid">
          <button
            v-for="l in received"
            :key="l.id"
            class="envelope"
            :class="{ locked: l.body === null }"
            :disabled="l.body === null"
            @click="opened = l"
          >
            <span class="seal" aria-hidden="true">{{ l.body === null ? '🔒' : '💌' }}</span>
            <span class="envelope-title">{{ l.title || '제목 없는 편지' }}</span>
            <span v-if="l.body === null" class="envelope-meta">
              {{ daysLeft(l) > 0 ? `D-${daysLeft(l)}` : '곧 열려요' }} · {{ formatKDate(l.unlock_date) }}에 열려요
            </span>
            <span v-else class="envelope-meta">열어보기</span>
          </button>
        </div>
      </section>

      <section class="letter-section">
        <h2 class="section-title">보낸 편지</h2>
        <p v-if="!sent.length" class="status">아직 보낸 편지가 없어요.</p>
        <ul v-else class="sent-list">
          <li v-for="l in sent" :key="l.id" class="sent-item">
            <div>
              <strong>{{ l.title || '제목 없는 편지' }}</strong>
              <p class="envelope-meta">{{ formatKDate(l.unlock_date) }}에 열려요</p>
            </div>
            <div class="sent-actions">
              <button class="link-btn" @click="opened = l">보기</button>
              <button class="link-btn" @click="remove(l)">삭제</button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <WriteLetter v-if="showWrite" @close="showWrite = false" @saved="onSaved" />

    <div v-if="opened" class="letter-backdrop" @click.self="opened = null">
      <article class="letter-paper" role="dialog" aria-modal="true" aria-labelledby="letter-title">
        <h2 id="letter-title">{{ opened.title || '제목 없는 편지' }}</h2>
        <p class="letter-body">{{ opened.body }}</p>
        <p class="letter-foot">{{ new Date(opened.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) }}에 씀</p>
        <button class="ghost" @click="opened = null">닫기</button>
      </article>
    </div>
  </main>
</template>
