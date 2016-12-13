// @flow

import invariant from 'invariant';

import sleep from './sleep';

async function zoomTo(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  let newX = rect.left;
  let newY = rect.top;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const containerRatio = width / height;

  const viewportWidth = window.screen.width;
  const viewportHeight = window.screen.height;
  const viewportRatio = viewportWidth / viewportHeight;

  // TODO center in the non-constrainted factor
  let newInitialScale;
  let newWidth;
  if (containerRatio > viewportRatio) {
    // Width is the constraining factor
    newWidth = width;// * 1.1;
    newInitialScale = viewportWidth / newWidth;
    //newX -= width * 0.05;
    //newY -= width * 0.05;
  } else {
    // Height is the constraining factor
    newInitialScale = viewportHeight / (height/* * 1.1*/);
    newWidth = viewportRatio * height;// * 1.1;
    //newX -= height * 0.05;
    //newY -= height * 0.05;
  }
  newX = 960 / 2 - newWidth / 2;

  const viewportMeta = document.getElementById('meta-viewport');
  invariant(viewportMeta instanceof HTMLMetaElement, "should be meta");
  const currentX = window.scrollX;
  const currentY = window.scrollY;
  const initialScaleMatches =
    viewportMeta.content.match(/initial-scale=([0-9]+(\.[0-9]+)?)/);
  invariant(
    initialScaleMatches && initialScaleMatches[1],
    "initial-scale should exist in viewport meta tag",
  );
  const currentInitialScale = parseFloat(initialScaleMatches[1]);

  const widthMatches = viewportMeta.content.match(/width=([0-9]+(\.[0-9]+)?)/);
  invariant(
    widthMatches && widthMatches[1],
    "width should exist in viewport meta tag",
  );
  const currentWidth = parseFloat(widthMatches[1]);

  const xDifference = newX - currentX;
  const yDifference = newY - currentY;
  const initialScaleDifference = newInitialScale - currentInitialScale;
  const widthDifference = newWidth - currentWidth;

  const animateIn = 20;
  for (let i = 1; i <= animateIn; i++) {
    window.scrollTo(
      currentX + xDifference / animateIn * i,
      currentY + yDifference / animateIn * i,
    );
    const nextInitialScale = currentInitialScale +
      initialScaleDifference / animateIn * i;
    viewportMeta.content = `width=960, minimum-scale=${nextInitialScale}`;
    //const nextWidth = currentWidth + widthDifference / animateIn * i;
    //viewportMeta.content = `width=${nextWidth}`;
    await sleep(1);
  }
  viewportMeta.content = `width=960, initial-scale=${newInitialScale}`;
}

export { zoomTo };
