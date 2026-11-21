// src/App.js
//
// App now has two "pages", chosen by the URL in the browser's address bar
// (this is what React Router does):
//
//   /                        ->  ResumeFlow: upload a resume, then review and edit it
//   /portfolio/<id>          ->  PortfolioView: loads the saved portfolio and shows it
//
// Any other URL sends the user back to "/".
//
// <BrowserRouter> is what makes `useNavigate` and `useParams` work (in
// EditData and PortfolioView). It lives here, so index.js does not need to
// change.

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import UploadForm from './components/UploadForm';
import EditData from './components/EditData';
import PortfolioView from './components/PortfolioView';

// The page at "/": step 1 (upload) and step 2 (review and edit).
// The step and the data are state here, as before. Saving happens inside
// EditData, which navigates to the next page by itself.
function ResumeFlow() {
  // 1 = Upload, 2 = Review and Edit.
  const [currentStep, setCurrentStep] = useState(1);

  // The parsed resume from the backend. It starts as null.
  const [portfolioData, setPortfolioData] = useState(null);

  // Step 1 -> 2. UploadForm calls this with the parsed resume.
  const handleUploadSuccess = (data) => {
    setPortfolioData(data);
    setCurrentStep(2);
  };

  // Step 2 -> 1. Lets the user discard everything and upload another file.
  const handleBackToUpload = () => {
    setPortfolioData(null);
    setCurrentStep(1);
  };

  // `&&` means "render this only if everything on the left is true".
  return (
    <>
      {currentStep === 1 && <UploadForm onUploadSuccess={handleUploadSuccess} />}

      {/* The check on portfolioData is a safety net: the editor needs data. */}
      {currentStep === 2 && portfolioData && (
        <EditData data={portfolioData} onBack={handleBackToUpload} />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1 className="app-logo">FOLIO</h1>
          <p className="app-tagline">Turn your resume into a portfolio.</p>
        </header>

        <main className="app-main">
          {/* <Routes> shows the first <Route> whose path matches the URL. */}
          <Routes>
            <Route path="/" element={<ResumeFlow />} />
            {/* ":portfolioId" is a URL parameter: PortfolioView reads it with useParams. */}
            <Route path="/portfolio/:portfolioId" element={<PortfolioView />} />
            {/* "*" matches everything else: send those visitors home. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;