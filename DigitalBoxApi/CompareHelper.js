const FileHelper = require("./FileHelper");

let fileIdDictionary = {};

exports.CheckForDbUpdates = (fileIds, jsonDB) => {
  let unaccountedFiles = [];
  createFileIdDictionary(jsonDB.Orders);
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
const createFileIdDictionary = (orders) =>
  orders.forEach((order) => {
    fileIdDictionary[`${order.FileId}`] = "";
  });
