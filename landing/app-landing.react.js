// @flow

import * as React from 'react';

import StarBackground from './star-background.react';

function AppLanding(): React.Node {
  return (
    <div>
      <StarBackground />
      <center>
        <h1>App Landing Page</h1>
        <img height={300} src="images/comm-screenshot.png" />
      </center>
    </div>
  );
}

export default AppLanding;
