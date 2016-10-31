// @flow

export default function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
