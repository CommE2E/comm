// @flow

// Only works on simple JSON
// Operates in-place!
function recursive_utf8_decode(mixed: mixed) {
  if (mixed === null) {
    return mixed;
  } else if (typeof mixed === "object") {
    for (let prop in mixed) {
      mixed[prop] = recursive_utf8_decode(mixed[prop]);
    }
    return mixed;
  } else if (typeof mixed === "string") {
    const test = decodeURIComponent(escape(mixed));
    return test;
  } else {
    return mixed;
  }
}

export {
  recursive_utf8_decode,
};
