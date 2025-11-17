const AuthorizationHelper = require("./AuthorizationHelper");
const FileHelper = require("./FileHelper");
const HttpHelper = require("./HttpHelper");
const LogHelper = require("./LogHelper");
const fs = require('fs');
const csv = require('csv-parser');

exports.toggleOrderPriority = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    let order = jsonDB.Orders.find((order) => order.FileId === request.FileId);

    if(!order) {      
      HttpHelper.respondToClientWithError(response, "Unable to set order as priority.");
      return;
    }

    order.priority = !order.priority ? true : false
    
    await FileHelper.writeToJsonFile(jsonDB, googleDrive);
    HttpHelper.respondToClient(response, jsonDB, request, "Priority saved successfully.");
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.addNote = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    let order = jsonDB.Orders.find((order) => order.FileId === request.FileId);

    if(!order) {      
      HttpHelper.respondToClientWithError(response, "Unable to add note to order.");
      return;
    }

    order.note = request.note;
    
    await FileHelper.writeToJsonFile(jsonDB, googleDrive);
    HttpHelper.respondToClient(response, jsonDB, request, "Priority saved successfully.");
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
}

exports.generateReport = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  let token = JSON.parse(request.body.token)

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    readCsv(request.file.path).then(data => {
      console.log(data);
    });
    HttpHelper.respondToClient(response, jsonDB, request, "Priority saved successfully.");
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
}

const readCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
    
    console.log(results);
  });
}
