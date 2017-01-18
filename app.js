var config = require("./config");

var book = require("./book");
var BookViewer = require("./lib/BookViewer");

BookViewer.init(book);
BookViewer.OpenPage(0);
