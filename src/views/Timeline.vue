<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, BUCKET } from '../lib/supabase'
import { daysSince, formatKDate } from '../lib/date'
import AddMemory from '../components/AddMemory.vue'

const router = useRouter()
const START = import.meta.env.VITE_START_DATE

const memories = ref([])
const urls = ref({})        // path -> signed url
const loading = ref(true)
const error = ref('')
const showAdd = ref(false)
const lightbox = ref(null)
const shownDays = ref(0)

async function load() {
  loading.value = true
  error.value = ''
  const { data, error: e } = await supabase
    .from('memories')
    .select('id, date, title, caption, place, photos(id, path, sort)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('sort', { referencedTable: 'photos', ascending: true })

  if (e) {
    error.value = '기록을 불러오지 못했어요. 새로고침해 주세요.'
    loading.value = false
    return
  }
  memories.value = data

  const paths = data.flatMap((m) => m.photos.map((p) => p.path))
  if (paths.length) {
    const { data: signed, error: se } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
    urls.value = se
      ? {}
      : Object.fromEntries(signed.filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]))
  } else {
    urls.value = {}
  }
  loading.value = false
}

// 삭제: Storage 파일 먼저 지우고 memory 삭제 (photos row는 cascade)
async function remove(m) {
  const name = m.title || formatKDate(m.date)
  if (!confirm(`'${name}' 기록을 삭제할까요? 사진도 함께 삭제돼요.`)) return

  const paths = m.photos.map((p) => p.path)
  if (paths.length) {
    const { error: se } = await supabase.storage.from(BUCKET).remove(paths)
    if (se) {
      alert('사진을 삭제하지 못했어요. 다시 시도해 주세요.')
      return
    }
  }
  const { error: e } = await supabase.from('memories').delete().eq('id', m.id)
  if (e) {
    alert('기록을 삭제하지 못했어요. 다시 시도해 주세요.')
    return
  }
  memories.value = memories.value.filter((x) => x.id !== m.id)
}

async function onSaved() {
  showAdd.value = false
  await load()
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

function animateDays(target) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shownDays.value = target
    return
  }
  const dur = 1200
  const t0 = performance.now()
  const step = (t) => {
    const p = Math.min((t - t0) / dur, 1)
    shownDays.value = Math.round(target * (1 - Math.pow(1 - p, 3)))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function onKey(e) {
  if (e.key === 'Escape') lightbox.value = null
}

onMounted(() => {
  if (START) animateDays(daysSince(START))
  load()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="page">
    <header class="hero">
      <nav class="topnav">
        <router-link to="/letters">편지함</router-link>
        <button class="link-btn" @click="logout">로그아웃</button>
      </nav>
      <template v-if="START">
        <p class="hero-label">우리가 함께한 지</p>
        <p class="hero-days">D+{{ shownDays.toLocaleString() }}</p>
        <p class="hero-since">{{ formatKDate(START) }}부터</p>
      </template>
      <p v-else class="hero-label">.env에 VITE_START_DATE를 넣어 주세요.</p>
    </header>

    <div class="toolbar">
      <button class="primary" @click="showAdd = true">추억 추가</button>
    </div>

    <p v-if="loading" class="status">불러오는 중…</p>
    <p v-else-if="error" class="status error">{{ error }}</p>
    <p v-else-if="!memories.length" class="status">첫 번째 추억을 추가해 보세요.</p>

    <ol v-else class="timeline">
      <li v-for="m in memories" :key="m.id" class="entry">
        <div class="entry-head">
          <time class="entry-date" :datetime="m.date">{{ formatKDate(m.date) }}</time>
          <span v-if="START && daysSince(START, m.date) >= 1" class="entry-dday">
            D+{{ daysSince(START, m.date).toLocaleString() }}
          </span>
        </div>
        <h2 v-if="m.title" class="entry-title">{{ m.title }}</h2>
        <p v-if="m.place" class="entry-place">{{ m.place }}</p>

        <div v-if="m.photos.length" class="photos">
          <template v-for="p in m.photos" :key="p.id">
            <button v-if="urls[p.path]" class="polaroid" @click="lightbox = urls[p.path]" aria-label="사진 크게 보기">
              <img :src="urls[p.path]" :alt="m.title || ''" loading="lazy" />
            </button>
          </template>
        </div>

        <p v-if="m.caption" class="entry-caption">{{ m.caption }}</p>
        <div class="entry-actions">
          <button class="link-btn" @click="remove(m)">삭제</button>
        </div>
      </li>
    </ol>

    <AddMemory v-if="showAdd" @close="showAdd = false" @saved="onSaved" />

    <button v-if="lightbox" class="lightbox" @click="lightbox = null" aria-label="닫기">
      <img :src="lightbox" alt="" />
    </button>
  </main>
</template>
