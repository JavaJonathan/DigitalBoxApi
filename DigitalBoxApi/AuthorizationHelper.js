const {google} = require('googleapis');
const fs = require('fs');

let credentials = {}

exports.authorizeWithGoogle = (token) => {  
    const oAuth2Client = new google.auth.OAuth2(credentials.ClientId, credentials.ClientSecret, 'http://localhost:3000/');
    oAuth2Client.credentials = JSON.parse(token)
    oAuth2Client.apiKey = credentials.ApiKey
    return google.drive({version: 'v3', auth: oAuth2Client});
}

exports.getCredentials = () => {
    credentials = JSON.parse(fs.readFileSync('botConfigs.json'))
    return credentials
}