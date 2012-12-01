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
        if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            // if the plugin is already present, remove it from the DOM
            if (document.getElementById("webpgPlugin"))
                document.body.removeChild(document.getElementById("webpgPlugin"));
            embed = document.createElement("embed");
            embed.id = "webpgPlugin";
            embed.type = "application/x-webpg";
            document.body.appendChild(embed);
        }

        webpg.plugin = document.getElementById("webpgPlugin");
        console.log("my plugin returned: " + webpg.plugin.valid + "; version " + webpg.plugin.version);

        if (webpg.plugin.valid && !webpg.plugin.webpg_status["error"]) {
            webpg.plugin.gpgSetHomeDir(gnupghome);
            webpg.plugin.addEventListener("keygenprogress", webpg.background.gpgGenKeyProgress, false);
            webpg.plugin.addEventListener("keygencomplete", webpg.background.gpgGenKeyComplete, false);

            /* Check to make sure all of the enabled_keys are private keys 
                this would occur if the key was enabled and then the secret key was deleted. */
            webpg.secret_keys = webpg.plugin.getPrivateKeyList();
            webpg.enabled_keys = webpg.preferences.enabled_keys.get();
            var secret_keys = webpg.secret_keys;
            var enabled_keys = webpg.enabled_keys;
            for (key in enabled_keys){
                if (enabled_keys[key] in secret_keys == false){
                    webpg.preferences.enabled_keys.remove(enabled_keys[key]);
                }
            }
            console.log("background initted");
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

        if (!sender.tab)
            sender.tab = {'id': -1}

        switch(request.msg) {
            // Show the page action for the tab that the sender (content script) was on.
            case 'enabled':
                console.log(webpg.preferences.webpg_enabled.get());
                response = {'enabled': webpg.preferences.webpg_enabled.get() };
                //console.log(response);
                break;

            case 'decorate_inline':
                response = {'decorate_inline':
                    webpg.preferences.decorate_inline.get()
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
                var signing_key = webpg.preferences.default_key.get()
                var sign_status = webpg.plugin.gpgSignText([signing_key],
                    request.selectionData.selectionText, 2);
                response = sign_status;
                if (!sign_status.error && sign_status.data.length > 0) {
                    if (typeof(request.message_event)=='undefined' || !request.message_event == "gmail") {
                        webpg.utils.tabs.sendRequest(sender.tab, {'msg': 'insertSignedData',
                            'data': sign_status.data,
                            'pre' : request.selectionData.pre_selection,
                            'post' : request.selectionData.post_selection});
                    }
                }
                break;

            case 'verify':
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
                    sig_fp = response.signatures[sig].fingerprint;
                    key_request = webpg.plugin.getNamedKey(sig_fp);
                    response.signatures[sig].public_key = key_request;
                }
                if (request.message_event && request.message_event == "context") {
                    if (response.gpg_error_code == "11") {
                        response = webpg.plugin.gpgDecrypt(content);
                        for (sig in response.signatures) {
                            sig_fp = response.signatures[sig].fingerprint;
                            key_request = webpg.plugin.getNamedKey(sig_fp);
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
                if (request.temp_context) {
                    temp_path = webpg.plugin.getTemporaryPath();
                    if (!temp_path)
                        temp_path = "/tmp/.gnupg";
                    webpg.plugin.gpgSetHomeDir(temp_path);
                }
                import_status = webpg.plugin.gpgImportKey(request.data);
                if (!import_status.imports.hasOwnProperty(0)) {
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

            case 'encrypt':
                //console.log("encrypt requested");
                if (request.keyid) {
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.keyid, 0);
                } else if (request.recipients) {
                    //console.log(request.data, request.recipients);
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.recipients, 0);
                } else {
                    response = "";
                }
                //console.log(response);
                if (typeof(request.message_event)=='undefined' || !request.message_event == "gmail")
                    webpg.utils.tabs.sendRequest(sender.tab, {
                        "msg": "insertEncryptedData", "data": response.data,
                        "iframe_id": request.iframe_id});
                break;

            case 'encryptSign':
                //console.log("encrypt requested");
                if (request.keyid) {
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.keyid, 1);
                } else if (request.recipients) {
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.recipients, 1);
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
                response = webpg.plugin.gpgSymmetricEncrypt(request.data, 0);
                if (typeof(request.message_event)=='undefined' ||
                !request.message_event == "gmail")
                    webpg.utils.tabs.sendRequest(sender.tab, {
                        "msg": "insertEncryptedData", "data": response.data,
                        "iframe_id": request.iframe_id});
                break;

            case 'sendtoiframe':
                //we need to send a message the action badge
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
                var keyResults = {};
                var users = request.users;
                for (var u in users) {
                    keyResults[users[u]] = webpg.plugin.getNamedKey(users[u]);
                }
                response = {'keys': keyResults};
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
                    "msg": "removeiframe", "iframe_id": request.iframe_id});
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
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
            var browserWindow = wm.getMostRecentWindow("navigator:browser");
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
                        label: _('Open Key Manager'),
                        accessKey: 'O',
                        popup: null,
                        callback: function() {
                            webpg.utils.openNewTab(webpg.utils.resourcePath +
                                    "XULContent/options.xul?options_tab=1")
                        }
                    }] : [];
            var priority = nb.PRIORITY_INFO_MEDIUM;
            nb.appendNotification(message, 'keygen-complete',
                 'chrome://webpg-firefox/skin/images/webpg-32.png',
                  priority, buttons);
        } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
            var title = (valid) ? "WebPG - " + _("Key Generation Complete") + "!" :
                _("WebPG Key Generation Failed") + "!";
            var message = (valid) ? _("The generation of your new key is now complete") + "." :
                _("Key Generation") + " " + data;
            var notification = webkitNotifications.createNotification(
              'skin/images/webpg-48.png',
              title,
              message
            );
            notification.show();
        }
    },

}

// Listen for the creation of the background DOM and then init webpg.background
window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    webpg.background.init();
}, false);

// Listen for the content script to send messages to the background page.
webpg.utils._onRequest.addListener(webpg.background._onRequest);
/* ]]> */
