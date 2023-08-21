const HttpHelper = require("./HttpHelper");
const LogHelper = require("./LogHelper");
const FileHelper = require("./FileHelper");
const AuthorizationHelper = require("./AuthorizationHelper");

exports.SearchOrders = async (request, response) => {
  try {
    let googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    let jsonDB = await FileHelper.getJSONFile(googleDrive);
    HttpHelper.respondToClient(
      response,
      jsonDB,
      request,
      "Search results returned successfully!", // TO DO: Get the message from the file helper so you always know when the last time the db was updated
    );
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};

exports.CanceledOrders = async (request, response) => {
    try {
        let googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
        let jsonDB = await FileHelper.getJSONFile(googleDrive);

        console.log(jsonDB)

        //we need to filter out all saved shipped orders that do not match the new json object design
        let orders = jsonDB.CancelledOrders.filter(order => order.FileContents !== undefined)

        HttpHelper.respondWithCanceledOrShippedOrders(
          response,
          orders,
          request,
          "Search results returned successfully!", // TO DO: Get the message from the file helper so you always know when the last time the db was updated
        );
      } catch (error) {
        HttpHelper.respondToClientWithError(response, error);
        LogHelper.LogError(error);
      }
}

exports.ShippedOrders = async (request, response) => {
    try {
        let googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
        let jsonDB = await FileHelper.getJSONFile(googleDrive);

        //we need to filter out all saved shipped orders that do not match the new json object design
        let orders = jsonDB.ShippedOrders.filter(order => order.FileContents !== undefined)

        console.log(orders);

        HttpHelper.respondWithCanceledOrShippedOrders(
          response,
          orders,
          request,
          "Search results returned successfully!", // TO DO: Get the message from the file helper so you always know when the last time the db was updated
        );
      } catch (error) {
        HttpHelper.respondToClientWithError(response, error);
        LogHelper.LogError(error);
      }
}
