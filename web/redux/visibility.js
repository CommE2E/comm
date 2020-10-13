// @flow

/* eslint-disable no-unused-vars */
let visibility = {
  hidden: () => false,
  change: (callback: (event: Object, state: string) => mixed) => 0,
  unbind: (callbackID: number) => {},
};
/* eslint-enable no-unused-vars */

(async () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const visibilityjs = await import('visibilityjs');
    visibility = visibilityjs.default;
  } catch {}
})();

function getVisibility() {
  return visibility;
}

export { getVisibility };
