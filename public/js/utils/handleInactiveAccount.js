/**
 * Utility to handle inactive account errors from API responses
 * Checks for 403 errors with "Account inactive" message and redirects to splash page
 */

/**
 * Check if an API response indicates an inactive account
 * @param {Response} response - Fetch API response object
 * @param {Object} data - Parsed JSON response data
 * @returns {boolean} - True if account is inactive
 */
export function isInactiveAccountError(response, data) {
  return (
    response.status === 403 &&
    (data?.error === "Account inactive" || data?.reason === "Your account has been deactivated")
  );
}

/**
 * Handle inactive account error by redirecting to splash page
 */
export function handleInactiveAccountRedirect() {
  window.location.href = "/?inactive=true";
}

/**
 * Wrapper for fetch that automatically handles inactive account errors
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function fetchWithInactiveCheck(url, options = {}) {
  const response = await fetch(url, options);
  
  // Only check JSON responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json().catch(() => ({}));
    
    if (isInactiveAccountError(response, data)) {
      handleInactiveAccountRedirect();
      // Return a rejected promise to prevent further processing
      throw new Error("Account inactive");
    }
    
    // Re-create response with parsed JSON for callers who need it
    return {
      ...response,
      json: async () => data,
      ok: response.ok,
      status: response.status,
    };
  }
  
  return response;
}

