/* <![CDATA[ */
/**
  @property {Object} port A Chrome/Chromium communications port
  @abstract
*/
/**
* @docauthor Kyle L. Huff
* @class webpg
* webpg is main logic controller for WebPG. It runs within the context
* of the browser instance and listens for requests from the WebPG content
* scripts, popups and dialogs.
*
* The background script is the only provider for the WebPG NPAPI plugin object.
*/
if (typeof(webpg)==='undefined') { var webpg = {}; }
/**
  @property {Object} plugin The backend binary component that provides interaction with GnuPG
  @property {Object} plugin.webpg_status The reported status of the NPAPI Plugin object, GnuPG and associated libraries
  @property {Object} plugin.webpg_status.Assuan Information about the detected Assuan installation.
  @property {String} plugin.webpg_status.Assuan.file_name
  @property {String} plugin.webpg_status.Assuan.home_dir
  @property {String} plugin.webpg_status.Assuan.req_version
  @property {String} plugin.webpg_status.Assuan.version
  @property {String} plugin.webpg_status.GNUPGBIN The currently defined GnuPG binary.
  @property {String} plugin.webpg_status.GNUPGHOME The currently dfeined GnuPG home directory.
  @property {Object} plugin.webpg_status.GPGCONF Information about the detected GPGCONF installation
  @property {String} plugin.webpg_status.GPGCONF.file_name The currently defined GPGCONF binary
  @property {String} plugin.webpg_status.GPGCONF.req_version
  @property {String} plugin.webpg_status.GPGCONF.version
  @property {String} plugin.webpg_status.GPGCONFBIN The currently defined GPGCONF binary
  @property {String} plugin.webpg_status.GPGCONFHOME The currently defined GPGCONF home directory
  @property {Object} plugin.webpg_status.OpenPGP Information about the detected OpenPGP installation
  @property {Object} [plugin.webpg_status.UISERVER] Information about the detected UISERVER installation
  @property {Boolean} plugin.webpg_status.error True if an error was detected in loading the plugin or GnuPG
  @property {String} [plugin.webpg_status.extension] The currently detected extension host browser
  @property {Boolean} plugin.webpg_status.extensionize
  @property {String} plugin.webpg_status.gpg_agent_info
  @property {Boolean} plugin.webpg_status.gpgconf_detected
  @property {String} plugin.webpg_status.gpgme_version
  @property {Boolean} plugin.webpg_status.openpgp_detected
  @property {Object} plugin.webpg_status.plugin WebPG NPAPI Plugin Library Information
  @property {Object} plugin.webpg_status.plugin.params Parameters used to initialize the Plugin Object
  @property {String} plugin.webpg_status.plugin.params.id The DOM Element ID of the Plugin Object
  @property {String} plugin.webpg_status.plugin.params.type The MimeType used to load the Plugin Object
  @property {String} plugin.webpg_status.plugin.path The absolute path to the Plugin Object Library
  @property {String} plugin.webpg_status.plugin.source_url The absolute URL to the page that loaded the Plugin Object
  @property {Object} plugin.webpg_status.plugin.version The current version of the Plugin Object

  @property plugin.webpg_status.Example An Example of webpg_status contents

      {
       "Assuan": {
        "file_name": "/run/user/1000/keyring-HpYEFj/gpg",
        "home_dir": "!GPG_AGENT",
        "req_version": "1.0",
        "version": "1.0"
       },
       "GNUPGBIN": "",
       "GNUPGHOME": "",
       "GPGCONF": {
        "file_name": "/usr/bin/gpgconf",
        "req_version": "2.0.4",
        "version": "2.0.20"
       },
       "GPGCONFBIN": "",
       "GPGCONFHOME": "",
       "OpenPGP": {
        "file_name": "/usr/bin/gpg",
        "req_version": "1.4.0",
        "version": "1.4.14"
       },
       "UISERVER": {
        "file_name": "/home/kylehuff/.gnupg/S.uiserver",
        "req_version": "1.0",
        "version": "1.0"
       },
       "error": false,
       "extension": "chrome",
       "extensionize": true,
       "gpg_agent_info": "/run/user/1000/keyring-HpYEFj/gpg:0:1",
       "gpgconf_detected": true,
       "gpgme_version": "1.4.2",
       "openpgp_detected": true,
       "plugin": {
        "params": {
         "id": "webpgPlugin",
         "type": "application/x-webpg"
        },
        "path": "/devel/webpg-chrome/extension/plugins/Linux_x86_64-gcc/npwebpg-ext-v0.7.0-Linux_x86_64-gcc.so",
        "source_url": "chrome-extension://hhaopbphlojhnmbomffjcbnllcenbnih/_generated_background_page.html",
        "version": "0.7.0"
       }
      }

  @member webpg

*/

