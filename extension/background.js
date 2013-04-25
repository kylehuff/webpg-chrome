/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class: webpg.background
        The background page runs within the context of the browser and handles
        communication between privileged pages/content and unprivileged pages.
*/
webpg.background = {

    /*
        Function: init
            Sets up the NPAPI plugin and initializes WebPG
    */
    init: function() {
        var _ = webpg.utils.i18n.gettext;

        var gnupghome = (webpg.preferences.gnupghome.get() != -1 &&
            webpg.preferences.gnupghome.get()) ? webpg.preferences.gnupghome.get() : "";

        // information and source code for the plugin can be found here:
        //      https://github.com/kylehuff/webpg-npapi
        if (navigator.userAgent.toLowerCase().search("chrome") > -1 ||
            navigator.userAgent.toLowerCase().search("opera") > -1) {
            // if the plugin is already present, remove it from the DOM
            if (document.getElementById("webpgPlugin"))
                document.body.removeChild(document.getElementById("webpgPlugin"));
            var embed = document.createElement("embed");
            embed.id = "webpgPlugin";
            embed.type = "application/x-webpg";
            document.body.appendChild(embed);
        }

        webpg.plugin = document.getElementById("webpgPlugin");
        console.log("WebPG NPAPI Plugin valid: " + webpg.plugin.valid + "; version " + webpg.plugin.version);

        // Set the users preferred option for the GnuPG binary
        if (webpg.plugin.valid) {
            var gnupgbin = webpg.preferences.gnupgbin.get();
            if (gnupgbin.length > 1) {
                webpg.plugin.gpgSetBinary(gnupgbin);
                console.log("Setting GnuPG binary to user value: '" + gnupgbin + "'");
            }
            var gpgconf = webpg.preferences.gpgconf.get();
            if (gpgconf.length > 1) {
                webpg.plugin.gpgSetGPGConf(gpgconf);
                console.log("Setting GPGCONF binary to user value: '" + gpgconf + "'");
            }
        }
        
        if (webpg.plugin.valid && !webpg.plugin.webpg_status["error"]) {
            if (gnupghome.length > 0)
                console.log("Setting GnuPG home directory to user value: '" + gnupghome + "'");
            if (webpg.plugin.webpg_status.openpgp_detected)
                console.log("Protocol OpenPGP is valid; v" + webpg.plugin.webpg_status.OpenPGP.version);
            if (webpg.plugin.webpg_status.gpgconf_detected)
                console.log("Protocol GPGCONF is valid; v" + webpg.plugin.webpg_status.GPGCONF.version); 
            webpg.plugin.gpgSetHomeDir(gnupghome);
            webpg.plugin.addEventListener("keygenprogress", webpg.background.gpgGenKeyProgress, false);
            webpg.plugin.addEventListener("keygencomplete", webpg.background.gpgGenKeyComplete, false);

            /* Check to make sure all of the enabled_keys are private keys 
                this would occur if the key was enabled and then the secret key was deleted. */
            webpg.default_key = webpg.preferences.default_key.get();
            webpg.secret_keys = webpg.plugin.getPrivateKeyList();
            webpg.preferences.enabled_keys.clear();
            for (var sKey in webpg.secret_keys) {
                webpg.preferences.enabled_keys.add(sKey);
                webpg.secret_keys[sKey].default = (sKey == webpg.default_key);
            }
            webpg.enabled_keys = webpg.preferences.enabled_keys.get();
//            var secret_keys = webpg.secret_keys;
//            var enabled_keys = webpg.enabled_keys;
//            for (var key in enabled_keys){
//                if (enabled_keys[key] in secret_keys == false){
//                    webpg.preferences.enabled_keys.remove(enabled_keys[key]);
//                }
//            }
            webpg.preferences.group.refresh_from_config();
            if (webpg.utils.detectedBrowser['vendor'] == 'mozilla'
            && webpg.utils.detectedBrowser['product'] != 'thunderbird') {
                webpg.background.tabIndex = 100;
                webpg.utils.tabListener.add();
            }
            console.log("WebPG background initialized");
        } else {
            if (webpg.plugin.valid == undefined) {
                webpg.plugin.webpg_status = {
                    "error": true,
                    "gpg_error_code": -1,
                    "error_string": _("WebPG Plugin failed to load"),
                    "file": "webpgPluginAPI.cpp",
                    "line": -1,
                }
            }
            // Hide the plugin element or it will FUBAR the content window
            //  on firefox.
            if (webpg.utils.detectedBrowser["vendor"] == "mozilla")
                document.getElementById("webpgPlugin").style.display = "none";
            webpg.utils.openNewTab(webpg.utils.resourcePath + "error.html");
        }
    },

    /*
        Function: _onRequest
            Called when a message is passed to the page
    */
    // Called when a message is passed.
    _onRequest: function(request, sender, sendResponse) {
        // refresh the value of gnupghome
        var gnupghome = (webpg.preferences.gnupghome.get() != -1 &&
            webpg.preferences.gnupghome.get()) ? webpg.preferences.gnupghome.get() : "";

        // set the default response to null
        var response = null;
        if (sender==undefined)
            sender = {};

        if (webpg.utils.detectedBrowser['vendor'] == 'mozilla'
        && webpg.utils.detectedBrowser['product'] != 'thunderbird') {

            try {
                if (webpg.utils.detectedBrowser['product'] == 'conkeror')
                    var tabID = window.buffers.current.browser._webpgTabID;
                else
                    var tabID = gBrowser.getBrowserForDocument(sender.defaultView.top.content.document)._webpgTabID;
            } catch (err) {
            }

            sender.tab = {
                'id': tabID,
                'selected': true,
            }
        }

        if (!sender.tab)
            sender.tab = {'id': -1}

        switch(request.msg) {
            // Show the page action for the tab that the sender (content script) was on.
            case 'enabled':
                response = {'enabled': webpg.preferences.webpg_enabled.get() };
                //console.log(response);
                break;

            case 'decorate_inline':
                response = {'decorate_inline':
                    webpg.preferences.decorate_inline.get(),
                    'mode': webpg.preferences.decorate_inline.mode(),
                    'render_toolbar': (webpg.preferences.render_toolbar.get() == "true"),
                };
                break;

            case 'gmail_integration':
                response = {'gmail_integration':
                    webpg.preferences.gmail_integration.get(),
                    'sign_gmail': webpg.preferences.sign_gmail.get()
                };
                break;

            case 'enabled_keys':
                response = webpg.preferences.enabled_keys.get();
                break;

            case 'default_key':
                response = webpg.preferences.default_key.get();
                break;

            case 'public_keylist':
                response = webpg.plugin.getPublicKeyList();
                break;

            case 'private_keylist':
                response = webpg.secret_keys;
                break;

            case 'newtab':
                var index = null;
                if (typeof(sender)!='undefined' && sender.tab) {
                    index = sender.tab.index;
                } else {
                    chrome.tabs.getSelected(null, function(tab) { 
                        webpg.utils.openNewTab(request.url, tab.index);
                    });
                    break;
                }
                response = webpg.utils.openNewTab(request.url, index);
                break;

            case 'getTabInfo':
                response = (sender.tab) ? sender.tab : false;
                break;

            case 'setBadgeText':
                try {
                    chrome.browserAction.setBadgeText({'text': request.badgeText, 'tabId': sender.tab.id});
                } catch (err) {
                    console.log(err.message);
                }
                break;

            case 'updateStatusBar':
                var browserWindow = webpg.utils.mozilla.getChromeWindow();
                if (browserWindow.document.getElementById("webpg-results-trusted-hover")) {
                    browserWindow.document.getElementById("webpg-results-trusted-hover").value = request.statusText;
                    browserWindow.document.getElementById("webpg-results-trusted-hover").style.display = (request.statusText.length > 0) ? '' : 'none';
                }
                break;

            case 'decrypt':
                //console.log("gpgDecrypt requested");
                response = webpg.plugin.gpgDecrypt(request.data);
                for (sig in response.signatures) {
                    sig_fp = response.signatures[sig].fingerprint;
                    key_request = webpg.plugin.getNamedKey(sig_fp);
                    response.signatures[sig].public_key = key_request;
                }
                response.original_text = request.data;
                break;

            case 'sign':
                var signers = (typeof(request.signers)!=undefined
                        && request.signers != null
                        && request.signers.length > 0) ? request.signers : 
                        webpg.preferences.default_key.get() != ""
                            ? [webpg.preferences.default_key.get()] : [];
                var sign_status = webpg.plugin.gpgSignText(signers,
                    request.selectionData.selectionText, 2);
                response = sign_status;
                if (!sign_status.error && sign_status.data.length > 0) {
                    if (typeof(request.message_event)=='undefined' || !request.message_event == "gmail") {
                        webpg.utils.tabs.sendRequest(sender.tab, {'msg': 'insertEncryptedData',
                            'data': sign_status.data,
                            'pre_selection' : request.selectionData.pre_selection,
                            'post_selection' : request.selectionData.post_selection,
                            "iframe_id": request.iframe_id});
                    }
                }
                break;

            case 'verify':
                if (request.data && request.data.length > 0) {
                    var content = request.data;
                    lowerBlock = content.match(/(-----BEGIN PGP.*?)\n.*?\n\n/gim);
                    if (lowerBlock && lowerBlock.length > 1) {
                        content.substr(0, content.indexOf(lowerBlock[1]) + lowerBlock[1].length)
                            + content.substr(content.indexOf(lowerBlock[1]) + lowerBlock[1].length, content.length).replace(/\n\n/gim, "\n");
                    }
                    request.data = content;
                }
                if (request.message_event && request.message_event == "context") {
                    var content = (request.data) ? request.data :
                        request.selectionData.selectionText;
                    response = webpg.plugin.gpgVerify(content);
                    response.original_text = content;
                } else {
                    response = webpg.plugin.gpgVerify(request.data);
                    response.original_text = request.data;
                }
                for (sig in response.signatures) {
                    var sig_fp = response.signatures[sig].fingerprint;
                    var key_request = webpg.plugin.getNamedKey(sig_fp);
                    response.signatures[sig].public_key = key_request;
                }
                if (request.message_event && request.message_event == "context") {
                    if (response.gpg_error_code == "11") {
                        response = webpg.plugin.gpgDecrypt(content);
                        for (sig in response.signatures) {
                            var sig_fp = response.signatures[sig].fingerprint;
                            var key_request = webpg.plugin.getNamedKey(sig_fp);
                            response.signatures[sig].public_key = key_request;
                        }
                    }
                }
                break;

            case 'async-gpgGenKey':
                //console.log("async-gpgGenKey requested");
                var result = webpg.plugin.gpgGenKey(
                        request.data['publicKey_algo'],
                        request.data['publicKey_size'],
                        request.data['subKey_algo'],
                        request.data['subKey_size'],
                        request.data['uid_0_name'],
                        request.data['uid_0_comment'],
                        request.data['uid_0_email'],
                        request.data['key_expire'],
                        request.data['passphrase']
                    );
                response = "queued";
                break;

            case 'async-gpgGenSubKey':
                //console.log("async-gpgGenSubKey requested");
                var result = webpg.plugin.gpgGenSubKey(
                    request.data['key_id'],
                    request.data['subKey_algo'],
                    request.data['subKey_size'],
                    request.data['key_expire'],
                    request.data['sign_flag'],
                    request.data['enc_flag'],
                    request.data['auth_flag']
                );
                response = "queued";
                break;

            case 'doKeyImport':
                //console.log("doKeyImport requested");
                var import_status = {'imports': []};
                if (request.temp_context) {
                    temp_path = webpg.plugin.getTemporaryPath();
                    if (!temp_path)
                        temp_path = "/tmp/.gnupg";
                    webpg.plugin.gpgSetHomeDir(temp_path);
                }
                if (request.external) {
                    for (var key in request.key_array) {
                        try {
                            import_status = webpg.plugin.gpgImportExternalKey(request.key_array[key]);
                        } catch (err) {
                            // do nothing
                        }
                    }
                } else {
                    try {
                        import_status = webpg.plugin.gpgImportKey(request.data);
                    } catch (err) {
                        // do nothing
                    }
                }
                if (import_status.error || !import_status.imports.hasOwnProperty(0)) {
                    //console.log("NO IMPORT; Something failed", request, import_status);
                    import_status['imports'] =
                        { 0 : {
                            'new_key': false,
                            'fingerprint': 'unknown',
                        }
                    }
                }
                if (request.temp_context) {
                    webpg.plugin.gpgSetHomeDir(gnupghome);
                }
                response = {
                    'import_status': import_status
                };
                break;

            case 'insertIntoPrior':
                webpg.utils.tabs.sendRequest(sender.tab, {
                    "msg": "insertIntoPrior",
                    "data": (request.data) ? request.data : null,
                    "iframe_id": request.iframe_id}
                );
                break;

            case 'encrypt':
                var sign = (typeof(request.sign)=='undefined'
                    || request.sign == false) ? 0 : 1;
                var signers = (typeof(request.signers)!=undefined
                        && request.signers != null
                        && request.signers.length > 0) ? request.signers : [];
                if (request.recipients.length > 0) {
                    //console.log(request.data, request.recipients);
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.recipients, sign, signers);
                } else {
                    response = "";
                }
                if (typeof(request.message_event)=='undefined' || !request.message_event == "gmail")
                    webpg.utils.tabs.sendRequest(sender.tab, {
                        "msg": "insertEncryptedData",
                        "data": (response.data) ? response.data : null,
                        "pre_selection": request.pre_selection,
                        "post_selection": request.post_selection,
                        "target_id": request.iframe_id,
                        "iframe_id": request.iframe_id});
                break;

            case 'encryptSign':
                //console.log("encrypt requested");
                if (request.recipients && request.recipients.length > 0) {
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.recipients, 1, request.signers);
                } else {
                    response = "";
                }
                if (typeof(request.message_event)=='undefined' ||
                !request.message_event == "gmail" && 
                response && !response.error)
                    webpg.utils.tabs.sendRequest(sender.tab, {
                        "msg": "insertEncryptedData", "data": response.data,
                        "iframe_id": request.iframe_id});
                break;

            case 'symmetricEncrypt':
                //console.log("symmetric encryption requested");
                response = webpg.plugin.gpgSymmetricEncrypt(request.data, 0, []);
                if (request.message_event == "context" || request.message_event == "editor")
                    webpg.utils.tabs.sendRequest(sender.tab, {
                        "msg": "insertEncryptedData",
                        "data": (response.data) ? response.data : null,
                        "pre_selection": request.pre_selection,
                        "post_selection": request.post_selection,
                        "iframe_id": request.iframe_id});
                break;

            case 'sendtoiframe':
                //we need to send a message the action badge or content script
                if (request.hasOwnProperty("msg_to_pass"))
                    request.msg = request.msg_to_pass;
                else
                    request.msg = "resizeiframe";
                webpg.utils.tabs.sendRequest(sender.tab, request);
                break;

            case 'deleteKey':
                //console.log("deleteKey requested");
                if (request.temp_context) {
                    temp_path = webpg.plugin.getTemporaryPath();
                    if (!temp_path)
                        temp_path = "/tmp/.gnupg";
                    webpg.plugin.gpgSetHomeDir(temp_path);
                }
                if (request.key_type == 'public_key'){
                    response = webpg.plugin.gpgDeletePublicKey(request.key_id);
                } else if (request.key_type == 'private_key'){
                    response = webpg.plugin.gpgDeletePrivateKey(request.key_id);
                }
                if (request.temp_context) {
                    webpg.plugin.gpgSetHomeDir(gnupghome);
                }
                break;

            case 'getNamedKey':
                //console.log("getNamedKey requested");
                if (request.temp_context) {
                    var temp_path = webpg.plugin.getTemporaryPath();
                    if (!temp_path)
                        temp_path = "/tmp/.gnupg";
                    webpg.plugin.gpgSetHomeDir(temp_path);
                }
                response = webpg.plugin.getNamedKey(request.key_id);
                if (request.temp_context) {
                    webpg.plugin.gpgSetHomeDir(gnupghome);
                    real_keyring_items = webpg.plugin.getNamedKey(request.key_id);
                    for (real_keyring_item in real_keyring_items) {
                        for (subkey in real_keyring_items[real_keyring_item].subkeys) {
                            subkey_id = real_keyring_items[real_keyring_item].
                                subkeys[subkey].subkey;
                            if (subkey_id == request.key_id) {
                                response[real_keyring_item].in_real_keyring = true;
                                response[real_keyring_item].real_keyring_item =
                                    real_keyring_items[real_keyring_item];
                            }
                        }
                    }
                }
                break;

            case 'getNamedKeys':
                var userKeys = {};
                var users = request.users;
                var key;
                for (var u=0; u < users.length; u++) {
                    // Pull keys by named user
                    userKeys[users[u]] = [];
                    key = webpg.plugin.getNamedKey(users[u]);
                    if (JSON.stringify(key) !== "{}")
                        userKeys[users[u]] = userKeys[users[u]].concat(key);
                    // Pull keys by named group
                    var group_result = webpg.preferences.group.get(users[u]);
                    for (var group=0; group < group_result.length; group++) {
                        key = webpg.plugin.getNamedKey(group_result[group]);
                        if (JSON.stringify(key) !== "{}")
                            userKeys[users[u]] = userKeys[users[u]].concat(key);
                    }
                }
                response = {'keys': userKeys};
                break;

            case 'export':
                if (request.keyid) {
                    response = webpg.plugin.gpgExportPublicKey(request.keyid).result;
                } else if (request.recipients) {
                    response = "";
                    for (var keyid in request.recipients)
                        response += webpg.plugin.gpgExportPublicKey(
                            request.recipients[keyid]).result + "\n";
                } else {
                    response = "";
                }
                webpg.utils.tabs.sendRequest(sender.tab, {
                    "msg": "insertPublicKey", "data": response,
                    "iframe_id": request.iframe_id});
                break;

            case 'removeiframe':
                webpg.utils.tabs.sendRequest(sender.tab, {
                    "msg": "removeiframe", "iframe_id": request.iframe_id,
                    "dialog_type": request.dialog_type});
                break;

            case 'log':
                response = null;
                console.log("Remote log request recieved; ", request.data);
                break;

            case 'create_menu':
                webpg.utils.contextMenus.removeAll(function() {
                    if ("paste" in request.context_menuitems) {
                        webpg.utils.contextMenus.add(webpg.constants.overlayActions.EXPORT);
                    }
                    if ("sign" in request.context_menuitems) {
                        webpg.utils.contextMenus.add(webpg.constants.overlayActions.PSIGN);
                    }
                    if ("import" in request.context_menuitems) {
                        webpg.utils.contextMenus.add(webpg.constants.overlayActions.IMPORT);
                    }
                    if ("encrypt" in request.context_menuitems) {
                        webpg.utils.contextMenus.add(webpg.constants.overlayActions.CRYPT);
                    }
                    if ("decrypt" in request.context_menuitems) {
                        webpg.utils.contextMenus.add(webpg.constants.overlayActions.DECRYPT);
                    }
                    if ("verify" in request.context_menuitems) {
                        webpg.utils.contextMenus.add(webpg.constants.overlayActions.VERIF);
                    }
                    webpg.utils.contextMenus.add(webpg.constants.overlayActions.OPTS);
                    webpg.utils.contextMenus.add(webpg.constants.overlayActions.MANAGER);
                });
                break;

            case 'delete_menu':
                chrome.contextMenus.removeAll();
                break;

        }
        // Return the response and let the connection be cleaned up.
        sendResponse({'result': response});
    },

    /*
        Function: gpgGenKeyProgress
            Called by webpg-npapi to update the current status of the key generation operation

        Parameters:
            data - <str> The ASCII representation of the current operation status
    */
    gpgGenKeyProgress: function(data) {
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
            var enumerator = wm.getEnumerator(null);

            while(enumerator.hasMoreElements()) {
                var win = enumerator.getNext().QueryInterface(
                    Components.interfaces.nsIDOMChromeWindow
                );
                if (win.content && win.content.document.location.href.search(
                "chrome://webpg-firefox/content/XULContent/options.xul") > -1) {
                    var contentWindow = win.content.document.getElementById(
                        "keylistFrame").contentWindow;
                    var doc = win.content.document.getElementById("keylistFrame")
                        .contentWindow.document;

                    // Attempt to remove the old listener
                    try {
                        doc.body.removeEventListener('progress', contentWindow.webpg.keymanager.progressMsg);
                    } catch (err) {
                        // We don't really care if it didn't already exist
                        console.log(err.message);
                    } finally { 
                        // Add the listener
                        doc.body.addEventListener('progress', contentWindow.webpg.keymanager.progressMsg);
                    }

                    var evtObj = doc.createEvent('CustomEvent');
                    evtObj.initCustomEvent("progress", true, true, {'type': 'progress', 'data': data});
                    doc.body.dispatchEvent(evtObj);
                }
            }
        } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
            var port = chrome.extension.connect({name: "gpgGenKeyProgress"});
            port.postMessage({"type": "progress", "data": data});
            port.disconnect()
        }
    },

    /*
        Function: gpgGenKeyComplete
            Called by webpg-npapi when a given key generation option has completed

        Parameters:
            data - <str> The ASCII representation of the current operation status
    */
    gpgGenKeyComplete: function(data) {
        var _ = webpg.utils.i18n.gettext;
        // Send the data to the GenKeyProgress method
        webpg.background.gpgGenKeyProgress(data);

        var valid = (data == "complete") ?
            true : false;

        // Notify the user
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            var browserWindow = webpg.utils.mozilla.getChromeWindow();
            var message = (valid) ? 'WebPG - ' + _("Key Generation Complete") + '!' :
                "WebPG " + _("Key Generation") + " " + data;
            var nb = browserWindow.getNotificationBox(browserWindow.content);
            var n = nb.getNotificationWithValue('keygen-complete');
            if(n) {
                n.label = message;
            }
            var buttons = (browserWindow.content.document.location.href
                .search(webpg.utils.resourcePath + "XULContent/options.xul") == -1) ?
                    [{
                        'label': _('Open Key Manager'),
                        'accessKey': 'O',
                        'popup': null,
                        'callback': function() {
                            webpg.utils.openNewTab(webpg.utils.resourcePath +
                                    "XULContent/options.xul?options_tab=1")
                        }
                    }] : [];
            var priority = nb.PRIORITY_INFO_MEDIUM;
            nb.appendNotification(message, 'keygen-complete',
                 'chrome://webpg-firefox/skin/images/badges/32x32/webpg.png',
                  priority, buttons);
        } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
            var title = (valid) ? "WebPG - " + _("Key Generation Complete") + "!" :
                _("WebPG Key Generation Failed") + "!";
            var message = (valid) ? _("The generation of your new key is now complete") + "." :
                _("Key Generation") + " " + data;
            var notification = webkitNotifications.createNotification(
              'skin/images/badges/48x48/webpg.png',
              title,
              message
            );
            notification.show();
        }
    },

}

if (webpg.utils.detectedBrowser["product"] == "chrome") {

    webpg.background.navigate = function(url) {
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.update(tab.id, {'url': url});
        });
    };

    chrome.omnibox.onInputEntered.addListener(function(text) {
        var keylist = webpg.plugin.getNamedKey(text);
        var cnt = 0;
        for (key in keylist) {
            cnt++;
            webpg.background.navigate(webpg.utils.resourcePath + "key_manager.html" +
                 "?auto_init=true&tab=-1&openkey=" + keylist[key].fingerprint.substr(-16));
        }
    });

    chrome.omnibox.setDefaultSuggestion({
        description: '<url><match>WebPG Key Search</match></url>'
    });

}

// Listen for the creation of the background DOM and then init webpg.background
window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    webpg.background.init();
    if (webpg.utils.detectedBrowser['product'] == 'thunderbird')
        webpg.utils._onRequest.addListener(webpg.background._onRequest);
}, false);

// Listen for the content script to send messages to the background page.
if (webpg.utils.detectedBrowser['product'] != 'thunderbird')
    webpg.utils._onRequest.addListener(webpg.background._onRequest);
/* ]]> */
