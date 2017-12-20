// @flow

import type { ThreadInfo, ThreadPermission } from '../types/thread-types';

import Color from 'color';

function colorIsDark(color: string) {
  return Color(`#${color}`).dark();
}

// Randomly distributed in RGB-space
const hexNumerals = '0123456789abcdef';
function generateRandomColor() {
  let color = "";
  for (let i = 0; i < 6; i++) {
    color += hexNumerals[Math.floor(Math.random() * 16)];
  }
  return color;
}

function threadHasPermission(
  threadInfo: ThreadInfo,
  permission: ThreadPermission,
) {
  if (!threadInfo.currentUser.permissions[permission]) {
    return false;
  }
  return threadInfo.currentUser.permissions[permission].value;
}

function viewerIsMember(threadInfo: ThreadInfo) {
  return threadInfo.currentUser &&
    threadInfo.currentUser.role !== null &&
    threadInfo.currentUser.role !== undefined;
}

export {
  colorIsDark,
  generateRandomColor,
  threadHasPermission,
  viewerIsMember,
}