/**
    @property {webpg.background} background
        The background page runs within the context of the browser and handles
        communication between privileged pages/content and unprivileged pages.
*/
webpg.background = {

    /**
        @method
            Sets up the NPAPI plugin and initializes WebPG
        @member webpg.background
    */
    init: function() {
        var _ = webpg.utils.i18n.gettext,
            gnupghome = webpg.preferences.gnupghome.get();
        webpg.extensionid = webpg.utils.extension.id();

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

        if (webpg.utils.detectedBrowser.vendor === 'google' &&
            webpg.utils.detectedBrowser.version &&
            parseInt(webpg.utils.detectedBrowser.version.split('.')[0]) >= 35) { // Check if this Chrome/Chromium version 35 or higher
            webpg.nativeMessaging.init();
            webpg.plugin.testValid();
        } else {
            webpg.plugin = document.getElementById("webpgPlugin");
            webpg.plugin.webpg_status = webpg.plugin.get_webpg_status();
            if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                try {
                    webpg.plugin.QueryInterface(Components.interfaces.nsIObjectLoadingContent).playPlugin();
                } catch (err) {
                }
            }
        }

        webpg.plugin.get_webpg_status(function(res) {
          webpg.plugin.webpg_status = res;
          webpg.utils.log('INFO')("WebPG NPAPI Plugin valid: " + webpg.plugin.valid + "; version " + webpg.plugin.version);

          // Set the users preferred option for the GnuPG binary
          if (webpg.plugin.valid) {
              var gnupgbin = webpg.preferences.gnupgbin.get();
              if (gnupgbin.length > 1) {
                  webpg.plugin.gpgSetBinary(gnupgbin);
                  webpg.utils.log('INFO')("Setting GnuPG binary to user value: '" + gnupgbin + "'");
              }
              var gpgconf = webpg.preferences.gpgconf.get();
              if (gpgconf.length > 1) {
                  webpg.plugin.gpgSetGPGConf(gpgconf);
                  webpg.utils.log('INFO')("Setting GPGCONF binary to user value: '" + gpgconf + "'");
              }
          }

          if (webpg.plugin.valid && !webpg.plugin.webpg_status.error) {
            // Regulates the display of the banner; increment to display welcome notice/version news
            this.banner_version = "9.4";

            if (gnupghome.length > 0)
                webpg.utils.log('INFO')("Setting GnuPG home directory to user value: '" + gnupghome + "'");
            if (webpg.plugin.webpg_status.openpgp_detected)
                webpg.utils.log('INFO')("Protocol OpenPGP is valid; v" + webpg.plugin.webpg_status.OpenPGP.version);
            if (webpg.plugin.webpg_status.gpgconf_detected)
                webpg.utils.log('INFO')("Protocol GPGCONF is valid; v" + webpg.plugin.webpg_status.GPGCONF.version);
            //webpg.plugin.gpgSetHomeDir(gnupghome);
            webpg.plugin.addEventListener("keygenprogress", webpg.background.gpgGenKeyProgress, false);
            webpg.plugin.addEventListener("keygencomplete", webpg.background.gpgGenKeyComplete, false);
            webpg.plugin.addEventListener("statusprogress", webpg.background.keylistProgress, false);

            /* Check to make sure all of the enabled_keys are private keys
                this would occur if the key was enabled and then the secret key was deleted. */
            webpg.preferences.default_key.get(function(res) {
              webpg.default_key = res.value;
              webpg.public_keys = {};
              webpg.secret_keycount = 0;
              webpg.plugin.getPrivateKeyList(true, false, function(res) {
                webpg.secret_keys = res;
                webpg.preferences.enabled_keys.clear();
                webpg.secret_keycount = 0;
                for (var sKey in webpg.secret_keys) {
                    webpg.secret_keycount++;
                    if (webpg.secret_keys[sKey].disabled === false)
                        webpg.preferences.enabled_keys.add(sKey);
                    webpg.secret_keys[sKey].default = (sKey === webpg.default_key);
                }
                webpg.enabled_keys = webpg.preferences.enabled_keys.get();
              });
              webpg.preferences.group.refresh_from_config();
              if (webpg.utils.detectedBrowser.vendor === 'mozilla' &&
                webpg.utils.detectedBrowser.product !== 'thunderbird') {
                  webpg.background.tabIndex = 100;
                  webpg.utils.tabListener.add();
              }
              webpg.utils.log('INFO')("WebPG background initialized");
            });
            // Display the welcome notice if appropriate
            var banner_version = webpg.preferences.banner_version.get();
            if (banner_version === 0 || !banner_version ||
              banner_version === "" ||
              parseFloat(banner_version) < parseFloat(this.banner_version)) {
                webpg.preferences.banner_version.set(this.banner_version);
                if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
                    webpg.appcontent = document.getElementById("appcontent") || document;
                    webpg.appcontent.addEventListener("DOMContentLoaded", function(aEvent) {
                        webpg.utils.openNewTab(webpg.utils.resourcePath + "notice.html");
                        webpg.appcontent.removeEventListener(aEvent.type, arguments.callee, false);
                    }, false);
                } else {
                    webpg.utils.openNewTab(webpg.utils.resourcePath + "notice.html");
                }
            }
          } else {
            if (webpg.plugin.valid === undefined) {
                webpg.plugin.webpg_status = {
                    "error": true,
                    "gpg_error_code": -1,
                    "error_string": _("WebPG Plugin failed to load"),
                    "file": "webpgPluginAPI.cpp",
                    "line": -1,
                };
            }
//            if (webpg.utils.detectedBrowser.vendor === 'mozilla') {
//                var prefs = Components.classes["@mozilla.org/preferences-service;1"]
//                        .getService(Components.interfaces.nsIPrefService);
//                prefs = prefs.getBranch("plugins.");
//                if (prefs.getBoolPref("click_to_play") === true) {
//                    webpg.plugin.webpg_status = {
//                        "error": true,
//                        "gpg_error_code": -2,
//                        "error_string": _("WebPG Plugin failed to load"),
//                        "file": "background.js",
//                        "line": new Error().lineNumber,
//                    };
//                }
//                // Hide the plugin element or it will FUBAR the content window
//                //  on firefox.
//                document.getElementById("webpgPlugin").style.display = "none";
//                webpg.appcontent = document.getElementById("appcontent") || document;
//                webpg.appcontent.addEventListener("DOMContentLoaded", function(aEvent) {
//                    webpg.utils.openNewTab(webpg.utils.resourcePath + "error.html");
//                    webpg.appcontent.removeEventListener(aEvent.type, arguments.callee, false);
//                }, false);
//            } else {
                webpg.utils.openNewTab(webpg.utils.resourcePath + "error.html");
//            }
          }
        });
    },

    /**
        @method _onRequest
            Called when a message is passed to the page
        @member webpg.background
    */
    // Called when a message is passed.
    _onRequest: function(request, sender, sendResponse) {
        if (webpg.utils.detectedBrowser.vendor === 'google' &&
            sender.id !== webpg.extensionid)
          return true;

        // refresh the value of gnupghome
        var gnupghome = webpg.preferences.gnupghome.get(),
            tabID = -1,
            bypassSendResult = false;

        // set the default response to null
        var response = null;
        if (sender===undefined)
            sender = {};

        if (webpg.utils.detectedBrowser.vendor === 'mozilla' &&
         webpg.utils.detectedBrowser.product !== 'thunderbird') {

            try {
                if (webpg.utils.detectedBrowser.product === 'conkeror')
                    tabID = window.buffers.current.browser._webpgTabID;
                else
                    tabID = gBrowser.getBrowserForDocument(sender.defaultView.top.content.document)._webpgTabID;
            } catch (err) {
            }
        }

        if (!sender.tab) {
            sender.tab = {
                'id': tabID,
                'selected': true,
            };
        }

        switch(request.msg) {
            // Show the page action for the tab that the sender (content script) was on.
            case 'enabled':
                response = {'enabled': webpg.preferences.webpg_enabled.get() };
                break;

            case 'preferences':
                response = {'error': false};
                if (webpg.preferences.hasOwnProperty(request.item) === false) {
                    response.error = true;
                    response.result = "No preference matching " + request.action;
                } else {
                  if (request.action === 'set') {
                      response.result = webpg.preferences[request.item].set(request.value || '');
                  } else if (request.action === 'get') {
                      response = webpg.preferences[request.item].get(request.param);
                  }
                }
                break;

            case 'decorate_inline':
                response = {'decorate_inline':
                    webpg.preferences.decorate_inline.get(),
                    'mode': webpg.preferences.decorate_inline.mode(),
                    'render_toolbar': (webpg.preferences.render_toolbar.get() === "true"),
                };
                break;

            case 'gmail_integration':
                response = {'gmail_integration':
                    webpg.preferences.gmail_integration.get(),
                    'sign_gmail': webpg.preferences.sign_gmail.get(),
                    'encrypt_to_self': webpg.preferences.encrypt_to_self.get()
                };
                break;

            case 'enabled_keys':
                response = webpg.preferences.enabled_keys.get();
                break;

            case 'default_key':
                response = webpg.preferences.default_key.get();
                break;

            case 'public_keylist':
                webpg.background.keylist_tab = sender.tab.id;
                webpg.background.requesting_iframe = request.iframe_id;
                webpg.plugin.getPublicKeyList(request.fastlistmode, request.threaded, function(response) {
                  sendResponse({'result': response});
                  webpg.background.keylistProgress(response);
                });
                bypassSendResult = true;
                break;

            case 'private_keylist':
                response = webpg.secret_keys;
                break;

            case 'newtab':
                var index = null;
                if (typeof(sender)!=='undefined' && sender.tab) {
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
                    webpg.utils.log('ERROR')(err.message);
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
                webpg.utils.log('INFO')("gpgDecrypt requested");
                webpg.plugin.gpgDecrypt(request.data, function(response) {
                  response.original_text = request.data;
                  if (response.error === true)
                    sendResponse({'result': response});
                  else {
                    var sig_list = [];
                    if (response.signatures) {
                      for (var sig in response.signatures)
                          sig_list.push(response.signatures[sig].fingerprint);

                      sig_list.map(function(sig, i) {
                        webpg.plugin.getNamedKey(sig, false, false, function(key) {
                            if (JSON.stringify(key) !== "{}")
                                response.signatures[i].public_key = key;
                            if (i === sig_list.length -1)
                              sendResponse({'result': response});
                        });
                      });
                    } else {
                      sendResponse({'result': response});
                    }
                  }
                });
                return true;
                break;

            case 'sign':
                var signers = (typeof(request.signers)!=='undefined' &&
                        request.signers !== null &&
                        request.signers.length > 0) ? request.signers :
                        webpg.preferences.default_key.get() !== "" ?
                            [webpg.preferences.default_key.get()] : [];
                webpg.plugin.gpgSignText(request.selectionData.selectionText,
                    signers, 2, function(sign_status) {
                      response = sign_status;
                      if (!sign_status.error && sign_status.data.length > 0) {
                        if (typeof(request.message_event)==='undefined' ||
                            request.message_event !== "gmail" ||
                            request.message_event !== "roundcube") {
                          webpg.utils.tabs.sendRequest(sender.tab, {
                            'msg': 'insertEncryptedData',
                            'data': sign_status.data,
                            'pre_selection' : (request.selectionData.pre_selection || ""),
                            'post_selection' : (request.selectionData.post_selection || ""),
                            "iframe_id": request.iframe_id
                          });
                        }
                      }
                    }
                );
                break;

            case 'verify':
                var content,
                    plaintext = (request.plaintext!==undefined) ?
                      request.plaintext : null;
                if (request.data && request.data.length > 0) {
                    content = request.data.replace(/^([-]+)(?=[\r\n]|\s\n)/gm, '\\$1');
                    var lowerBlock = content.match(/(-----BEGIN PGP.*?)\n.*?\n\n/gim);
                    if (lowerBlock && lowerBlock.length > 1) {
                        content.substr(0, content.indexOf(lowerBlock[1]) + lowerBlock[1].length) +
                            content.substr(content.indexOf(lowerBlock[1]) + lowerBlock[1].length, content.length).replace(/\n\n/gim, "\n");
                    }
                    request.data = content;
                }
                function checkSignatures(response) {
                  if (response.signatures === null) {
                    sendResponse({'result': response});
                    return true;
                  }
                  var sig_list = [],
                      userKeys = [];
                  for (var sig in response.signatures) {
                      sig_list.push(response.signatures[sig].fingerprint);
                  }
                  sig_list.map(function(sig, i) {
                    // Pull keys by named user
                    userKeys[sig] = [];
                    webpg.plugin.getNamedKey(sig, false, false, function(key) {
                      if (JSON.stringify(key) !== "{}")
                          response.signatures[i].public_key = key;
                      if (i === sig_list.length -1) {
                        sendResponse({'result': response});
                      }
                    });
                  });
                };
                function responseMethod(response) {
                  response.original_text = (request.message_event === "context") ? content : request.data;
                  if (response.gpg_error_code === 11 || response.gpg_error_code === 152) {
                    if (request.message_event && request.message_event === "context") {
                      webpg.plugin.gpgDecrypt(content, function(res) {
                        res.original_text = (request.message_event === "context") ? content : request.data;
                        checkSignatures(res);
                      });
                    } else {
                      response.message_type = "encrypted_message";
                      sendResponse({'result': response});
                    }
                  } else if (response.gpg_error_code === 58) {
                    sendResponse({'result': response});
                  } else {
                    checkSignatures(response);
                  }
                };
                if (request.message_event && request.message_event === "context") {
                    content = (request.data) ? request.data :
                        request.selectionData.selectionText;
                    content = content.replace(/^([-]+)(?=[\r\n]|\s\n)/gm, '\\$1');
                    webpg.plugin.gpgVerify(content, plaintext, responseMethod);
                } else {
                    webpg.plugin.gpgVerify(request.data, plaintext, responseMethod);
                }
                return true;
                break;

            case 'async-gpgGenKey':
                webpg.utils.log('INFO')("async-gpgGenKey requested");
                webpg.plugin.gpgGenKey(
                        request.data.publicKey_algo,
                        request.data.publicKey_size,
                        request.data.subKey_algo,
                        request.data.subKey_size,
                        request.data.uid_0_name,
                        request.data.uid_0_comment,
                        request.data.uid_0_email,
                        request.data.key_expire,
                        request.data.passphrase
                );
                response = "queued";
                break;

            case 'async-gpgGenSubKey':
                webpg.utils.log('INFO')("async-gpgGenSubKey requested");
                webpg.plugin.gpgGenSubKey(
                    request.data.key_id,
                    request.data.subKey_algo,
                    request.data.subKey_size,
                    request.data.key_expire,
                    request.data.sign_flag,
                    request.data.enc_flag,
                    request.data.auth_flag
                );
                response = "queued";
                break;

            case 'doKeyImport':
                webpg.utils.log('INFO')("doKeyImport requested");
                request.bypassSendResult = true;
                function processResult(import_status) {
                  if (import_status.error || !import_status.imports ||
                    !import_status.imports.hasOwnProperty(0)) {
                      import_status.imports =
                          { 0 : {
                              'new_key': false,
                              'fingerprint': 'unknown',
                          }
                      };
                  }
                  if (request.temp_context)
                      webpg.plugin.gpgSetHomeDir(gnupghome);
                  sendResponse({'result': {'import_status': import_status}});
                };
                function attemptImport() {
                      try {
                        if (webpg.plugin.webpg_status.plugin.type !== "NATIVEHOST") {
                          var import_status = webpg.plugin.gpgImportKey(request.data);
                          processResult(import_status);
                        } else {
                          webpg.plugin.gpgImportKey(request.data, processResult);
                        }
                      } catch (err) {
                          webpg.utils.log('ERROR')(err);
                      }
                };
                if (request.temp_context) {
                    webpg.plugin.getTemporaryPath(function(temp_path) {
                      if (!temp_path)
                          temp_path = "/tmp/.gnupg";
                      if (webpg.plugin.webpg_status.plugin.type !== "NATIVEHOST") {
                        webpg.plugin.gpgSetHomeDir(temp_path);
                        attemptImport();
                      } else {
                        webpg.plugin.gpgSetHomeDir(temp_path, attemptImport);
                      }
                    });
                } else {
                  attemptImport();
                }
                return true;
                break;

            case 'insertIntoPrior':
                webpg.utils.tabs.sendRequest(sender.tab, {
                    "msg": "insertIntoPrior",
                    "data": (request.data) ? request.data : null,
                    "iframe_id": request.iframe_id}
                );
                break;

            case 'encrypt':
                var sign = (typeof(request.sign)==='undefined' ||
                      request.sign === false) ? 0 : 1;
                var signers = (typeof(request.signers)!=='undefined' &&
                        request.signers !== null &&
                        request.signers.length > 0) ? request.signers : [];
                if (request.recipients.length > 0) {
                    webpg.utils.log('INFO')(request.data, request.recipients);
                    webpg.plugin.gpgEncrypt(
                        request.data,
                        request.recipients,
                        sign,
                        signers,
                        function(response) {
                          webpg.utils.log('INFO')(response);
                          if (typeof(request.message_event)==='undefined' || request.message_event !== "gmail")
                              webpg.utils.tabs.sendRequest(sender.tab, {
                                  "msg": "insertEncryptedData",
                                  "data": (response.data) ? response.data : null,
                                  "pre_selection": request.pre_selection,
                                  "post_selection": request.post_selection,
                                  "target_id": request.iframe_id,
                                  "iframe_id": request.iframe_id});
                        }
                    );
                    request.bypassSendResult = true;
                    return true;
                } else {
                    response = "";
                }
                break;

            case 'encryptSign':
                webpg.utils.log('INFO')("encrypt requested");
                if (request.recipients && request.recipients.length > 0) {
                    response = webpg.plugin.gpgEncrypt(request.data,
                        request.recipients, 1, request.signers);
                } else {
                    response = "";
                }
                if (typeof(request.message_event)==='undefined' ||
                request.message_event !== "gmail" &&
                response && !response.error)
                    webpg.utils.tabs.sendRequest(sender.tab, {
                        "msg": "insertEncryptedData", "data": response.data,
                        "iframe_id": request.iframe_id});
                break;

            case 'symmetricEncrypt':
                webpg.utils.log('INFO')("symmetric encryption requested");
                var signers = (typeof(request.signers)!=='undefined' &&
                        request.signers !== null &&
                        request.signers.length > 0) ? request.signers : [];
                var sign = (signers.length > 0) ? 1 : 0;
                webpg.plugin.gpgSymmetricEncrypt(request.data, sign, signers, function(response) {
                  webpg.utils.log('INFO')(request);
                  if (request.message_event === "context" || request.message_event === "editor")
                      webpg.utils.tabs.sendRequest(sender.tab, {
                          "msg": "insertEncryptedData",
                          "data": (response.data) ? response.data : null,
                          "pre_selection": request.pre_selection,
                          "post_selection": request.post_selection,
                          "iframe_id": request.iframe_id});
                });
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
                webpg.utils.log('INFO')("deleteKey requested");
                if (request.temp_context) {
                    temp_path = webpg.plugin.getTemporaryPath();
                    if (!temp_path)
                        temp_path = "/tmp/.gnupg";
                    webpg.plugin.gpgSetHomeDir(temp_path);
                }
                if (request.key_type === 'public_key'){
                    response = webpg.plugin.gpgDeletePublicKey(request.key_id);
                } else if (request.key_type === 'private_key'){
                    response = webpg.plugin.gpgDeletePrivateKey(request.key_id);
                }
                if (request.temp_context) {
                    webpg.plugin.gpgSetHomeDir(gnupghome);
                }
                break;

            case 'getNamedKey':
                webpg.utils.log('INFO')("getNamedKey requested");
                request.bypassSendResult = true;
                function getNamedKey() {
                  webpg.plugin.getNamedKey(request.key_id, false, false, function(response) {
                    if (request.temp_context) {
                      if (webpg.plugin.webpg_status.plugin.type !== "NATIVEHOST") {
                        webpg.plugin.gpgSetHomeDir(gnupghome);
                        webpg.plugin.getNamedKey(request.key_id, false, false, function(real_keyring_item) {
                          for (var subkey in real_keyring_item.subkeys) {
                            var subkey_id = real_keyring_item.
                              subkeys[subkey].subkey;
                            if (subkey_id === request.key_id) {
                              response.in_real_keyring = true;
                              response.real_keyring_item =
                                  real_keyring_item;
                            }
                          }
                          sendResponse({'result': response});
                        });
                      } else {
                        webpg.plugin.gpgSetHomeDir(gnupghome, function() {
                          webpg.plugin.getNamedKey(request.key_id, false, false, function(real_keyring_item) {
                            for (var subkey in real_keyring_item.subkeys) {
                              var subkey_id = real_keyring_item.
                                subkeys[subkey].subkey;
                              if (subkey_id === request.key_id) {
                                response.in_real_keyring = true;
                                response.real_keyring_item =
                                    real_keyring_item;
                              }
                            }
                            sendResponse({'result': response});
                          });
                        });
                      }
                    }
                  });
                }
                if (request.temp_context) {
                  if (webpg.plugin.webpg_status.plugin.type !== "NATIVEHOST") {
                    var temp_path = webpg.plugin.getTemporaryPath();
                    if (!temp_path)
                        temp_path = "/tmp/.gnupg";
                    webpg.plugin.gpgSetHomeDir(temp_path);
                    getNamedKey();
                  } else {
                    webpg.plugin.getTemporaryPath(function(temp_path) {
                      if (!temp_path)
                          temp_path = "/tmp/.gnupg";
                      webpg.plugin.gpgSetHomeDir(temp_path, function() {
                        getNamedKey();
                      });
                    });
                  }
                } else {
                  getNamedKey();
                }
                return true;
                break;

            case 'getNamedKeys':
                var userKeys = {},
                    users = request.users,
                    key;
                users.map(function(user, i) {
                    // Pull keys by named user
                    userKeys[user] = [];
                    webpg.plugin.getNamedKey(user, false, false, function(key) {
                      if (JSON.stringify(key) !== "{}")
                          userKeys[user] = key;
                      // Pull keys by named group
//                      var group_result = webpg.preferences.group.get(users[u]);
//                      for (var group=0; group < group_result.length; group++) {
//                          key = webpg.plugin.getNamedKey(group_result[group]);
//                          if (JSON.stringify(key) !== "{}")
//                              userKeys[users[u]] = userKeys[users[u]].concat(key);
//                      }
                      if (i === users.length -1)
                        sendResponse({'result': {'keys': userKeys}})
                    });
                    return user;
                })
                return true;
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
                webpg.utils.log('INFO')("Remote log request recieved; ", request.data);
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

            case 'sendPGPMIMEMessage':
                webpg.utils.log('INFO')(request);
                webpg.plugin.sendMessage(request.params, function(response) {
                  sendResponse({'result': response});
                });
                return true;
                break;

        }
        // Return the response and let the connection be cleaned up.
        if (request.bypassSendResult !== true)
          sendResponse({'result': response});
        delete request, response;
    },

    /**
        @method keylistProgress
            Called by webpg-npapi when a given key generation event is emitted

        @param {String} data The ASCII representation of the current operation status

        @member webpg.background
    */
    keylistProgress: function(data) {
      var msgType;
      if (typeof(data) === "string")
        msgType = (data.substr(2, 6) === "status") ? "progress" : "key";
      else
        msgType = data.type
      if (webpg.utils.detectedBrowser.vendor === "mozilla") {
          var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
          var enumerator = wm.getEnumerator(null);
          var win;

          if (webpg.background.requesting_iframe !== undefined) {
              win = webpg.utils.getFrameById(webpg.background.requesting_iframe);
              var contentWindow = win.contentWindow;
              var doc = win.contentDocument;
          } else {
              while(enumerator.hasMoreElements()) {
                  var win = enumerator.getNext().QueryInterface(
                      Components.interfaces.nsIDOMChromeWindow
                  );

                  if (win.content && (win.content.document.location.href.search(
                  "chrome://webpg-firefox/content/key_manager.html") > -1)) {
                      var contentWindow = win.content;
                      var doc = win.content.document;
                      break;
                  }
              }
          }

          if (data === '{"status": "complete"}')
              delete webpg.background.requesting_iframe;

          if (doc) {
              // Attempt to remove the old listener
              try {
                  doc.body.removeEventListener('gpgkeylistprogress', contentWindow.webpg.keymanager.keylistprogress);
              } catch (err) {
                  // We don't really care if it didn't already exist
                  webpg.utils.log('INFO')(err);
              } finally {
                  // Add the listener
                  doc.body.addEventListener('gpgkeylistprogress', contentWindow.webpg.keymanager.keylistprogress);
              }

              var evtObj = doc.createEvent('CustomEvent');
              evtObj.initCustomEvent("gpgkeylistprogress", true, true, {'type': msgType, 'data': data});
              doc.body.dispatchEvent(evtObj);
          }
          delete data, evtObj;
      } else if (webpg.utils.detectedBrowser.product === "chrome") {
        try {
          webpg.background.keylistProgressPort.postMessage({"type": msgType, "data": data});
        } catch (e) {
          if (webpg.background.keylistProgressPort !== undefined)
            webpg.background.keylistProgressPort.disconnect();
          if (webpg.background.keylist_tab !== undefined)
            webpg.background.keylistProgressPort = chrome.tabs.connect(webpg.background.keylist_tab, {name: "gpgKeyListProgress"});
          else
            webpg.background.keylistProgressPort = chrome.runtime.connect({name: "gpgKeyListProgress"});
          webpg.background.keylistProgressPort.postMessage({"type": msgType, "data": data});
        }

        if (data === '{"status": "complete"}')
          delete webpg.background.keylist_tab;

        delete data;
      }
    },

    /**
        @method gpgGenKeyProgress
            Called by webpg-npapi to update the current status of the key generation operation

        @param {String} data The ASCII representation of the current operation status

        @member webpg.background
    */
    gpgGenKeyProgress: function(data) {
        if (webpg.utils.detectedBrowser.vendor === "mozilla") {
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
                        webpg.utils.log('ERROR')(err.message);
                    } finally {
                        // Add the listener
                        doc.body.addEventListener('progress', contentWindow.webpg.keymanager.progressMsg);
                    }

                    var evtObj = doc.createEvent('CustomEvent');
                    evtObj.initCustomEvent("progress", true, true, {'type': 'progress', 'data': data});
                    doc.body.dispatchEvent(evtObj);
                }
            }
        } else if (webpg.utils.detectedBrowser.product === "chrome") {
            var port = chrome.extension.connect({name: "gpgGenKeyProgress"});
            port.postMessage({"type": "progress", "data": data});
            port.disconnect();
        }
    },

    /**
        @method gpgGenKeyComplete
            Called by webpg-npapi when a given key generation option has completed

        @param {String} data The ASCII representation of the current operation status

        @member webpg.background
    */
    gpgGenKeyComplete: function(data) {
        var _ = webpg.utils.i18n.gettext;
        // Send the data to the GenKeyProgress method
        webpg.background.gpgGenKeyProgress(data);

        var valid = (data === "complete");

        // Notify the user
        if (webpg.utils.detectedBrowser.vendor === "mozilla") {
            var browserWindow = webpg.utils.mozilla.getChromeWindow();
            var message = (valid) ? 'WebPG - ' + _("Key Generation Complete") + '!' :
                "WebPG " + _("Key Generation") + " " + data;
            var nb = browserWindow.getNotificationBox(browserWindow.content);
            var n = nb.getNotificationWithValue('keygen-complete');
            if(n) {
                n.label = message;
            }
            var buttons = (browserWindow.content.document.location.href
                .search(webpg.utils.resourcePath + "XULContent/options.xul") === -1) ?
                    [{
                        'label': _('Open Key Manager'),
                        'accessKey': 'O',
                        'popup': null,
                        'callback': function() {
                            webpg.utils.openNewTab(webpg.utils.resourcePath +
                                    "XULContent/options.xul?options_tab=1");
                        }
                    }] : [];
            var priority = nb.PRIORITY_INFO_MEDIUM;
            nb.appendNotification(message, 'keygen-complete',
                 'chrome://webpg-firefox/skin/images/badges/32x32/webpg.png',
                  priority, buttons);
        } else if (webpg.utils.detectedBrowser.product === "chrome") {
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

};

if (webpg.utils.detectedBrowser.product === "chrome") {

    webpg.background.navigate = function(url) {
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.update(tab.id, {'url': url});
        });
    };

    chrome.omnibox.onInputEntered.addListener(function(text) {
        webpg.plugin.getNamedKey(text, true, false, function(key) {
          if (Object.keys(key) > 0)
            webpg.background.navigate(webpg.utils.resourcePath + "key_manager.html" +
               "?auto_init=true&tab=-1&openkey=" + key.fingerprint.substr(-16));
        });
    });

    chrome.omnibox.setDefaultSuggestion({
        description: '<url><match>WebPG Key Search</match></url>'
    });

}

// Listen for the creation of the background DOM and then init webpg.background
window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    webpg.background.init();
    if (webpg.utils.detectedBrowser.product === 'thunderbird')
        webpg.utils._onRequest.addListener(webpg.background._onRequest);
}, false);

// Listen for the content script to send messages to the background page.
if (webpg.utils.detectedBrowser.product !== 'thunderbird')
    webpg.utils._onRequest.addListener(webpg.background._onRequest);
/* ]]> */
