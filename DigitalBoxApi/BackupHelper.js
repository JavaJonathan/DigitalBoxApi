const fs = require('fs');
const LogHelper = require('./LogHelper');

const backUpFolderId = '1MePmV9XLJpl4RAu7FeH6WTpyG9kMu294';

exports.BackupDatabase = async googleDrive => {
  let fileIds = [];
  try {
    await uploadDatabaseBackup(googleDrive);
    fileIds = await getDatabaseBackups(googleDrive, fileIds);

    if (fileIds.length > 100) await trimDatabaseBackups(fileIds[100], googleDrive);
  } catch (error) {
    console.log('Failed to back up database.');
    LogHelper.LogError(error);
  }
};

const getDatabaseBackups = async (googleDrive, fileIds) => {
  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .list({
        q: `'${backUpFolderId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id)',
        spaces: 'drive',
        pageSize: 1000,
        orderBy: 'createdTime desc'
      })
      .then(response => {
        fileIds = [...response.data.files];
        resolve(fileIds);
      })
      .catch(error => {
        console.log('Failed to retrieve database back ups.');
        LogHelper.LogError(error);
        fetch = false;
        reject(error);
      });
  });
};

const trimDatabaseBackups = (fileIdParam, googleDrive) => {
  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .delete({
        fileId: fileIdParam.id
      })
      .then(response => {
        resolve(console.log('DB Backups Trimmed'));
      })
      .catch(error => {
        console.log('Failed to trim database back ups.');
        LogHelper.LogError(error);
        reject(error);
      });
  });
};

const uploadDatabaseBackup = async googleDrive => {
  const fileMetadata = {
    name: `${new Date().toLocaleString()}-BackUp.json`,
    parents: [`${backUpFolderId}`]
  };

  var media = {
    mimeType: 'text/plain',
    body: fs.createReadStream('orders.json')
  };

  return new Promise(async (resolve, reject) => {
    await googleDrive.files
      .create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      })
      .then(response => {
        resolve(console.log('DB Backup Uploaded'));
      })
      .catch(error => {
        console.log('Failed to upload database back up.');
        LogHelper.LogError(error);
        reject(error);
      });
  });
};
