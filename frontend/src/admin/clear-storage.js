/**
 * LOCAL STORAGE CLEARANCE UTILITY
 * Forces removal of cached admin system data from localStorage to ensure
 * fresh data loads from the server, particularly useful after document
 * upload/management changes to prevent stale data display.
 */

// This file clears localStorage to ensure fresh data loads
if (typeof window !== 'undefined') {
  localStorage.removeItem('adminSystemData');
  console.log('Local storage cleared. Refresh the page to load new data with documents.');
}