const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");
const LogHelper = require("./LogHelper");
const fs = require("fs");
const CompareHelper = require("./CompareHelper");
const ContentHelper = require("./ContentHelper");
const UploadHelper = require("./UploadHelper");
const MoveFileHelper = require("./MoveFileHelper");
const { json } = require("body-parser");
const { off } = require("process");

exports.JsonFileId = "1tboD-ZunulU7AiPksoFSXHWIEljey11I";

exports.GetOrdersFromFile = async (request, response) => {
  let fileIds = [];
  let jsonDB = {};
  let newFiles = [];
  let removedFiles = [];
  let message = `Your search results are up to date as of ${new Date().toLocaleString()}`;
  let drive = {};

  try {
    drive = AuthorizationHelper.authorizeWithGoogle(request.token);
    await getPdfFiles(drive, fileIds);
    jsonDB = await getJSONFile(drive);
  } catch (e) {
    respondToClientWithError(response);
    LogHelper.LogError(e);
    return;
  }

  if (jsonDB.Updating === true) {
    message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
  } else {
    let files = CompareHelper.CheckForDbUpdates(fileIds, jsonDB);
    newFiles = files[0];
    removedFiles = files[1];
  }

  if (removedFiles.length > 0 || newFiles.length > 0) {
    jsonDB = checkForRemovedFiles(jsonDB, removedFiles);

    if (newFiles.length > 0) {
      jsonDB.Updating = true;
      jsonDB.UpdateFinishTime = getUpdateFinishTime(newFiles.length);
      message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
    }
    await writeToJsonFile(jsonDB, drive);
  }

  respondToClient(response, jsonDB, request, message);
  await updateDBWithNewItems(newFiles, jsonDB, drive);
};

exports.CancelOrShipOrders = async (request, response) => {
  let drive = {};
  let jsonDB = {};
  let newDBState = {};

  try {
    drive = AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await getJSONFile(drive);
    newDBState = UpdateJsonDb(request.Orders, drive);
    MoveFileHelper.MoveFiles(drive, request.Orders, request.Action);
  } catch (e) {
    LogHelper.LogError(e);
    respondToClientWithError(response);
  }

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

const respondToClientWithError = (response) => {
  response.json({
    Orders: [],
    Message: "Sorry, we encountered an error. Please try again.",
  });
};

const respondToClient = (response, jsonDB, request, message) => {
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
};

const checkForRemovedFiles = (jsonDB, removedFiles) => {
  if (removedFiles.length > 0) {
    removedFiles.forEach((removedFile) => {
      jsonDB.Orders = jsonDB.Orders.filter((order) => {
        return order.FileId !== removedFile;
      });
    });
  }

  return jsonDB;
};

const updateDBWithNewItems = async (newFiles, jsonDB, drive) => {
  let newOrders = [];

  try {
    for (let counter = 0; counter < newFiles.length; counter++) {
      let PDFObject = {};
      try {
        await ContentHelper.DownloadFile(drive, newFiles[counter], "photo.pdf");
      }
      catch(e) { console.log(e); continue; }
      PDFObject = await ContentHelper.GetText(newFiles[counter]);
      newOrders.push(PDFObject);
    }
  } catch (e) {
    jsonDB.Updating = false;
    await writeToJsonFile(jsonDB, drive);
    LogHelper.LogError(e);
    console.log(e)
  }

  if (newOrders.length > 0) {
    jsonDB = await getJSONFile(drive);
    jsonDB.Orders.push(...newOrders);
    jsonDB.Updating = false;
    await writeToJsonFile(jsonDB, drive);
  }
};

const getUpdateFinishTime = (numberOfItems) => {
  let date = new Date();
  date.setMinutes(date.getMinutes() + Math.ceil(numberOfItems / 90));
  console.log(date.toLocaleString());
  return date.toLocaleString();
};

const downloadShippedFiles = async (drive, orders) => {
  for (let counter = 0; counter < orders.length; counter++) {
    await ContentHelper.DownloadFile(
      drive,
      orders[counter],
      JSON.parse(fs.readFileSync("botConfigs.json")).DownloadFolderPath
    );
  }
};

const getJSONFile = (drive) => {
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
  return currentDBState;
};

const writeToJsonFile = async (jsonString, drive) => {
  fs.writeFileSync("orders.json", JSON.stringify(jsonString));
  return UploadHelper.UpdateJsonFile(drive);
};

const filterOrders = (request, items) => {
  console.log(request.Filter);
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
  let pageToken = null;
  let fetch = true;

  return new Promise(async (resolve) => {
    while (fetch) {
      await drive.files
        .list({
          q: "'1TYJZ67Ghs0oqsBeBjdBfnmb2S7r8kMOU' in parents and trashed=false",
          fields: "nextPageToken, files(id, name)",
          spaces: "drive",
          pageToken: pageToken,
          pageSize: 1000,
        })
        .then((response) => {
          response.data.files.forEach(function (file) {
            fileIds.push(file.id);
          });
          console.log(response);

          pageToken = response.nextPageToken;

          if (!pageToken) {
            fetch = false;
            resolve("Completed");
          }
        });
    }
  });
};
