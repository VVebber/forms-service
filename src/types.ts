export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'
export type FormStatus = 'draft' | 'published'

export interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
}

export interface Form {
  id: string
  title: string
  description: string
  status: FormStatus
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

export interface Submission {
  id: string
  createdAt: string
  answers: Record<string, string | boolean>
}
