/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

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
            if (webpg.constants.debug.LOG) {
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

                var jq = webpg.jq;

                // Proxy the newly set console.log method to make it more like the
                //  chrome console logger, i.e. accept multiple arguments, output
                //  objects as strings and display line numbers (stack trace)
                (function(jq, oldLogMethod){
                    console.log = function(){
                        // Iterate through the passed arguments (if any)
                        for (var i=0; i<arguments.length; i++) {
                            // If the argument passed is an object, convert it
                            //  to a string
                            if (typeof(arguments[i])=="undefined")
                                arguments[i] = "<undefined>";
                            else if (typeof(arguments[i]) == "object")
                                if (arguments[i] == null) {
                                    arguments[i] = "<null>";
                                } else {
                                    try {
                                        arguments[i] = JSON.stringify(arguments[i]);
                                    } catch(err) {
                                        arguments[i] = arguments[i].toSource();
                                    }
                                }
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
                            var dp = (arguments.length > 0) ? arguments.length - 1 : 0;
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
        else if (navigator.userAgent.toLowerCase().search("conkeror") > -1)
            return { "vendor": "mozilla", "product": "conkeror" };
        else if (navigator.userAgent.toLowerCase().search("opera") > -1)
            return { "vendor": "opera", "product": "opera" };
        else if (navigator.userAgent.toLowerCase().search("safari") > -1)
            return { "vendor": "apple", "product": "safari" };
        else
            return "unknown";
    })(),

    /*
        Function: detectedLocale
            Returns the first 2 characters of the current locale.
    */
    detectedLocale: (function() {
        return navigator.language.substr(0, 2).toLowerCase();
    })(),

    /*
        Function: isRTL
            Returns true if the detected locale is a right-to-left
            language.
            
    */
    isRTL: (function() {
        RTL_locales = ['ar', 'fa', 'he'];
        return (RTL_locales.indexOf(this.detectedLocale) > -1);
    }),

    /*
        Function: resourcePath
            Determines the base path for extension resources. This is a self
            executing method.
    */
    resourcePath: function() {
        var userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.search("firefox") > -1 ||
          userAgent.search("thunderbird") > -1 ||
          userAgent.search("conkeror") > -1 ||
          userAgent.search("seamonkey") > -1)
            return "chrome://webpg-firefox/content/";   
        else if (userAgent.search("chrome") > -1)
            return chrome.extension.getURL("");
        else if (userAgent.search("safari") > -1)
            return safari.extension.baseURI;
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
            // Check for iframes within frame elements
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
            var browserWindow = wm.getMostRecentWindow("navigator:browser");
            for (var i = 0; i < browserWindow.content.frames.length; i++) {
                var iframes = browserWindow.content.frames[i].frameElement.contentDocument.getElementsByTagName("iframe");
                for (var x=0; x < iframes.length; x++) {
                    if (iframes[x].id == id)
                        return iframes[x];
                }
            }
            // Check all windows
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                         .getService(Components.interfaces.nsIWindowMediator);
            for (var found = false, index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().gBrowser;
               index < tabbrowser.tabContainer.childNodes.length && !found;
               index++) {

                // Get the next tab
                var currentTab = tabbrowser.tabContainer.childNodes[index];

                // Check if this tab contains the frame we are looking for
                var browser = tabbrowser.getBrowserAtIndex(index);
                var iframes = browser.contentDocument.getElementsByTagName("iframe");
                for (var x=0; x < iframes.length; x++) {
                    if (iframes[x].id == id)
                        return iframes[x];
                }
            }
        } else {
            var iframe = webpg.jq("#" + id);
            if (iframe)
                return (typeof(iframe.length)=="number") ?
                    iframe[0] : iframe;
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
        var _ = webpg.utils.i18n.gettext;
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
                        userSelection = ae.textContent.substring(ae.selectionStart, ae.selectionEnd);
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
        var _ = webpg.utils.i18n.gettext;
        switch (webpg.utils.detectedBrowser['product']) {
            case "firefox":
            case "thunderbird":
            case "conkeror":
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
                var wFlags = "titlebar=yes,menubar=no,location=no,dialog=no," +
                    "maximize=yes,resizeable=yes,scrollbars=yes,status=no," +
                    "centerscreen=yes";
                console.log("the title is: " + wTitle + ", the url is: " + url);
                if (url.search("XULContent") > -1) {
                    try {
                        openTab("chromeTab", { chromePage: url });
//                        window.open(url, wTitle, wFlags);
                    } catch (e) {
                        var tBrowser = top.document.getElementById("content");
                        var tab = tBrowser.addTab(url);
                        tBrowser.selectedTab = tab;
                    }
                } else {
                    gBrowser.selectedTab = gBrowser.addTab("http://webpg.org/");
                }
                break;

            case "chrome":
                if (chrome.tabs) {
                    if (tabIndex) {
                        chrome.tabs.create({'url': url, 'index': tabIndex})
                    } else {
                        chrome.tabs.getSelected(null, function(tab) { 
                            chrome.tabs.create({'url': url, 'index': tab.index});
                        });
                    }
                } else {
                    webpg.utils.sendRequest({'msg': 'newtab', 'url': url });
                }
                break;

            case "safari":
                if (tabIndex) {
                    safari.application.browserWindow.openTab(tabIndex);
                } else {
                    safari.application.browserWindow.openTab(safari.application.browserWindow.activeTab.index);
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
    getSelectedText: function(forcedElement) {
        var selectionText = '';
        var preSelection = '';
        var postSelection = '';
        var selectionTarget = null;
        var selectionObject = null;

        selectionTarget = (forcedElement) ? forcedElement : document.activeElement;

        if (this.detectedBrowser['vendor'] == "mozilla") {
            try {
                selectionObject = selectionTarget.contentWindow.document.getSelection();
                selectionTarget = selectionTarget.contentWindow.document.activeElement;
            } catch (err) {
                selectionObject = content.document.getSelection();
                selectionTarget = content.document.activeElement;
            }
        } else {
            selectionObject = window.getSelection();
        }

        if (!selectionObject.toString().length > 0 && selectionTarget.nodeName == "IFRAME" &&
            selectionTarget.className.indexOf("webpg-result-frame") < 0 &&
            selectionTarget.className.indexOf("webpg-dialog") < 0) {
            console.log(selectionTarget.className);
            selectionTarget = selectionTarget.contentDocument.documentElement.ownerDocument;
            selectionObject = selectionTarget.getSelection();
            selectionTarget = selectionTarget.activeElement;
            selectionText = selectionObject.toString();
        } else {
            if (selectionTarget.nodeName == "TEXTAREA" || selectionTarget.nodeName == "INPUT")
                selectionText = selectionTarget.value.substring(selectionTarget.selectionStart, selectionTarget.selectionEnd);
        }

        if (selectionObject && selectionObject.rangeCount > 0) {
            webpg.overlay.insert_range = selectionObject.getRangeAt(0);
            if (webpg.overlay.insert_range.startOffset == webpg.overlay.insert_range.endOffset)
                webpg.overlay.insert_range = null;
        } else {
            webpg.overlay.insert_range = null;
        }

        if ((!selectionText || !selectionText.length > 0) && selectionTarget) {
            selectionText = (selectionTarget.nodeName == "TEXTAREA") ?
                selectionTarget.value : selectionTarget.innerText;
            if (this.detectedBrowser['vendor'] == "mozilla" && selectionTarget.nodeName != "TEXTAREA") {
                var nodes = selectionTarget.childNodes;
                var selectionText = "";
                for (var i=0; i<nodes.length; i++) {
                    selectionText += nodes[i].textContent || "\n\n";
                }
            }
        }

        if (selectionTarget && selectionText.length > 0) {
            var textValue = (selectionTarget.nodeName == "TEXTAREA") ?
                selectionTarget.value : selectionTarget.innerText;
            if (this.detectedBrowser['vendor'] == "mozilla" && (selectionTarget.nodeName != "TEXTAREA" ||
                selectionTarget.nodeName != "INPUT")) {
                var nodes = selectionTarget.childNodes;
                var textValue = "";
                for (var i=0; i<nodes.length; i++) {
                    textValue += nodes[i].textContent || "\n\n";
                }
            }
            if (selectionText.length != textValue.length && selectionTarget.selectionStart != undefined) {
                preSelection = textValue.substr(0, selectionTarget.selectionStart);
                postSelection = textValue.substr(selectionTarget.selectionEnd, textValue.length);
            }
        }

        if (selectionTarget)
            webpg.overlay.insert_target = selectionTarget;

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
    sendRequest: function(data, callback) { // analogue of chrome.extension.sendRequest
        if (this.detectedBrowser['vendor'] == "mozilla" ||
            this.detectedBrowser['product'] == "safari" ||
            this.detectedBrowser['vendor'] == "opera") {
            var request = document.createTextNode("");

            if (this.detectedBrowser['vendor'] == "mozilla")
                request.setUserData("data", data, null);
            else
                webpg.jq(request).data("data", data);

            if (callback) {
                if (this.detectedBrowser['vendor'] == "mozilla")
                    request.setUserData("callback", callback, null);
                else
                    webpg.jq(request).data("callback", callback);

                document.addEventListener("webpg-listener-response", function(event) {
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                        var node = event.target, callback = node.getUserData("callback"), response = node.getUserData("response");
                    else
                        var node = event.target, callback = webpg.jq(node).data("callback"), response = webpg.jqurey(node).data("response");
                    document.documentElement.removeChild(node);
                    document.removeEventListener("webpg-listener-response", arguments.callee, false);
                    return callback(response);
                }, false);
            }
            document.documentElement.appendChild(request);

            var sender = document.createEvent("HTMLEvents");
            sender.initEvent("webpg-listener-query", true, false);
            return request.dispatchEvent(sender);
        } else if (this.detectedBrowser['vendor'] == "opera") {
            if (typeof(opera.extension)=='undefined') {
                if (!typeof(window.frames.extension)!='undefined') {
                    if (callback == null) {
                        window.frames.extension.postMessage(data);
                    } else {
                        data.callback = callback.toString();
                        window.frames.extension.postMessage(data);
                    }
                } else {
                    document.dispatchEvent(
                        new window.CustomEvent('webpg-listener-query', {'detail' : {'data': data} })
                    );
                }
            } else {
                if (callback == null) {
                    opera.extension.postMessage(data);
                } else {
                    data.callback = callback.toString();
                    opera.extension.postMessage(data);
                }
            }
        } else if (this.detectedBrowser['vendor'] == "google") {
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
            if (webpg.utils.detectedBrowser['product'] == "safari" ||
               (webpg.utils.detectedBrowser['vendor'] == "mozilla" &&
               webpg.utils.detectedBrowser['product'] != "thunderbird")) {
                return document.addEventListener("webpg-listener-query", function(event) {
                    var node = event.target, doc = node.ownerDocument;

                    var userData = (webpg.utils.detectedBrowser['vendor'] == "mozilla") ?
                        node.getUserData("data") : webpg.jq(node).data("data");

                    var userCallback = (webpg.utils.detectedBrowser['vendor'] == "mozilla") ?
                        node.getUserData("callback") : webpg.jq(node).data("callback");

                    if (webpg.utils.detectedBrowser['vendor'] != "mozilla" &&  !userData)
                        userData = event.detail.data;

                    if (webpg.utils.detectedBrowser['vendor'] != "mozilla" && !userCallback)
                        userCallback = event.detail.callback;

                    return callback(userData, doc, function(data) {
                        if (!userCallback) {
                            try {
                                return doc.documentElement.removeChild(node);
                            } catch (err) {
                                return;
                            }
                        }

                        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                            node.setUserData("response", data, null);
                        else
                            webpg.jq(node).data("response", data);

                        var listener = doc.createEvent("HTMLEvents");
                        listener.initEvent("webpg-listener-response", true, false);
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
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla" ||
                webpg.utils.detectedBrowser['product'] == "safari") {
                if (!request.target_id) {
                    webpg.utils.sendRequest(request);
                } else {
                    var iframe = webpg.utils.getFrameById(request.target_id);
                    if (iframe) {
                        iframe.addEventListener("load", function(aEvent) {
                            var tw = aEvent.originalTarget;
                            tw.contentWindow.postMessage(request, "*");
                        }, false);
                    }
                }
            } else if (webpg.utils.detectedBrowser['vendor'] == "opera") {
                data = {
                    "msg": "emit_event",
                    "event": "message",
                    "request": request
                },
                opera.extension.broadcastMessage(data);
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
                webpg.jq(".context-menu-item").each(function(iter, element) {
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
            var _ = webpg.utils.i18n.gettext;
            switch (action) {
                case webpg.constants.overlayActions.EXPORT:
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        webpg.jq(".webpg-menu-export")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-insert-pubkey";
                        chrome.contextMenus.create({
                            "title" : _("Paste Public Key"),
                            "contexts" : ["editable", "frame", "selection"],
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
                        webpg.jq(".webpg-menu-sign")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-clearsign";
                        chrome.contextMenus.create({
                            "title" : _("Clear-sign this text"),
                            "contexts" : ["selection", "editable"],
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
                        webpg.jq(".webpg-menu-import")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-import";
                        chrome.contextMenus.create({
                            "title" : _("Import this Key"),
                            "contexts" : ["selection", "editable"],
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
                        webpg.jq(".webpg-menu-crypt")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-encrypt";
                        chrome.contextMenus.create({
                            "title" : _("Encrypt this text"),
                            "contexts" : ["editable", "selection"],
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
                        webpg.jq(".webpg-menu-decrypt")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-decrypt";
                        chrome.contextMenus.create({
                            "title" : _("Decrypt this text"),
                            "contexts" : ["selection", "editable"],
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
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        webpg.jq(".webpg-menu-verif")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-verify";
                        chrome.contextMenus.create({
                            "title" : _("Verify this text"),
                            "contexts" : ["selection", "editable"],
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
                        webpg.jq(".webpg-menu-options")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-separator";
                        chrome.contextMenus.create({
                            "type" : "separator",
                            "contexts" : ["all", "page"],
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
                        webpg.jq(".webpg-menu-manager")[0].hidden = false;
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        var id = "webpg-context-manager";
                        chrome.contextMenus.create({
                            "title" : _("Key Manager"),
                            "type" : "normal",
                            "contexts" : ["all", "page"],
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
                if (!res || res.length == 0) {
                    // msg names that begin with a number, i.e. "90 days", they
                    //  are stored as "n90 days"; the following detects this
                    //  conversion and removes the preceeding "n".
                    var m = /^[n]([0-9].*)/g.exec(msg);
                    if (m && m.length == 2)
                        msg = m[1];
                    return msg;
                } else {
                    return res;
                }
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                msgName = msg.replace("_", "--").replace(/[^\"|^_|^a-z|^A-Z|^0-9]/g, '_');
                var tmsg = chrome.i18n.getMessage(msgName);
                if (tmsg.length == 0) {
                    // msg names that begin with a number, i.e. "90 days", they
                    //  are stored as "n90 days"; the following detects this
                    //  conversion and removes the preceeding "n".
                    var m = /^[n]([0-9].*)/g.exec(msg);
                    if (m && m.length == 2)
                        msg = m[1];
                    return msg;
                } else {
                    return tmsg;
                }
            } else {
                // msg names that begin with a number, i.e. "90 days", they
                //  are stored as "n90 days"; the following detects this
                //  conversion and removes the preceeding "n".
                var m = /^[n]([0-9].*)/g.exec(msg);
                if (m && m.length == 2)
                    msg = m[1];
                return msg;
            }
        },
    },

    extension: {
        version: function() {
            if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
                return chrome.app.getDetails().version;
            } else {
                try {
                    // Firefox 4 and later; Mozilla 2 and later
                    Components.utils.import("resource://gre/modules/AddonManager.jsm");
                    AddonManager.getAddonByID("webpg-firefox@curetheitch.com", function(result) {
                        return result.version;
                    });
                } catch (ex) {
                    // Firefox 3.6 and before; Mozilla 1.9.2 and before
                    var em = Components.classes["@mozilla.org/extensions/manager;1"]
                             .getService(Components.interfaces.nsIExtensionManager);
                    return em.getItemForID("webpg-firefox@curetheitch.com").version;
                }
            }
        }
    },
}

webpg.descript = function(html) { return html.replace(/\<script(.|\n)*?\>(.|\n)*?\<\/script\>/g, "") };

webpg.utils.init();
/* ]]> */
