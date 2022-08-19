const { google } = require("googleapis");
const fs = require("fs");

exports.BackupDatabase = async (googleDrive) => {
  let fileIds = [];

  try {
    await uploadDatabaseBackup(googleDrive);
    fileIds = await getDatabaseBackups(googleDrive, fileIds);

    console.log(fileIds);

    if (fileIds.length > 100)
      await trimDatabaseBackups(fileIds[100], googleDrive);
  } catch (err) {
    console.log(err);
  }
};

const getDatabaseBackups = async (googleDrive, fileIds) => {
  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .list({
        q: "'1KTz0I8r3YxuvHS78vUcqBlKPKUdOBLQn' in parents and trashed=false",
        fields: "nextPageToken, files(id)",
        spaces: "drive",
        pageSize: 1000,
        orderBy: "createdTime desc",
      })
      .then((response) => {
        fileIds = [...response.data.files];
        resolve(fileIds);
      })
      .catch((error) => {
        console.log(error);
        fetch = false;
        reject(error);
      });
  });
};

const trimDatabaseBackups = (fileIdParam, googleDrive) => {
  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .delete({
        fileId: fileIdParam.id,
      })
      .then((response) => {
        resolve(console.log("DB Backups Trimmed"));
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
};

const uploadDatabaseBackup = async (googleDrive) => {
  const fileMetadata = {
    name: `${new Date().toLocaleString()}-BackUp.json`,
    parents: ["1KTz0I8r3YxuvHS78vUcqBlKPKUdOBLQn"],
  };

  var media = {
    mimeType: "text/plain",
    body: fs.createReadStream("orders.json"),
  };

  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .create({
        resource: fileMetadata,
        media: media,
        fields: "id",
      })
      .then((response) => {
        resolve(console.log("DB Backup Uploaded"));
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
};
