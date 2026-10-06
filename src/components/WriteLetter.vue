<script setup>
import { ref, reactive } from 'vue'
import { supabase } from '../lib/supabase'
import { todayStr, addDays } from '../lib/date'

const emit = defineEmits(['close', 'saved'])

const minDate = addDays(todayStr(), 1)
const form = reactive({ title: '', unlock: minDate, body: '' })
const saving = ref(false)
const error = ref('')

function close() {
  if (!saving.value) emit('close')
}

async function save() {
  if (!form.body.trim()) {
    error.value = '편지 내용을 적어 주세요.'
    return
  }
  if (form.unlock < minDate) {
    error.value = '열리는 날은 내일 이후로 골라 주세요.'
    return
  }
  saving.value = true
  error.value = ''
  const { error: e } = await supabase.rpc('create_letter', {
    p_title: form.title,
    p_unlock: form.unlock,
    p_body: form.body,
  })
  saving.value = false
  if (e) {
    console.error(e)
    error.value = '편지를 보내지 못했어요. 다시 시도해 주세요.'
    return
  }
  emit('saved')
}
</script>

<template>
  <div class="sheet-backdrop" @click.self="close">
    <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="write-title" @submit.prevent="save">
      <h2 id="write-title">편지 쓰기</h2>
      <label>
        봉투에 적을 말 (열기 전에도 보여요)
        <input v-model="form.title" maxlength="60" placeholder="예: 우리 3주년에 열어봐" />
      </label>
      <label>열리는 날<input v-model="form.unlock" type="date" :min="minDate" required /></label>
      <label>편지<textarea v-model="form.body" rows="8" required></textarea></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="sheet-actions">
        <button type="button" class="ghost" :disabled="saving" @click="close">취소</button>
        <button class="primary" :disabled="saving">{{ saving ? '보내는 중…' : '봉인해서 보내기' }}</button>
      </div>
    </form>
  </div>
</template>
