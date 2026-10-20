import type { FormField } from '../types'

export default function FieldControl({ field, value, onChange, preview = false }: {
  field: FormField
  value?: string | boolean
  onChange?: (value: string | boolean) => void
  preview?: boolean
}) {
  const common = {
    id: field.id,
    required: field.required,
    disabled: preview,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange?.(event.target instanceof HTMLInputElement && event.target.type === 'checkbox' ? event.target.checked : event.target.value),
  }
  if (field.type === 'checkbox') return <label className="checkbox-control"><input {...common} type="checkbox" checked={Boolean(value)} /><span>{field.label}{field.required && <i> *</i>}</span></label>
  if (field.type === 'textarea') return <textarea {...common} placeholder="Ваш ответ" rows={3} value={String(value ?? '')} />
  if (field.type === 'select') return <select {...common} value={String(value ?? '')}>
    <option value="" disabled>Выберите вариант</option>
    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select>
  return <input {...common} type={field.type === 'phone' ? 'tel' : field.type} placeholder={field.type === 'email' ? 'name@example.com' : field.type === 'phone' ? '+7 (___) ___-__-__' : 'Ваш ответ'} value={String(value ?? '')} />
}
