// @flow

import * as React from 'react';
import Particles from 'react-particles-js';

import './landing.css';
import particlesConfig from './particles-config.json';

function Landing(): React.Node {
  return (
    <div>
      <h1>Comm</h1>
      <Particles height="100vh" width="100vw" params={particlesConfig} />
    </div>
  );
}

export default Landing;
