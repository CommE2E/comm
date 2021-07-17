// @flow

export type DeviceCameraInfo = {
  +hasCamerasOnBothSides: boolean,
  +defaultUseFrontCamera: boolean,
};

export const defaultDeviceCameraInfo = {
  hasCamerasOnBothSides: true,
  defaultUseFrontCamera: false,
};
