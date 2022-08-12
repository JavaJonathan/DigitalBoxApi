const FileHelper = require("./FileHelper");

exports.CheckForDbUpdates = (fileIds, jsonDB) => {
  let unaccountedFiles = [];
  let fileIdDictionary = {};
  let removedFiles = [];

  createFileIdDictionary(jsonDB.Orders, fileIdDictionary);
  fileIds.forEach((fileId) => {
    fileIdDictionary;
    if (!fileIdDictionary.hasOwnProperty(fileId)) {
      if (fileId !== FileHelper.JsonFileId) {
        unaccountedFiles.push(fileId);
      }
    } else {
      fileIdDictionary[fileId] = "hit";
    }
  });

  //we need this to ensure files were not manually removed from the google drive
  Object.keys(fileIdDictionary).forEach((key) => {
    if (fileIdDictionary[key] === "not hit") {
      removedFiles.push(key);
    }
  });
  return [unaccountedFiles, removedFiles];
};

exports.EnsureFilesExist = (orders, jsonDB) => {
  let allFilesExist = true;
  let fileIdDictionary = {};

  createFileIdDictionary(jsonDB.Orders, fileIdDictionary);

  orders.forEach((order) => {
    if (!fileIdDictionary.hasOwnProperty(order)) {
      allFilesExist = false;
    }
  });
  return allFilesExist;
};
//we create a dictionary with the fileIds for quick searching
const createFileIdDictionary = (orders, fileIdDictionary) =>
  orders.forEach((order) => {
    fileIdDictionary[`${order.FileId}`] = "not hit";
  });
