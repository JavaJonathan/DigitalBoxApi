const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");
const CompareHelper = require("./CompareHelper");
const ContentHelper = require("./ContentHelper");
const UploadHelper = require("./UploadHelper");

exports.JsonFileId = "1PJZgDZ8G0LzjJkRAeTdPPlYSAxALDrRh";

exports.GetFileIds = async (request, response) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(request.token);

  let fileIds = [];
  let jsonDB = {};

  await getPdfFiles(drive, fileIds);
  jsonDB = await getJSONFile(drive);
  let unaccountedFiles = CompareHelper.CheckForDbUpdates(fileIds, jsonDB);

  response.json({
    Orders: filterOrders(request, jsonDB.Orders),
    Message: `${unaccountedFiles.length} files missing from DB`,
  });

  for (let counter = 0; counter < unaccountedFiles.length; counter++) {
    let PDFObject = {};
    await ContentHelper.DownloadFile(drive, unaccountedFiles[counter]);
    PDFObject = await ContentHelper.GetText(unaccountedFiles[counter]);
    jsonDB.Orders.push(PDFObject);
  }
  writeToJsonFile(jsonDB, drive);
};

const getJSONFile = (drive, jsonDB) => {
  return drive.files
    .get({ fileId: `${exports.JsonFileId}`, alt: "media" })
    .then((response) => {
      return response.data;
    });
};

const writeToJsonFile = (jsonString, drive) => {
  fs.writeFileSync("orders.json", JSON.stringify(jsonString));
  UploadHelper.UpdateJsonFile(drive);
};

const filterOrders = (request, items) => {
  if (request.Filter === "") return items;

  return items.filter((item) => {
    return shouldBeFiltered(item, request);
  });
};

const shouldBeFiltered = (item, request) => {
  console.log(request.Filter);

  for (counter = 0; counter < item.FileContents.length; counter++) {
    console.log(
      item.FileContents[counter].Title.replace(/\s/g, "").toLowerCase()
    );
    if (
      //we needed to remove the spaces due to search results not returning
      item.FileContents[counter].Title.replace(/\s/g, "")
        .toLowerCase()
        .includes(request.Filter.replace(/\s/g, "").toLowerCase()) ||
      item.FileContents[counter].OrderNumber.replace(/\s/g, "")
        .toLowerCase()
        .includes(request.Filter.replace(/\s/g, "").toLowerCase())
    ) {
      return true;
    }
  }
  return false;
};

const getPdfFiles = async (drive, fileIds) => {
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
