// src/components/TemplateSelector.js
//
// Step 2 of the flow: the user picks how their portfolio should look.
//
// This component holds NO state of its own. App.js owns the selected
// template, and this component just shows it and reports clicks back up.
//
// Props:
//   selectedTemplate  - id of the currently chosen template (from App)
//   onSelectTemplate  - called with a template id when a card is clicked
//   onContinue        - called when the user confirms their choice
//   onBack            - called when the user wants to go back to upload

// The available templates, kept in one array so adding a fourth one later
// means adding one object here (plus its CSS theme class in App.css).
// The `id` is also used to build the theme class, e.g. theme-modern-clean.
const TEMPLATES = [
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Light and friendly, with a soft gradient header.',
    tags: ['Clean layout', 'Soft gradients'],
  },
  {
    id: 'professional-bold',
    name: 'Professional Bold',
    description: 'A confident look with a dark header and strong headings.',
    tags: ['Bold accents', 'Strong headings'],
  },
  {
    id: 'creative-minimal',
    name: 'Creative Minimal',
    description: 'Plenty of white space and a quiet, simple style.',
    tags: ['Minimal', 'White space'],
  },
];

function TemplateSelector({ selectedTemplate, onSelectTemplate, onContinue, onBack }) {
  return (
    <section className="template-selector">
      <h2>Choose Your Portfolio Template</h2>
      <p className="template-subheading">
        Pick a style for your portfolio. You can go back and change it any time.
      </p>

      {/* One card per template. .map() loops over the array and returns
          one <button> for each. Buttons (not divs) are used so the cards
          work with the keyboard (Tab to focus, Enter or Space to select). */}
      <div className="template-grid">
        {TEMPLATES.map((template) => {
          const isSelected = template.id === selectedTemplate;

          return (
            <button
              key={template.id}
              type="button"
              className={isSelected ? 'template-card template-card-selected' : 'template-card'}
              onClick={() => onSelectTemplate(template.id)}
              // Tells screen readers whether this card is currently chosen.
              aria-pressed={isSelected}
            >
              {/* Small decorative preview. Its look is set in CSS by the
                  modifier class, e.g. preview-modern-clean. */}
              <span
                className={`template-preview preview-${template.id}`}
                aria-hidden="true"
              />

              {/* The round indicator in the corner; filled when selected. */}
              <span className="template-card-check" aria-hidden="true" />

              <span className="template-card-name">{template.name}</span>
              <span className="template-card-description">{template.description}</span>

              {/* Pill-shaped feature tags. */}
              <span className="template-tags">
                {template.tags.map((tag) => (
                  <span key={tag} className="template-tag">
                    {tag}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="template-actions">
        <button className="button button-secondary" type="button" onClick={onBack}>
          Back
        </button>
        <button className="button" type="button" onClick={onContinue}>
          Generate portfolio
        </button>
      </div>
    </section>
  );
}

export default TemplateSelector;