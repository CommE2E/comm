// @flow

import type { LoadingStatus } from 'lib/model/redux-reducer.js';

import React from 'react';

import css from './style.css';

type Props = {
  status: LoadingStatus,
  className: ?string,
};

export default function LoadingIndicator(props: Props) {
  if (props.status === "inactive") {
    return null;
  }
  let cssClassNames = css[`loading-indicator-${props.status}`];
  if (props.className) {
    cssClassNames += " " + props.className;
  }
  if (props.status === "loading") {
    return (
      <img
        className={cssClassNames}
        src="images/ajax-loader.gif"
        alt="loading"
      />
    );
  } else if (props.status === "error") {
    return <span className={cssClassNames} title="error">!</span>;
  }
}
