// This file clears localStorage to ensure fresh data loads
if (typeof window !== 'undefined') {
  localStorage.removeItem('adminSystemData');
  console.log('Local storage cleared. Refresh the page to load new data with documents.');
}
