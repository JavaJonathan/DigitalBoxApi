const { google } = require("googleapis");
const fs = require("fs");

let credentials = {};

exports.authToken = '';

exports.authorizeWithGoogle = async (token) => {
  const oAuth2Client = new google.auth.OAuth2(
    credentials.ClientId,
    credentials.ClientSecret,
    "http://localhost:3000/"
  );
  oAuth2Client.credentials = token;
  oAuth2Client.apiKey = credentials.ApiKey;

  //refreshes token if needed
  this.authToken = await oAuth2Client.getAccessToken()
  oAuth2Client.credentials = {access_token: this.authToken.token}

  return google.drive({ version: "v3", auth: oAuth2Client });
};

exports.getCredentials = () => {
  credentials = JSON.parse(fs.readFileSync("botConfigs.json"));
  return credentials;
};
