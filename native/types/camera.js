// @flow

import PropTypes from 'prop-types';

export type DeviceCameraInfo = {|
  hasCamerasOnBothSides: bool,
  defaultUseFrontCamera: bool,
|};

export const deviceCameraInfoPropType = PropTypes.shape({
  hasCamerasOnBothSides: PropTypes.bool.isRequired,
  defaultUseFrontCamera: PropTypes.bool.isRequired,
});

export const defaultDeviceCameraInfo = {
  hasCamerasOnBothSides: true,
  defaultUseFrontCamera: false,
};
