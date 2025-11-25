const AuthorizationHelper = require("./AuthorizationHelper");
const FileHelper = require("./FileHelper");
const HttpHelper = require("./HttpHelper");
const LogHelper = require("./LogHelper");
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { Worker } = require('worker_threads');
const worker = new Worker(path.resolve(__dirname, './InventoryCheckWorker.js'));

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
    HttpHelper.respondToClient(response, jsonDB, request, "Note saved successfully.");
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
    let data = await readCsv(request.file.path);

    fs.rmSync(path.join(__dirname, '/reports'), { recursive: true, force: true });
    
    worker.postMessage({
      lineItems: data,
      orders: jsonDB.Orders
    });

    HttpHelper.respondToClient(response, jsonDB, request, "Generating report.. Once completed, you can refresh the page and click the Paper Icon to download.");
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
}

worker.on("message", function (message) {
  const { results } = message;
  saveReport(results);
  console.log("Report Generated successfully!");
});

worker.on('error', function (error) {
  console.error("Error generating report: ", error);
});

const readCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);    
  });
}

const saveReport = (reportList) => {
  const filePath = path.join(__dirname, '/reports')

  let csvContent = "title\n";
  for (const item of reportList) {
    csvContent += `"${item}"\n`;
  }

  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }

  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const BOM = '\uFEFF';

  fs.writeFileSync(path.join(filePath, `DigitalBoxReport${month}-${day}-${year}.csv`), BOM + csvContent, 'utf8');
}