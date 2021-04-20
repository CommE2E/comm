// @flow

import * as React from 'react';
import { Email, Box } from 'react-html-email';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

type Props = {|
  +title: string,
  +children: React.Node,
|};
function Template(props: Props): React.Node {
  return (
    <Email title={props.title} headCSS={css} align="left" width="100%">
      <Box align="left" cellSpacing={10}>
        {props.children}
      </Box>
    </Email>
  );
}

export default Template;
