const { google } = require('googleapis');
const AuthorizationHelper = require('./AuthorizationHelper');
const fs = require('fs');
const FileHelper = require('./FileHelper');
const LogHelper = require('./LogHelper');

exports.UpdateJsonFile = async drive => {
  var jsonFileId = await FileHelper.JsonFileId(drive);
  var fileMetadata = {
    name: 'orders.json'
  };
  var media = {
    mimeType: 'text/plain',
    body: fs.createReadStream('orders.json')
  };
  return new Promise((resolve, reject) => {
    drive.files.update(
      {
        fileId: `${jsonFileId}`,
        resource: fileMetadata,
        media: media,
        fields: 'id'
      },
      function (err, file) {
        if (err) {
          console.log('Error updating json file.');
          LogHelper.LogError(err);
          reject(err);
        } else {
          resolve(console.log('Json File Updated.'));
        }
      }
    );
  }).catch(error => {
    console.log('Error updating json file.');
    LogHelper.LogError(error);
    throw error;
  });
};
