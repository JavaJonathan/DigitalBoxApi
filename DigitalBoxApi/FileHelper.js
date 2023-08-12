const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");
const LogHelper = require("./LogHelper");
const fs = require("fs");
const CompareHelper = require("./CompareHelper");
const ContentHelper = require("./ContentHelper");
const UploadHelper = require("./UploadHelper");
const MoveFileHelper = require("./MoveFileHelper");
const BackupHelper = require("./BackupHelper");
const HttpHelper = require("./HttpHelper");

exports.JsonFileId = "1Es2hHSXsd2ZGL6pnPKKFohUgYTj_4AeZ";

exports.GetOrdersFromFile = async (request, response) => {
  let fileIds = [];
  let jsonDB = {};
  let newFiles = [];
  let removedFiles = [];
  let message = `Your search results are up to date as of ${new Date().toLocaleString()}`;
  let googleDrive = {};
  let currentUserTriggeredDBUpdate = false;

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    await getPdfFiles(googleDrive, fileIds);
    jsonDB = await getJSONFile(googleDrive);

    if (jsonDB.Updating === true) {
      message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
    } else {
      //there's a bug in the checkForUpdates func
      // We are checking if there has been a file manually removed from the to be shipped folder
      //but I think that may be conflicting with the ship functionality
      //that moves the files, downloads them, then updates the db
      //we can maybe solve this by implementing an isShippingFlag in the db to know whether a file is missing to due someone shipping
      //or due to a manual removal
      //This will also solve the issue where they are seeing the db has been updated message when nothing was updated
      //Root Cause: in addition to the explanation above, once the db is prematurely updated, someone else searches and now the db
      //and now the db sees there is a file missing causing the shipped message to pop up
      //TO DO:
      //We need a reliable way to fallback if any of our boolean value get stuck in a certain value
      //we can also speed up search by giving them results from the client side then in the background checking if their results are out of date
      //ship and cancel will be disabled until results are confirmed to be up to date
      let files = CompareHelper.CheckForDbUpdates(fileIds, jsonDB);
      newFiles = files[0];
      removedFiles = files[1];
    }

    if (removedFiles.length > 0 || newFiles.length > 0) {
      jsonDB = removeFilesFromDB(jsonDB, removedFiles);

      if (newFiles.length > 0) {
        jsonDB.Updating = true;
        currentUserTriggeredDBUpdate = true;
        jsonDB.UpdateFinishTime = getUpdateFinishTime(newFiles.length);
        message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
      }
      await writeToJsonFile(jsonDB, googleDrive);
      updateDBWithNewItems(newFiles, jsonDB, googleDrive);
    }

    HttpHelper.respondToClient(response, jsonDB, request, message);
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);

    if (currentUserTriggeredDBUpdate) markDBAsNotBeingUpdated(googleDrive);

    return;
  }
};

exports.CancelOrShipOrders = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};
  let newDBState = {};
  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await getJSONFile(googleDrive);

    //we need to ensure the files hasn't already been moved causing further issues
    let allFilesExist = CompareHelper.EnsureFilesExist(request.Orders, jsonDB);

    if (!allFilesExist) {
      response.json({
        Message: `Some of your orders have already been shipped or cancelled.`,
        Orders: jsonDB.Orders.sort((a, b) => {
          return (
            Date.parse(a.FileContents[0].ShipDate) -
            Date.parse(b.FileContents[0].ShipDate)
          );
        }),
        Token: AuthorizationHelper.authToken,
      });

      return;
    }

    newDBState = removeOrdersFromDB(
      jsonDB,
      request.Orders,
      googleDrive,
      request.Action,
    );
    MoveFileHelper.MoveFiles(googleDrive, request.Orders, request.Action);

    if (request.Action === "ship") {
      await downloadShippedFiles(googleDrive, request.Orders);
      HttpHelper.respondToClient(
        response,
        newDBState,
        request,
        `${request.Orders.length} order(s) shipped successfully`,
      );
    } else if (request.Action === "cancel") {
      BackupHelper.BackupDatabase(googleDrive);
      HttpHelper.respondToClient(
        response,
        newDBState,
        request,
        `${request.Orders.length} order(s) cancelled successfully`,
      );
    }
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
    return;
  }
};

