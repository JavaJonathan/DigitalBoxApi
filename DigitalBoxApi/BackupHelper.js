const { google } = require("googleapis");
const fs = require("fs");

exports.BackupDatabase = async (googleDrive) => {
  try {
    await uploadDatabaseBackup(googleDrive);
  } catch (err) {
    console.log(err);
  }
};

const getDatabaseBackups = async (googleDrive, fileIds) => {
  let pageToken = null;

  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .list({
        q: "'1KTz0I8r3YxuvHS78vUcqBlKPKUdOBLQn' in parents and trashed=false",
        fields: "nextPageToken, files(id, name)",
        spaces: "drive",
        pageToken: pageToken,
        pageSize: 1000,
        orderBy: "createdTime desc",
      })
      .then((response) => {
        response.data.files.forEach(function (file) {});
      })
      .catch((error) => {
        console.log(error);
        fetch = false;
        reject(error);
      });
  });
};

const trimDatabaseBackups = () => {};

const uploadDatabaseBackup = async (googleDrive) => {

  const fileMetadata = {
    title: 'BackUp.json',
    parents: ["1KTz0I8r3YxuvHS78vUcqBlKPKUdOBLQn"]
  };

  var media = {
    mimeType: "text/plain",
    body: fs.createReadStream("orders.json"),
  };

  return new Promise(async (resolve, reject) => {
  await googleDrive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  })  
  .then((response) => {resolve('cool')})
  .catch((error) => {
    console.log(error);
    reject(error);
  });
});
};
