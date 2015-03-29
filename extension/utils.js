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
    },

    /*
        Function: detectedBrowser
            Determines the current running browser and returns an object
            containing the vendor and the product name.
    */
    detectedBrowser: (function() {
        var version = window.
          navigator.
            userAgent.
              match(/(?:chrome|firefox|seamonkey|thunderbird|conkeror|opera|safari)\/((?:\d+\.)+(?:\d+\b)?)+/i);
        version = (version && version.length > 1) ? version[1] : "";
        if (navigator.userAgent.toLowerCase().search("seamonkey") > -1)
            return { "vendor": "mozilla", "product": "seamonkey", "version": version };
        else if (navigator.userAgent.toLowerCase().search("chrome") > -1)
            return { "vendor": "google", "product": "chrome", "version": version };
        else if (navigator.userAgent.toLowerCase().search("thunderbird") > -1)
            return { "vendor": "mozilla", "product": "thunderbird", "version": version };
        else if (navigator.userAgent.toLowerCase().search("firefox") > -1)
            return { "vendor": "mozilla", "product": "firefox", "version": version };
        else if (navigator.userAgent.toLowerCase().search("conkeror") > -1)
            return { "vendor": "mozilla", "product": "conkeror", "version": version };
        else if (navigator.userAgent.toLowerCase().search("opera") > -1)
            return { "vendor": "opera", "product": "opera", "version": version };
        else if (navigator.userAgent.toLowerCase().search("safari") > -1)
            return { "vendor": "apple", "product": "safari", "version": version };
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
        else if (userAgent.search("chrome") > -1) {
            if (chrome && chrome.extension)
              return chrome.extension.getURL("");
            else
              return "/";
        } else if (userAgent.search("safari") > -1)
            return safari.extension.baseURI;
        else
            return "/";
    }(),

    /*
        Function: getParameterByName
            Searches the query string for a named parameter

        Parameters:
            parameterName - The name of the parameter to return
            queryString - optional querystring to parse
    */
    getParameterByName: function(parameterName, queryString) {
        queryString = (queryString || window.location.search);
        var match = RegExp('[?&]' + parameterName + '=([^&]*)')
                        .exec(queryString);
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
        var re = /^((\w+):\/\/\/?)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#;\|]+)?([;\|])?([^\?#]+)?\??([^#]+)?#?(\w*)/gi;
        result = re.exec(url);
        return { 'url': result[0],
            'proto_full': result[1],
            'proto_clean': result[2],
            'domain': result[6],
            'port': result[7],
            'path': result[8],
            'query': result[11],
            'anchor': result[12]
        };
    },

    formatSearchParameter: function(item) {
        var pParam = item.split(":")[0];
        var pValue = item.split(":")[1];

        if (pValue != "true" && pValue != "false" &&
        isNaN(pValue)) {
            return item.replace(
                    new RegExp("(.*?):(.*)", "g"
                ),
                "\"$1\":\"$2");
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
        if (typeof(str)==='number'||typeof(str)==='undefined')
            return str;

        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    },

    getInnerText: function(element) {
        if (webpg.utils.detectedBrowser.product === "chrome" && typeof(element) === 'object')
            return element.innerText;

        var text = "";
        if (typeof window.getSelection != "undefined") {
            var sel = window.getSelection();
            sel.removeAllRanges();
            var range = document.createRange();
            range.selectNodeContents(element);
            sel.addRange(range);
            text = sel.toString();
            sel.removeAllRanges();
        }
        return text;
    },

    /*
        Function: clean
            Strips out or replaces extra HTML markup added by the page

        Parameters:
            text - <str> The string to parse
    */
    clean: function(text) {
        var reg = new RegExp("<div[^>]*><br></div>", "gi");
        str = text.replace(reg, "\n");

        reg = new RegExp("<div[^>]*>(.*?)</div>", "gi");
        str = text.replace(reg, "\n$1");

        reg = new RegExp("<div[^>]*><br></div>", "gi");
        str = str.replace(reg, "\n");

        reg = new RegExp("</p>", "gi");
        str = str.replace(reg, "</p>\n");

        reg = new RegExp("<br[^>]*>", "gi");
        str = str.replace(reg,"");

        reg = new RegExp("<wbr>", "gi");
        str = str.replace(reg,"\n");

        reg = new RegExp("<[^>]+>", "g");
        str = str.replace(reg, "");

        reg = new RegExp("&lt;", "g");
        str = str.replace(reg, "<");

        reg = new RegExp("&gt;", "g");
        str = str.replace(reg, ">");

        reg = new RegExp("&nbsp;", "g");
        str = str.replace(reg, " ");

        return (str.indexOf("\n") === 0) ? str.substr(1) : str;
    },

    /*
        Function: getFrameById
            Iterates through the windows to find a frame matching the given ID

        Parameters:
            id - <str> The unique ID of the frame to locate
    */
    getFrameById: function(id) {
        var iframes, i, x, browser;
        if (webpg.utils.detectedBrowser.product === 'thunderbird') {
            iframes = content.document.getElementsByTagName("iframe");
            for (i=0; i < iframes.length; i++) {
                if (iframes[i].id === id)
                    return iframes[i];
            }
            var mainWindow = webpg.utils.mozilla.getChromeWindow();
            var tabmail = mainWindow.document.getElementById("tabmail");
            for (var ti = 0; ti < tabmail.tabInfo.length; ti++) {
                var tab = tabmail.tabInfo[ti];
                if (tab.mode.name === "message") {
                    browser = tab.mode.getBrowser();
                    iframes = browser.querySelectorAll("iframe");
                    for (i=0; i < iframes.length; i++) {
                        if (iframes[i].id === id)
                            return iframes[i];
                    }
                }
            }
        } else if (webpg.utils.detectedBrowser.vendor === "mozilla") {
            if (webpg.utils.detectedBrowser.product === 'conkeror')
                iframes = window.buffers.current.browser.contentDocument.getElementsByTagName("iframe");
            else
                iframes = gBrowser.contentDocument.getElementsByTagName("iframe");
            for (i=0; i < iframes.length; i++) {
                if (iframes[i].id === id)
                    return iframes[i];
            }
            // Check for iframes within frame elements
            var browserWindow = webpg.utils.mozilla.getChromeWindow();
            for (i = 0; i < browserWindow.content.frames.length; i++) {
                iframes = browserWindow.content.frames[i].frameElement.contentDocument.getElementsByTagName("iframe");
                for (x=0; x < iframes.length; x++) {
                    if (iframes[x].id === id)
                        return iframes[x];
                }
            }
            var currentTab;
            // Check all windows
            if (webpg.utils.detectedBrowser.product === 'conkeror') {
                for (i = 0; i < window.buffers.container.childNodes.length; i++) {
                    currentTab = window.buffers.container.childNodes.item(i).conkeror_buffer_object;
                    iframes = currentTab.browser.contentDocument.getElementsByTagName("iframe");
                    for (x=0; x < iframes.length; x++) {
                        if (iframes[x].id === id)
                            return iframes[x];
                    }
                }
            } else {
                var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                             .getService(Components.interfaces.nsIWindowMediator);
                for (var found = false, index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().gBrowser;
                   index < tabbrowser.tabContainer.childNodes.length && !found;
                   index++) {

                    // Get the next tab
                    currentTab = tabbrowser.tabContainer.childNodes[index];

                    // Check if this tab contains the frame we are looking for
                    browser = tabbrowser.getBrowserAtIndex(index);
                    iframes = browser.contentDocument.getElementsByTagName("iframe");
                    for (x=0; x < iframes.length; x++) {
                        if (iframes[x].id === id)
                            return iframes[x];
                    }
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
    copyToClipboard: function(win, doc, link) {
        var _ = webpg.utils.i18n.gettext;
        var status = {
            'msg': _("Text copied to clipboard"),
            'success': true
        };
        try {
            if (doc.execCommand("Copy") === false)
              throw "access denied";
        } catch(cperr) {
            try {
                if (win.getSelection && doc.activeElement){
                    ae = doc.activeElement;
                    if (ae.nodeName === "TEXTAREA" ||
                        (ae.nodeName === "INPUT" &&
                        ae.getAttribute("type").toLowerCase() === "text")){
                        userSelection = ae.textContent.substring(ae.selectionStart, ae.selectionEnd);
                    } else {
                        userSelection = win.getSelection();
                    }
                } else {
                    userSelection = doc.getElementById("clipboard_input").value;
                }
                var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                        getService(Components.interfaces.nsIClipboardHelper);
                gClipboardHelper.copyString(userSelection);
            } catch(cliperr) {
                webpg.utils.log(cliperr);
                status.success = false;
                status.msg = _("There may have been a problem placing the data into the clipboard") + "; " + err;
            }
        }
        webpg.jq(link).fadeOut(100, function() {
            webpg.jq(link).text((status.success) ? _('TEXT COPIED') : _("UNABLE TO COPY TEXT"))
            .fadeIn(700).fadeOut((status.success) ? 100 : 700, function() {
                webpg.jq(link).text(_("COPY TO CLIPBOARD"));
            }).fadeIn(700);
        });
        if (!status.success)
            webpg.utils.log(status);
        return status;
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
        switch (webpg.utils.detectedBrowser.product) {
            case "firefox":
            case "thunderbird":
            case "conkeror":
            case "seamonkey":
                var gBrowser;
//                if (url.search("options.html") > -1)
//                    url = url.replace("options.html", "XULContent/options.xul")
//                        .replace("?", "?options_tab=0&");
//                if (url.search("key_manager.html") > -1)
//                    url = url.replace("key_manager.html", "XULContent/options.xul")
//                        .replace("?", "?options_tab=1&");
                try {
                    openTab("chromeTab", { 'chromePage': url });
                } catch (e) {
                    gBrowser = webpg.utils.mozilla.getChromeWindow().gBrowser;
                    setTimeout(function() {
                      gBrowser.selectedTab = gBrowser.addTab(url);
                    }, 500);
                }
                break;

            case "chrome":
                if (chrome.tabs) {
                    if (tabIndex) {
                        chrome.tabs.create({'url': url, 'index': tabIndex});
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

    logger: function() {
      var stack = (new Error());
      return stack;
    },

    log: function(level) {
        if (!level)
          level = webpg.constants.LOG_LEVEL.INFO;

        if (!webpg.constants.debug.LOG)
            return function() { return false };

        var context = "WebPG || " + webpg.constants.LOG_LEVEL[level] + ":";

        switch (level) {
          case 'INFO':
            return Function.prototype.bind.call(console.info, console, context);
          case 'WARN':
            return Function.prototype.bind.call(console.warn, console, context);
          case 'ERROR':
            return Function.prototype.bind.call(console.error, console, context);
          default:
            return Function.prototype.bind.call(console.log, console, context);
        }
    },

    logLevel: function(level) {
      return webpg.constants.LOG_LEVEL[level];
    },

    debug: function() {
        if (!webpg.constants.debug.LOG)
            return function() { return false };

        var context = "WebPG:";

        return Function.prototype.bind.call(console.debug, console, context);

    }(),

    warn: function() {
        if (!webpg.constants.debug.LOG)
            return function() { return false };

        var context = "WebPG:";

        return Function.prototype.bind.call(console.warn, console, context);

    }(),

    info: function() {
        if (!webpg.constants.debug.LOG)
            return function() { return false };

        var context = "WebPG:";

        return Function.prototype.bind.call(console.info, console, context);

    }(),

    error: function() {
        if (!webpg.constants.debug.LOG)
            return function() { return false };

        var context = "WebPG:";

        return Function.prototype.bind.call(console.error, console, context);

    }(),

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

        if (this.detectedBrowser.vendor === "mozilla") {
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

        if (selectionObject.toString().length <= 0 && selectionTarget.nodeName === "IFRAME" &&
            selectionTarget.className.indexOf("webpg-result-frame") < 0 &&
            selectionTarget.className.indexOf("webpg-dialog") < 0) {
            webpg.utils.log(selectionTarget.className);
            selectionTarget = selectionTarget.contentDocument.documentElement.ownerDocument;
            selectionObject = selectionTarget.getSelection();
            selectionTarget = selectionTarget.activeElement;
            selectionText = selectionObject.toString();
        } else {
            if (selectionTarget.nodeName === "TEXTAREA" || selectionTarget.nodeName === "INPUT")
                selectionText = selectionTarget.value.substring(selectionTarget.selectionStart, selectionTarget.selectionEnd);
        }

        if (selectionObject && selectionObject.rangeCount > 0) {
            webpg.overlay.insert_range = selectionObject.getRangeAt(0);
            if (webpg.overlay.insert_range.startOffset === webpg.overlay.insert_range.endOffset)
                webpg.overlay.insert_range = null;
        } else {
            webpg.overlay.insert_range = null;
        }

        if ((!selectionText || selectionText.length <= 0) && selectionTarget) {
            selectionText = (selectionTarget.nodeName === "TEXTAREA") ?
                selectionTarget.value : selectionTarget.innerText;
            if (this.detectedBrowser.vendor === "mozilla" && selectionTarget.nodeName != "TEXTAREA") {
                var nodes = selectionTarget.childNodes;
                selectionText = "";
                for (var i=0; i<nodes.length; i++) {
                    selectionText += nodes[i].textContent || "\n\n";
                }
            }
        }

        if (selectionTarget && selectionText.length > 0) {
            var textValue = (selectionTarget.nodeName === "TEXTAREA") ?
                selectionTarget.value : selectionTarget.innerText;
            if (selectionTarget.selectionStart !== undefined &&
            selectionTarget.selectionStart > 0 &&
            selectionTarget.selectionStart !== textValue.length) {
                preSelection = textValue.substr(0, selectionTarget.selectionStart);
                postSelection = textValue.substr(selectionTarget.selectionEnd, textValue.length);
            }
        }

        if (selectionTarget)
            webpg.overlay.insert_target = selectionTarget;

        return {'selectionText': selectionText, 'pre_selection': preSelection, 'post_selection': postSelection};
    },

    getPlainText: function(node) {
        if (webpg.utils.detectedBrowser.product === "chrome" && typeof(node) === 'object')
            return node.innerText;

      // used for testing:
      //return node.innerText || node.textContent;

      var normalize = function(a) {
        // clean up double line breaks and spaces
        if(!a) return "";
        return a.replace(/ +/g, " ")
            .replace(/[\t]+/gm, "")
            .replace(/[ ]+$/gm, "")
            .replace(/^[ ]+/gm, "")
            .replace(/\n\n/g, "\n");
      };
      var removeWhiteSpace = function(node) {
        // getting rid of empty text nodes
        var isWhite = function(node) {
          return !(/[^\t\n\r ]/.test(node.nodeValue));
        };
        var ws = [];
        var findWhite = function(node){
          for(var i=0; i<node.childNodes.length; i++) {
            var n = node.childNodes[i];
            if (n.nodeType==3 && isWhite(n)){
              ws.push(n);
            } else if (n.hasChildNodes()) {
              findWhite(n);
            }
          }
        };
        findWhite(node);
        for(var i=0;i<ws.length; i++) {
          ws[i].parentNode.removeChild(ws[i]);
        }

      };
      var sty = function(n, prop) {
        // Get the style of the node.
        // Assumptions are made here based on tagName.
        if(n.style[prop]) return n.style[prop];
        var s = n.currentStyle || n.ownerDocument.defaultView.getComputedStyle(n, null);
        if(n.tagName === "SCRIPT") return "none";
        if(!s[prop]) return "LI,P,TR".indexOf(n.tagName) > -1 ? "block" : n.style[prop];
        if(s[prop] =="block" && n.tagName=="TD") return "feaux-inline";
        return s[prop];
      };

      var blockTypeNodes = "table-row,block,list-item";
      var isBlock = function(n) {
        // diaply:block or something else
        var s = sty(n, "display") || "feaux-inline";
        if(blockTypeNodes.indexOf(s) > -1) return true;
        return false;
      };
      var recurse = function(n) {
        // Loop through all the child nodes
        // and collect the text, noting whether
        // spaces or line breaks are needed.
        if(/pre/.test(sty(n, "whiteSpace"))) {
          t += n.innerHTML
            .replace(/\t/g, " ")
            .replace(/\n/g, " "); // to match IE
          return "";
        }
        var s = sty(n, "display");
        if(s === "none") return "";
        var gap = isBlock(n) ? "\n" : " ";
        t += gap;
        for(var i=0; i<n.childNodes.length; i++){
          var c = n.childNodes[i];
          if(c.nodeType === 3) t += c.nodeValue;
          if(c.childNodes.length) recurse(c);
        }
        t += gap;
        return t;
      };

      // Use a copy because stuff gets changed
      if (typeof(node) === 'object') {
          node = node.cloneNode(true);
      } else {
          cloneNode = document.createElement('pre');
          cloneNode.textContent = node;
          node = cloneNode;
      }

      // Line breaks aren't picked up by textContent
      node.innerHTML = node.innerHTML.replace(/<br>/g, "\n");

      // Double line breaks after P tags are desired, but would get
      // stripped by the final RegExp. Using placeholder text.
      var paras = node.getElementsByTagName("p");
      for(var i=0; i<paras.length; i++){
        paras[i].innerHTML += "NEWLINE";
      }

      var t = "";
      removeWhiteSpace(node);
      // Make the call!
      return normalize(recurse(node));
    },

    /*
        Function: gmailWrapping

        This fuction approximates gmail's line-wrapping rules, so that
        a message can be wrapped before it's signed, instead of after,
        which would break the signature.

        Parameters:
            text - The text.

    */
    gmailWrapping: function(text) {
        var lines = text.split("\n");
        var result = "";

        // Wrap each line
        for (var i = 0; i < lines.length; i++) {
            // gmail doesn't wrap lines with less than 81 characters
            // or lines that have been quoted from previous messages
            // in the usual way, so we don't bother either.
            if (lines[i].length <= 80 || lines[i].substring(0,2) === "> ")
                result = result + lines[i] + "\n";
            else
                // If we're wrapping a line, each of the resulting
                // lines shouldn't be longer than 70 characters
                // unless it has to be.
                result = result + webpg.utils.wrapText(lines[i], 70) + "\n";
        }

        return result;
    },

    gmailNotify: function(text, timeout) {
      timeout = (timeout===undefined) ? 3000 : timeout;

      var doc = webpg.gmail.getCanvasFrameDocument();

      webpg.jq(doc)
        .find(".J-J5-Ji .vh")
          .first()
            .text(text)
              .parent()
                .parent()
                  .css('top', '');

      setTimeout(function(e) {
        webpg.utils.gmailCancelNotify();
      }, timeout);
    },

    gmailCancelNotify: function() {
      var doc = webpg.gmail.getCanvasFrameDocument();
      webpg.jq(doc)
        .find(".J-J5-Ji .vh")
          .first()
            .text('')
              .parent()
                .parent()
                  .css({'position': 'relative', 'top': '-10000px'});
    },

    /*
        Function: wrap

        This function wraps a single line of text into multiple lines,
        each no longer than limit, unless a single word is too long.

        Parameters:
            text - The text.
            limit - The maximum characters for one line.


    */
    wrapText: function(text, limit) {
        var result = "";

        // Keep wrapping until the remainder is short enough.
        while (text.length > limit)
        {
            var index = text.lastIndexOf(" ", limit);
            // If the first word is too long, look for the first space
            if (index === -1)
                index = text.indexOf(" ");
            // If there are no more spaces at all, give up.
            if (index === -1)
            {
                break;
            }
            else
            {
                result = result + text.substring(0, index) + "\r\n";
                text = text.substring(index + 1);
            }
        }

        return result + text;
    },

    // Gmail replaces any text that looks like a link and encloses it with anchor tags.
    //  This replaces any links without tags with
    linkify: function(inputText) {
        var replacedText, regex;

        // URLs in <a> tags with or without other attributes
        regex = /<a(.+?href=[\"|\']([^\"|^\']+?)[\"|\']+?)>/gim;
        replacedText = inputText.replace(regex, '<a href="$2" target="_blank">');

        // Change email addresses to mailto:: links.
        regex = /((\:)?\b[A-Z0-9._%-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b)/gim;
        replacedText = replacedText.replace(regex, function(match_i, email, prefix) {
          if (prefix === undefined)
            return '<a href="mailto:' + email + '" target="_blank">' + email + '</a>';
          else
            return match_i
        });

        regex = new RegExp("(\\b([a-z\\-]+:\\/\\/)?(?:(?:(?:[a-z\\d]+[\:]?(?:[a-z\\d\\-@]{1,2}[a-z\\d]){1,10}\\.))+[a-z]{2,4}(?:<br(?:\/)?>)?(?![\\\"|\\'|@|<]|[\\/][\\\"])|(?:(?:\\d{1,3}\\.){3}\\d{1,3}))(?:\\:\\d+)?(?:\\/[\\-a-z\\d%_.~+]{1,20})*(?:\\?[;\\&a-z\\d\\%_\\.~+=\\-]+)?(?:#[\\-a-z\\d_]+)?)\\b", "gim");

        try {
        replacedText = replacedText.replace(regex, function(match_i, url, protocol, a) {
            webpg.utils.log(url);
            var suffix = url.match(/<br(\/)?>/g),
                suffix = (suffix !== null) ? suffix[0] : "";
            url = url.replace(/<br(\/)?>/g, "");
            return "<a href=\"" + ((!protocol) ? "http://" : "") +
                url + "\" target=\"_blank\">" + url + "</a>" + suffix;
        });
        } catch (e) {
          webpg.utils.log(e);
          webpg.utils.log(e.message);
        }

        return replacedText;
    },

    parseMailMessage: function(msg) {
      var parsedMsg = {},       // The return object
          boundary,             // The boundary used
          parts,                // All of the separate parts of the message
          headers = {},         // Stores all of the header items
          regex = new RegExp(), // Reusable RegExp Object
          h;                    // Temporary var to hold the current header item

      // Regex to capture the boundary string
      regex.compile(/\bboundary=(?:["'])?(.+?)(?:["';\r\n\s])(?:$)?/igm);

      msg = msg.replace(/\r\n/gm, '\n').trim();
      parsedMsg.multipart = regex.test(msg);

      if (parsedMsg.multipart) {
        // Recompile the RegExp, because test() messes it up
        regex.compile(/\bboundary=(?:["'])?(.+?)(?:["';\r\n\s])(?:$)?/igm);

        // Define the boundary
        boundary = regex.exec(msg)[1];

        // Create a regex that splits the boundaries
        regex = new RegExp("--" + boundary + "(?!-)", "gm");

        // Split the boundaries
        parts = msg.split("--" + boundary);
      } else {
        regex.compile(/(?:\b)?[\r\n][\r\n]/gm);
        parts = msg.split(regex);
      }

      // Remove the header and keep a reference to it for parsing
      var theaders = parts.splice(0, 1);

      // An inline method to parse the headers of a MIME part
      parseHeaders = function(theaders) {
        var headers = {},
            regex = new RegExp();

        // Regex to capture all of the headers+values (TODO: not perfect yet)
        regex.compile(/^(\w*?(?:(?:-\w*?)+)?):(?:\s)?(.*(?:(?:[\r\n][\ |\t]+.+)?)+)/gm);

        // Loop through the header items
        while (h = regex.exec(theaders)) {
          var key = h[1].toLowerCase().replace(/-/g, '_'),
              value = h[2];

          if (key === 'content_type' || key === 'content_disposition' ) {
            headers[key] = {};
            value.split(/[;|\r\n]/g).every(function(x) {
              if (x.length > 0) {
                if (x.search('=') > 0) {
                  var vstr = x.trim().replace(/[\"|;]/g, ''),
                      vpair = [];
                  vpair.push(vstr.slice(0, vstr.indexOf("=")));
                  vpair.push(vstr.slice(vstr.indexOf("=")+1));
                  headers[key][vpair[0]] = vpair[1];
                } else if (x.trim().length > 0) {
                  var type = (key === 'content_disposition') ?
                    'disposition' : 'type';
                  headers[key][type] = x.trim();
                }
              }
              return true;
            });
          } else {
            headers[key] = h[2];
          }
        }
        return headers;
      }

      parsedMsg.headers = parseHeaders(theaders);
      parsedMsg.headers.full_headers = (theaders[0] || theaders);
      parsedMsg.content = parts.join('\r\n\r\n').split(/[\r\n]{4}\b/)[0].slice(0, -1);

      parsedMsg.parts = [];

      if (parsedMsg.multipart === false) {
        parsedMsg.parts.push({'content': parts.join('\r\n\r\n')});
      } else {
        for (var msgPart in parts) {
          if (parts[msgPart] !== '--') {
            var part = {},
                headerEnd = parts[msgPart].search(/[\r\n][\r\n]/gm),
                content = parts[msgPart].substr(headerEnd);
            part.headers = parseHeaders(parts[msgPart].slice(0, headerEnd));
            part.headers.full_headers = parts[msgPart].slice(0, headerEnd);
            part.content = content;
            part.body = content.split('--'+boundary)[0].trim();
            regex.compile(/\bboundary=(?:["'])?(.+?)(?:["';\r\n\s])(?:$)?/igm);
            part.multipart = regex.test(parts[msgPart]);
            if (part.multipart)
              parsedMsg.parts.push(webpg.utils.parseMailMessage(parts[msgPart]));
            else
              parsedMsg.parts.push(part);
          }
        }
      }

      return parsedMsg;
    },

    getPGPMimeMsg: function(msg) {
      var msgHeadersStr = JSON.stringify(msg.headers).toLowerCase();
      if (msgHeadersStr.search("multipart/(signed|encrypted)") !== -1 &&
          msgHeadersStr.search("application/pgp-(signature|signed|encrypted)") !== -1)
        return msg
      var pgpmsg = null;
      for (msgp in msg.parts) {
        if (msg.parts[msgp].hasOwnProperty('headers') &&
            JSON.stringify(msg.parts[msgp].headers).search("multipart/(signed|encrypted)") !== -1) {
          pgpmsg = msg.parts[msgp];
        } else if (msg.parts[msgp].hasOwnProperty('parts')) {
          pgpmsg = this.getPGPMimeMsg(msg.parts[msgp]);
        } else if (msg.parts[msgp].hasOwnProperty('content') &&
                   msg.parts[msgp].content.search(
                    /(^\s*?)?(-----BEGIN PGP.*?)/gi) !== -1
                  ) {
          pgpmsg = msg.parts[msgp];
        }

        if (pgpmsg !== null)
          return pgpmsg;
     }
     return pgpmsg;
    },

    quoted_printable_encode: function(str) {
      return s.replace(/=/g, "=3D").replace(/[^ -~\r\n\t]/g,
        function(v) { return "=" + v.charCodeAt(0).toString(16); });
    },

    quoted_printable_decode: function(str) {
      return str.replace(/=[\r\n]+/g, "").replace(/=[0-9A-F]{2}/gi,
        function(v){ return String.fromCharCode(parseInt(v.substr(1),16)); });
    },

    base64_decode: function(data) {
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

      if (!data) {
        return data;
      }

      data += '';

      do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
          tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
      } while (i < data.length);

      dec = tmp_arr.join('');

      return dec;
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
        var tabID;
        if (this.detectedBrowser.product === 'thunderbird') {
            var browserWindow = webpg.utils.mozilla.getChromeWindow();

            tabID = -1;

            try {
                if (webpg.utils.detectedBrowser.product === 'conkeror')
                    tabID = window.getBrowser()._webpgTabID;
                else
                    tabID = gBrowser.getBrowserForDocument(content.document)._webpgTabID;
            } catch (err) {
                // Do nothing
            }

            data.sender = {
                'tab': { 'id': tabID }
            };

            if (!callback)
                callback = function() { return; };

            browserWindow.webpg.background._onRequest(data, data.sender, callback);
            browserWindow.webpg.overlay._onRequest(data, data.sender, callback);
        } else if (this.detectedBrowser.vendor === "mozilla" ||
            this.detectedBrowser.product === "safari") {

            if (!gBrowser) {
                var browserWindow = webpg.utils.mozilla.getChromeWindow();
                var gBrowser = browserWindow.gBrowser;
            }

            try {
                tabID = gBrowser.getBrowserForDocument(content.document)._webpgTabID;
            } catch (err1) {
                tabID = -1;
            }

            data.sender = {
                'tab': { 'id': tabID }
            };

            var mozDoc = (content) ? content.document : document;
            var request = mozDoc.createTextNode("");

            if (this.detectedBrowser.vendor === "mozilla")
                request.setUserData("data", data, null);
            else
                webpg.jq(request).data("data", data);

            if (callback) {
                if (this.detectedBrowser.vendor === "mozilla")
                    request.setUserData("callback", callback, null);
                else
                    webpg.jq(request).data("callback", callback);

                mozDoc.addEventListener("webpg-listener-response", function(event) {
                    var node = event.target,
                        callback,
                        response;
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        callback = node.getUserData("callback");
                        response = node.getUserData("response");
                    } else {
                        callback = webpg.jq(node).data("callback");
                        response = webpg.jq(node).data("response");
                    }
                    if (node.parentNode)
                      node.parentNode.removeChild(node);
                    else if (node.parentElement)
                      node.parentElement.removeChild(node);
                    else
                      node.remove();

                    mozDoc.removeEventListener("webpg-listener-response", arguments.callee, false);
                    return callback(response);
                }, false);
            }

            mozDoc.documentElement.appendChild(request);

            var sender = mozDoc.createEvent("HTMLEvents");
            sender.initEvent("webpg-listener-query", true, false);
            return request.dispatchEvent(sender);
        } else if (this.detectedBrowser.vendor === "opera") {
            if (typeof(opera.extension)=='undefined') {
                if (typeof(window.frames.extension)!=='undefined') {
                    if (callback === null) {
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
                if (callback === null) {
                    opera.extension.postMessage(data);
                } else {
                    data.callback = callback.toString();
                    opera.extension.postMessage(data);
                }
            }
        } else if (this.detectedBrowser.vendor === "google") {
            // Check if the callback is null, otherwise the chrome bindings will freak out.
            if (callback === undefined || callback === null)
                chrome.runtime.sendMessage(chrome.runtime.id, data);
            else
                chrome.runtime.sendMessage(chrome.runtime.id, data, callback);
        }
        return true;
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
            if (webpg.utils.detectedBrowser.product === "safari" ||
               (webpg.utils.detectedBrowser.vendor === "mozilla" &&
               webpg.utils.detectedBrowser.product !== "thunderbird")) {
                var mozDoc = (content) ? content.document : document;
                return mozDoc.addEventListener("webpg-listener-query", function(event) {

                    var node = event.target, doc = node.ownerDocument;

                    var userData = (webpg.utils.detectedBrowser.vendor === "mozilla") ?
                        node.getUserData("data") : webpg.jq(node).data("data");

                    var userCallback = (webpg.utils.detectedBrowser.vendor === "mozilla") ?
                        node.getUserData("callback") : webpg.jq(node).data("callback");

                    if (webpg.utils.detectedBrowser.vendor !== "mozilla" &&  !userData)
                        userData = event.detail.data;

                    if (webpg.utils.detectedBrowser.vendor !== "mozilla" && !userCallback)
                        userCallback = event.detail.callback;

                    return callback(userData, doc, function(data) {
                        if (!userCallback) {
                            try {
                                return doc.documentElement.removeChild(node);
                            } catch (err) {
                                return false;
                            }
                        }

                        if (webpg.utils.detectedBrowser.vendor === "mozilla")
                            node.setUserData("response", data, null);
                        else
                            webpg.jq(node).data("response", data);

                        var listener = doc.createEvent("HTMLEvents");
                        listener.initEvent("webpg-listener-response", true, false);
                        return node.dispatchEvent(listener);
                    });
                }, false);
            } else if (webpg.utils.detectedBrowser.product === "chrome") {
                chrome.runtime.onMessage.addListener(callback);
            }
            return false;
        },

        removeEventListener: function() {
            if (webpg.utils.detectedBrowser.product === "safari" ||
               (webpg.utils.detectedBrowser.vendor === "mozilla" &&
               webpg.utils.detectedBrowser.product !== "thunderbird")) {
                var mozDoc = (content) ? content.document : document;
                mozDoc.removeEventListener("webpg-listener-query", arguments.callee, false);
            }
        }
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
            if (webpg.utils.detectedBrowser.vendor === "mozilla" ||
                webpg.utils.detectedBrowser.product === "safari") {
                if (request.msg !== "removeiframe" && request.msg !== "resizeiframe" && request.msg !== "insertIntoPrior") {
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
            } else if (webpg.utils.detectedBrowser.vendor === "opera") {
                data = {
                    "msg": "emit_event",
                    "event": "message",
                    "request": request
                };
                opera.extension.broadcastMessage(data);
            } else if (webpg.utils.detectedBrowser.product === "chrome") {
                chrome.tabs.sendMessage(target.id, request);
            }
        },

        pageAction: {
            setPopup: function(popupData) {
                if (webpg.utils.detectedBrowser.product === 'chrome') {
                    chrome.pageAction.setPopup(popupData);
                } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    var popup = document.getElementById("webpg-pageAction-popup");
                    var frameSource = webpg.utils.resourcePath + popupData.popup;
                    var dialogFrame = document.getElementById('webpg-pageAction-popup-frame');
                    var browserWindow = webpg.utils.mozilla.getChromeWindow();
                    dialogFrame.addEventListener("load", function() {
                      dialogFrame.removeEventListener("load", arguments.callee, false);
                      var cont = new XPCNativeWrapper(dialogFrame.contentWindow).wrappedJSObject;
                      cont.webpg.popup.init(browserWindow, popup);
                    }, true);
                    popup.removeAttribute('onpopupshowing');
                    popup.setAttribute('onpopupshowing', "document.getElementById('webpg-pageAction-popup-frame').setAttribute('src', '" + frameSource + "')");
                }
            },

            setIcon: function(popupData) {
                if (webpg.utils.detectedBrowser.product === 'chrome') {
                    chrome.pageAction.setIcon(popupData);
                } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    var pageActionIcon = document.getElementById("webpg-pageAction-icon");
                    pageActionIcon.setAttribute('src', webpg.utils.resourcePath + popupData.path);
                }
            },

            show: function(popupData) {
                if (webpg.utils.detectedBrowser.product === 'chrome') {
                    chrome.pageAction.show(popupData);
                } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    var icon = document.getElementById("webpg-pageAction-icon");
                    icon.setAttribute("collapsed", false);
                }
            },

            hide: function(popupData) {
                if (webpg.utils.detectedBrowser.product === 'chrome') {
                    chrome.pageAction.hide(popupData.tabId);
                } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    var icon = document.getElementById("webpg-pageAction-icon");
                    icon.setAttribute("collapsed", true);
                }
            },

            showPopup: function(popupData) {
                if (webpg.utils.detectedBrowser.product === 'chrome') {
                    chrome.pageAction.show(popupData);
                } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    var popup = document.getElementById("webpg-pageAction-popup");
                    popup.openPopup(document.getElementById("webpg-pageAction-icon"), "after_end", 1, 4, false, false);
                }
            },

            closePopup: function(popup) {
                if (webpg.utils.detectedBrowser.product === 'chrome') {
                    popup.close();
                } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    popup.hidePopup();
                }
            },

            toggle: function(popupData) {
//                document.
            }

        },

        getSelectedTab: function(tab, callback) {
            if (webpg.utils.detectedBrowser.product === 'chrome') {
                chrome.tabs.getSelected(tab, callback);
            } else if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                if (!gBrowser) {
                    var gBrowser = webpg.utils.mozilla.getChromeWindow().gBrowser;
                }
                var tabID = gBrowser.getBrowserForDocument(content.document)._webpgTabID;
                callback({'url': content.document.location.href, 'id': tabID});
            }
        },

        executeScript: function(tabID, code) {
            if (webpg.utils.detectedBrowser.product === 'chrome') {
                chrome.tabs.executeScript(tabID, {'code': code});
            } else if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                code();
            }
        }

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
            if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                webpg.jq(".context-menu-item").each(function(iter, element) {
                    element.hidden = true;
                });
                callback();
            } else if (webpg.utils.detectedBrowser.product === "chrome") {
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
            var _ = webpg.utils.i18n.gettext,
                item,
                id;
            switch (action) {
                case webpg.constants.overlayActions.VERIF:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-verif");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-verify";
                        chrome.contextMenus.create({
                            "title" : _("Verify this text"),
                            "contexts" : ["selection", "editable"],
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.DECRYPT:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-decrypt");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-decrypt";
                        chrome.contextMenus.create({
                            "title" : _("Decrypt this text"),
                            "contexts" : ["selection", "editable"],
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.IMPORT:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-import");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-import";
                        chrome.contextMenus.create({
                            "title" : _("Import this Key"),
                            "contexts" : ["selection", "editable"],
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.PSIGN:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-sign");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-clearsign";
                        chrome.contextMenus.create({
                            "title" : _("Clear-sign this text"),
                            "contexts" : ["selection", "editable"],
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.CRYPT:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-crypt");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-encrypt";
                        chrome.contextMenus.create({
                            "title" : _("Encrypt this text"),
                            "contexts" : ["editable", "selection"],
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.EXPORT:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-export");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-insert-pubkey";
                        chrome.contextMenus.create({
                            "title" : _("Paste Public Key"),
                            "contexts" : ["editable", "frame", "selection"],
                            "type" : "normal",
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.OPTS:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-options");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-separator";
                        chrome.contextMenus.create({
                            "type" : "separator",
                            "contexts" : ["all", "page"],
                            "onclick" : function(info, tab) {
                                webpg.utils.tabs.sendRequest(tab, {
                                    "msg": "onContextCommand",
                                    "action": action,
                                    "source": 'context-menu'
                                });
                            }
                        });
                        id = "webpg-context-options";
                        chrome.contextMenus.create({
                            "title" : _("Options"),
                            "type" : "normal",
                            "contexts" : ["all", "page"],
                            "onclick" : function(info, tab) {
                                var url = "options.html";
                                if (webpg.utils.detectedBrowser.product === "chrome")
                                    url += "?auto_init=true";
                                webpg.utils.openNewTab(webpg.utils.resourcePath + url);
                            }
                        });
                    }
                    break;

                case webpg.constants.overlayActions.MANAGER:
                    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                        item = document.querySelector(".webpg-menu-manager");
                        if (item)
                            item.hidden = false;
                    } else if (webpg.utils.detectedBrowser.product === "chrome") {
                        id = "webpg-context-manager";
                        chrome.contextMenus.create({
                            "title" : _("Key Manager"),
                            "type" : "normal",
                            "contexts" : ["all", "page"],
                            "onclick" : function() {
                                var url = "key_manager.html";
                                if (webpg.utils.detectedBrowser.product === "chrome")
                                    url += "?auto_init=true";
                                webpg.utils.openNewTab(webpg.utils.resourcePath + url);
                            }
                        });
                    }
                    break;
            }
        } // end webpg.utils.contextMenus.add
    },

    i18n: {
        gettext: function(msg) {
            var res,
                msgName,
                m;
            if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                // Get the reference to the browser window
                var mainWindow = webpg.utils.mozilla.getChromeWindow();
                var stringBundle = mainWindow.document.getElementById("webpg-strings");
                msgName = msg.replace("_", "--").replace(/[^\"|^_|^a-z|^A-Z|^0-9|^\.]/g, '_');
                try {
                    res = stringBundle.getString(msgName);
                } catch (e) {
                    res = msg;
                }
                if (!res || res.length === 0) {
                    // msg names that begin with a number, i.e. "90 days", they
                    //  are stored as "n90 days"; the following detects this
                    //  conversion and removes the preceeding "n".
                    m = /^[n]([0-9].*)/g.exec(msg);
                    if (m && m.length === 2)
                        msg = m[1];
                    return msg;
                } else {
                    return res;
                }
            } else if (webpg.utils.detectedBrowser.product === "chrome") {
                if (!chrome.i18n)
                  return msg;
                msgName = msg.replace("_", "--").replace(/[^\"|^_|^a-z|^A-Z|^0-9]/g, '_');
                var tmsg = chrome.i18n.getMessage(msgName);
                if (tmsg.length === 0) {
                    // msg names that begin with a number, i.e. "90 days", they
                    //  are stored as "n90 days"; the following detects this
                    //  conversion and removes the preceeding "n".
                    m = /^[n]([0-9].*)/g.exec(msg);
                    if (m && m.length === 2)
                        msg = m[1];
                    return msg;
                } else {
                    return tmsg;
                }
            } else {
                // msg names that begin with a number, i.e. "90 days", they
                //  are stored as "n90 days"; the following detects this
                //  conversion and removes the preceeding "n".
                m = /^[n]([0-9].*)/g.exec(msg);
                if (m && m.length === 2)
                    msg = m[1];
                return msg;
            }
        }
    },

    mozilla: {
        getChromeWindow: function() {
            var mainWindow = window
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation)
                    .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                    .rootTreeItem
                    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIDOMWindow);

            if (!mainWindow) {
                var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
                var winType = (webpg.utils.detectedBrowser.product === "thunderbird") ?
                    "mail:3pane" : "navigator:browser";
                mainWindow = wm.getMostRecentWindow(winType);
            }

            return mainWindow;
        },

        getChromeFile: function(chromeURL) {
          // convert the chrome URL into a file URL
          var cr = Components.classes['@mozilla.org/chrome/chrome-registry;1']
                   .getService(Components.interfaces.nsIChromeRegistry);
          var io = Components.classes['@mozilla.org/network/io-service;1']
                   .getService(Components.interfaces.nsIIOService);
          var uri = io.newURI(decodeURI(chromeURL), 'UTF-8', null);
          var fileURL = cr.convertChromeURL(uri);
          // get the nsILocalFile for the file
          return  fileURL.QueryInterface(Components.interfaces.nsIFileURL).file;
        },
    },

    extension: {
        id: function(callback) {
            if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
                return (callback) ? callback(chrome.app.getDetails().id) : chrome.app.getDetails().id;
            } else {
                return "webpg-mozilla@webpg.org";
            }
        },

        version: function(callback) {
            if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
                callback(chrome.app.getDetails().version);
            } else {
                try {
                    // Firefox 4 and later; Mozilla 2 and later
                    Components.utils.import("resource://gre/modules/AddonManager.jsm");
                    AddonManager.getAddonByID("webpg-firefox@curetheitch.com", function(result) {
                        callback(result.version);
                    });
                } catch (ex) {
                    // Firefox 3.6 and before; Mozilla 1.9.2 and before
                    var em = Components.classes["@mozilla.org/extensions/manager;1"]
                             .getService(Components.interfaces.nsIExtensionManager);
                    callback(em.getItemForID("webpg-firefox@curetheitch.com").version);
                }
            }
        },

        extensionURI: function(callback) {
            if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
                webpg.plugin.getTemporaryPath(callback);
            } else {
                var id = "webpg-firefox@curetheitch.com";
                try {
                    // Firefox 4 and later; Mozilla 2 and later
                    Components.utils.import("resource://gre/modules/AddonManager.jsm");
                    AddonManager.getAddonByID(id, function(result) {
                        callback(result.getResourceURI("extension").path);
                    });
                } catch (ex) {
                    // Firefox 3.6 and before; Mozilla 1.9.2 and before
                    var em = Components.classes["@mozilla.org/extensions/manager;1"]
                             .getService(Components.interfaces.nsIExtensionManager);
                    callback(em.getInstallLocation(id).getItemFile(id, "extension").path);
                }
            }
        }

    },

    requestListener: {
        supported: function() {
            return webpg.utils.detectedBrowser['product'] == 'chrome' ?
                typeof(chrome.webNavigation)!=='undefined' : true;
        },

        add: function(callback) {
            if (!callback)
                return "No callback provided";

            if (webpg.utils.detectedBrowser['product'] == 'chrome') {
                chrome.webNavigation.onCompleted.addListener(function(details) {
                    callback(details);
                });
            } else {
                var httpRequestObserver = {
                    observe: function(subject, topic, data) {
                        if (topic == "http-on-examine-response") {
                            subject.QueryInterface(Components.interfaces.nsIHttpChannel);
                            var details = {
                              url: subject.URI,
                              domain: subject.URI.host,
                              protocol: subject.URI.scheme,
                              tabId: webpg.utils.requestListener.getTabIDfromDOM(subject, subject),
                              headers: {},
                            };

                            subject.visitResponseHeaders(
                                function(header) {
                                    details.headers[header] = subject.getResponseHeader(header);
                                }
                            );
                            callback(details);
                        }
                    },

                    get observerService() {
                        return Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
                    },

                    register: function() {
                        this.observerService.addObserver(this, "http-on-examine-response", false);
                    },

                    unregister: function() {
                        this.observerService.removeObserver(this, "http-on-examine-response");
                    }
                };

                httpRequestObserver.register();
            }
        },

        getTabIDfromDOM : function(aChannel, aSubject) {
            try {
                var notificationCallbacks =
                    aChannel.notificationCallbacks ? aChannel.notificationCallbacks : aSubject.loadGroup.notificationCallbacks;

                if (!notificationCallbacks)
                    return null;

                var callback = notificationCallbacks.getInterface(Components.interfaces.nsIDOMWindow);

                return callback.top.document ? gBrowser.getBrowserForDocument(callback.top.document)._webpgTabID : null;

             } catch(e) {
                return null;
             }
       },

    },

    tabListener: {
        add: function(openListener, closeListener) {
            if (openListener === undefined)
              openListener = webpg.utils.tabListener.openListener;
            if (closeListener === undefined)
              closeListener = webpg.utils.tabListener.closeListener;

            if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                if (gBrowser===undefined) {
                    gBrowser = webpg.utils.mozilla.getChromeWindow().gBrowser;
                }

                if (!gBrowser)
                    return;

                var container = gBrowser.tabContainer;
                container.addEventListener("TabOpen", openListener, false);
                //container.addEventListener("TabSelect", webpg.utils.tabListener.selectListener, false);
                if (closeListener !== null)
                  container.addEventListener("TabClose", closeListener, false);
            } else if (webpg.utils.detectedBrowser.product === 'chrome') {
                chrome.tabs.onCreated.addListener(openListener);
                //chrome.tabs.onActivated.addListener(webpg.utils.tabListener.selectListener);
                if (closeListener !== null)
                  chrome.tabs.onRemoved.addListener(closeListener);
            }
        },

        openListener: function(event) {
            if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                var browser = gBrowser.getBrowserForTab(event.target);
                browser._webpgTabID = ++webpg.background.tabIndex;
            } else if (webpg.utils.detectedBrowser.product === 'chrome') {
                webpg.utils.log("opened a new tab with id:", event.id);
            }
        },

        selectListener: function(event) {
            if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                var browser = gBrowser.getBrowserForTab(event.target);
                webpg.utils.log("checking for headers in tab: " + browser._webpgTabID);
                if (browser._webpgDisplayAction)
                    webpg.utils.tabs.pageAction.show({'tabId': browser._webpgTabID});
                else
                    webpg.utils.tabs.pageAction.hide({'tabId': browser._webpgTabID});
            } else if (webpg.utils.detectedBrowser.product === 'chrome') {
                webpg.utils.log("a tab has been selected with tab id:", event.tabId);
            }
        },

        closeListener: function(event) {
            if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                var browser = gBrowser.getBrowserForTab(event.target);
                webpg.utils.log("closing tab with id: " + browser._webpgTabID);
            } else if (webpg.utils.detectedBrowser.product === 'chrome') {
                webpg.utils.log("a tab has been closed with tab id:", event);
            }
        }
    },

    keylistTextSearch: function(val, keylist) {
        // Convert some items of val
        val = val.replace(/\\/g, "\\\\").
                replace(/\./g, "\\.").
                replace(/\*/g, "\.*?");
        // Create an empty object that will hold the keys matching
        //  the search string
        var searchResults = {},
            searchStrs, // Plural
            searchStr, // Singular
            locate;
        // Determine if this is a compound search
        var compound = (val.search("&&") > -1);
        if (compound)
            searchStrs = val.split(" && ");
        else
            searchStrs = val.split(" & ");
        // Iterate through the keys in the keylist to preform
        //  our search
        for (var key in keylist) {
            // The instance of the current key object
            var keyobj = keylist[key];
            // Convert the key object to a string
            var keyobjStr = JSON.stringify(keyobj).toLowerCase()
                .replace(/\"signatures\"\:.*?\}\}\,/gim, " ");
            // Check if this is a compound search
            if (compound) {
                // Set a flag to determine if all of the search words
                //  were located
                var allfound = true;
                // Iterate through each of the search words.
                for (searchStr in searchStrs) {
                    // Determine if this search word is a
                    //  property:value item
                    if (searchStrs[searchStr].search(":") > -1) {
                        // Format the property:value search item
                        //  to a compatible format
                        searchStrM = webpg.utils.formatSearchParameter(
                            searchStrs[searchStr]
                        );
                    } else {
                        searchStrM = false;
                    }
                    locate = (searchStrM) ? searchStrM
                        : searchStrs[searchStr];
                    if (keyobjStr.search(locate) > -1 ||
                    keyobjStr.search(locate.replace(":\"", ":")) > -1) {
                        allfound = false;
                    }
                }
                if (allfound)
                    searchResults[key] = keyobj;
            } else {
                for (searchStr in searchStrs) {
                    if (searchStrs[searchStr].search(":") > -1) {
                        // Format the property:value search item
                        //  to a compatible format
                        searchStrM = webpg.utils.formatSearchParameter(
                            searchStrs[searchStr]
                        );
                    } else {
                        searchStrM = false;
                    }
                    locate = (searchStrM) ? searchStrM
                        : searchStrs[searchStr];
                    if (keyobjStr.search(locate) > -1 ||
                    keyobjStr.search(locate.replace(":\"", ":")) > -1) {
                        searchResults[key] = keyobj;
                        break;
                    }
                }
            }
        }

        return (val.length > 0) ? searchResults : null;
    },

    getTrustStatus: function() {
        var statusText = '';
        validchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        for (var i = 0; i < 4; i++)
            statusText += validchars.charAt(Math.floor(Math.random() * validchars.length));

        return statusText;
    },

    setStatusBarText: function(statusText) {
        if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
            webpg.utils.sendRequest({'msg': 'updateStatusBar', 'statusText': statusText});
        } else if (webpg.utils.detectedBrowser.vendor === 'google') {
            webpg.utils.sendRequest({"msg": "setBadgeText", "badgeText": statusText});
        }
    },

};

webpg.descript = function(html) { return (html || "").replace(/\<script(.|\n)*?\>(.|\n)*?\<\/script\>/g, ""); };

webpg.utils.init();

/* ]]> */
