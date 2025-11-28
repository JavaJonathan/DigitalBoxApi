const AuthorizationHelper = require('./AuthorizationHelper');
const FileHelper = require('./FileHelper');
const HttpHelper = require('./HttpHelper');
const LogHelper = require('./LogHelper');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { Worker } = require('worker_threads');
const { UndoShip, UndoCancel } = require('./MoveFileHelper');
const worker = new Worker(path.resolve(__dirname, './InventoryCheckWorker.js'));

exports.undoShippedOrder = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    let order = jsonDB.ShippedOrders.find(order => order.FileId === request.FileId);

    let transformedOrder = {
      FileId: order.FileId,
      FileContents: order.FileContents,
      Checked: false
    };

    jsonDB = await FileHelper.getJSONFile(googleDrive);
    jsonDB.Orders.push(transformedOrder);
    jsonDB.ShippedOrders = jsonDB.ShippedOrders.filter(order => order.FileId !== request.FileId);

    await FileHelper.writeToJsonFile(jsonDB, googleDrive);
    await UndoShip(googleDrive, [order.FileId]);

    //we need to filter out all saved shipped orders that do not match the new json object design
    let orders = jsonDB.ShippedOrders.filter(order => order.FileContents !== undefined);

    HttpHelper.respondWithShippedOrders(response, orders, request, 'Undo successful.');
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.undoCanceledOrder = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    let order = jsonDB.CancelledOrders.find(order => order.FileId === request.FileId);

    console.log(jsonDB.Orders[0]);

    console.log(order);

    let transformedOrder = {
      FileId: order.FileId,
      FileContents: order.FileContents,
      Checked: false
    };

    console.log(transformedOrder);

    jsonDB = await FileHelper.getJSONFile(googleDrive);
    jsonDB.Orders.push(transformedOrder);
    jsonDB.CancelledOrders = jsonDB.CancelledOrders.filter(
      order => order.FileId !== request.FileId
    );

    await UndoCancel(googleDrive, [order.FileId]);
    await FileHelper.writeToJsonFile(jsonDB, googleDrive);

    //we need to filter out all saved shipped orders that do not match the new json object design
    let orders = jsonDB.CancelledOrders.filter(order => order.FileContents !== undefined);

    HttpHelper.respondWithCanceledOrders(response, orders, request, 'Undo successful.');
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.toggleOrderPriority = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    let order = jsonDB.Orders.find(order => order.FileId === request.FileId);

    if (!order) {
      HttpHelper.respondToClientWithError(response, 'Unable to set order as priority.');
      return;
    }

    order.priority = !order.priority ? true : false;

    await FileHelper.writeToJsonFile(jsonDB, googleDrive);
    HttpHelper.respondToClient(response, jsonDB, request, 'Priority saved successfully.');
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
    let order = jsonDB.Orders.find(order => order.FileId === request.FileId);

    if (!order) {
      HttpHelper.respondToClientWithError(response, 'Unable to add note to order.');
      return;
    }

    order.note = request.note;

    await FileHelper.writeToJsonFile(jsonDB, googleDrive);
    HttpHelper.respondToClient(response, jsonDB, request, 'Note saved successfully.');
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.generateReport = async (request, response) => {
  let googleDrive = {};
  let jsonDB = {};

  let token = JSON.parse(request.body.token);

  try {
    googleDrive = await AuthorizationHelper.authorizeWithGoogle(token);
    jsonDB = await FileHelper.getJSONFile(googleDrive);
    let data = await readCsv(request.file.path);

    fs.rmSync(path.join(__dirname, '/reports'), { recursive: true, force: true });

    worker.postMessage({
      lineItems: data,
      orders: jsonDB.Orders
    });

    HttpHelper.respondToClient(
      response,
      jsonDB,
      request,
      'Generating report.. Once completed, you can refresh the page and click the Paper Icon to download.'
    );
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

worker.on('message', function (message) {
  const { results } = message;
  saveReport(results);
  console.log('Report Generated successfully!');
});

worker.on('error', function (error) {
  console.error('Error generating report: ', error);
});

const readCsv = filePath => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const saveReport = reportList => {
  const filePath = path.join(__dirname, '/reports');

  let csvContent = 'title\n';
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

  fs.writeFileSync(
    path.join(filePath, `DigitalBoxReport${month}-${day}-${year}.csv`),
    BOM + csvContent,
    'utf8'
  );
};
