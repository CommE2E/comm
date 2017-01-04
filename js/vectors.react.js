// @flow

import React from 'react';

type SVGProps = {
  height: string,
  width: string,
  className: string,
  viewBox: string,
  children?: Element<any>,
};

function SVG(props: SVGProps) {
  return (
    <svg
      height={props.height}
      width={props.width}
      className={props.className}
      viewBox={props.viewBox}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      {props.children}
    </svg>
  );
}

type PagerProps = {
  size: string,
  className: string,
};

export function LeftPager(props: PagerProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 512 512"
    >
      <polygon points={
        "352,128.4 319.7,96 160,256 160,256 160,256 319.7,416 " +
        "352,383.6 224.7,256"
      }/>
    </SVG>
  );
}

export function RightPager(props: PagerProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 512 512"
    >
      <polygon points={
        "160,128.4 192.3,96 352,256 352,256 352,256 192.3,416 " +
        "160,383.6 287.3,256 "
      }/>
    </SVG>
  );
}

type CaretProps = {
  size: string,
  className: string,
};

export function UpCaret(props: CaretProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 8 8"
    >
      <path d="M4 2l-4 4h8l-4-4z" />
    </SVG>
  );
}

export function DownCaret(props: CaretProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 8 8"
    >
      <path d="M0 2l4 4 4-4h-8z" />
    </SVG>
  );
}
