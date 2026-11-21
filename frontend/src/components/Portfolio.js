// src/components/Portfolio.js
//
// Displays the parsed resume data. This is a "presentational" component:
// it does not fetch or change data, it only receives props and shows them.
//
// The data comes from an AI, so any field might be missing or empty.
// This component never assumes a field exists: it falls back to a default
// value and hides sections that have nothing to show, so it cannot crash.
//
// The page has two parts:
//   1. Hero    - name, title, summary, and links (email + social profiles)
//   2. Details - skills, education, projects, achievements, extracurriculars
//
// Props:
//   data     - object from the backend with name, title, email, summary,
//              skills[], education[], projects[], social_links[],
//              achievements[], extracurriculars[]
//   template - id of the chosen template: 'modern-clean',
//              'professional-bold' or 'creative-minimal'
//   onReset  - function that sends the user back to the upload screen

// Returns `value` if it is a real list, otherwise an empty list.
// Calling .map() on undefined (or on a string) would crash the page,
// but calling it on [] is always safe.
function asList(value) {
  return Array.isArray(value) ? value : [];
}

// Turns the link text from the resume into a safe address for an <a> tag.
//   "github.com/alex"      -> "https://github.com/alex"   (adds the missing https://)
//   "https://linkedin.com" -> unchanged
//   "javascript:alert(1)"  -> ""                           (rejected)
// Only http and https links are allowed. The text came from a resume, so we
// must not let it become a link that runs code when clicked.
function toSafeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';

  const trimmed = rawUrl.trim();
  // If the text already starts with a scheme like "https:" keep it,
  // otherwise assume it is a plain web address and add https://.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  return /^https?:\/\//i.test(withScheme) ? withScheme : '';
}

// If no template is passed in, fall back to the default look.
function Portfolio({ data, template = 'modern-clean', onReset }) {
  // `value || fallback` means "use value, unless it is missing or empty".
  const fullName = data.name || 'Your Name';
  const title = data.title || '';
  const skills = asList(data.skills);
  const education = asList(data.education);
  const projects = asList(data.projects);

  // For the two plain-text lists, also drop empty entries.
  // .filter(Boolean) keeps only values that are not empty.
  const achievements = asList(data.achievements).filter(Boolean);
  const extracurriculars = asList(data.extracurriculars).filter(Boolean);

  // Social links: keep only entries that have a usable address, and store
  // the cleaned-up address next to each one as `safeUrl`.
  const socialLinks = asList(data.social_links)
    .filter(Boolean)
    .map((link) => ({ ...link, safeUrl: toSafeUrl(link.url) }))
    .filter((link) => link.safeUrl);

  // Split "Alex Johnson" into "Alex" and "Johnson" so a theme can style the
  // first word and the rest differently (the bold theme does this).
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0];
  const otherNames = nameParts.slice(1).join(' ');

  // The modern theme shows "And I'm a Frontend Developer".
  // Choose "an" when the title starts with a vowel ("an Engineer").
  const article = /^[aeiou]/i.test(title) ? 'an' : 'a';

  return (
    // The template id becomes part of the class name, for example
    // "portfolio theme-professional-bold". The base .portfolio styles
    // always apply, and the .theme-* class in App.css changes the look.
    <article className={`portfolio theme-${template}`}>
      {/* ==================== HERO ==================== */}
      <section className="portfolio-hero">
        <div className="portfolio-intro">
          {/* Small decorative label. Hidden by default in App.css and
              switched on only by the themes that want it. */}
          <p className="portfolio-eyebrow">Hi there</p>

          <h2 className="portfolio-name">
            <span className="name-first">{firstName}</span>{' '}
            {/* `&&` means: only render the right side if the left side is
                not empty (a one-word name has nothing to show here). */}
            {otherNames && <span className="name-rest">{otherNames}</span>}
          </h2>

          {/* Only show the title line if the resume had a title. */}
          {title && (
            <p className="portfolio-title">
              {/* Decorative prefix, also hidden unless a theme shows it. */}
              <span className="portfolio-title-prefix">And I'm {article} </span>
              <span className="portfolio-title-text">{title}</span>
            </p>
          )}

          {data.summary && <p className="portfolio-summary">{data.summary}</p>}

          {/* One row for the email and the social links. The row is only
              drawn if there is at least one of them. Social links reuse the
              .portfolio-email class so every theme styles them the same way
              as the email (a pill, an arrow link, or plain text). */}
          {(data.email || socialLinks.length > 0) && (
            <div className="portfolio-links">
              {/* mailto: links open the visitor's email app. */}
              {data.email && (
                <a className="portfolio-email" href={`mailto:${data.email}`}>
                  {data.email}
                </a>
              )}

              {/* target="_blank" opens the profile in a new tab.
                  rel="noopener noreferrer" stops that new page from getting
                  access to ours, which is the safe way to do it. */}
              {socialLinks.map((link, index) => (
                <a
                  key={`${link.safeUrl}-${index}`}
                  className="portfolio-email"
                  href={link.safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.platform || link.safeUrl}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== DETAILS ==================== */}
      <div className="portfolio-details">
        {/* Each section below is shown only if its list has items.
            `skills.length > 0` is false for an empty list, so the whole
            section (heading included) is skipped. */}

        {/* Skills: .map() loops over the array and returns one <li> per
            skill. React needs a unique `key` on each item in a list so it
            can track which items changed. We combine the skill name with its
            position (index) so even a repeated skill gets a unique key. */}
        {skills.length > 0 && (
          <section className="portfolio-section">
            <h3>Skills</h3>
            <ul className="skills-list">
              {skills.map((skill, index) => (
                <li key={`${skill}-${index}`} className="skill-tag">
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section className="portfolio-section">
            <h3>Education</h3>
            {education.map((item, index) => {
              // Join whichever of school / years exist, e.g. "State University, 2022 - 2026".
              // .filter(Boolean) drops empty or missing values first.
              const meta = [item.school, item.years].filter(Boolean).join(', ');

              return (
                <div key={`${item.school}-${index}`} className="portfolio-item">
                  {item.degree && <p className="item-title">{item.degree}</p>}
                  {meta && <p className="item-meta">{meta}</p>}
                </div>
              );
            })}
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="portfolio-section">
            <h3>Projects</h3>
            {projects.map((project, index) => {
              // Accept either field name for the project's heading:
              // `name` (what we planned) or `title` (what the AI schema uses).
              const projectName = project.name || project.title;

              return (
                <div key={`${projectName}-${index}`} className="portfolio-item">
                  {projectName && <p className="item-title">{projectName}</p>}
                  {project.description && <p>{project.description}</p>}
                </div>
              );
            })}
          </section>
        )}

        {/* Achievements: a simple bullet list of short sentences. */}
        {achievements.length > 0 && (
          <section className="portfolio-section">
            <h3>Achievements</h3>
            <ul className="portfolio-list">
              {achievements.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Extracurriculars: same list style. */}
        {extracurriculars.length > 0 && (
          <section className="portfolio-section">
            <h3>Extracurriculars</h3>
            <ul className="portfolio-list">
              {extracurriculars.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Calls the reset function from App, which clears the data
          and brings the upload form back. */}
      <button className="button button-secondary" type="button" onClick={onReset}>
        Upload a different resume
      </button>
    </article>
  );
}

export default Portfolio;