// @flow

import * as React from 'react';

import LoginForm from '../account/log-in-form.react';
import css from './splash.css';

function Splash(): React.Node {
  return (
    <div className={css.splashContainer}>
      <div className={css.loginContainer}>
        <LoginForm />
      </div>
    </div>
  );
}

export default Splash;
