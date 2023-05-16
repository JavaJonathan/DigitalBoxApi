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

exports.JsonFileId = "1tboD-ZunulU7AiPksoFSXHWIEljey11I";

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

    respondToClient(response, jsonDB, request, message);
  } catch (error) {
    respondToClientWithError(response, error);
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
    googleDrive = AuthorizationHelper.authorizeWithGoogle(request.token);
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
        Token: AuthorizationHelper.authToken
      });

      return;
    }

    newDBState = removeOrdersFromDB(
      jsonDB,
      request.Orders,
      googleDrive,
      request.Action
    );
    MoveFileHelper.MoveFiles(googleDrive, request.Orders, request.Action);

    if (request.Action === "ship") {
      await downloadShippedFiles(googleDrive, request.Orders);
      respondToClient(
        response,
        newDBState,
        request,
        `${request.Orders.length} order(s) shipped successfully`
      );
    } else if (request.Action === "cancel") {
      BackupHelper.BackupDatabase(googleDrive);
      respondToClient(
        response,
        newDBState,
        request,
        `${request.Orders.length} order(s) cancelled successfully`
      );
    }
  } catch (error) {
    LogHelper.LogError(error);
    respondToClientWithError(response, error);
    return;
  }
};

const respondToClientWithError = (response, error) => {
  console.log(error);

  if (error.response) {
    let errorCode = error.response.status;
    let errorText = error.response.statusText;

    if (errorCode === 401) {
      response.json({
        Orders: [],
        Message: "You have been logged out, please log in again and retry.",
        Token: AuthorizationHelper.authToken
      });
    } else if (errorText === "Forbidden" && errorCode === 403) {
      response.json({
        Orders: [],
        Message: "You have been logged out, please log in again and retry.",
        Token: AuthorizationHelper.authToken
      });
    } else if (errorCode === 403) {
      response.json({
        Orders: [],
        Message: "You have been rate limited, please wait a moment then retry.",
        Token: AuthorizationHelper.authToken
      });
    } else {
      console.log(`Error Code: ${error.response}`);
      response.json({
        Orders: [],
        Message: "Sorry, we encountered an error. Please try again.",
        Token: AuthorizationHelper.authToken
      });
    }
  } else if (
    `${error}` === "Error: No access, refresh token or API key is set."
  ) {
    response.json({
      Orders: [],
      Message: "You have been logged out, please log in again and retry.",
      Token: AuthorizationHelper.authToken
    });
  } else {
    console.log(`Error Code: ${error}`);
    response.json({
      Orders: [],
      Message: "Sorry, we encountered an error. Please try again.",
      Token: AuthorizationHelper.authToken
    });
  }
};

const markDBAsNotBeingUpdated = async (googleDrive) => {
  let jsonDB = await getJSONFile(googleDrive);
  jsonDB.Updating = false;
  await writeToJsonFile(jsonDB, googleDrive);
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
    Token: AuthorizationHelper.authToken
  });
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

  try {
    for (let counter = 0; counter < newFiles.length; counter++) {
      let PDFObject = {};

      await ContentHelper.DownloadFile(
        googleDrive,
        newFiles[counter],
        "photo.pdf"
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
  } catch (e) {
    jsonDB.Updating = false;
    await writeToJsonFile(jsonDB, googleDrive);
    LogHelper.LogError(e);
    console.log(e);
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
      JSON.parse(fs.readFileSync("botConfigs.json")).DownloadFolderPath
    );
  }
};

const getJSONFile = (googleDrive) => {
  return googleDrive.files
    .get({ fileId: `${exports.JsonFileId}`, alt: "media" })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw error;
    });
};

const removeOrdersFromDB = (currentDBState, orders, googleDrive, action) => {
  let newOrders = currentDBState.Orders.filter((record) => {
    return !orders.includes(record.FileId);
  });

  if (action === "cancel") {
    updateCancelledOrders(currentDBState, orders);
  }
  else if (action === "ship") {
    updateShippedOrders(currentDBState, orders);
  }

  currentDBState.Orders = newOrders;
  writeToJsonFile(currentDBState, googleDrive);
  return currentDBState;
};

const updateCancelledOrders = (currentDBState, orders) => {
  if (!currentDBState.CancelledOrders) {
    currentDBState.CancelledOrders = orders.map((order) => {
      return {
        LinkToFile: `https://drive.google.com/file/d/${order}`,
        CancelledOn: new Date().toLocaleString(),
      };
    });
  } else {
    currentDBState.CancelledOrders.push(
      ...orders.map((order) => {
        return {
          LinkToFile: `https://drive.google.com/file/d/${order}`,
          CancelledOn: new Date().toLocaleString(),
        };
      })
    );
  }

  if (currentDBState.CancelledOrders.length > 100) {
    currentDBState.CancelledOrders = currentDBState.CancelledOrders.sort(
      (a, b) => {
        return Date.parse(b.CancelledOn) - Date.parse(a.CancelledOn);
      }
    ).slice(0, 99);
  }
};

const updateShippedOrders = (currentDBState, orders) => {
  if (!currentDBState.ShippedOrders) {
    currentDBState.ShippedOrders = orders.map((order) => {
      return {
        LinkToFile: `https://drive.google.com/file/d/${order}`,
        ShippedOn: new Date().toLocaleString(),
      };
    });
  } else {
    currentDBState.ShippedOrders.push(
      ...orders.map((order) => {
        return {
          LinkToFile: `https://drive.google.com/file/d/${order}`,
          ShippedOn: new Date().toLocaleString(),
        };
      })
    );
  }

  if (currentDBState.ShippedOrders.length > 100) {
    currentDBState.ShippedOrders = currentDBState.ShippedOrders.sort(
      (a, b) => {
        return Date.parse(b.ShippedOn) - Date.parse(a.ShippedOn);
      }
    ).slice(0, 99);
  }
};


const writeToJsonFile = async (jsonString, googleDrive) => {
  fs.writeFileSync("orders.json", JSON.stringify(jsonString));
  return UploadHelper.UpdateJsonFile(googleDrive);
};

const filterOrders = (request, items) => {
  if (!request.Filter || request.Filter === "") return items;

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

const getPdfFiles = async (googleDrive, fileIds) => {
  let pageToken = null;
  let fetch = true;

  return new Promise(async (resolve, reject) => {
    while (fetch) {
      await googleDrive.files
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
