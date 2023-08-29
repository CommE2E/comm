// @flow

function handleHTTPResponseError(response: Response): void {
  if (!response.ok) {
    const { status, statusText } = response;
    throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
  }
}

export { handleHTTPResponseError };
