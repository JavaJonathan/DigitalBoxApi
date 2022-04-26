const FileHelper = require("./FileHelper");

exports.CheckForDbUpdates = (fileIds, jsonDB) => {
  let unaccountedFiles = [];
  let fileIdDictionary = {};

  createFileIdDictionary(jsonDB.Orders, fileIdDictionary);
  fileIds.forEach((fileId) => {
    if (!fileIdDictionary.hasOwnProperty(fileId)) {
      if (fileId !== FileHelper.JsonFileId) {
        unaccountedFiles.push(fileId);
      }
    }
  });
  return unaccountedFiles;
};
//we create a dictionary with the fileIds for quick searching
const createFileIdDictionary = (orders, fileIdDictionary) =>
  orders.forEach((order) => {
    fileIdDictionary[`${order.FileId}`] = "";
  });
