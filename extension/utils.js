/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class:   webpg.utils
        Provides reusable, generic methods for browser specific tasks.
*/
webpg.utils = {

    /*
        Function: init
            Initializes the webpg.utils object and setups up required overrides.
    */
    init: function() {
        if (this.detectedBrowser['vendor'] == "mozilla") {
            // We are using Mozilla, so make `console.log` an alias to
            //  something that provides more information than the standard
            //  console logging utility.
            
            // TODO: This is ugly and buggy; we should consider replacing
            //  with something a little more elegant and reliable. 
 
            // Set the console.log method to use the factory console
            if (typeof(Application.console.log)!='undefined') {
                console.log = Application.console.log;
            } else {
                console = {};
                ffconsoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
                console.log = ffconsoleService.logStringMessage;
            }

            // Proxy the newly set console.log method to make it more like the
            //  chrome console logger, i.e. accept multiple arguments, output
            //  objects as strings and display line numbers (stack trace)
            (function(jQuery, oldLogMethod){
                console.log = function(){
                    // Iterate through the passed arguments (if any)
                    for (var i=0; i<arguments.length; i++) {
                        // If the argument passed is an object, convert it
                        //  to a string
                        if (typeof(arguments[i])=="undefined")
                            arguments[i] = "<undefined>";
                        else if (typeof(arguments[i]) == "object")
                            arguments[i] = (arguments[i] == null) ? "<null>" :
                                arguments[i].toSource();
                        // Append a space between arguments being printed
                        arguments[i] += " ";
                    }
                    // Get the stack trace information so we can display the
                    //  calling function(s) name and line number(s)
                    var stack = (new Error).stack.split("\n").slice(1);
                    for (var i=0; i<stack.length - 1; i++) {
                        var stack_i = stack[i].split("@");
                        var func = (stack[i].search("@") > 1) ? stack_i[0] + "@" : "";
                        var fileAndLine = stack[i].split("/").pop()
                        dp = (arguments.length > 0) ? arguments.length - 1 : 0;
                        arguments[dp] += "\n[" + func + fileAndLine + "]";
                    }
                    return(
                        // Execute the original method with the modified
                        //  arguments and additional information
	                    oldLogMethod.apply(this, arguments)
                    );
                };
            })(this, console.log);
        }
    },

    /*
        Function: detectedBrowser
            Determines the current running browser and returns an object
            containing the vendor and the product name.
    */
    detectedBrowser: (function() {
        if (navigator.userAgent.toLowerCase().search("seamonkey") > -1)
            return { "vendor": "mozilla", "product": "seamonkey" };
        else if (navigator.userAgent.toLowerCase().search("chrome") > -1)
            return { "vendor": "google", "product": "chrome" };
        else if (navigator.userAgent.toLowerCase().search("thunderbird") > -1)
            return { "vendor": "mozilla", "product": "thunderbird" };
        else if (navigator.userAgent.toLowerCase().search("firefox") > -1)
            return { "vendor": "mozilla", "product": "firefox" };
        else
            return "unknown";
    })(),

    /*
        Function: resourcePath
            Determines the base path for extension resources. This is a self
            executing method.
    */
    resourcePath: function() {
        var userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.search("firefox") > -1 ||
          userAgent.search("thunderbird") > -1 || userAgent.search("seamonkey") > -1)
            return "chrome://webpg-firefox/content/";   
        else if (userAgent.search("chrome") > -1)
            return chrome.extension.getURL("");
        else
            return "/";
    }(),

    /*
        Function: getParameterByName
            Searches the location.search query string for a named parameter

        Parameters:
            parameterName - The name of the parameter to return
    */
    getParameterByName: function(parameterName) {
        var match = RegExp('[?&]' + parameterName + '=([^&]*)')
                        .exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    },
    
    /*
        Function: parseUrl
            Returns an object containing the many various elements of a URL

        Parameters:
            url - <str> The URL to parse

        Returns:
            <obj> - An object containing the many various elements of a URL
    */
    parseUrl: function(url) {
        var re = /^((\w+):\/\/\/?)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#;\|]+)?([;\|])?([^\?#]+)?\??([^#]+)?#?(\w*)/gi
        result = re.exec(url);
        return { 'url': result[0],
            'proto_full': result[1],
            'proto_clean': result[2],
            'domain': result[6],
            'port': result[7],
            'path': result[8],
            'query': result[11],
            'anchor': result[12]
        }
    },

    formatSearchParameter: function(item) {
        var pParam = item.split(":")[0];
        var pValue = item.split(":")[1];

        if (pValue != "true" && pValue != "false"
        && isNaN(pValue)) {
            return item.replace(
                    new RegExp("(.*?):(.*)", "g"
                ),
                "\"$1\":\"$2\"");
        } else {
            return item.replace(
                    new RegExp("(.*?):(.*)", "g"
                ),
                "\"$1\":$2");
        }
    },

    /*
        Function: isValidEmailAddress
            Parses a given string to ensure it is a valid email address;
            Returns true/false

        Parameters:
            emailAddress - <str> The email address parse

        Returns:
            <bool> - (true/false)
    */
    isValidEmailAddress: function(emailAddress) {
        var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    },

    escape: function(str) {
        if (typeof(str)=='number'||typeof(str)=='undefined')
            return str;

        var map = {
            "&" : "amp",
            "'": "#39",
            '"': "quot",
            "<": "lt",
            ">": "gt"

        };

        return str.replace( /[&'"<>]/g, function(m) {
            return "&" + map[m] + ";";
        });
    },

    /*
        Function: getFrameById
            Iterates through the windows to find a frame matching the given ID

        Parameters:
            id - <str> The unique ID of the frame to locate
    */
    getFrameById: function(id) {
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            var iframes = gBrowser.contentDocument.getElementsByTagName("iframe");
            for (var i=0; i < iframes.length; i++) {
                if (iframes[i].id == id)
                    return iframes[i];
            }
        } else {
            var iframe = jQuery("#" + id);
            if (iframe)
                return iframe[0];
        }
    },

    /*
        Function: copyToClipboard
            Provides a unified method to put data into the clipboard

        Parameters:
            win - <window> The window that hosts the element that contains the
                data to copy
            doc - <document> The specific documnet of <window> with the element
    */
    copyToClipboard: function(win, doc) {
        try {
            if (doc.execCommand("Copy"))
                return "Text copied to clipboard";
        } catch(err) {
            try {
                if (win.getSelection && doc.activeElement){
                    ae = doc.activeElement;
                    if (ae.nodeName == "TEXTAREA" ||
                        (ae.nodeName == "INPUT" && 
                        ae.getAttribute("type").toLowerCase() == "text")){
                        userSelection = ae.value.substring(ae.selectionStart, ae.selectionEnd);
                    } else {
                        userSelection = win.getSelection();
                    }
                }
                var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                        getService(Components.interfaces.nsIClipboardHelper);
                gClipboardHelper.copyString(userSelection);
                return _("Text copied to clipboard");
            } catch(err) {
                console.log(err);
                return _("There may have been a problem placing the data into the clipboard") + "; " + err;
            }
        }
    },

    /*
        Function: openNewTab
            Opens a new tab with the location specified and if possible
            opens the tab at specified index.

        Parameters:
            url - <str> The URL to open
            tabIndex - <int> The desired index number (position) for the tab
    */
    openNewTab: function(url, tabIndex) {
        switch (webpg.utils.detectedBrowser['product']) {
            case "firefox":
            case "thunderbird":
            case "seamonkey":
                if (url.search("options.html") > -1)
                    url = url.replace("options.html", "XULContent/options.xul")
                        .replace("?", "?options_tab=0&");
                if (url.search("key_manager.html") > -1)
                    url = url.replace("key_manager.html", "XULContent/options.xul")
                        .replace("?", "?options_tab=1&");
                wTitle = (url.search("options_tab=0") > -1) ? _("WebPG Options") :
                    (url.search("options_tab=1") > -1) ? _("WebPG Key Manager") :
                    (url.search("options_tab=2") > -1) ? _("About WebPG") : "";
                var wFlags = "titlebar=no,menubar=no,location=no";
                wFlags += "scrollbars=yes,status=no,centerscreen=yes";
                if (url.search("XULContent") > -1) {
                    window.open(url, wTitle, wFlags);
                } else {
                    // Get the reference to the browser window
                    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                       .getInterface(Components.interfaces.nsIWebNavigation)
                       .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                       .rootTreeItem
                       .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                       .getInterface(Components.interfaces.nsIDOMWindow);
                    var gBrowser = mainWindow.gBrowser;
                    var tab = gBrowser.addTab(url);
                    gBrowser.selectedTab = tab;
                }
                break;

            case "chrome":
                if (tabIndex) {
                    chrome.tabs.create({'url': url, 'index': tabIndex})
                } else {
                    chrome.tabs.getSelected(null, function(tab) { 
                        chrome.tabs.create({'url': url, 'index': tab.index});
                    });
                }
                break;
        }
    },

    /*
        Function: getSelectedText
            Gets the selected text for the various types of selections; returns
            a JSON Object.

        Returns:
            {'selectionText': <str>, 'pre_selection': <str>, 'post_selection': <str>}
    */
    getSelectedText: function() {
        var selectionText;
        var preSelection;
        var postSelection;
        if (this.detectedBrowser['vendor'] == "mozilla") {
            var selectionObject = getBrowser().contentWindow.getSelection();
            var selectionTarget = document.commandDispatcher.focusedElement;
            var selectionText = selectionObject.toString();

            if (!selectionText.length > 0 && selectionTarget &&
                (selectionTarget.selectionStart
                != selectionTarget.selectionEnd))
                selectionText = selectionTarget.value.substr(selectionTarget.selectionStart,
                    selectionTarget.selectionEnd - selectionTarget.selectionStart);
        } else if (this.detectedBrowser['product'] == "chrome") {
            var selectionObject = window.getSelection();
            var selectionTarget = document.activeElement;
            var selectionText = selectionObject.toString();
        }

        if ((!selectionText || !selectionText.length > 0) && selectionTarget) {
            selectionText = selectionTarget.value;
            var preSelection = null;
            var postSelection = null;
        } else if (selectionTarget && selectionTarget.value) {
            var preSelection = selectionTarget.value.substr(0, selectionTarget.selectionStart);
            var postSelection = selectionTarget.value.substr(selectionTarget.selectionEnd, selectionTarget.value.length);
        }
        return {'selectionText': selectionText, 'pre_selection': preSelection, 'post_selection': postSelection};
    },

    /*
        Function: sendRequest
            Sends a request event to the background page or content script

        Parameters:
            data - <json obj> A JSON object with parameters and data to pass
            callback - <func> The callback to be called upon completion
            doc - <document> The document to add the listener to 
    */
    sendRequest: function(data, callback, doc) { // analogue of chrome.extension.sendRequest
        if (this.detectedBrowser['vendor'] == "mozilla") {
            var request = document.createTextNode("");
            request.setUserData("data", data, null);
            if (callback) {
                request.setUserData("callback", callback, null);

                document.addEventListener("listener-response", function(event) {
                    var node = event.target, callback = node.getUserData("callback"), response = node.getUserData("response");
                    document.documentElement.removeChild(node);
                    document.removeEventListener("listener-response", arguments.callee, false);
                    return callback(response);
                }, false);
            }
            document.documentElement.appendChild(request);

            var sender = document.createEvent("HTMLEvents");
            sender.initEvent("listener-query", true, false);
            return request.dispatchEvent(sender);
        } else {
            // Check if the callback is null, otherwise the chrome bindings will freak out.
            if (callback == null)
                chrome.extension.sendRequest(data);
            else
                chrome.extension.sendRequest(data, callback);
        }
    },

    /*
        Class:  webpg.utils._onRequest
            Provides the document listeners for receiving events
    */
    //  This class had to be renamed to _onRequest in order to pass
    //  validation for addons.mozilla.org, which erroneously detects
    //  this as a handleEvent call, not a user defined method. Lame.
    _onRequest: {
        /*
            Function: addListener
                This function creates a listener object for interaction between
                privileged and non-privileged pages

            Parameters:
                callback - <func> The callback to be called upon completion
        */
        addListener: function(callback) { // analogue of chrome.extension.onRequest.addListener
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla" &&
              webpg.utils.detectedBrowser['product'] != "thunderbird") {
                return document.addEventListener("listener-query", function(event) {
                    var node = event.target, doc = node.ownerDocument;

                    return callback(node.getUserData("data"), doc, function(data) {
                        if (!node.getUserData("callback")) {
                            return doc.documentElement.removeChild(node);
                        }

                        node.setUserData("response", data, null);

                        var listener = doc.createEvent("HTMLEvents");
                        listener.initEvent("listener-response", true, false);
                        return node.dispatchEvent(listener);
                    });
                }, false, true);
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                chrome.extension.onRequest.addListener(callback);
            }
        },
    },


    /*
        Class: webpg.utils.tabs
            Creates a unified class for managing tabs in various browsers
    */
    tabs: {
        /*
            Function: sendRequest
                Sends a request to a given tab/frame

            Parameters:
                target - <obj> An object that contains at minimum, the id for target
                request - <json obj> A JSON object with parameters and data to send
        */
        sendRequest: function(target, request) {
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                if (!request.target_id) {
                    webpg.utils.sendRequest(request);
                } else {
                    var iframe = webpg.utils.getFrameById(request.target_id);
                    if (iframe) {
                        iframe.onload = function(aEvent) {
                            var tw = aEvent.originalTarget;
                            tw.contentWindow.postMessage(request, "*");
                        }
                    }
                }
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                chrome.tabs.sendRequest(target.id, request);
            }
        },
    },

    /*
        Class: webpg.utils.contextMenus
            Creates a unified class for managing contextMenus in various browsers
    */
    contextMenus: {
        /*
            Function: removeAll
                Removes or hides all items in the context menu.

            Parameters:
                callback - <func> A function to execute when completed.
        */
        removeAll: function(callback) {
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                jQuery(".context-menu-item").each(function(iter, element) {
                    element.hidden = true;
                });
                callback();
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                chrome.contextMenus.removeAll(callback);
            }
        },

        /*
            Function: add
                Adds items to the context menu

            Parameters:
                action - <int> The webpg.constants.overlayAction to add
        */
        add: function(action) {
            switch (action) {
                case webpg.constants.overlayActions.EXPORT:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-export")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-insert-pubkey";
                        chrome.contextMenus.create({
                            "title" : _("Paste Public Key"),
                            "contexts" : ["editable"],
                            "id": id,
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            }
                        });
                    }
                    break;
                
                case webpg.constants.overlayActions.PSIGN:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-sign")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-clearsign";
                        chrome.contextMenus.create({
                            "title" : _("Clear-sign this text"),
                            "contexts" : ["selection", "editable"],
                            "id": id,
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.IMPORT:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-import")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-import";
                        chrome.contextMenus.create({
                            "title" : _("Import this Key"),
                            "contexts" : ["selection", "editable"],
                            "id": id,
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.CRYPT:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-crypt")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-encrypt";
                        chrome.contextMenus.create({
                            "title" : _("Encrypt this text"),
                            "contexts" : ["editable"],
                            "id": id,
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.DECRYPT:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-decrypt")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-decrypt";
                        chrome.contextMenus.create({
                            "title" : _("Decrypt this text"),
                            "contexts" : ["selection", "editable"],
                            "id": id,
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.VERIF:
                    if (webpg.utils.detectedBrowser['product'] == "mozilla") {
                        jQuery(".webpg-menu-verif")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-verify";
                        chrome.contextMenus.create({
                            "title" : _("Verify this text"),
                            "contexts" : ["selection", "editable"],
                            "id": id,
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.OPTS:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-options")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-separator";
                        chrome.contextMenus.create({
                            "type" : "separator",
                            "contexts" : ["all", "page"],
                            "id": id,
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action
                                });
                            },
                        });
                        var id = "webpg-context-options";
                        chrome.contextMenus.create({
                            "title" : _("Options"),
                            "type" : "normal",
                            "contexts" : ["all", "page"],
                            "id": id,
                            "onclick" : function(info, tab) {
                                var url = "options.html";
                                if (webpg.utils.detectedBrowser['product'] == "chrome")
                                    url += "?auto_init=true"
                                webpg.utils.openNewTab(webpg.utils.resourcePath + url);
                            },
                        });
                    }
                    break;
                    
                case webpg.constants.overlayActions.MANAGER:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        jQuery(".webpg-menu-manager")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-manager";
                        chrome.contextMenus.create({
                            "title" : _("Key Manager"),
                            "type" : "normal",
                            "contexts" : ["all", "page"],
                            "id": id,
                            "onclick" : function() {
                                var url = "key_manager.html";
                                if (webpg.utils.detectedBrowser['product'] == "chrome")
                                    url += "?auto_init=true"
                                webpg.utils.openNewTab(webpg.utils.resourcePath + url);
                            },
                        });
                    }
                    break;
            }
        }, // end webpg.utils.contextMenus.add
    },

    i18n: {
        gettext: function(msg) {
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                // Get the reference to the browser window
                var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
                var stringBundle = mainWindow.document.getElementById("webpg-strings");
                msgName = msg.replace("_", "--").replace(/[^\"|^_|^a-z|^A-Z|^0-9|^\.]/g, '_');
                try {
                    var res = stringBundle.getString(msgName);
                } catch (e) {
                    var res = msg;
                }
                if (!res || res.length == 0)
                    return msg
                else
                    return res
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                msgName = msg.replace("_", "--").replace(/[^\"|^_|^a-z|^A-Z|^0-9]/g, '_');
                var tmsg = chrome.i18n.getMessage(msgName);
                if (tmsg.length == 0)
                    return msg;
                else
                    return tmsg;
            }
        },
    },
}

window._ = webpg.utils.i18n.gettext;

webpg.utils.init();
/* ]]> */
