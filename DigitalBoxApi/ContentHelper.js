const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { PdfReader } = require("pdfreader");
const express = require("express");
const AuthorizationHelper = require("./AuthorizationHelper");

exports.GetFileContents = async (token, res) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(token);
  return await getFileContent(drive, res);
};

async function getFileContent(drive, response) {
  let progress = 0;
  let dest = fs.createWriteStream("photo.pdf");

  return drive.files
    .get(
      { fileId: "1Ht0Bbqo_C37xL4KaWB2YebbLwOHCF7i8", alt: "media" },
      { responseType: "stream" }
    )
    .then((res) => {
      res.data
        .on("end", () => {
          console.log("Done downloading file.");
          getText(
            "C:\\Users\\jonat\\Documents\\JSProjects\\DigitalBoxApi\\DigitalBoxApi\\photo.pdf",
            response
          );
        })
        .on("error", (err) => {
          console.error("Error downloading file.");
        })
        .on("data", (d) => {
          progress += d.length;
          if (process.stdout.isTTY) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(`Downloaded ${progress} bytes`);
          }
        })
        .pipe(dest);
    });
}

const getNewPDFItem = () => {
  return {
    Title: "",
    OrderNumber: "",
    Quantity: "",
    ShipDate: "",
  };
};

const IsCharADash = (item) => item && item.R[0].T.toString() === "%C2%AD";
const IsShipDate = (item) =>
  item && item.R[0].T.toString() === "Ship%C2%A0Date";
const shouldIgnore = (item) =>
  (item && item.R[0].T.toString() === "Description%C2%A0") ||
  item.text === "Price" ||
  item.text === "Qty";
const isOrderNumber = (item) =>
  item && item.R[0].T.toString() === "Order%C2%A0%23";
const foundPriceContent = (item) => item && item.text.toString().includes("$");

/*HACK ALERT! I had to leverage a suboptimal api in order to read from a PDF, so this entire function is a hack to get it to do what I need*/
async function getText(pdfUrl, res) {
  let orderNumber = "";
  let shipDate = "";
  let startTitle = false;
  let startOrderNumber = false;
  let previousItem = "";
  let startTitleOnNextIteration = false;
  let itemArray = [];

  let pdfItem = getNewPDFItem();

  new PdfReader().parseFileItems(pdfUrl, (err, item) => {
    if (err) console.error("error:", err);
    else if (!item) {
      console.log(itemArray);
      return res.json(
        JSON.stringify([
          {
            FileId: "Hello World",
            FileContents: itemArray,
            Checked: false,
          },
        ])
      );
    } else if (item.text) {
      //we need this here because each item after the first item starts with the title
      if (startTitleOnNextIteration) {
        startTitleOnNextIteration = false;
        startTitle = true;
      }
      //start title
      else if (previousItem && previousItem.text === "Qty") startTitle = true;
      else if (IsShipDate(previousItem)) {
        //start ship date
        pdfItem.ShipDate = item.text;
      }
      //end title
      else if (foundPriceContent(item)) startTitle = false;
      //get quantity end current item and start a new one incase there are more orders
      else if (foundPriceContent(previousItem)) {
        pdfItem.Quantity = item.text;
        itemArray.push(pdfItem);
        orderNumber = pdfItem.OrderNumber;
        shipDate = pdfItem.ShipDate;
        pdfItem = getNewPDFItem();
        pdfItem.OrderNumber = orderNumber;
        pdfItem.ShipDate = shipDate;
        startTitleOnNextIteration = true;
      }
      //start of the order number
      else if (isOrderNumber(previousItem)) startOrderNumber = true;
      //stop order number
      else if (IsShipDate(item)) startOrderNumber = false;

      if (startTitle) {
        //these are dashes that cannot render, they need to be replaced
        if (IsCharADash(item)) pdfItem.Title += "-";
        //new pages cause issues with the algo, so this is if we encounter a new page and find these value we do nothing
        else if (shouldIgnore(item)) {
        } else pdfItem.Title += item.text;
      } else if (startOrderNumber) {
        //these are dashes that cannot render, they need to be replaced
        if (IsCharADash(item)) pdfItem.OrderNumber += "-";
        else pdfItem.OrderNumber += item.text;
      }
      previousItem = item;
    }
  });
}
