const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");
const CompareHelper = require("./CompareHelper");
const ContentHelper = require("./ContentHelper");
const UploadHelper = require("./UploadHelper");
const MoveFileHelper = require("./MoveFileHelper");
const { json } = require("body-parser");

exports.JsonFileId = "1Es2hHSXsd2ZGL6pnPKKFohUgYTj_4AeZ";

exports.GetOrdersFromFile = async (request, response) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(request.token);

  let fileIds = [];
  let jsonDB = {};
  let unaccountedFiles = [];
  let message = `Your search results are up to date as of ${new Date().toLocaleString()}`;

  await getPdfFiles(drive, fileIds);
  jsonDB = await getJSONFile(drive);

  if (jsonDB.Updating === true) {
    message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
  } else {
    unaccountedFiles = CompareHelper.CheckForDbUpdates(fileIds, jsonDB);
  }

  if (unaccountedFiles.length > 0) {
    jsonDB.Updating = true;
    jsonDB.UpdateFinishTime = getUpdateFinishTime(unaccountedFiles.length)
    message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
    writeToJsonFile(jsonDB, drive);
  }

  response.json({
    Orders: filterOrders(
      request,
      jsonDB.Orders.sort((a, b) => {
        return (
          Date.parse(a.FileContents[0].ShipDate) -
          Date.parse(b.FileContents[0].ShipDate)
        );
      })
    ),
    Message: message,
  });

  let newOrders = [];

  for (let counter = 0; counter < unaccountedFiles.length; counter++) {
    let PDFObject = {};
    await ContentHelper.DownloadFile(
      drive,
      unaccountedFiles[counter],
      "photo.pdf"
    );
    PDFObject = await ContentHelper.GetText(unaccountedFiles[counter]);
    newOrders.push(PDFObject);
  }

  if (newOrders.length > 0) {
    jsonDB = await getJSONFile(drive);
    jsonDB.Orders.push(...newOrders);
    jsonDB.Updating = false;
    writeToJsonFile(jsonDB, drive);
  }
};

const getUpdateFinishTime = (numberOfItems) => {
    let date = new Date()
    date.setMinutes(date.getMinutes() + Math.ceil(numberOfItems / 120))
    console.log(date.toLocaleString())
    return date.toLocaleString()
}

exports.CancelOrShipOrders = async (request, response) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(request.token);
  let jsonDB = {};

  jsonDB = await getJSONFile(drive);
  let newDBState = UpdateJsonDb(jsonDB, request.Orders, drive);
  MoveFileHelper.MoveFiles(drive, request.Orders, request.Action);

  if (request.Action === "ship") {
    await downloadShippedFiles(drive, request.Orders);
    response.json({
      Message: `${request.Orders.length} order(s) shipped successfully`,
      Orders: newDBState.Orders.sort((a, b) => {
        return (
          Date.parse(a.FileContents[0].ShipDate) -
          Date.parse(b.FileContents[0].ShipDate)
        );
      }),
    });
  } else if (request.Action === "cancel") {
    response.json({
      Message: `${request.Orders.length} order(s) cancelled successfully`,
      Orders: newDBState.Orders.sort((a, b) => {
        return (
          Date.parse(a.FileContents[0].ShipDate) -
          Date.parse(b.FileContents[0].ShipDate)
        );
      }),
    });
  }
};

const downloadShippedFiles = async (drive, orders) => {
  for (let counter = 0; counter < orders.length; counter++) {
    await ContentHelper.DownloadFile(
      drive,
      orders[counter],
      `C:\\Users\\jonat\\Downloads\\ShippedItems`
    );
  }
};

const getJSONFile = (drive, jsonDB) => {
  return drive.files
    .get({ fileId: `${exports.JsonFileId}`, alt: "media" })
    .then((response) => {
      return response.data;
    });
};

const UpdateJsonDb = (currentDBState, orders, drive) => {
  let newOrders = currentDBState.Orders.filter((record) => {
    return !orders.includes(record.FileId);
  });

  currentDBState.Orders = newOrders;
  writeToJsonFile(currentDBState, drive);
  UploadHelper.UpdateJsonFile(drive);
  return currentDBState;
};

const writeToJsonFile = (jsonString, drive) => {
  fs.writeFileSync("orders.json", JSON.stringify(jsonString));
  UploadHelper.UpdateJsonFile(drive);
};

const filterOrders = (request, items) => {
    console.log(request.Filter)
  if (request.Filter === "") return items;

  return items.filter((item) => {
    return shouldBeFiltered(item, request);
  });
};

const shouldBeFiltered = (item, request) => {
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
