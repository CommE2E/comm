// @flow

const fs = require('fs');
const readline = require('readline');

// Create an interface for reading input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const credentials = {};

rl.question('username: ', value1 => {
  credentials.username = value1;

  rl.question('password: ', value2 => {
    credentials.password = value2;

    rl.question('user id: ', value3 => {
      credentials.id = value3;

      writeFiles(credentials);

      // Close the readline interface
      rl.close();
    });
  });
});

function writeFiles(userCredentials) {
  const userCredentialsJSON = JSON.stringify(userCredentials, null, 2);
  fs.writeFileSync(
    'keyserver/secrets/user_credentials.json',
    userCredentialsJSON,
  );

  // Create configs containing authoritative keyservers data.
  // Because we have different mechanisms for fetching configs,
  // we need this config in two places

  const authoritativeKeyserver = {
    authoritativeKeyserverID: userCredentials.id,
  };
  const authoritativeKeyserverJSON = JSON.stringify(
    authoritativeKeyserver,
    null,
    2,
  );
  fs.writeFileSync(
    'native/facts/authoritative_keyserver.json',
    authoritativeKeyserverJSON,
  );
  fs.writeFileSync(
    'keyserver/facts/authoritative_keyserver.json',
    authoritativeKeyserverJSON,
  );
}
