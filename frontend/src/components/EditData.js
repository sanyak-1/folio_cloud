// src/components/EditData.js
//
// Step 2 of the flow: the user reviews what the AI extracted and fixes any
// mistakes before the portfolio is built.
//
// Props:
//   data    - the parsed resume object from the backend (comes from App)
//   onBack  - called when the user wants to go back and upload another file
//
// How it works, in short:
//   1. When the component first appears, it copies `data` into its own local
//      state called `form`. We edit the COPY, never the original.
//   2. Every input shows a value from `form` and updates `form` when the user
//      types. (This pattern is called a "controlled input".)
//   3. The user also picks a portfolio template from a dropdown. That choice
//      is kept in its own piece of state called `template`.
//   4. On save, we tidy the copy (trim spaces, drop empty rows), add the
//      template, send it to the backend (POST /api/portfolio), and when the
//      backend answers with the new portfolio's ID we move to the page
//      /portfolio/<id>.

import { useState } from 'react';
// useNavigate gives us a function that changes the page (the URL) from code.
import { useNavigate } from 'react-router-dom';

// Where the backend saves portfolios (see backend/main.py).
const SAVE_URL = 'http://98.93.19.133/api/portfolio';

// The templates the user can choose from. `id` is what we save in the
// database. It must match the IDs the backend accepts (TemplateId in
// backend/main.py) and the theme classes in Portfolio.js / App.css.
// `label` and `description` are only for the dropdown text.
const TEMPLATE_OPTIONS = [
  { id: 'modern-clean', label: 'Modern Clean', description: 'light with cyan accents' },
  { id: 'professional-bold', label: 'Professional Bold', description: 'sage green with bold type' },
  { id: 'creative-minimal', label: 'Creative Minimal', description: 'white and airy' },
];

// The template that is selected when the editor first opens.
const DEFAULT_TEMPLATE = TEMPLATE_OPTIONS[0].id;

// ======================================================================
// Helpers (plain functions that live outside the component)
// ======================================================================

// Every row in a list needs a unique, stable id so React can tell rows apart
// when we add or remove one (this is what the `key` prop is for). We cannot
// use the row's position, because positions shift when a row is removed.
// This counter hands out 1, 2, 3, ... and never repeats.
let nextId = 1;
function makeId() {
  const id = nextId;
  nextId += 1;
  return id;
}

// Returns `value` if it is a real list, otherwise an empty list.
// (.map() on undefined or on a string would crash.)
function asList(value) {
  return Array.isArray(value) ? value : [];
}

// Text inputs need a string. AI data might contain null, a number (like a
// year written as 2026) or even an object, so we convert everything safely.
function asText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

// ======================================================================
// Configuration: which list sections exist and what fields each row has
// ======================================================================
// One entry per list. A row in "skills" has a single text box (key 'value').
// A row in "education" has three boxes (school, degree, years), and so on.
// Describing the lists as data lets us draw all six with one component
// instead of copying the same code six times.
//   key       - the property name in the data
//   label     - the label shown above the input
//   multiline - use a bigger text area instead of a one-line input
//   alt       - another property name to try if `key` is empty
//               (older data used `name` for a project's heading)
const LIST_SECTIONS = [
  {
    listName: 'skills',
    title: 'Skills',
    itemLabel: 'Skill',
    emptyText: 'No skills yet.',
    fields: [{ key: 'value', label: 'Skill', placeholder: 'e.g. React' }],
  },
  {
    listName: 'education',
    title: 'Education',
    itemLabel: 'Education',
    emptyText: 'No education entries yet.',
    fields: [
      { key: 'school', label: 'School', placeholder: 'e.g. State University' },
      { key: 'degree', label: 'Degree', placeholder: 'e.g. B.Tech in Computer Science' },
      { key: 'years', label: 'Years', placeholder: 'e.g. 2022 - 2026' },
    ],
  },
  {
    listName: 'projects',
    title: 'Projects',
    itemLabel: 'Project',
    emptyText: 'No projects yet.',
    fields: [
      { key: 'title', alt: 'name', label: 'Title', placeholder: 'e.g. Task Tracker' },
      { key: 'description', label: 'Description', multiline: true, placeholder: 'What did you build?' },
    ],
  },
  {
    listName: 'social_links',
    title: 'Social links',
    itemLabel: 'Link',
    emptyText: 'No links yet.',
    fields: [
      { key: 'platform', label: 'Platform', placeholder: 'e.g. GitHub' },
      { key: 'url', label: 'URL', placeholder: 'e.g. github.com/yourname' },
    ],
  },
  {
    listName: 'achievements',
    title: 'Achievements',
    itemLabel: 'Achievement',
    emptyText: 'No achievements yet.',
    fields: [{ key: 'value', label: 'Achievement', placeholder: 'e.g. Won the campus hackathon' }],
  },
  {
    listName: 'extracurriculars',
    title: 'Extracurriculars',
    itemLabel: 'Activity',
    emptyText: 'No activities yet.',
    fields: [{ key: 'value', label: 'Activity', placeholder: 'e.g. Coding club secretary' }],
  },
];

