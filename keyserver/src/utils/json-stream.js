// @flow

function waitForStream(readable: stream$Readable): Promise<void> {
  return new Promise(r => {
    readable.on('end', r);
  });
}

export { waitForStream };
