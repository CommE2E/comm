// @flow

import * as React from 'react';

import Alert from '../alert.react.js';

function InvalidUploadModal(): React.Node {
  return (
    <Alert title="Invalid upload">
      We don&rsquo;t support that file type yet :(
    </Alert>
  );
}

export default InvalidUploadModal;
