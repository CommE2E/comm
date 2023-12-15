// @flow

import uuid from 'uuid';

import sleep from 'lib/utils/sleep.js';

import { deleteBlob, download, upload } from '../services/blob.js';

(async () => {
  const blob = new Blob(['abc']);
  const hash = 'test_delete_4';
  const holder = uuid.v4();
  console.log(holder);
  const result = await upload(blob, { hash, holder });
  console.log(result);

  const downloadResponse = await download(hash);
  if (downloadResponse.found) {
    console.log(await downloadResponse.blob.text());
  } else {
    console.log('not found');
  }

  await deleteBlob(hash, holder);

  const downloadResponse2 = await download(hash);
  if (downloadResponse2.found) {
    console.log(await downloadResponse2.blob.text());
  } else {
    console.log('not found');
  }

  await sleep(5000);

  const downloadResponse3 = await download(hash);
  if (downloadResponse3.found) {
    console.log(await downloadResponse3.blob.text());
  } else {
    console.log('not found');
  }
})();
