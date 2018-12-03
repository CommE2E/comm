// @flow

import PropTypes from 'prop-types';

type MediaType = "photo" | "video";

export type Media = {|
  uri: string,
  type: MediaType,
|};

export const mediaPropType = PropTypes.shape({
  uri: PropTypes.string.isRequired,
  type: PropTypes.oneOf([ "photo", "video" ]).isRequired,
});