// The simple one-line and multi-line text fields at the top of the form.
const BASIC_FIELDS = [
  { key: 'name', label: 'Full name', placeholder: 'Your name' },
  { key: 'title', label: 'Title or headline', placeholder: 'e.g. Full Stack Developer' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  { key: 'summary', label: 'Summary', multiline: true, rows: 4, placeholder: 'A short introduction' },
];

// A list whose rows are plain strings (skills, achievements, extracurriculars)
// has exactly one field called 'value'.
function isStringList(section) {
  return section.fields.length === 1 && section.fields[0].key === 'value';
}

// ======================================================================
// Converting between the backend's data and the form's data
// ======================================================================

// Backend data -> form state.
// - Every missing or odd value becomes an empty string or empty list.
// - Every list row gets an `id`. Plain strings like "React" become
//   objects like { id: 3, value: "React" } so they can carry an id.
function toFormState(data) {
  const source = data || {};
  const form = {};

  BASIC_FIELDS.forEach((field) => {
    form[field.key] = asText(source[field.key]);
  });

  LIST_SECTIONS.forEach((section) => {
    form[section.listName] = asList(source[section.listName]).map((raw) => {
      const item = { id: makeId() };

      section.fields.forEach((field, index) => {
        let value;

        if (isStringList(section)) {
          // The row itself is the text, e.g. "React".
          value = raw;
        } else if (typeof raw === 'string') {
          // An object list that arrived as plain text (for example
          // education written as one string). Keep the text by putting it in
          // the first box so the user can fix it by hand.
          value = index === 0 ? raw : '';
        } else {
          // Normal case: read the property, or its alternative name.
          value = raw && (raw[field.key] || (field.alt && raw[field.alt]));
        }

        item[field.key] = asText(value);
      });

      return item;
    });
  });

  return form;
}

// Form state -> clean data to send to the backend.
// - Adds the chosen template.
// - Trims spaces around every value.
// - Removes the temporary `id`s.
// - Drops rows where every box is empty, so a half-clicked "Add" button
//   never leaves a blank entry in the portfolio.
function toSaveData(form, template) {
  // The template is a plain piece of text like "modern-clean", so it can
  // go straight into the result next to the other fields.
  const result = { template };

  BASIC_FIELDS.forEach((field) => {
    result[field.key] = form[field.key].trim();
  });

  LIST_SECTIONS.forEach((section) => {
    const keys = section.fields.map((field) => field.key);

    // Trim every value in every row.
    const rows = form[section.listName].map((item) => {
      const clean = {};
      keys.forEach((key) => {
        clean[key] = item[key].trim();
      });
      return clean;
    });

    // Keep only rows where at least one box has text.
    const filledRows = rows.filter((row) => keys.some((key) => row[key] !== ''));

    // String lists go back to plain strings; object lists stay as objects.
    result[section.listName] = isStringList(section)
      ? filledRows.map((row) => row.value)
      : filledRows;
  });

  return result;
}

// ======================================================================
// Small reusable pieces
// ======================================================================

// A label plus a text input (or text area). It is "controlled": the value
// always comes from state, and typing calls onChange with the new text.
function Field({ id, label, value, onChange, type = 'text', multiline = false, rows = 3, placeholder }) {
  return (
    // Text areas get an extra class so the CSS can make them span the full row.
    <div className={multiline ? 'field field-wide' : 'field'}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>

      {multiline ? (
        <textarea
          id={id}
          className="input"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

// One editable list (skills, education, ...) with Add and Remove buttons.
// It receives everything it needs as props and changes nothing by itself.
function ListEditor({ section, items, onAdd, onUpdate, onRemove }) {
  const isSingle = section.fields.length === 1;
  const itemName = section.itemLabel.toLowerCase();

  return (
    <section className="edit-group">
      <div className="edit-group-header">
        <h3>{section.title}</h3>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => onAdd(section)}
        >
          + Add {itemName}
        </button>
      </div>

      {/* An empty list is normal (the resume had none, or the user removed
          them all), so show a friendly hint instead of a blank gap. */}
      {items.length === 0 && <p className="edit-empty">{section.emptyText}</p>}

      {/* key={item.id}: a stable id, NOT the position in the list. */}
      {items.map((item, index) => (
        <div key={item.id} className={isSingle ? 'edit-row edit-row-single' : 'edit-row'}>
          <div className="edit-row-fields">
            {section.fields.map((field) => (
              <Field
                key={field.key}
                id={`${section.listName}-${item.id}-${field.key}`}
                label={field.label}
                value={item[field.key]}
                multiline={field.multiline}
                placeholder={field.placeholder}
                onChange={(text) => onUpdate(section.listName, item.id, field.key, text)}
              />
            ))}
          </div>

          <button
            type="button"
            className="button button-secondary button-small button-remove"
            onClick={() => onRemove(section.listName, item.id)}
            aria-label={`Remove ${itemName} ${index + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}

// Turns the backend's error reply into one readable sentence.
// FastAPI sends errors in two shapes:
//   - a plain message:       { "detail": "Could not reach the database..." }
//   - validation problems:   { "detail": [ { "loc": ["body", "name"], "msg": "..." } ] }
function describeServerError(result) {
  const detail = result && result.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    // `loc` says where the problem is, e.g. ["body", "skills", 0].
    // We drop the word "body" and join the rest: "skills > 0".
    const where = Array.isArray(first.loc)
      ? first.loc.filter((part) => part !== 'body').join(' > ')
      : '';
    return where
      ? `Please check "${where}": ${first.msg}`
      : `Please check your details: ${first.msg}`;
  }

  return 'The server could not save your portfolio. Please try again.';
}

// ======================================================================
// The main component
// ======================================================================
function EditData({ data, onBack }) {
  // navigate('/some/path') changes the page. It only works because App.js
  // wraps everything in a <BrowserRouter>.
  const navigate = useNavigate();

  // Local copy of the data that the form edits.
  // Passing a FUNCTION to useState (a "lazy initializer") means the copy is
  // built only once, on the first render, not on every keystroke.
  const [form, setForm] = useState(() => toFormState(data));

  // The id of the chosen template, e.g. 'modern-clean'. It is separate from
  // `form` because it is picked from a fixed list, not typed in.
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  // A message shown if the form cannot be saved yet.
  const [error, setError] = useState('');

  // True while the save request is in flight. We use it to disable the
  // buttons and show "Saving...", which also stops double clicks from
  // saving the same portfolio twice.
  const [isSaving, setIsSaving] = useState(false);

  // Update one of the simple fields (name, title, email, summary).
  // `[field]: value` is a "computed key": it sets whichever property
  // `field` names. We build a NEW object ({ ...previous }) instead of
  // changing the old one, because React only re-renders when it gets a new
  // object. The `previous =>` form always starts from the latest state.
  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError('');
  };

  // Add an empty row to a list. The blank row has an empty string for every
  // box in the section, plus a fresh id.
  const addItem = (section) => {
    const blankRow = { id: makeId() };
    section.fields.forEach((field) => {
      blankRow[field.key] = '';
    });

    setForm((previous) => ({
      ...previous,
      [section.listName]: [...previous[section.listName], blankRow],
    }));
  };

  // Change one box in one row. .map() builds a new list where only the row
  // with the matching id is replaced by an updated copy.
  const updateItem = (listName, id, fieldKey, value) => {
    setForm((previous) => ({
      ...previous,
      [listName]: previous[listName].map((item) =>
        item.id === id ? { ...item, [fieldKey]: value } : item
      ),
    }));
  };

  // Remove a row. .filter() keeps every row except the one with this id.
  const removeItem = (listName, id) => {
    setForm((previous) => ({
      ...previous,
      [listName]: previous[listName].filter((item) => item.id !== id),
    }));
  };

  // Runs when the form is submitted ("Save and Continue" or the Enter key).
  // `async` lets us use `await`, which pauses this function until the server
  // answers without freezing the page.
  const handleSave = async (event) => {
    // Stop the browser from reloading the page.
    event.preventDefault();

    // Already saving? Ignore a second click or a second press of Enter.
    if (isSaving) return;

    // A portfolio without a name would show a placeholder, so require one.
    if (!form.name.trim()) {
      setError('Please enter your name before continuing.');
      return;
    }

    setError('');
    setIsSaving(true);

    // If anything inside `try` fails, JavaScript jumps to `catch`.
    try {
      // Send the cleaned-up copy as JSON. toSaveData removes the temporary
      // ids and empty rows, so the shape matches what the backend expects
      // (template, name, title, email, summary, skills, education, projects,
      // social_links, achievements, extracurriculars).
      // Unlike a file upload, JSON needs the Content-Type header, so the
      // server knows how to read the body.
      const response = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSaveData(form, template)),
      });

      // Read the reply. If it is not JSON (for example an HTML error page),
      // .catch gives us null instead of throwing.
      const result = await response.json().catch(() => null);

      // fetch does NOT throw for 400, 422, 500 or 503 replies, so we check
      // response.ok ourselves.
      if (!response.ok) {
        throw new Error(describeServerError(result));
      }

      // Success: the backend sends back the new portfolio's ID.
      if (!result || !result.portfolio_id) {
        throw new Error('The server did not return a portfolio ID.');
      }

      // Go to the page for this portfolio. This form disappears after that,
      // so we do not reset isSaving here.
      navigate(`/portfolio/${encodeURIComponent(result.portfolio_id)}`);
    } catch (err) {
      // The full error goes to the browser console for debugging.
      console.error('Saving the portfolio failed:', err);

      // fetch throws a TypeError when it cannot reach the server at all
      // (server not running, wrong port, CORS blocked, no network).
      if (err.name === 'TypeError') {
        setError('Could not reach the server. Make sure the backend is running on port 8000.');
      } else {
        // Otherwise show the message we threw above.
        setError(err.message);
      }

      // Unlock the form so the user can fix something and try again.
      // Their edits are still there because they live in `form`.
      setIsSaving(false);
    }
  };

  return (
    <form className="edit-data" onSubmit={handleSave} autoComplete="off">
      <h2>Review and edit your details</h2>
      <p className="edit-hint">
        The AI filled this in from your resume. Fix anything that looks wrong, then continue.
      </p>

      {/* Only this middle part scrolls. The heading above and the buttons
          below stay in view. */}
      <div className="edit-scroll">
        {/* Template choice. This is a "controlled" <select>: its value comes
            from state, and choosing an option calls setTemplate. It reuses
            the same .field and .input styles as the text boxes. */}
        <section className="edit-group">
          <h3>Portfolio template</h3>
          <div className="field">
            <label className="field-label" htmlFor="template-select">
              Choose how your portfolio will look
            </label>
            <select
              id="template-select"
              className="input"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}: {option.description}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="edit-group">
          <h3>Basic information</h3>
          {BASIC_FIELDS.map((field) => (
            <Field
              key={field.key}
              id={`basic-${field.key}`}
              label={field.label}
              type={field.type}
              multiline={field.multiline}
              rows={field.rows}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(text) => updateField(field.key, text)}
            />
          ))}
        </section>

        {LIST_SECTIONS.map((section) => (
          <ListEditor
            key={section.listName}
            section={section}
            items={form[section.listName]}
            onAdd={addItem}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* role="alert" lets screen readers announce the message. */}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="edit-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onBack}
          disabled={isSaving}
        >
          Start over
        </button>
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </form>
  );
}

export default EditData;