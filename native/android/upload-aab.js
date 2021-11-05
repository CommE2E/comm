// @flow

const { createReadStream } = require('fs');
const { google } = require('googleapis');

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './PLAY_STORE_PUBLISHING_KEY.json',
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: auth,
    });
    
    const aab = createReadStream(
      'app/build/outputs/bundle/release/app-release.aab',
    );

    const insertResp = await androidPublisher.edits.insert({
      packageName: 'app.comm.android',
    });

    await androidPublisher.edits.bundles.upload({
      editId: insertResp.data.id,
      packageName: 'app.comm.android',
      media: {
        mimeType: 'application/octet-stream',
        body: aab,
      },
    });

    await androidPublisher.edits.commit({
      packageName: 'app.comm.android',
      editId: insertResp.data.id,
    });

  } catch (error) {
    console.warn(error);
  }
}

main();