const getJSONFile = exports.getJSONFile = async (googleDrive) => {
  return googleDrive.files
    .get({ fileId: `${exports.JsonFileId}`, alt: "media" })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw error;
    });
};

const markDBAsNotBeingUpdated = async (googleDrive) => {
  let jsonDB = await getJSONFile(googleDrive);
  jsonDB.Updating = false;
  await writeToJsonFile(jsonDB, googleDrive);
};

const removeFilesFromDB = (jsonDB, removedFiles) => {
  if (removedFiles.length > 0) {
    removedFiles.forEach((removedFile) => {
      jsonDB.Orders = jsonDB.Orders.filter((order) => {
        return order.FileId !== removedFile;
      });
    });
  }

  return jsonDB;
};

const updateDBWithNewItems = async (newFiles, jsonDB, googleDrive) => {
  let newOrders = [];
  for (let counter = 0; counter < newFiles.length; counter++) {
    let PDFObject = {};

    await ContentHelper.DownloadFile(
      googleDrive,
      newFiles[counter],
      "photo.pdf",
    );
    PDFObject = await ContentHelper.GetText(newFiles[counter]);
    newOrders.push(PDFObject);
  }

  if (newOrders.length > 0) {
    jsonDB = await getJSONFile(googleDrive);
    jsonDB.Orders.push(...newOrders);
    jsonDB.Updating = false;
    await writeToJsonFile(jsonDB, googleDrive);
  }
};

const getUpdateFinishTime = (numberOfItems) => {
  let date = new Date();
  date.setMinutes(date.getMinutes() + Math.ceil(numberOfItems / 90));
  return date.toLocaleString();
};

const downloadShippedFiles = async (googleDrive, orders) => {
  for (let counter = 0; counter < orders.length; counter++) {
    await ContentHelper.DownloadFile(
      googleDrive,
      orders[counter],
      JSON.parse(fs.readFileSync("botConfigs.json")).DownloadFolderPath,
    );
  }
};

const removeOrdersFromDB = (currentDBState, orders, googleDrive, action) => {
  let newOrders = currentDBState.Orders.filter((record) => {
    return !orders.includes(record.FileId);
  });

  let removedOrders = currentDBState.Orders.filter((record) => {
    return orders.includes(record.FileId);
  });

  if (action === "cancel") {
    updateCancelledOrders(currentDBState, removedOrders);
  } else if (action === "ship") {
    updateShippedOrders(currentDBState, removedOrders);
  }

  currentDBState.Orders = newOrders;
  writeToJsonFile(currentDBState, googleDrive);
  return currentDBState;
};

const updateCancelledOrders = (currentDBState, orders) => {
  orders = orders.map(order => {
    return  { ...order, canceledOn: new Date().toLocaleString() }
  })

  if (!currentDBState.CancelledOrders) {
    currentDBState.CancelledOrders = [...orders]
  } else {
    currentDBState.CancelledOrders.push(
      orders
    );
  }
};

const updateShippedOrders = (currentDBState, orders) => {
  orders = orders.map(order => {
    return  { ...order, shippedOn: new Date().toLocaleString() }
  })

  if (!currentDBState.ShippedOrders) {
    currentDBState.ShippedOrders = [...orders]
  } else {
    currentDBState.ShippedOrders.push(
      ...orders
    );
  }
};

const writeToJsonFile = async (jsonString, googleDrive) => {
  fs.writeFileSync("orders.json", JSON.stringify(jsonString));
  return UploadHelper.UpdateJsonFile(googleDrive);
};

const getPdfFiles = async (googleDrive, fileIds) => {
  let pageToken = null;
  let fetch = true;

  return new Promise(async (resolve, reject) => {
    while (fetch) {
      await googleDrive.files
        .list({
          q: "'1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z' in parents and trashed=false",
          fields: "nextPageToken, files(id)",
          spaces: "drive",
          pageToken: pageToken,
          pageSize: 1000,
        })
        .then((response) => {
          response.data.files.forEach(function (file) {
            fileIds.push(file.id);
          });
          pageToken = response.data.nextPageToken;

          if (!pageToken) {
            fetch = false;
            resolve("Completed");
          }
        })
        .catch((error) => {
          console.log(error);
          fetch = false;
          reject(error);
        });
    }
  });
};
