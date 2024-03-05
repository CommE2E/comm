/* eslint-disable flowtype/require-valid-file-annotation */

const basePath = process.argv[2];

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

    writeFiles(data);

    // Close the readline interface
    rl.close();
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
    const keyserverSecrets = `${basePath}/keyserver/secrets`;
    if (!fs.existsSync(keyserverSecrets)) {
      fs.mkdirSync(keyserverSecrets);
    }
    fs.writeFileSync(
      `${keyserverSecrets}/user_credentials.json`,
      userCredentialsJSON,
    );
  } catch (e) {
    console.error(
      'Failure creating configuration files: ' +
        'admin data could not be correctly written',
    );
    throw e;
  }
}
