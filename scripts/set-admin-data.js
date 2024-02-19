// @flow

const fs = require('fs');
const readline = require('readline');

// Create an interface for reading input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const data = {};

rl.question('username: ', value1 => {
  data.username = value1;

  rl.question('password: ', value2 => {
    data.password = value2;

    rl.question('user id: ', value3 => {
      data.id = value3;

      writeFiles(data);

      // Close the readline interface
      rl.close();
    });
  });
});

function writeFiles(credentials) {
  try {
    const userCredentials = {
      username: credentials.username,
      password: credentials.password,
      usingIdentityCredentials: true,
    };
    const userCredentialsJSON = JSON.stringify(userCredentials, null, 2);
    fs.writeFileSync(
      'keyserver/secrets/user_credentials.json',
      userCredentialsJSON,
    );

    // Create configs containing authoritative keyservers data.
    // Because we have different mechanisms for fetching configs,
    // we need this config in two places

    const authoritativeKeyserver = {
      authoritativeKeyserverID: credentials.id,
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
  } catch (e) {
    console.error(
      'Failure creating configuration files: ' +
        'admin data could not be correctly written',
    );
    throw e;
  }
}
