// @flow

type RequestWithTimeoutOptions = {
  ...$Exact<RequestOptions>,
  +timeout?: number, // ms
};

async function fetchWithTimeout(
  url: string,
  options?: RequestWithTimeoutOptions,
): Promise<Response> {
  const { timeout, signal: externalSignal, ...requestOptions } = options || {};

  const abortController = new AbortController();

  // Handle situation when callee has abort signal already set
  let externalAbort = false;
  const externalAbortEvent = () => {
    externalAbort = true;
    abortController.abort();
  };
  if (externalSignal) {
    externalSignal.addEventListener('abort', externalAbortEvent);
  }

  let timeoutHandle;
  if (timeout) {
    timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, timeout);
  }

  try {
    return await fetch(url, {
      ...requestOptions,
      signal: abortController.signal,
    });
  } catch (err) {
    if (abortController.signal.aborted && !externalAbort) {
      throw new Error('Request timed out');
    } else {
      throw err;
    }
  } finally {
    clearTimeout(timeoutHandle);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', externalAbortEvent);
    }
  }
}

export { fetchWithTimeout };
