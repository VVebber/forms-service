import type { Form, FormField, Submission } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Не удалось выполнить запрос')
  return payload as T
}

export const api = {
  forms: () => request<Form[]>('/api/forms'),
  form: (id: string) => request<Form>(`/api/forms/${id}`),
  createForm: () => request<Form>('/api/forms', { method: 'POST', body: '{}' }),
  updateForm: (id: string, changes: Partial<Pick<Form, 'title' | 'description' | 'fields'>>) =>
    request<Form>(`/api/forms/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  deleteForm: (id: string) => request<{ ok: true }>(`/api/forms/${id}`, { method: 'DELETE' }),
  publishForm: (id: string) => request<Form>(`/api/forms/${id}/publish`, { method: 'POST' }),
  submissions: (id: string) => request<Submission[]>(`/api/forms/${id}/submissions`),
  submit: (id: string, answers: Submission['answers']) =>
    request<{ ok: true }>(`/api/forms/${id}/submissions`, {
      method: 'POST', body: JSON.stringify({ answers }),
    }),
}

export function createField(type: FormField['type'] = 'text'): FormField {
  const labels: Record<FormField['type'], string> = {
    text: 'Короткий ответ', email: 'Электронная почта', phone: 'Телефон',
    textarea: 'Развёрнутый ответ', select: 'Выпадающий список', checkbox: 'Подтверждение',
  }
  return {
    id: crypto.randomUUID(), label: labels[type], type, required: false,
    options: type === 'select' ? ['Первый вариант', 'Второй вариант'] : [],
  }
}
