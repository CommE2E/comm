// @flow

import invariant from 'invariant';

declare class SVGElement extends Element {}

function htmlTargetFromEvent(event: SyntheticEvent<*>): HTMLElement {
  let target = event.target;
  while (!(target instanceof HTMLElement)) {
    invariant(
      target instanceof SVGElement,
      'non-HTMLElements in typeahead should be SVGElements',
    );
    target = target.parentNode;
  }
  return target;
}

export { htmlTargetFromEvent };
