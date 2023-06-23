// @flow

import * as React from 'react';

type SVGProps = {
  className?: string,
  viewBox: string,
  preserveAspectRatio?: string,
  children?: React.Node,
  fill?: string,
};

function SVG(props: SVGProps): React.Node {
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

export function UpCaret(props: { className?: string }): React.Node {
  return (
    <SVG
      viewBox="0 0 8 8"
      preserveAspectRatio="none"
      className={props.className}
    >
      <path d="M4 2l-4 4h8l-4-4z" />
    </SVG>
  );
}

export function DownCaret(props: { className?: string }): React.Node {
  return (
    <SVG
      viewBox="0 0 8 8"
      preserveAspectRatio="none"
      className={props.className}
    >
      <path d="M0 2l4 4 4-4h-8z" />
    </SVG>
  );
}

export function DeleteVector(props: { className?: string }): React.Node {
  return (
    <SVG className={props.className} viewBox="0 0 8 8">
      <path
        d={
          'M1.406 0l-1.406 1.406.688.719 1.781 1.781-1.781 1.781-.688.719 ' +
          '1.406 1.406.719-.688 1.781-1.781 1.781 1.781.719.688 1.406-1.406' +
          '-.688-.719-1.781-1.781 1.781-1.781.688-.719-1.406-1.406-.719.688' +
          '-1.781 1.781-1.781-1.781-.719-.688z'
        }
      />
    </SVG>
  );
}

export function AddVector(props: { className?: string }): React.Node {
  return (
    <SVG className={props.className} viewBox="0 0 8 8">
      <path d="M3 0v3h-3v2h3v3h2v-3h3v-2h-3v-3h-2z" />
    </SVG>
  );
}

export function HistoryVector(props: { className?: string }): React.Node {
  return (
    <SVG className={props.className} viewBox="0 0 8 8">
      <path
        d={
          'M.094 0c-.06 0-.094.034-.094.094v5.813c0 .06.034.094.094.094h5.' +
          '906l2 2v-7.906000000000001c0-.06-.034-.094-.094-.094h-7.813z'
        }
      />
    </SVG>
  );
}

export function MagnifyingGlass(props: { className?: string }): React.Node {
  return (
    <SVG className={props.className} viewBox="0 0 24 24">
      <path
        d={
          'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 ' +
          '9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.' +
          '79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 ' +
          '14 7.01 14 9.5 11.99 14 9.5 14z'
        }
      />
      <path d="M0 0h24v24H0z" fill="none" />
    </SVG>
  );
}

export function AddLink(props: { className?: string }): React.Node {
  return (
    <SVG className={props.className} viewBox="0 0 24 24" fill="none">
      <path
        d={
          'M16.9488 12.7106L18.363 11.2964C19.9251 9.73433 19.9251 7.20167 ' +
          '18.363 5.63957C16.8009 4.07747 14.2682 4.07747 12.7061 ' +
          '5.63957L11.2919 7.05378M9.1706 14.832L14.8275 9.1751M7.04928 ' +
          '11.2964L5.63507 12.7106C4.07297 14.2727 4.07297 16.8054 5.63507 ' +
          '18.3675C7.19717 19.9296 9.72983 19.9296 11.2919 18.3675L12.7061 ' +
          '16.9533'
        }
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19.5 15V21" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22.5 18H16.5" strokeWidth="1.5" strokeLinecap="round" />
    </SVG>
  );
}
