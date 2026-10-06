<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import imageCompression from 'browser-image-compression'
import { supabase, BUCKET } from '../lib/supabase'
import { todayStr } from '../lib/date'

const emit = defineEmits(['close', 'saved'])

const form = reactive({ date: todayStr(), title: '', place: '', caption: '' })
const files = ref([])
const previews = ref([])
const saving = ref(false)
const progress = ref('')
const error = ref('')

function revokePreviews() {
  previews.value.forEach((u) => URL.revokeObjectURL(u))
}

function onFiles(e) {
  revokePreviews()
  files.value = Array.from(e.target.files || [])
  previews.value = files.value.map((f) => URL.createObjectURL(f))
}

function close() {
  if (!saving.value) emit('close')
}

async function save() {
  if (!files.value.length && !form.title.trim()) {
    error.value = '제목이나 사진 중 하나는 넣어 주세요.'
    return
  }
  saving.value = true
  error.value = ''

  let memoryId = null
  const uploaded = []

  try {
    const { data: mem, error: me } = await supabase
      .from('memories')
      .insert({
        date: form.date,
        title: form.title.trim() || null,
        place: form.place.trim() || null,
        caption: form.caption.trim() || null,
      })
      .select('id')
      .single()
    if (me) throw me
    memoryId = mem.id

    const rows = []
    for (const [i, f] of files.value.entries()) {
      progress.value = `사진 올리는 중 ${i + 1}/${files.value.length}`
      const blob = await imageCompression(f, {
        maxWidthOrHeight: 1920,
        maxSizeMB: 0.6,
        initialQuality: 0.85,
        fileType: 'image/jpeg',
        useWebWorker: true,
      })
      const path = `${memoryId}/${crypto.randomUUID()}.jpg`
      const { error: ue } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg' })
      if (ue) throw ue
      uploaded.push(path)
      rows.push({ memory_id: memoryId, path, sort: i })
    }

    if (rows.length) {
      const { error: pe } = await supabase.from('photos').insert(rows)
      if (pe) throw pe
    }

    emit('saved')
  } catch (e) {
    console.error(e)
    // 롤백: 올라간 파일과 memory 정리
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded)
    if (memoryId) await supabase.from('memories').delete().eq('id', memoryId)
    error.value = '저장하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.'
  } finally {
    saving.value = false
    progress.value = ''
  }
}

onBeforeUnmount(revokePreviews)
</script>

<template>
  <div class="sheet-backdrop" @click.self="close">
    <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="add-title" @submit.prevent="save">
      <h2 id="add-title">추억 추가</h2>
      <label>날짜<input v-model="form.date" type="date" required /></label>
      <label>제목<input v-model="form.title" maxlength="80" /></label>
      <label>장소<input v-model="form.place" maxlength="80" /></label>
      <label>이야기<textarea v-model="form.caption" rows="3"></textarea></label>
      <label>사진<input type="file" accept="image/*" multiple @change="onFiles" /></label>

      <div v-if="previews.length" class="previews">
        <img v-for="(src, i) in previews" :key="i" :src="src" alt="" />
      </div>

      <p v-if="progress" class="progress">{{ progress }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="sheet-actions">
        <button type="button" class="ghost" :disabled="saving" @click="close">취소</button>
        <button class="primary" :disabled="saving">{{ saving ? '저장 중…' : '저장' }}</button>
      </div>
    </form>
  </div>
</template>
