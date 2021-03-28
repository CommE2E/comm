// @flow

import * as React from 'react';

type VisibilityModule = {
  +hidden: () => boolean,
  +change: (callback: (event: Object, state: string) => mixed) => number,
  +unbind: (callbackID: number) => void,
  ...
};

/* eslint-disable no-unused-vars */
let visibilityModule: VisibilityModule = {
  hidden: () => false,
  change: (callback: (event: Object, state: string) => mixed) => 0,
  unbind: (callbackID: number) => {},
};
/* eslint-enable no-unused-vars */

let callbacks = [];

(async () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const visibilityjs = await import('visibilityjs');
    visibilityModule = visibilityjs.default;
    callbacks.forEach(callback => callback(visibilityModule));
    callbacks = [];
  } catch {}
})();

function getVisibility(): VisibilityModule {
  return visibilityModule;
}

function useVisibility(): VisibilityModule {
  const [visibility, setVisibility] = React.useState(visibilityModule);
  callbacks.push(setVisibility);
  return visibility;
}

export { getVisibility, useVisibility };
