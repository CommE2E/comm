// @flow

import React from 'react';

type SVGProps = {
  height: string,
  width: string,
  className: string,
  viewBox: string,
  preserveAspectRatio?: string,
  // I can't figure out how to get Flow to work for this
  children?: any,
};

function SVG(props: SVGProps) {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      {...props}
    />
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
  height: string,
  width: string,
  className: string,
};

export function UpCaret(props: CaretProps) {
  return (
    <SVG
      viewBox="0 0 8 8"
      preserveAspectRatio="none"
      {...props}
    >
      <path d="M4 2l-4 4h8l-4-4z" />
    </SVG>
  );
}

export function DownCaret(props: CaretProps) {
  return (
    <SVG
      viewBox="0 0 8 8"
      preserveAspectRatio="none"
      {...props}
    >
      <path d="M0 2l4 4 4-4h-8z" />
    </SVG>
  );
}

type ActionLinksProps = {
  size: string,
  className: string,
};

export function DeleteVector(props: ActionLinksProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 8 8"
    >
      <path d={
        "M1.406 0l-1.406 1.406.688.719 1.781 1.781-1.781 1.781-.688.719 " +
        "1.406 1.406.719-.688 1.781-1.781 1.781 1.781.719.688 1.406-1.406" +
        "-.688-.719-1.781-1.781 1.781-1.781.688-.719-1.406-1.406-.719.688" +
        "-1.781 1.781-1.781-1.781-.719-.688z"
      }/>
    </SVG>
  );
}

export function AddVector(props: ActionLinksProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 8 8"
    >
      <path d="M3 0v3h-3v2h3v3h2v-3h3v-2h-3v-3h-2z" />
    </SVG>
  );
}

export function HistoryVector(props: ActionLinksProps) {
  return (
    <SVG
      height={props.size}
      width={props.size}
      className={props.className}
      viewBox="0 0 8 8"
    >
      <path d={
        "M.094 0c-.06 0-.094.034-.094.094v5.813c0 .06.034.094.094.094h5." +
        "906l2 2v-7.906000000000001c0-.06-.034-.094-.094-.094h-7.813z"
      }/>
    </SVG>
  );
}
