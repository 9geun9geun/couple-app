// 'YYYY-MM-DD'를 로컬 자정으로 파싱 (new Date('YYYY-MM-DD')는 UTC라 NZ에서 하루 밀릴 수 있음)
export function parseLocalDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 오늘 날짜 (로컬 기준). toISOString()은 UTC라 쓰면 안 됨
export function todayStr() {
  const t = new Date()
  const mm = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  return `${t.getFullYear()}-${mm}-${dd}`
}

// 한국식 D+day: 시작일 = D+1. DST 때문에 round 사용
export function daysSince(startStr, dateStr = todayStr()) {
  return Math.round((parseLocalDate(dateStr) - parseLocalDate(startStr)) / 86400000) + 1
}

export function formatKDate(s) {
  const d = parseLocalDate(s)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 'YYYY-MM-DD'에 n일 더한 'YYYY-MM-DD' (로컬 기준)
export function addDays(s, n) {
  const d = parseLocalDate(s)
  d.setDate(d.getDate() + n)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
