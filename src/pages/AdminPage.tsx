import { useEffect, useState } from "react";
import { api, createField } from "../api";
import type { FieldType, Form, FormField, Submission } from "../types";
import type { UpdateForm } from "../App";
import FieldControl from "../component/FieldControl";

const fieldTypes: {
  type: FieldType;
  title: string;
  hint: string;
  icon: string;
}[] = [
  {
    type: "text",
    title: "Короткий ответ",
    hint: "Имя, вуз или ссылка",
    icon: "T",
  },
  {
    type: "textarea",
    title: "Развёрнутый ответ",
    hint: "Опыт или мотивация",
    icon: "¶",
  },
  {
    type: "email",
    title: "Электронная почта",
    hint: "Для связи с кандидатом",
    icon: "@",
  },
  { type: "phone", title: "Телефон", hint: "Номер телефона", icon: "⌕" },
  {
    type: "select",
    title: "Выпадающий список",
    hint: "Выбор одного варианта",
    icon: "☷",
  },
  {
    type: "checkbox",
    title: "Подтверждение",
    hint: "Согласие или условие",
    icon: "✓",
  },
];

export default function AdminPage({
  forms,
  activeForm,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onTogglePublish,
  error,
  onDismissError,
}: {
  forms: Form[];
  activeForm: Form | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onUpdate: UpdateForm;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  error: string;
  onDismissError: () => void;
}) {
  const [tab, setTab] = useState<"builder" | "answers">("builder");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    setTab("builder");
    setDeleteConfirm(false);
    if (activeForm)
      api
        .submissions(activeForm.id)
        .then(setSubmissions)
        .catch(() => setSubmissions([]));
    else setSubmissions([]);
  }, [activeForm?.id]);

  useEffect(() => {
    if (tab === "answers" && activeForm) {
      api
        .submissions(activeForm.id)
        .then(setSubmissions)
        .catch(() => setSubmissions([]));
    }
  }, [tab, activeForm?.id]);

  async function save(
    changes: Partial<Pick<Form, "title" | "description" | "fields">>,
  ) {
    if (activeForm) await onUpdate(activeForm.id, changes);
  }

  function changeField(id: string, changes: Partial<FormField>) {
    if (!activeForm) return;
    void save({
      fields: activeForm.fields.map((field) =>
        field.id === id ? { ...field, ...changes } : field,
      ),
    });
  }

  function moveField(index: number, direction: -1 | 1) {
    if (!activeForm) return;
    const target = index + direction;
    if (target < 0 || target >= activeForm.fields.length) return;
    const fields = [...activeForm.fields];
    [fields[index], fields[target]] = [fields[target], fields[index]];
    void save({ fields });
  }

  function share() {
    if (!activeForm) return;
    void navigator.clipboard
      .writeText(`${location.origin}/f/${activeForm.id}`)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/admin">
          <span className="brand-mark">f</span>
          <span>
            форма<span className="brand-dot">.</span>
            <small>СТУДЕНЧЕСКИЕ ОТКЛИКИ</small>
          </span>
        </a>
        <div className="sidebar-heading">
          <span>РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <button
            className="icon-button tiny"
            title="Создать форму"
            onClick={onCreate}
          >
            ＋
          </button>
        </div>
        <nav className="form-nav" aria-label="Ваши формы">
          {forms.map((form) => (
            <button
              key={form.id}
              className={`nav-item ${activeForm?.id === form.id ? "selected" : ""}`}
              onClick={() => onSelect(form.id)}
            >
              <span className={`nav-icon ${form.status}`}>
                {form.status === "published" ? "↗" : "▤"}
              </span>
              <span className="nav-copy">
                <b>{form.title || "Без названия"}</b>
                <small>
                  {form.status === "published" ? "Опубликована" : "Черновик"}
                </small>
              </span>
              <span className="nav-count">
                {form.id === activeForm?.id ? submissions.length : ""}
              </span>
            </button>
          ))}
        </nav>
        <button className="new-form" onClick={onCreate}>
          <span>＋</span> Создать форму
        </button>
        <div className="sidebar-foot">
          <span className="avatar">М</span>
          <span>
            <b>Моё пространство</b>
            <small>Личный кабинет</small>
          </span>
          <span className="dots">···</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Мои формы</span>
            <b>/</b>
            <strong>{activeForm?.title || "Новая форма"}</strong>
          </div>
          <div className="top-actions">
            {activeForm && (
              <>
                <span className={`status-pill ${activeForm.status}`}>
                  {activeForm.status === "published" ? (
                    <>
                      <i /> Опубликована
                    </>
                  ) : (
                    <>
                      <i /> Черновик
                    </>
                  )}
                </span>
                <button
                  className="button button-light"
                  onClick={share}
                  disabled={activeForm.status !== "published"}
                  title={
                    activeForm.status !== "published"
                      ? "Сначала опубликуйте форму"
                      : ""
                  }
                >
                  {copied ? "Ссылка скопирована" : "↗ Поделиться"}
                </button>
                <button
                  className="button button-primary"
                  onClick={() => onTogglePublish(activeForm.id)}
                >
                  {activeForm.status === "published"
                    ? "Снять с публикации"
                    : "Опубликовать форму"}
                </button>
              </>
            )}
          </div>
        </header>

        {error && (
          <div className="toast-error" role="alert">
            {error}
            <button onClick={onDismissError}>×</button>
          </div>
        )}
        {!activeForm ? (
          <section className="empty-dashboard">
            <div className="empty-illustration">
              <span>✳</span>
              <span>▤</span>
              <span>↗</span>
            </div>
            <p className="eyebrow">ВАШЕ ПРОСТРАНСТВО ДЛЯ ОТКЛИКОВ</p>
            <h1>
              Хорошие возможности
              <br />
              начинаются с формы
            </h1>
            <p className="muted">
              Соберите форму отклика для стажировки или события —
              <br className="desktop-only" /> ответы студентов сразу появятся
              здесь.
            </p>
            <button className="button button-primary large" onClick={onCreate}>
              ＋ Создать первую форму
            </button>
            <div className="steps">
              <span>
                <i>01</i> Соберите вопросы
              </span>
              <span>
                <i>02</i> Опубликуйте ссылку
              </span>
              <span>
                <i>03</i> Получите ответы
              </span>
            </div>
          </section>
        ) : (
          <>
            <section className="page-heading">
              <div>
                <div className="eyebrow">
                  {activeForm.status === "published"
                    ? "ФОРМА ОТКРЫТА ДЛЯ ОТКЛИКОВ"
                    : "ЧЕРНОВИК ФОРМЫ"}
                </div>
                <h1>{activeForm.title || "Новая форма"}</h1>
                <p>
                  {activeForm.description ||
                    "Соберите вопросы для будущих участников."}
                </p>
              </div>
              <button
                className="icon-button delete-form"
                aria-label="Удалить форму"
                title="Удалить форму"
                onClick={() => setDeleteConfirm(true)}
              >
                ⌫
              </button>
            </section>
            {deleteConfirm && (
              <div className="confirm-bar">
                <span>Удалить форму и все ответы?</span>
                <button
                  className="text-action"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Отмена
                </button>
                <button
                  className="text-action danger"
                  onClick={() => onDelete(activeForm.id)}
                >
                  Удалить
                </button>
              </div>
            )}
            <div className="tabs">
              <button
                className={tab === "builder" ? "active" : ""}
                onClick={() => setTab("builder")}
              >
                Конструктор <span>{activeForm.fields.length}</span>
              </button>
              <button
                className={tab === "answers" ? "active" : ""}
                onClick={() => setTab("answers")}
              >
                Ответы <span>{submissions.length}</span>
              </button>
            </div>
            {tab === "builder" ? (
              <div className="builder-layout">
                <section className="builder-column">
                  <div className="section-caption">
                    <div>
                      <b>Настройка формы</b>
                      <span>Название и описание увидят студенты</span>
                    </div>
                    <span className="autosave">
                      <i /> Сохранено
                    </span>
                  </div>
                  <div className="settings-card">
                    <label className="input-label">
                      Название формы
                      <input
                        value={activeForm.title}
                        maxLength={120}
                        onChange={(event) =>
                          void save({ title: event.target.value })
                        }
                        placeholder="Например, стажировка в дизайне"
                      />
                    </label>
                    <label className="input-label">
                      Описание
                      <textarea
                        rows={3}
                        value={activeForm.description}
                        maxLength={1000}
                        onChange={(event) =>
                          void save({ description: event.target.value })
                        }
                        placeholder="Расскажите о возможности и о том, кого вы ищете"
                      />
                    </label>
                  </div>
                  <div className="section-caption fields-caption">
                    <div>
                      <b>Вопросы формы</b>
                      <span>Добавьте вопросы и отметьте обязательные</span>
                    </div>
                    <span className="field-total">
                      {activeForm.fields.length} / 30
                    </span>
                  </div>
                  <div className="fields-list">
                    {activeForm.fields.map((field, index) => (
                      <article className="question-card" key={field.id}>
                        <div className="question-toolbar">
                          <span className="drag-handle">⠿</span>
                          <span className="question-number">
                            ВОПРОС {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="question-actions">
                            <button
                              title="Переместить вверх"
                              disabled={index === 0}
                              onClick={() => moveField(index, -1)}
                            >
                              ↑
                            </button>
                            <button
                              title="Переместить вниз"
                              disabled={index === activeForm.fields.length - 1}
                              onClick={() => moveField(index, 1)}
                            >
                              ↓
                            </button>
                            <button
                              title="Удалить вопрос"
                              onClick={() =>
                                void save({
                                  fields: activeForm.fields.filter(
                                    (item) => item.id !== field.id,
                                  ),
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <input
                          className="question-title"
                          aria-label="Текст вопроса"
                          value={field.label}
                          onChange={(event) =>
                            changeField(field.id, { label: event.target.value })
                          }
                          placeholder="Введите вопрос"
                        />
                        <div className="question-options">
                          <select
                            aria-label="Тип вопроса"
                            value={field.type}
                            onChange={(event) => {
                              const next = createField(
                                event.target.value as FieldType,
                              );
                              changeField(field.id, {
                                type: next.type,
                                options: next.options,
                              });
                            }}
                          >
                            {fieldTypes.map((item) => (
                              <option key={item.type} value={item.type}>
                                {item.title}
                              </option>
                            ))}
                          </select>
                          <label className="switch-label">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) =>
                                changeField(field.id, {
                                  required: event.target.checked,
                                })
                              }
                            />
                            <span className="switch" />
                            Обязательный
                          </label>
                        </div>
                        {field.type === "select" && (
                          <label className="options-editor">
                            Варианты ответа
                            <textarea
                              rows={2}
                              value={field.options.join("\n")}
                              onChange={(event) =>
                                changeField(field.id, {
                                  options: event.target.value.split("\n"),
                                })
                              }
                              placeholder="Каждый вариант с новой строки"
                            />
                          </label>
                        )}
                      </article>
                    ))}
                  </div>
                  {activeForm.fields.length < 30 && (
                    <div className="add-question">
                      <div className="add-question-title">
                        <span className="plus-ring">＋</span>
                        <div>
                          <b>Добавить вопрос</b>
                          <small>Выберите тип ответа</small>
                        </div>
                      </div>
                      <div className="field-type-grid">
                        {fieldTypes.map((item) => (
                          <button
                            className="field-type"
                            key={item.type}
                            onClick={() =>
                              void save({
                                fields: [
                                  ...activeForm.fields,
                                  createField(item.type),
                                ],
                              })
                            }
                          >
                            <span className="type-icon">{item.icon}</span>
                            <span>
                              <b>{item.title}</b>
                              <small>{item.hint}</small>
                            </span>
                            <span className="type-add">＋</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
                <aside className="preview-column">
                  <div className="preview-heading">
                    <span>ПРЕДПРОСМОТР</span>
                    <span className="preview-device">▣&nbsp; Студентам</span>
                  </div>
                  <div className="form-preview">
                    <div className="preview-topline">
                      <span className="preview-brand">
                        <i /> форма
                      </span>
                      <span>ОТКЛИК</span>
                    </div>
                    <div className="preview-content">
                      <div className="preview-label">ВОЗМОЖНОСТЬ</div>
                      <h2>{activeForm.title || "Название формы"}</h2>
                      <p>
                        {activeForm.description ||
                          "Здесь появится описание возможности и информация для кандидатов."}
                      </p>
                      <div className="preview-divider" />
                      {activeForm.fields.length ? (
                        activeForm.fields.map((field) => (
                          <label className="preview-field" key={field.id}>
                            <span>
                              {field.label || "Ваш вопрос"}
                              {field.required && <i> *</i>}
                            </span>
                            <FieldControl field={field} preview />
                          </label>
                        ))
                      ) : (
                        <div className="preview-placeholder">
                          <span>＋</span>
                          <b>Ваша форма появится здесь</b>
                          <small>
                            Добавьте первый вопрос, чтобы увидеть его
                            предпросмотр
                          </small>
                        </div>
                      )}
                      <button className="preview-submit" disabled>
                        Отправить отклик <span>→</span>
                      </button>
                      <div className="preview-privacy">
                        Ваши данные будут доступны организаторам
                      </div>
                    </div>
                  </div>
                  <p className="preview-footnote">
                    Предпросмотр может немного отличаться от опубликованной
                    формы
                  </p>
                </aside>
              </div>
            ) : (
              <AnswersView form={activeForm} submissions={submissions} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function AnswersView({
  form,
  submissions,
}: {
  form: Form;
  submissions: Submission[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const current =
    submissions.find((item) => item.id === selected) || submissions[0];
  const date = (value: string) =>
    new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <section className="answers-view">
      <div className="answers-summary">
        <div>
          <span className="eyebrow">ОТКЛИКИ НА ФОРМУ</span>
          <h2>Ответы студентов</h2>
          <p>Все отправленные анкеты в одном месте.</p>
        </div>
        <div className="answer-count">
          <strong>{submissions.length}</strong>
          <span>получено</span>
        </div>
      </div>
      {!submissions.length ? (
        <div className="answers-empty">
          <span className="empty-envelope">↙</span>
          <h3>Пока нет ответов</h3>
          <p>Как только студент отправит форму, его ответы появятся здесь.</p>
          <a href={`/f/${form.id}`} target="_blank" rel="noreferrer">
            Открыть опубликованную форму ↗
          </a>
        </div>
      ) : (
        <div className="responses-layout">
          <div className="response-list">
            {submissions.map((item, index) => {
              const firstAnswer = Object.values(item.answers).find(
                (answer) => typeof answer === "string" && answer.trim(),
              );
              const display =
                typeof firstAnswer === "string" ? firstAnswer : "Новый отклик";
              return (
                <button
                  key={item.id}
                  className={`response-item ${current?.id === item.id ? "selected" : ""}`}
                  onClick={() => setSelected(item.id)}
                >
                  <span className="response-avatar">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="response-copy">
                    <b>{display}</b>
                    <small>{date(item.createdAt)}</small>
                  </span>
                  <span className="response-arrow">→</span>
                </button>
              );
            })}
          </div>
          <article className="response-detail">
            {current && (
              <>
                <div className="response-detail-head">
                  <div>
                    <span className="eyebrow">
                      АНКЕТА · {date(current.createdAt)}
                    </span>
                    <h3>Ответ студента</h3>
                  </div>
                  <span className="response-avatar large-avatar">
                    {String(submissions.indexOf(current) + 1).padStart(2, "0")}
                  </span>
                </div>
                {form.fields.map((field) => (
                  <div className="answer-row" key={field.id}>
                    <span>{field.label}</span>
                    <b>
                      {field.type === "checkbox"
                        ? current.answers[field.id]
                          ? "Да"
                          : "Нет"
                        : String(current.answers[field.id] || "—")}
                    </b>
                  </div>
                ))}
              </>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
