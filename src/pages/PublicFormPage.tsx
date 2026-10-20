import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { Form } from "../types";
import FieldControl from "../component/FieldControl";

export default function PublicFormPage({ formId }: { formId: string }) {
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api
      .form(formId)
      .then(setForm)
      .catch(() => setForm(null))
      .finally(() => setLoading(false));
  }, [formId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError("");
    for (const field of form.fields) {
      const answer = answers[field.id];
      if (
        field.required &&
        (field.type === "checkbox"
          ? answer !== true
          : !String(answer ?? "").trim())
      ) {
        setError(`Заполните обязательное поле «${field.label}»`);
        document.getElementById(field.id)?.focus();
        return;
      }
      if (
        field.type === "email" &&
        answer &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answer))
      ) {
        setError(`Проверьте адрес электронной почты в поле «${field.label}»`);
        document.getElementById(field.id)?.focus();
        return;
      }
    }
    setSubmitting(true);
    try {
      await api.submit(form.id, answers);
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось отправить ответы. Попробуйте ещё раз.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="public-page">
        <div className="public-loading">Открываем форму…</div>
      </div>
    );
  if (!form || form.status !== "published")
    return (
      <div className="public-page">
        <a className="public-brand" href="/admin">
          <span className="brand-mark">f</span> форма
        </a>
        <div className="public-message">
          <span className="message-icon">◌</span>
          <h1>Форма недоступна</h1>
          <p>Возможно, ссылка устарела или форма ещё не опубликована.</p>
          <a href="/admin">Перейти на главную ↗</a>
        </div>
      </div>
    );
  if (sent)
    return (
      <div className="public-page">
        <a className="public-brand" href="/admin">
          <span className="brand-mark">f</span> форма
        </a>
        <div className="public-message success-message">
          <span className="message-icon success-icon">✓</span>
          <div className="eyebrow">ОТКЛИК ОТПРАВЛЕН</div>
          <h1>Спасибо за ответ!</h1>
          <p>Ваши данные переданы организаторам. Желаем удачи!</p>
        </div>
        <div className="public-credit">
          Создано в <b>форма.</b>
        </div>
      </div>
    );

  return (
    <div className="public-page">
      <header className="public-header">
        <a className="public-brand" href="/admin">
          <span className="brand-mark">f</span> форма
          <span className="brand-dot">.</span>
        </a>
        <span className="secure-note">
          <span>✳</span> ФОРМА ОТКЛИКА
        </span>
      </header>
      <main className="public-main">
        <div className="public-kicker">
          <span /> ЗАЯВКА · {form.title.toLocaleUpperCase("ru-RU")}
        </div>
        <h1>{form.title}</h1>
        {form.description && (
          <p className="public-description">{form.description}</p>
        )}
        <div className="public-progress">
          <span>ВАШИ ДАННЫЕ</span>
          <div>
            <i style={{ width: "100%" }} />
          </div>
          <span>{form.fields.length} ВОПРОСОВ</span>
        </div>
        <form className="public-form" onSubmit={submit} noValidate>
          {form.fields.map((field, index) => (
            <div
              className={`public-field ${field.type === "checkbox" ? "public-checkbox" : ""}`}
              key={field.id}
            >
              <label htmlFor={field.id}>
                <span className="public-field-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  {field.label}
                  {field.required && <i> *</i>}
                </span>
              </label>
              {field.type === "checkbox" ? (
                <FieldControl
                  field={field}
                  value={answers[field.id]}
                  onChange={(value) =>
                    setAnswers((current) => ({ ...current, [field.id]: value }))
                  }
                />
              ) : (
                <FieldControl
                  field={field}
                  value={answers[field.id]}
                  onChange={(value) =>
                    setAnswers((current) => ({ ...current, [field.id]: value }))
                  }
                />
              )}
            </div>
          ))}
          {error && (
            <div className="form-error" role="alert">
              ⚠ {error}
            </div>
          )}
          <div className="submit-row">
            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Отправляем…" : "Отправить отклик"} <span>→</span>
            </button>
            <small>
              Нажимая кнопку, вы соглашаетесь на обработку ответов
              организатором.
            </small>
          </div>
        </form>
        <div className="public-bottom">
          <span>Вопросы? Свяжитесь с организатором.</span>
          <span>
            Защищённая форма <b>✳</b>
          </span>
        </div>
      </main>
      <div className="public-credit">
        СОЗДАНО В <b>форма.</b>
      </div>
    </div>
  );
}
