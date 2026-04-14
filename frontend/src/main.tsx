import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css"; 

/**
 * APPLICATION ENTRY POINT
 * Initializes the React application with:
 * - React Strict Mode for development warnings
 * - BrowserRouter for client-side routing
 * - Global CSS styles
 * - Renders the main App component into the root DOM element
 */

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);