// @flow

import invariant from 'invariant';

declare class SVGElement extends Element {}

function htmlTargetFromEvent(event: SyntheticEvent<EventTarget>): HTMLElement {
  let target: EventTarget = event.target;
  while (!(target instanceof HTMLElement)) {
    invariant(
      target instanceof SVGElement,
      'non-HTMLElements in DOM should be SVGElements',
    );
    const { parentNode } = target;
    invariant(parentNode, 'non-HTMLElements in DOM should have parentNode');
    target = parentNode;
  }
  return target;
}

export { htmlTargetFromEvent };
