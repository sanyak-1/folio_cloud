// src/components/UploadForm.js
//
// Lets the user pick a resume (.pdf or .docx) and send it to the FastAPI
// backend. The backend extracts the text, asks the AI to structure it, and
// replies with JSON. On success we hand that JSON up to App.

import { useState } from 'react';

// File types we accept. Kept in one place so the HTML `accept` attribute
// and the JavaScript check below always agree.
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

// Where the backend listens (see backend/main.py). In a real deployment this
// would come from a setting instead of being typed here.
const API_URL = 'http://localhost:8000/api/resume/upload';

// `onUploadSuccess` is a function passed down from App (a "callback prop").
// We call it with the parsed resume data once the backend answers.
function UploadForm({ onUploadSuccess }) {
  // The file the user picked (null until they pick one).
  const [selectedFile, setSelectedFile] = useState(null);
  // A message shown when something is wrong (e.g. wrong file type).
  const [error, setError] = useState('');
  // True while we wait for the backend, so we can show a loading message
  // and disable the button.
  const [isUploading, setIsUploading] = useState(false);

  // Runs every time the user chooses a file in the file picker.
  const handleFileChange = (event) => {
    // event.target.files is a list; we only allow one file, so take the first.
    const file = event.target.files[0];

    // User opened the picker and cancelled: reset everything.
    if (!file) {
      setSelectedFile(null);
      setError('');
      return;
    }

    // The `accept` attribute on the input only filters the picker, and users
    // can bypass it (for example by choosing "All files"). So we check the
    // file name ourselves too.
    const fileName = file.name.toLowerCase();
    const isAllowed = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      setSelectedFile(null);
      setError('Please choose a PDF or DOCX file.');
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  // Runs when the form is submitted (button click or Enter key).
  // `async` lets us use `await` inside, which pauses this function until
  // the server answers without freezing the page.
  const handleSubmit = async (event) => {
    // Stop the browser from reloading the page, which is the default
    // behaviour for HTML forms.
    event.preventDefault();

    if (!selectedFile) {
      setError('Choose your resume before uploading.');
      return;
    }

    setError('');
    setIsUploading(true);

    // try/catch: if anything inside `try` throws an error, JavaScript jumps
    // to `catch` so we can show a message instead of crashing.
    try {
      // FormData is how a browser sends files. The key 'file' must match the
      // parameter name in the backend (`file: UploadFile`).
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Send the request. We do NOT set a Content-Type header: the browser
      // adds "multipart/form-data" plus the required boundary by itself,
      // and setting it manually would break the upload.
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      // Read the JSON body. If the body is not JSON (for example an HTML
      // error page), .catch gives us null instead of throwing.
      const result = await response.json().catch(() => null);

      // fetch does NOT throw for 400 or 500 responses, so we check
      // response.ok ourselves. FastAPI puts its error message in `detail`.
      if (!response.ok) {
        const message =
          result && typeof result.detail === 'string'
            ? result.detail
            : 'The server could not process your resume. Please try again.';
        throw new Error(message);
      }

      // Success, but make sure the reply has the shape we expect.
      if (!result || !result.data) {
        throw new Error('The server sent an unexpected response.');
      }

      // Pass the parsed resume up to App, which saves it and moves on to the
      // template step. This form disappears after that, so we do not need to
      // reset isUploading here.
      onUploadSuccess(result.data);
    } catch (err) {
      // fetch throws a TypeError when it cannot reach the server at all
      // (server not running, wrong port, CORS blocked, no network).
      if (err.name === 'TypeError') {
        setError('Could not reach the server. Make sure the backend is running on port 8000.');
      } else {
        // Otherwise show the message we threw above (e.g. "Invalid file type...").
        setError(err.message);
      }
      // Re-enable the form so the user can try again.
      setIsUploading(false);
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h2>Upload your resume</h2>
      <p className="upload-hint">PDF or DOCX, one file.</p>

      {/* The "drop zone": a styled box with the real file input stretched
          invisibly over it (see .file-input in App.css). Clicking anywhere
          in the box opens the file picker, and dragging a file onto it works
          natively. The extra class switches the box to its "file chosen" look. */}
      <div className={selectedFile ? 'dropzone dropzone-filled' : 'dropzone'}>
        <span className="dropzone-icon" aria-hidden="true">
          +
        </span>
        <p className="dropzone-title">Drag and drop your resume</p>
        <p className="dropzone-subtitle">or click to browse your files</p>

        {/* accept= limits what the file picker shows.
            join(',') turns the array into the string ".pdf,.docx". */}
        <input
          className="file-input"
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {/* Show the chosen file name so the user knows what will be uploaded. */}
      {selectedFile && <p className="file-name">Selected: {selectedFile.name}</p>}

      {/* Shown only while we wait for the backend. The AI step can take a
          few seconds. It reuses the .file-name info-box style from App.css.
          role="status" lets screen readers announce it. */}
      {isUploading && (
        <p className="file-name" role="status">
          Loading... The AI is processing your resume
        </p>
      )}

      {/* Only render the error paragraph when there is an error message.
          role="alert" lets screen readers announce it. */}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button className="button" type="submit" disabled={isUploading}>
        {isUploading ? 'Processing...' : 'Generate portfolio'}
      </button>
    </form>
  );
}

export default UploadForm;