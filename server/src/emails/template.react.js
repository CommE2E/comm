// @flow

import React from 'react';
import * as React2 from 'react';
import ReactHTML from 'react-html-email';

const { Email, Box } = ReactHTML;

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

type Props = {|
  title: string,
  children: React2.Node,
|};
function Template(props: Props) {
  return (
    <Email title={props.title} headCSS={css} align="left" width="100%">
      <Box align="left">
        {props.children}
      </Box>
    </Email>
  );
}

export default Template;
