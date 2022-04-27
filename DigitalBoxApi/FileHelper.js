const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");
const CompareHelper = require("./CompareHelper");
const ContentHelper = require("./ContentHelper");
const UploadHelper = require("./UploadHelper");
const MoveFileHelper = require("./MoveFileHelper");

exports.JsonFileId = "1Es2hHSXsd2ZGL6pnPKKFohUgYTj_4AeZ";

exports.GetOrdersFromFile = async (request, response) => {
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

exports.CancelOrShipOrders = async (request, response) => {
    let drive = AuthorizationHelper.authorizeWithGoogle(request.token);
    let jsonDB = {};

    jsonDB = await getJSONFile(drive);
    let newDBState = UpdateJsonDb(jsonDB, request.Orders, drive)
    MoveFileHelper.MoveFiles(drive, request.Orders, request.Action)

    if(request.Action === 'ship'){
        response.json({Message: `${request.Orders.length} Orders shipped successfully`, Orders: newDBState.Orders})
    }
    else if(request.Action === 'cancel'){
        response.json({Message: `${request.Orders.length} Orders cancelled successfully`, Orders: newDBState.Orders})
    }
}

const getJSONFile = (drive, jsonDB) => {
  return drive.files
    .get({ fileId: `${exports.JsonFileId}`, alt: "media" })
    .then((response) => {
      return response.data;
    });
};

const UpdateJsonDb = (currentDBState, orders, drive) => {
    let newOrders = currentDBState.Orders.filter((record) => {
        return !orders.includes(record.FileId)
    })

    currentDBState.Orders = newOrders
    writeToJsonFile(currentDBState, drive)
    UploadHelper.UpdateJsonFile(drive)
    return currentDBState
}

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
        fileIds.push(file.id);
      });
    });
};
