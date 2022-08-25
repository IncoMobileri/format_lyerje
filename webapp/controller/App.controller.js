sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    "sap/ui/unified/DateTypeRange",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, DateTypeRange, Filter, FilterOperator, MessageBox, MessageToast) {
        "use strict";

        return Controller.extend("npmlyerje.formularlyerje.controller.App", {
            onInit: function () {

                //Table for  header creation
                var headerData = {
                    'date': "",
                    'fullname': "",
                    'difference': "",
                    'uom': "",
                    'all': "",
                    'surface': "",
                    'side': "",
                    'total': ""
                };

                //Table for   items creation
                var itemData = [{
                    'number': "1",
                    'height': "",
                    'width': "",
                    'X': "X",
                    '=': "=",
                    'pieces': "",
                    'surface': "",
                    'side': ""
                }];

                //original items before difference
                this.itemOriginal = [];

                // Initialize an object that we will use to store all the information for our application
                var oAllData = {
                    headerData: headerData,
                    itemData: itemData,
                    clientsData: []
                };

                // Create and set the created object to the the documents Model
                var documentsModel = new JSONModel(oAllData);
                this.getView().setModel(documentsModel);

                // Get single set of documents to create user 
                this.getSavedOrders(documentsModel);
            },

            getSavedOrders: function (iModel) {
                const firestore = this.getView().getModel("firebase").getData().firestore;
                const collRefDocuments = firestore.collection("Lyerjet");
                collRefDocuments.get().then(
                    function (collection) {
                        var oClients = collection.docs.map(function (clients) {
                            return clients.data();
                        });
                        iModel.setProperty("/clientsData", oClients);//Change the model

                    });
            },

            //get already saved order from client name
            onGetSavedOrder: function (oEvent) {
                var oValue = oEvent.getParameters().selectedItem.getText();//get fullname
                var allDataModel = this.getView().getModel();//our main model
                const firestore = this.getView().getModel("firebase").getData().firestore;
                const headerLyerjet = firestore.collection("Lyerjet").where("headerId", "==", oValue);//condition to take header id

                headerLyerjet.get().then(//get header data
                    function (collection) {
                        var oHeader = collection.docs.map(function (header) {
                            return header.data();
                        });
                        var oHeaderExtend = $.extend([], oHeader);//create header extention
                        allDataModel.setProperty("/headerData", oHeaderExtend[0]);//Change the model

                        const itemsLyerjet = firestore.collection("LyerjetItems").where("headerId", "==", oValue);//condition to take items header id
                        itemsLyerjet.get().then(//get item data
                            function (collectionItem) {
                                var oItems = collectionItem.docs.map(function (items) {
                                    return items.data();
                                });
                                var oItemsExtend = $.extend([], oItems);//create header extention
                                allDataModel.setProperty("/itemData", oItemsExtend);//Change the model
                            });
                    });

            },

            //event on difference change
            onDiffChange: function (oEvent) {
                var oValue = parseFloat(oEvent.getParameter('value'));//Price value converted to a float value
                var allDataModel = this.getView().getModel();//our main model
                var allData = allDataModel.getData();
                var oCopiedArray;

                //Fill the original items table
                allData.itemData.map((obj, index) => {
                    if (this.itemOriginal.length > 0) {//always push the first item
                        var oFlag = true;//flag to check if it need to add a new item to the original table
                        for (var i = 0; i < this.itemOriginal.length; i++) {
                            if (obj.number === this.itemOriginal[i].number) {
                                oFlag = false;
                            }
                        }
                        if (oFlag) { oCopiedArray = $.extend([], obj); this.itemOriginal.push(oCopiedArray) };//push new object if flag is true
                    } else {
                        oCopiedArray = $.extend([], obj);//create an extension of the original object
                        this.itemOriginal.push(oCopiedArray);
                    }

                });
                // allDataModel.setProperty("/itemOriginal", allData.itemOriginal);//set original model

                //always apply the difference change to the original table
                this.itemOriginal.map((obj, index) => {
                    var oOriginalCopy = $.extend([], obj);

                    oOriginalCopy.height = parseFloat(oOriginalCopy.height) + oValue;
                    oOriginalCopy.width = parseFloat(oOriginalCopy.width) + oValue;
                    oOriginalCopy.surface = this.calculateSurface(oOriginalCopy.height, oOriginalCopy.width, parseInt(oOriginalCopy.pieces));
                    oOriginalCopy.side = this.calculateSide(oOriginalCopy.height, oOriginalCopy.width, parseInt(oOriginalCopy.pieces))

                    this.calculateSurfaceSum(oOriginalCopy, oOriginalCopy.surface);//calculate the sum of surface
                    this.calculateSideSum(oOriginalCopy, oOriginalCopy.side);//calculate the sum of sides

                    //modify the item data array to display the new data
                    for (var j = 0; j < allData.itemData.length; j++) {
                        if (index === j) {
                            allData.itemData[j].height = oOriginalCopy.height;
                            allData.itemData[j].width = oOriginalCopy.width;
                            allData.itemData[j].surface = oOriginalCopy.surface;
                            allData.itemData[j].side = oOriginalCopy.side;
                        }
                    }
                });

                var oSide = allDataModel.getProperty("/headerData/side");//get the side total
                var oSurface = allDataModel.getProperty("/headerData/surface");//get the surface total
                this.calculateTotal(oSurface, oSide);//Calculate total of side total and surface total

                allDataModel.setProperty("/itemData", allData.itemData);//Change the model

            },

            //on height change event
            onHeightChange: function (oEvent) {
                var oSelectedItem = oEvent.getSource().getBindingContext().getObject();//Get the record we are modifying
                var oBinding = this.byId("itemTable").getBinding("items");//Get binding of table
                var oHeight = oEvent.getParameter('value');//Price value
                var aContext = oBinding.getContexts();//get context
                var oContext = aContext[oSelectedItem.number - 1];
                var oBindingPath = oContext.getPath();//Get the path wee need to change
                var allDataModel = this.getView().getModel();//our main model

                var oSurface = this.calculateSurface(oHeight, oSelectedItem.width, oSelectedItem.pieces)
                allDataModel.setProperty(oBindingPath + "/surface", oSurface);//Change the model
                this.calculateSurfaceSum(oSelectedItem, oSurface);//calculate the sum of surface

                var oSide = this.calculateSide(oHeight, oSelectedItem.width, oSelectedItem.pieces);
                allDataModel.setProperty(oBindingPath + "/side", oSide);//Change the model
                this.calculateSideSum(oSelectedItem, oSide);//calculate the sum of sides

                var oTotalSide = allDataModel.getProperty("/headerData/side");//get the side total
                var oTotalSurface = allDataModel.getProperty("/headerData/surface");//get the surface total
                this.calculateTotal(oTotalSurface, oTotalSide);//Calculate total of side total and surface total
            },

            //on length change event
            onWidthChange: function (oEvent) {
                var oSelectedItem = oEvent.getSource().getBindingContext().getObject();//Get the record we are modifying
                var oBinding = this.byId("itemTable").getBinding("items");//Get binding of table
                var oWidth = oEvent.getParameter('value');//Price value
                var aContext = oBinding.getContexts();//get context
                var oContext = aContext[oSelectedItem.number - 1];
                var oBindingPath = oContext.getPath();//Get the path wee need to change
                var allDataModel = this.getView().getModel();//our main model

                var oSurface = this.calculateSurface(oSelectedItem.height, oWidth, oSelectedItem.pieces);
                allDataModel.setProperty(oBindingPath + "/surface", oSurface);//Change the model
                this.calculateSurfaceSum(oSelectedItem, oSurface);//calculate the sum of surface

                var oSide = this.calculateSide(oSelectedItem.height, oWidth, oSelectedItem.pieces)
                allDataModel.setProperty(oBindingPath + "/side", oSide);//Change the model
                this.calculateSideSum(oSelectedItem, oSide);//calculate the sum of sides

                var oTotalSide = allDataModel.getProperty("/headerData/side");//get the side total
                var oTotalSurface = allDataModel.getProperty("/headerData/surface");//get the surface total
                this.calculateTotal(oTotalSurface, oTotalSide);//Calculate total of side total and surface total
            },

            //on length change event
            onPiecesChange: function (oEvent) {
                var oSelectedItem = oEvent.getSource().getBindingContext().getObject();//Get the record we are modifying
                var oBinding = this.byId("itemTable").getBinding("items");//Get binding of table
                var oPieces = oEvent.getParameter('value');//Price value
                var aContext = oBinding.getContexts();//get context
                var oContext = aContext[oSelectedItem.number - 1];
                var oBindingPath = oContext.getPath();//Get the path wee need to change
                var allDataModel = this.getView().getModel();//our main model

                var oSurface = this.calculateSurface(oSelectedItem.height, oSelectedItem.width, oPieces);
                allDataModel.setProperty(oBindingPath + "/surface", oSurface);//Change the model
                this.calculateSurfaceSum(oSelectedItem, oSurface);//calculate the sum of surface

                var oSide = this.calculateSide(oSelectedItem.height, oSelectedItem.width, oPieces);
                allDataModel.setProperty(oBindingPath + "/side", oSide);//Change the model
                this.calculateSideSum(oSelectedItem, oSide);//calculate the sum of sides

                this.calculatePiecesSum(oSelectedItem, oPieces);//Calculate sum of all pieces

                var oTotalSide = allDataModel.getProperty("/headerData/side");//get the side total
                var oTotalSurface = allDataModel.getProperty("/headerData/surface");//get the surface total
                this.calculateTotal(oTotalSurface, oTotalSide);//Calculate total of side total and surface total
            },

            //calculate surface value
            calculateSurface: function (iHeight, iWidth, iPieces) {
                return (iHeight * iWidth * iPieces / 10000).toFixed(1);
            },

            // calculate surface value
            calculateSide: function (iHeight, iWidth, iPieces) {
                return ((((iHeight * 2) + (iWidth * 2)) * 0.18 / 1000) * iPieces).toFixed(1);
            },

            // calculate  sum of pieces
            calculatePiecesSum: function (iSelectedItem, iPieces) {
                var allDataModel = this.getView().getModel();//our main model
                var allData = allDataModel.getData();
                var oTotal = 0;

                //Calculate the total amount of items , except the one we are calculating, and the amount is valorized
                for (var i = 0; i < allData.itemData.length; i++) {
                    if (iSelectedItem.number != allData.itemData[i].number && allData.itemData[i].pieces) {
                        oTotal = oTotal + parseInt(allData.itemData[i].pieces);
                    }
                }

                //add the value we are calculating
                if (iPieces) { oTotal = oTotal + parseInt(iPieces); }
                allDataModel.setProperty("/headerData/all", oTotal);//Change the model
            },

            // calculate  sum of surface
            calculateSurfaceSum: function (iSelectedItem, iSurface) {
                var allDataModel = this.getView().getModel();//our main model
                var allData = allDataModel.getData();
                var oTotal = 0;

                //Calculate the total amount of items , except the one we are calculating, and the amount is valorized
                for (var i = 0; i < allData.itemData.length; i++) {
                    if (iSelectedItem.number != allData.itemData[i].number && allData.itemData[i].surface) {
                        oTotal = oTotal + parseFloat(allData.itemData[i].surface);
                    }
                }

                //add the value we are calculating
                if (iSurface) { oTotal = oTotal + parseFloat(iSurface); }
                allDataModel.setProperty("/headerData/surface", oTotal.toFixed(1));//Change the model
            },


            // calculate  sum of side
            calculateSideSum: function (iSelectedItem, iSide) {
                var allDataModel = this.getView().getModel();//our main model
                var allData = allDataModel.getData();
                var oTotal = 0;

                //Calculate the total amount of items , except the one we are calculating, and the amount is valorized
                for (var i = 0; i < allData.itemData.length; i++) {
                    if (iSelectedItem.number != allData.itemData[i].number && allData.itemData[i].side) {
                        oTotal = oTotal + parseFloat(allData.itemData[i].side);
                    }
                }

                //add the value we are calculating
                if (iSide) { oTotal = oTotal + parseFloat(iSide); }
                allDataModel.setProperty("/headerData/side", oTotal.toFixed(1));//Change the model
            },

            // calculate  sum of side
            calculateTotal: function (iSurface, iSide) {
                var allDataModel = this.getView().getModel();//our main model
                var allData = allDataModel.getData();
                var oTotal = parseFloat(iSurface) + parseFloat(iSide);
                if (oTotal) { allDataModel.setProperty("/headerData/total", oTotal.toFixed(1)); }//Change the model}
            },

            //We add a new item 
            onAddItem: function () {
                var allDataModel = this.getView().getModel();
                var allData = allDataModel.getData();
                var oNumber = allData.itemData.length + 1;
                allData.itemData.push({
                    'number': oNumber.toString(),//always keep the values to a string format
                    'height': "",
                    'width': "",
                    'X': "X",
                    '=': "=",
                    'pieces': "",
                    'surface': "",
                    'side': ""
                })
                allDataModel.setProperty("/itemData", allData.itemData);//Change the model
            },

            //Delete item from purchase Order 
            onDeleteItem: function (oEvent) {
                var oSelectedItem = oEvent.getSource().getBindingContext().getObject();//Get the record we are deleting
                var allDataModel = this.getView().getModel();
                var allData = allDataModel.getData();
                allData.itemData.splice((oSelectedItem.number - 1), 1);//remove the item we selected
                this.itemOriginal.splice((oSelectedItem.number - 1), 1);//remove the item we selected

                //set new index and recalculate everything
                if (allData.itemData.length > 0) {
                    for (var i = 0; i < allData.itemData.length; i++) {//set the new indexes
                        var oNumber = i + 1;
                        allData.itemData[i].number = oNumber.toString();//always keep numbers as string

                        this.calculateSurfaceSum(allData.itemData[i], allData.itemData[i].surface);//calculate the sum of surface
                        this.calculateSideSum(allData.itemData[i], allData.itemData[i].side);//calculate the sum of sides
                    }
                    allDataModel.setProperty("/itemData", allData.itemData);//Change the model

                    var oTotalSide = allDataModel.getProperty("/headerData/side");//get the side total
                    var oTotalSurface = allDataModel.getProperty("/headerData/surface");//get the surface total
                    this.calculateTotal(oTotalSurface, oTotalSide);//Calculate total of side total and surface total

                    //set new index on original table
                    if (this.itemOriginal.length > 0) {
                        for (var i = 0; i < this.itemOriginal.length; i++) {//set the new indexes
                            var oNumber = i + 1;
                            this.itemOriginal[i].number = oNumber.toString();//always keep numbers as string
                        }
                    }

                }
            },

            //save the document
            onSaveButtonPressed: function (oEvent) {
                var allDataModel = this.getView().getModel();
                var allData = allDataModel.getData();
                const firestore = this.getView().getModel("firebase").getData().firestore;
                var that = this;
                const checkLyerjetRef = firestore.collection("Lyerjet").where("fullname", "==", allData.headerData.fullname);//condition to check if a client order already exist

                //check if name field is valorized
                if (!allData.headerData.fullname) { MessageBox.error("Ju lutem vendosni emrin e klientit"); return; }

                checkLyerjetRef.get().then(function (checkClient) {
                    if (!checkClient.docs.length) {//if it does not find the same user

                        //Create header for new record
                        const docCreateHeader = firestore.collection("Lyerjet").doc();
                        allData.headerData.headerId = allData.headerData.fullname;//insert header Id same as fullname
                        docCreateHeader.set(allData.headerData).then(function () {
                            //when the header is inserted correctly, proccedd with the items creation inside of the loop
                            allData.itemData.map((obj) => {
                                obj.headerId = allData.headerData.fullname;//give the header id of the item the same value of the document path used in the header as a foreign key
                                firestore.collection("LyerjetItems").doc().set(obj); //insert items
                            });

                            //delete all the information saved previously and show success message
                            that.clearModel();//clear tables for fresh start
                            MessageBox.success("Lyerja u ruajt me sukses!");

                        }).catch(function (error) {
                            MessageBox.error("Ka ndodhur nje gabim, rekordi nuk eshte ruajtur, ju lutem rifreskoni faqen edhe provojeni perseri!");
                        });

                    } else { //show error message that a user is already saved
                        MessageBox.error("Ekziston nje lyerje me kete emer, ju lutem ndryshoni emrin")
                    }
                });

            },

            clearModel: function () {//clear the model for fresh start
                var allDataModel = this.getView().getModel();
                //Table forheader creation
                var headerData = {
                    'date': "",
                    'fullname': "",
                    'difference': "",
                    'uom': "",
                    'all': "",
                    'surface': "",
                    'side': "",
                    'total': ""
                };

                //Table for items creation
                var itemData = [{
                    'number': "1",
                    'height': "",
                    'width': "",
                    'X': "X",
                    '=': "=",
                    'pieces': "",
                    'surface': "",
                    'side': ""
                }];

                //original items before difference
                this.itemOriginal = [];

                allDataModel.setProperty("/headerData", headerData);//Change the model for header
                allDataModel.setProperty("/itemData", itemData);//Change the model for item
            },

            //print the document
            onPrintButtonPressed: function (oEvent) {
                var allDataModel = this.getView().getModel();
                var allData = allDataModel.getData();
                var oStarter = 0;
                var oBreak = 0;
                var oPrint = ""
                var oTabInit = "<br><body>" +
                    "<div style='box-sizing: content-box; width: 1000px; height: 100%; border: 0px solid black;' class='table-responsive'><img src='/logo/IncoLogo.jpg' alt='Icon' width='120' height='120'>  ";

                var oHeader =
                    "<table class='table' width='1000px' style=''>" +
                    "<tr align='center' >" +
                    "<td style='box-sizing: content-box;font-size: 20px;border: 0px solid black;font-family: calibri;width: 45%;' align='left'><b>Emer/Mbiemer</b>" + ": " + allData.headerData.fullname +
                    "</td>" +
                    "<td style='box-sizing: content-box;font-size: 25px;border: 0px solid black;font-family: calibri;width: 40%;' align='left'><b>Formular Lyerje</b>" +
                    "</td>" +
                    "<td  style='box-sizing: content-box;font-size: 20px;border: 0px solid black;font-family: calibri;width: 10%;' align='left'><b>Data</b>" + ": " + allData.headerData.date +
                    "</td>" +
                    "</tr>" +
                    "</table>" +
                    "<hr>" +
                    "<div>" +
                    "<table class='table' width='1000px' style=''>" +
                    "<tr align='center' >" +
                    "<td style='box-sizing: content-box;font-size: 20px;border: 0px solid black;font-family: calibri;width: 40%;' align='left'><b>Siperfaqe</b>" + ": " + allData.headerData.surface +
                    "</td>" +
                    "<td style='box-sizing: content-box;font-size: 20px;border: 0px solid black;font-family: calibri;width: 35%;' align='left'><b>Gjithsej</b>" + ": " + allData.headerData.all +
                    "</td>" +
                    "</tr>" +
                    "</table>" +
                    "</div>" +
                    "<div class='table-responsive'><table class='table' width='1000px' style=''>" +
                    "<tr align='left' >" +
                    "<td style='font-size: 20px;font-family: calibri;box-sizing: content-box;border: 0px solid black;width: 40%;' align='left'><b>Anesore" + "</b>: " + allData.headerData.side +
                    "</td>" +
                    "<td style='box-sizing: content-box;font-size: 20px;border: 0px solid black;font-family: calibri;width: 35%;' align='left'><b>Shtese/Zbritje</b>" + ": " + allData.headerData.difference +
                    "</td>" +
                    "</tr>" +
                    "</table>" +
                    "</div>" +
                    "<div class='table-responsive'><table class='table' width='1000px' style=''><tr  align='left' >" +
                    "<td style='font-size: 20px;font-family: calibri;box-sizing: content-box;border: 0px solid black;width: 40%;' align='left'>" + "<b>Totali</b>" + ": " + allData.headerData.total +
                    "</td>" +
                    "</table>" +
                    "</div>" +
                    "<div class='table-responsive'><table class='table' width='1000px' style=''>" +
                    "</table>" +
                    "</div>" +
                    "<hr>";


                var oCounter = 0;
                if (allData.itemData.length > 35) {
                    var oMod = allData.itemData.length % 35;
                    if (oMod) {
                        var oRemainder = allData.itemData.length - oMod
                        oCounter = (oRemainder / 35) + 1;
                    } else {
                        oCounter = allData.itemData.length / 35;
                    }
                } else {
                    oCounter = 1;
                }

                for (var n = 0; n < oCounter; n++) {
                    var oItemInit = "<div class='table-responsive' style='height:60%px; width: 500px;'>" +
                        "<table class='table' style='border-collapse: collapse; width: 1000px;'>";
                    var oItemsColumns =
                        "<tr>" +
                        "<th style='text-align: center; border: 0px solid black; font-size: 20px;font-family: calibri;width: 5%;'>Numri</th>" +
                        "<th style='text-align: center; border: 0px solid black; font-size: 20px;font-family: calibri; width: 8%;'>Lartesi</th>" +
                        "<th style='text-align: left; font-size: 20px; font-family: calibri; width: 1%;'> </th>" +//X
                        "<th style='text-align: center;font-size: 20px; border: 0px solid black; font-family: calibri; ;width: 8%;'>Gjatesi</th>" +
                        "<th style='text-align: left;font-size: 20px; font-family: calibri; width: 1%;'> </th>" +//=
                        "<th style='text-align: center; font-size: 20px; border: 0px solid black; font-family: calibri; width: 5%;'>Cope</th>" +
                        "<th style='text-align: center;width:56%; font-size: 20px; border: 0px solid black; font-family: calibri; '>Pershkrim</th>" +
                        "<th style='text-align: center;font-size: 20px; border: 0px solid black;font-family: calibri;width: 8%;'>Siperfaqe</th>" +
                        "<th style='text-align: center;width:8%; font-size: 20px; border: 0px solid black; font-family: calibri; '>Anesore</th>" +
                        "</tr>" +
                        "</table>" +
                        "<hr>";

                    oItemInit = oItemInit + oItemsColumns;
                    if (oCounter > 1) {
                        if (n === 0) { oStarter = 0; } else { oStarter = oStarter + 35 }
                        if (n === oCounter - 1) {
                            oBreak = oStarter + oMod;
                        } else {
                            oBreak = oStarter + 35;
                        }
                    } else {
                        oStarter = 0;
                        oBreak = oStarter + allData.itemData.length;
                    }

                    for (var i = oStarter; i < oBreak; i++) {
                        var oDescription = allData.itemData[i].description ? allData.itemData[i].description : "";//if description is empty show nothing
                        var oItems =
                            "<table class='table' style='border-collapse: collapse; width: 1000px;'>" +
                            "<tr style='height: 30px'>" +
                            "<td style='text-align: center;  border: 0px solid black;font-size: 20px;font-family: calibri; width: 5%;'>" + allData.itemData[i].number + "." +
                            "</td>" +
                            "<td style='text-align: center;width:8%; font-size: 20px; border: 0px solid black; font-family: calibri;'>" + allData.itemData[i].height +
                            "</td>" +
                            "<td style='text-align: left;font-size: 20px;font-family: calibri; width: 1%;'>" + "X" +
                            "</td>" +
                            "<td style='text-align: center ;width:8%; font-size: 20px; border: 0px solid black; font-family: calibri;'>" + allData.itemData[i].width +
                            "</td>" +
                            "<td style='  text-align: left; font-size: 14px;font-family: calibri; width: 1%;'>" + "=" +
                            "</td>" +
                            "<td style='text-align: center;width:5%; font-size: 20px; border: 0px solid black; font-family: calibri;'>" + allData.itemData[i].pieces +
                            "</td>" +
                            "<td style='text-align: left;font-size: 14px; border: 0px solid black; font-family: calibri; width: 56%;'>" + oDescription +
                            "</td>" +
                            "<td style='text-align: center;width:8%; font-size: 20px; border: 0px solid black; font-family: calibri;'>" + allData.itemData[i].surface +
                            "</td>" +
                            "<td style='text-align: center;width:8%; font-size: 20px; border: 0px solid black; font-family: calibri;'>" + allData.itemData[i].side +
                            "</td>" +
                            "</tr>";
                        oItemInit = oItemInit + oItems;
                    };
                    oItemInit = oItemInit + "</table></div>";

                    //creating a footerLayout for print layout
                    var oFooter = "</table>" +
                        "</div>" +
                        "</div>" +
                        "</div>" +
                        "</body>";

                    var ctrlString = "width=1500px,height=1500px";
                    var wind = window.open("", "PrintWindow", ctrlString);
                    oPrint = ""
                    oPrint = oPrint + oTabInit + oHeader + oItemInit + oFooter;

                    if (wind !== undefined) {
                        wind.document.write(oPrint);
                    }
                    // Creating a small time delay so that the layout renders
                    setTimeout(function () {
                        wind.print();
                        wind.close();

                    }, 500);

                }
            }
        });
    });
