// @flow

import type { $Response } from 'express';

async function writeReadableStreamToResponse(
  stream: ReadableStream,
  res: $Response,
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        res.write(new TextDecoder().decode(value));
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export { writeReadableStreamToResponse };
