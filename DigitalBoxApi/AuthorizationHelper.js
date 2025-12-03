const { google } = require('googleapis');
const fs = require('fs');

let credentials = {};

exports.authToken = '';

exports.authorizeWithGoogle = async code => {
  credentials = JSON.parse(fs.readFileSync('botConfigs.json'));

  const oAuth2Client = new google.auth.OAuth2(
    credentials.ClientId,
    credentials.ClientSecret,
    'http://localhost:3000'
  );

  setAuthToken()

  if(this.authToken === '') {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    this.authToken = tokens.refresh_token
    fs.writeFileSync('RefreshToken.json', JSON.stringify(tokens.refresh_token));
  } else {
    oAuth2Client.setCredentials({ refresh_token: this.authToken });
  }

  return google.drive({ version: 'v3', auth: oAuth2Client });
};

exports.getCredentials = () => {
  credentials = JSON.parse(fs.readFileSync('botConfigs.json'));
  return credentials;
};

const setAuthToken = () => {
  if(this.authToken === '') {
    this.authToken = JSON.parse(fs.readFileSync('RefreshToken.json'));
  }
}
