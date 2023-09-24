const HttpHelper = require("./HttpHelper");
const LogHelper = require("./LogHelper");
const FileHelper = require("./FileHelper");
const AuthorizationHelper = require("./AuthorizationHelper");

exports.SearchOrders = async (request, response) => {
  let message = "Search results returned successfully!";
  try {
    let googleDrive = await AuthorizationHelper.authorizeWithGoogle(
      request.token,
    );
    let jsonDB = await FileHelper.getJSONFile(googleDrive);

    if (jsonDB.Updating === true) {
      message = `Your search is missing some new orders. It should be updated at approximately ${jsonDB.UpdateFinishTime}.`;
    }

    HttpHelper.respondToClient(
      response,
      jsonDB,
      request,
      message, // TO DO: Get the message from the file helper so you always know when the last time the db was updated
    );
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.CanceledOrders = async (request, response) => {
  try {
    let googleDrive = await AuthorizationHelper.authorizeWithGoogle(
      request.token,
    );
    let jsonDB = await FileHelper.getJSONFile(googleDrive);

    //we need to filter out all saved shipped orders that do not match the new json object design
    let orders = jsonDB.CancelledOrders.filter(
      (order) => order.FileContents !== undefined,
    );

    HttpHelper.respondWithCanceledOrders(
      response,
      orders,
      request,
      "Search results returned successfully!", // TO DO: Get the message from the file helper so you always know when the last time the db was updated
    );
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.ShippedOrders = async (request, response) => {
  try {
    let googleDrive = await AuthorizationHelper.authorizeWithGoogle(
      request.token,
    );
    let jsonDB = await FileHelper.getJSONFile(googleDrive);

    //we need to filter out all saved shipped orders that do not match the new json object design
    let orders = jsonDB.ShippedOrders.filter(
      (order) => order.FileContents !== undefined,
    );

    HttpHelper.respondWithShippedOrders(
      response,
      orders,
      request,
      "Search results returned successfully!", // TO DO: Get the message from the file helper so you always know when the last time the db was updated
    );
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};
