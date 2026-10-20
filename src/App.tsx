import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { Form, FormField, Submission } from './types'
import AdminPage from './pages/AdminPage'
import PublicFormPage from './pages/PublicFormPage'

export default function App() {
  const match = window.location.pathname.match(/^\/f\/([^/]+)\/?$/)
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeForm = useMemo(() => forms.find((form) => form.id === activeId) || null, [forms, activeId])
  const saveQueue = useRef(Promise.resolve())

  useEffect(() => {
    if (match) return
    api.forms().then((items) => {
      setForms(items)
      setActiveId(items[0]?.id || null)
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [match])

  async function createForm() {
    try {
      const form = await api.createForm()
      setForms((items) => [form, ...items])
      setActiveId(form.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось создать форму')
    }
  }

  async function updateForm(id: string, changes: Partial<Pick<Form, 'title' | 'description' | 'fields'>>) {
    setForms((items) => items.map((form) => form.id === id ? { ...form, ...changes } : form))
    const saving = saveQueue.current.catch(() => undefined).then(() => api.updateForm(id, changes))
    saveQueue.current = saving.then(() => undefined, () => undefined)
    try { await saving } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить изменения')
    }
  }

  async function deleteForm(id: string) {
    try {
      await api.deleteForm(id)
      const remaining = forms.filter((form) => form.id !== id)
      setForms(remaining)
      setActiveId(remaining[0]?.id || null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить форму')
    }
  }

  async function togglePublish(id: string) {
    try {
      const saved = await api.publishForm(id)
      setForms((items) => items.map((form) => form.id === id ? saved : form))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус')
    }
  }

  if (match) return <PublicFormPage formId={decodeURIComponent(match[1])} />
  if (loading) return <div className="loading-screen"><span className="spinner" /> Загружаем ваши формы</div>
  if (error && !forms.length) return <div className="loading-screen"><div className="error-card">{error}<button onClick={() => location.reload()}>Попробовать снова</button></div></div>
  return <AdminPage
    forms={forms}
    activeForm={activeForm}
    onSelect={setActiveId}
    onCreate={createForm}
    onUpdate={updateForm}
    onDelete={deleteForm}
    onTogglePublish={togglePublish}
    error={error}
    onDismissError={() => setError('')}
  />
}

export type UpdateForm = (id: string, changes: Partial<Pick<Form, 'title' | 'description' | 'fields'>>) => Promise<void>
export type SubmissionList = Submission[]
export type { FormField }
