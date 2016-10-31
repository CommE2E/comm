// @flow

import React from 'react';

export type LoadingStatus = "inactive" | "loading" | "error";

type Props = {
  status: LoadingStatus,
  baseURL: string,
  className: ?string,
}

export default function LoadingIndicator(props: Props) {
  if (props.status === "inactive") {
    return null;
  }
  let cssClassNames = "loading-indicator-" + props.status;
  if (props.className) {
    cssClassNames += " " + props.className;
  }
  if (props.status === "loading") {
    return (
      <img
        className={cssClassNames}
        src={props.baseURL + "images/ajax-loader.gif"}
        alt="loading"
      />
    );
  } else if (props.status === "error") {
    return <span className={cssClassNames}>!</span>;
  }
}
