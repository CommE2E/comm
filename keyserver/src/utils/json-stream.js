// @flow

import type { $Response } from 'express';
import JSONStream from 'JSONStream';
import replaceStream from 'replacestream';
import Combine from 'stream-combiner';

function streamJSON(
  res: $Response,
  input: { +[key: string]: mixed },
): stream$Readable {
  const jsonStream = Combine(
    JSONStream.stringifyObject('{', ',', '}'),
    replaceStream(/</g, '\\u003c'),
  );
  jsonStream.pipe(res, { end: false });
  resolvePromisesToStream(jsonStream, input);
  return jsonStream;
}

function resolvePromisesToStream(
  stream: { +write: ([string, mixed]) => mixed, +end: () => mixed, ... },
  input: { +[key: string]: mixed },
) {
  const blocking = [];
  for (const key in input) {
    const value = input[key];
    if (value instanceof Promise) {
      blocking.push(
        (async () => {
          const result = await value;
          stream.write([key, result]);
        })(),
      );
    } else {
      stream.write([key, value]);
    }
  }
  Promise.all(blocking).then(() => {
    stream.end();
  });
}

function waitForStream(readable: stream$Readable): Promise<void> {
  return new Promise(r => {
    readable.on('end', r);
  });
}

export { streamJSON, waitForStream };
