// src/components/PortfolioView.js
//
// The page at /portfolio/<id>. It does three jobs:
//   1. Reads the <id> from the URL (useParams).
//   2. Fetches that portfolio from the backend (useEffect + fetch).
//   3. Shows a loading message, an error message, or the finished portfolio.
//
// The actual portfolio design lives in Portfolio.js. This component only
// gets the data and hands it over, so Portfolio.js stays a simple display
// component that knows nothing about the network.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Portfolio from './Portfolio';

// The backend address for loading one portfolio (see backend/main.py).
const API_BASE_URL = 'http://localhost:8000/api/portfolio';

// The templates Portfolio.js and App.css know how to draw. These must match
// the ids saved by the editor.
const KNOWN_TEMPLATES = ['modern-clean', 'professional-bold', 'creative-minimal'];

// Used when a saved portfolio has no template (older documents were saved
// before the template existed) or has one we do not recognise.
const DEFAULT_TEMPLATE = 'modern-clean';

function PortfolioView() {
  // useParams reads the dynamic part of the URL. The route in App.js is
  // "/portfolio/:portfolioId", so for /portfolio/64b7... we get that ID here.
  const { portfolioId } = useParams();
  const navigate = useNavigate();

  // One variable describes what the page is doing, so it can never be in a
  // contradictory state (for example "loading" and "error" at once):
  //   'loading' -> waiting for the backend
  //   'success' -> we have the data
  //   'error'   -> something went wrong (see errorMessage)
  const [status, setStatus] = useState('loading');
  const [portfolioData, setPortfolioData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Is it worth showing a "Try again" button? Yes for server or network
  // problems, no for "not found" (trying again cannot fix a wrong ID).
  const [canRetry, setCanRetry] = useState(false);

  // Adding 1 to this number makes the effect below run again (see its
  // dependency list). That is how "Try again" re-fetches.
  const [attempt, setAttempt] = useState(0);

  // useEffect runs code AFTER the page has been drawn. We use it here
  // because fetching data is a "side effect": something that reaches outside
  // of React. It runs when the component first appears, and again whenever
  // a value in the list at the bottom ([portfolioId, attempt]) changes.
  useEffect(() => {
    // An AbortController lets us cancel the request if the user leaves the
    // page, or the ID changes, before the answer arrives.
    const controller = new AbortController();

    async function loadPortfolio() {
      // Start from a clean "loading" screen (matters for a re-fetch).
      setStatus('loading');
      setPortfolioData(null);
      setErrorMessage('');

      try {
        // encodeURIComponent makes sure odd characters in the ID cannot
        // change the meaning of the web address.
        const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(portfolioId)}`, {
          signal: controller.signal,
        });

        // Read the JSON body. If it is not JSON (for example an HTML error
        // page), .catch gives us null instead of throwing.
        const result = await response.json().catch(() => null);

        // fetch does NOT throw for 400, 404 or 503 replies, so we check
        // response.ok ourselves. FastAPI puts its message in `detail`.
        if (!response.ok) {
          const message =
            result && typeof result.detail === 'string'
              ? result.detail
              : 'The server could not load this portfolio. Please try again.';
          const error = new Error(message);
          error.status = response.status; // remember it, to decide about "Try again"
          throw error;
        }

        // The backend answers { message: "Success", data: { ...portfolio } }.
        if (!result || !result.data) {
          throw new Error('The server sent an unexpected response.');
        }

        setPortfolioData(result.data);
        setStatus('success');
      } catch (err) {
        // An aborted request is not a real error: the page was left, or the
        // ID changed, so a newer request has taken over. Do nothing.
        if (err.name === 'AbortError') return;

        console.error('Loading the portfolio failed:', err);

        // fetch throws a TypeError when it cannot reach the server at all.
        if (err.name === 'TypeError') {
          setErrorMessage('Could not reach the server. Make sure the backend is running on port 8000.');
        } else {
          setErrorMessage(err.message);
        }

        // Errors with a status below 500 (400, 404) are the user's problem:
        // retrying would give the same answer. Server and network problems
        // (no status, or 500 and above) may go away, so offer a retry.
        setCanRetry(!err.status || err.status >= 500);
        setStatus('error');
      }
    }

    loadPortfolio();

    // The "cleanup" function. React calls it before the effect runs again
    // and when the component disappears. We cancel any request still in flight.
    return () => controller.abort();
  }, [portfolioId, attempt]);

  // ---------- What to show ----------

  if (status === 'loading') {
    // The card and info-box styles are reused from the upload form.
    // role="status" lets screen readers announce the message.
    return (
      <div className="upload-form">
        <p className="file-name" role="status">
          Loading your portfolio...
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="upload-form">
        <h2>We could not load this portfolio</h2>
        <p className="error" role="alert">
          {errorMessage}
        </p>

        {/* The button-row style is reused from the editor screen. */}
        <div className="edit-actions">
          {canRetry && (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setAttempt((count) => count + 1)}
            >
              Try again
            </button>
          )}
          <button className="button" type="button" onClick={() => navigate('/')}>
            Create a new portfolio
          </button>
        </div>
      </div>
    );
  }

  // status === 'success'.
  // Only use the saved template if we know it. This also covers a missing
  // template (undefined), null, or an empty string.
  const template = KNOWN_TEMPLATES.includes(portfolioData.template)
    ? portfolioData.template
    : DEFAULT_TEMPLATE;

  // Portfolio.js puts "theme-<template>" on its own outer element, which is
  // where App.css expects the theme class to be.
  return (
    <Portfolio
      data={portfolioData}
      template={template}
      onReset={() => navigate('/')}
    />
  );
}

export default PortfolioView;