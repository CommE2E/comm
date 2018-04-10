// @flow

import type { LoadingStatus } from 'lib/types/loading-types';

import React from 'react';

import css from './style.css';

type Props = {
  status: LoadingStatus,
  size?: "small" | "large",
  color?: "black" | "white",
  loadingClassName?: string,
  errorClassName?: string,
};

export default function LoadingIndicator(props: Props) {
  const size = props.size ? props.size : "small";
  const color = props.color ? props.color : "white";
  if (props.status === "loading") {
    let cssClassNames = size === "small"
      ? css['loading-indicator-loading-small']
      : css['loading-indicator-loading'];
    if (props.loadingClassName) {
      cssClassNames += " " + props.loadingClassName;
    }
    if (color === "black") {
      cssClassNames += " " + css['loading-indicator-black'];
    }
    return <span className={cssClassNames} />;
  } else if (props.status === "error") {
    let cssClassNames = css['loading-indicator-error'];
    if (props.loadingClassName) {
      cssClassNames += " " + props.errorClassName;
    }
    if (color === "black") {
      cssClassNames += " " + css['loading-indicator-error-black'];
    }
    return <span className={cssClassNames}>!</span>;
  } else {
    return null;
  }
}
