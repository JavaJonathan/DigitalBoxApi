const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");
const CompareHelper = require("./CompareHelper");

let fileIds = [];
let jsonDB = {};

exports.GetFileIds = async (token) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(token);

  await getPdfFiles(drive);
  await getJSONFile(drive);
  console.log(fileIds, jsonDB)
  CompareHelper.CheckForDbUpdates(fileIds, jsonDB)
};

const getJSONFile = (drive) => {
  return drive.files
    .get({ fileId: "1AHF_JQdnpdUm9eJYKgdBg9_q3fvzr4_X", alt: "media" })
    .then((response) => {
      jsonDB = response.data;
    });
};

const writeToJsonFile = (jsonString) => {
    fs.writeFileSync('order.json', jsonString);
}

const getPdfFiles = async (drive) => {
  var pageToken = null;

  return drive.files
    .list({
      q: "'1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z' in parents and trashed=false",
      fields: "nextPageToken, files(id, name)",
      spaces: "drive",
      pageToken: pageToken,
    })
    .then((response) => {
      response.data.files.forEach(function (file) {
        console.log("Found file: ", file.name, file.id);
        fileIds.push(file.id);
      });
    });
};
