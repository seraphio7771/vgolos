  var config = require("../config");
  var book = {};


  module.exports.pages = {};
  module.exports.current_page = 0;

  module.exports.analytics = null;
  if (config.settings.googleTrackId) {
    module.exports.analytics = navigator.analytics;
    module.exports.analytics.setTrackingId(config.settings.googleTrackId);
  }

  module.exports.screen = {
    "width": 0,
    "height": 0,
    "update":  function () {
      var orientation = tabris.device.get("orientation");
      if ('portrait-primary' == orientation || 'portrait-secondary' == orientation) {
        this.width = screen.width;
        this.height = screen.height;
      }
      else {
        this.width = screen.height;
        this.height = screen.width;
      }
    }
  };


  module.exports.init = function(b) {
    book = b;

    if (book.settings.fullscreen) {
        tabris.ui.set("toolbarVisible", false);
        tabris.device.on("change:orientation", function(device, orientation, options) {
          tabris.ui.set("toolbarVisible", false);
          module.exports.screen.update();
        });
    }

    // Auto create menu
    var drawer = tabris.create("Drawer").append(tabris.create("PageSelector"));

    // Generate all pages
    for (var p = 0; p < book.pages.length; p++) {
      module.exports.GeneratePage(p);
    }


    // Android back-button, add confirmation window
    tabris.app.on("backnavigation", function(app, options) {
      options.preventDefault = false;
    });


    // Set styling for toolbar
    Object.keys(book.styling).forEach(function (key) {
      if (book.styling[key]) {
        tabris.ui.set(key, book.styling[key]);
      }
    });

  };


  module.exports.PreviousPage = function() {
    if (module.exports.current_page > 0) {
      module.exports.OpenPage(module.exports.current_page - 1);
    }
  }

  module.exports.NextPage = function() {
    if (module.exports.current_page < book.pages.length - 1) {
      module.exports.OpenPage(module.exports.current_page + 1);
    }
  }

  module.exports.OpenPage = function(nm) {

    if (nm in module.exports.pages) {
      module.exports.pages[nm].open();

      if (module.exports.analytics) {
        var pageName = module.exports.pages[nm].get('title');
        if (!pageName) {
          pageName = '#' + nm;
        }

        module.exports.analytics.sendAppView(pageName, function () {
//          console.log('> analytics success, ', pageName);
        }, function (err) {
//          console.log('> analytics err: ', err);
        });
      }
    }
    else {
      console.error('Failed to open page ', nm);
    }
  }


  module.exports.GeneratePage = function(nm) {

    if (!(nm in book.pages)) {
      return false;
    }

    var page = tabris.create("Page", book.pages[nm].data);

    // Set styling for specific page
    if ('styling' in book.pages[nm]) {
      Object.keys(book.pages[nm].styling).forEach(function (key) {
        page.set(key, book.pages[nm].styling[key]);
      });
    }

    // Render elements
    var parent = null;
    if ('scrollview' in book.pages[nm].settings && book.pages[nm].settings.scrollview) {
      parent = tabris.create("ScrollView", {
        direction: "vertical",
        layoutData: {left: 0, right: 0, top: 0, bottom: 0}
      }).appendTo(page);
    }
    else {
      parent = page;
    }

    var margin = 0;
    if ('margin' in book.settings && book.settings.margin) {
      margin = book.settings.margin;
    }
    var marginElement = 10;
    if ('marginElement' in book.settings && book.settings.marginElement) {
      marginElement = book.settings.marginElement;
    }

    var c = 0;
    book.pages[nm].elements.forEach(function (element) {
      if (!(element.meta.hasOwnProperty('hidden')) || !element.meta.hidden) {
        c++;
        var data = {};

        if ('auto' == element.meta.render) {
          switch (element.type) {

            case 'TextView':
              // data = element.data;
              data.font = element.meta.font.size + 'px ' + element.meta.font.name;

              data.alignment = element.meta.align;
              if ('middle' == data.alignment) {
                data.alignment = 'center';
              }

              data.text = element.data.text.replace('&', '&#38;').replace(/(?:\r\n|\r|\n)/g, '').replace("\t", "&#160;&#160;&#160;&#160;");

              data.markupEnabled = true;
              data.layoutData = {
                "left": margin,
                "right": margin,
                "top": (1 == c ? margin : "prev() " + marginElement)
              };
            break;

            case 'ImageView':
              if (element.meta.fullscreen) {
                data.layoutData = {
                  "left": 0,
                  "right": 0,
                  "top": 0,
                  "bottom": 0
                };
              }
              else {
                data.layoutData = {
                  "left": element.meta.left + "%",
                  "right": (100 - element.meta.right) + "%",
                  "top": (1 == c ? marginElement : "prev() " + marginElement)
                  // , "height": "100%"
                };
              }

              data.scaleMode = 'fit';
              if (element.data.scaleMode) {
                data.scaleMode = element.data.scaleMode;
              }

              if (element.data.background) {
                data.background = element.data.background;
              }

              data.image = {"src": book.images.files[element.meta.key] };
            break;
          }
        }
        else {
          data = element.data;
        }

        if (data && 'type' in element) {
          tabris.create(element.type, data).appendTo(parent);
          if ('ImageView' == element.type && element.meta.description) {

            tabris.create('TextView', {
              "layoutData": {
                "left": margin,
                "right": margin,
                "top": "prev() 1"
              },
              "alignment": "center",
              "text": "<small>" + (element.meta.description.replace(/(?:\r\n|\r|\n)/g, '')) + "</small>",
              "markupEnabled": true
            }).appendTo(parent);
          }
        }
        else {
          console.error('Unknown element type in page ', nm);
        }
      }
    });

    // go up
    /*
    if ('scrollview' in book.pages[nm].settings && book.pages[nm].settings.scrollview) {
      tabris.create("Button", {
        layoutData: {centerX: 0, top: "prev() 20"},
        text: "На початок"
      }).on("select", function() {
        // parent.set('offset', {"x": 0, "y": 0}); NOT implemented in TabrisJS
      }).appendTo(parent);
    }
    */

    page.nm = nm;
    module.exports.pages[nm] = page;

    // Assign touch events
    parent.on("swipe:left", function(widget, event) {
      module.exports.NextPage();
    });
    parent.on("swipe:right", function(widget, event) {
      module.exports.PreviousPage();
    });
    page.on("appear", function(mypage, event) {
      module.exports.current_page = mypage.nm;
    });



  };
