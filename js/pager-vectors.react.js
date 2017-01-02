// @flow

import React from 'react';

type Props = {
  size: string,
  className: string,
};

export function LeftPager(props: Props) {
  return (
    <svg
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 512 512"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <polygon points={
        "352,128.4 319.7,96 160,256 160,256 160,256 319.7,416 " +
        "352,383.6 224.7,256"
      }/>
    </svg>
  );
}

export function RightPager(props: Props) {
  return (
    <svg
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 512 512"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <polygon points={
        "160,128.4 192.3,96 352,256 352,256 352,256 192.3,416 " +
        "160,383.6 287.3,256 "
      }/>
    </svg>
  );
}
