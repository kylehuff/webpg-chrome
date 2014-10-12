// Native messaging
/**
    @property {webpg.nativeMessaging} nativeMessaging
        The nativeMessaging object provides helper methods for communicating
        with a Native Messaging host.
*/
webpg.nativeMessaging = {
  /**
    @method
        Initializes the nativeMessaging object
    @member webpg.nativeMessaging
  */
  init: function() {
    // Any init steps needed?
  },

  /**
    @method
        Creates an instance of a Native Messaging "port". Disconnects any
        previously established ports (is this always desired?)
    @member webpg.nativeMessaging
  */
  portConstructor: function() {
    try {
      this.port.disconnect();
    } catch (e) { }; // Do nothing if disconnect fails
    var port = chrome.extension.connectNative("org.webpg.nativehost");
    return port;
  },

  /**
    @method
        Returns the outcome of the webpg.nativeMessaging.portConstructor();
    @member webpg.nativeMessaging
  */
  port: function() {
    return this.portConstructor();
  },

  /**
    @method
        Sends a message to the Native Client host via sendNativeMessage (does
        not use a port)
    @member webpg.nativeMessaging
  */
  sendMessage: function(msg, callback) {
    chrome.runtime.sendNativeMessage('org.webpg.nativehost', msg, callback);
  },

  /**
    @method
        Adds a listener to a given port that calls the callback method passed
    @member webpg.nativeMessaging
  */
  addListener: function(port, callback) {
    port.onMessage.addListener(function(msg, port) {
      var result;
      try {
        result = JSON.parse(msg);
      } catch (e) { 
        if (msg === "queued")
          result = {"status": "queued"};
        else
          result = (msg.type === "onstatusprogress") ? JSON.parse(msg.data) : msg;
      }
      callback(result);
      if (result.status === "complete")// "{\"status\": \"complete\"}")
        port.disconnect();
      return true;
    });
  },

  /**
    @method
        Shortcut method to pass a function request to the Native Messaging
        host.
    @member webpg.nativeMessaging
  */
  nativeFunction: function(args, callback) {
    if (callback && (args.async===true || (args.params && args.params.async))) {
      var port = webpg.nativeMessaging.port();
      webpg.nativeMessaging.addListener(port, callback);
      port.postMessage(args);
    } else {
      webpg.nativeMessaging.sendMessage(args,
        function(res) {
          if (callback && typeof(callback) === "function")
            if (chrome.runtime.lastError)
              callback(chrome.runtime.lastError);
            else
              callback(res);
          else
            return res;
        }
      );
    }
  },

  getFunctionName: function() {
      var re = new RegExp(/Object\.(webpg\.(?:\w*\.)?(?!getFunctionName)(\w+))\s/gm),
          re_res = re.exec(new Error().stack),
          func = "unknown";
      if (re_res)
        func = re_res[re_res.length - 1];
      return func;
  },
};

// Plugin Object
/**
    @property {webpg.plugin} plugin
        Provides the interface to the Native Messaging host via an abstracted
        "plugin" object.
*/
webpg.plugin = {
  /**
    @method
        Checks the validity of the port
    @member webpg.nativeMessaging
  */
  testValid: function() {
    // Check if the native messaging port is valid
    try {
      chrome.runtime.sendNativeMessage("org.webpg.nativehost", {},
        function(response) {
          if (chrome.runtime.lastError) {
            webpg.plugin.valid = false;
            var stack = new Error().stack.split("\n").slice(1);
            var stack_i = stack[0].split("@");
            var func = (stack[0].search("@") > 1) ? stack_i[0] + "@" : "";
            var fileAndLine = stack[0].split("/").pop();
            webpg.plugin.webpg_status = {
              'valid': false,
              'error': true,
              'gpg_error_code': -3,
              'error_string': chrome.runtime.lastError.message,
              'file': fileAndLine.split(":")[0],
              'line': fileAndLine.split(":")[1]
            };
          } else {
            webpg.plugin.valid = true;
          }
        }
      );
    } catch (e) {
      webpg.plugin.valid = false;
    }
  },

  addEventListener: function(eventName, callback, useCapture) {
    window.addEventListener("message", function(event) {
      if (event.data.data.type === eventName ||
          event.data.data.type === "on" + eventName) {
        console.log("calling " + eventName + " type event for event type: " + event.data.data.type);
        console.log(event.data.data);
        callback(event.data.data);
      }
    }, useCapture);
  },

  /**
    @method
        Requests the version string from the Native Messaging host
    @member webpg.nativeMessaging
  */
  get_version: function() {
    webpg.nativeMessaging.sendMessage(
                          {"func": "get_version"},
                          function(res) {
                            webpg.plugin.version = res;
                          })
    return "value for webpg.plugin.get_version placed into webpg.plugin.version";
  }(),

  /**
    @method
        Requests the webpg_status object from the Native Messaging host
    @member webpg.nativeMessaging
  */
  get_webpg_status: function(callback) {
    webpg.nativeMessaging.sendMessage({"func": "get_webpg_status"},
      function(res) {
        if (res)
          webpg.plugin.webpg_status = res;
        else
          webpg.plugin.testValid();
        if (callback)
          callback(res);
      }
    );
  },

  /**
    @method
        Sets the GnuPG binary setting
    @member webpg.nativeMessaging
  */
  gpgSetBinary: function(gnupgbin, callback) {
    webpg.nativeMessaging.sendMessage({"func": "gpgSetBinary",
      params: gnupgbin},
      function(res) {
        if (callback)
          callback(res);
      });
  },

  /**
    @method
        Requests the currently defined GnuPG binary setting
    @member webpg.nativeMessaging
  */
  gpgGetBinary: function(callback) {
    webpg.nativeMessaging.nativeFunction({"func": "gpgGetBinary"},
      function(res) {
        if (callback)
          callback(res);
      }
    );
  },

  /**
    @method
        Sets the currently defined GnuPG binary setting
    @member webpg.nativeMessaging
  */
  gpgGetPreference: function(pref, callback) {
    var args = {
      "func": "gpgGetPreference",
      "params": [pref]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the requested GnuPG pref with value
    @member webpg.nativeMessaging
  */
  gpgSetPreference: function(option, value, callback) {
    var args = {
      "func": "gpgSetPreference",
      "params": [option, value]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the requested GnuPG pref with value
    @member webpg.nativeMessaging
  */
  gpgSetGroup: function(params, callback) {
    var args = {
      "func": "gpgSetGroup",
      "params": (typeof(params)==="object") ?
        (params.hasOwnProperty('length')===false) ?
          Object.keys(params).map(function(p) { return params[p]; }) :
          params :
        [params]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the requested GnuPG pref with value
    @member webpg.nativeMessaging
  */
  gpgSetKeyTrust: function(keyid, trust_value, callback) {
    var args = {
      "func": "gpgSetKeyTrust",
      "params": [keyid, trust_value]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the named Key
    @member webpg.nativeMessaging
  */
  gpgSetSubkeyExpire: function(keyid, subkey_idx, subkey_expire, callback) {
    var args = {
      "func": "gpgSetSubkeyExpire",
      "params": [keyid, subkey_idx, subkey_expire]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the named Key
    @member webpg.nativeMessaging
  */
  gpgSetPubkeyExpire: function(keyid, expire, callback) {
    var args = {
      "func": "gpgSetPubkeyExpire",
      "params": [keyid, expire]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },


  /**
    @method
        Requests the Public Key List
    @member webpg.nativeMessaging
  */
  getPublicKeyList: function(fastListMode, async, callback) {
    fastListMode = (fastListMode === true) ? true : false;
    async = (async === true) ? true : false;
    var args = {
      "func": "getPublicKeyList",
      "params": {
        "fastListMode": fastListMode,
        "async": async
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the Private Key List
    @member webpg.nativeMessaging
  */
  getPrivateKeyList: function(fastListMode, async, callback) {
    fastListMode = (fastListMode === true) ? true : false;
    async = (async === true) ? true : false;
    var args = {
      "func": "getPrivateKeyList",
      "params": {
        "fastListMode": fastListMode,
        "async": async
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the named Key
    @member webpg.nativeMessaging
  */
  getNamedKey: function(name, fastListMode, async, callback) {
    fastListMode = (fastListMode === true) ? true : false;
    async = (async === true) ? true : false;
    var args = {
      "func": "getNamedKey",
      "params": {
        "name": name,
        "fastListMode": fastListMode,
        "async": async
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the named Key from the defined keyserver
    @member webpg.nativeMessaging
  */
  getExternalKey: function(name, callback) {
    var args = {
      "func": "getExternalKey",
      "params": {
        "name": name
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests for <text> to be signed with <signers> as type <signType>
    @member webpg.nativeMessaging
  */
  gpgSignText: function(text, signers, signType, callback) {
    var args = {
      "func": "gpgSignText",
      "params": {
        "text": text,
        "signers": signers,
        "signType": signType
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests for <text> to be Symmetrically encypted, and optionally signed with <signers>
    @member webpg.nativeMessaging
  */
  gpgSymmetricEncrypt: function(text, sign, signers, callback) {
    var args = {
      "func": "gpgSymmetricEncrypt",
      "params": {
        "text": text,
        "sign": sign,
        "signers": signers
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests for <text> to be Encrypted with <recipient> keys and optionally signed with <signers>
    @member webpg.nativeMessaging
  */
  gpgEncrypt: function(text, recipients, sign, signers, callback) {
    var args = {
      "func": "gpgEncrypt",
      "params": {
        "text": text,
        "recipients": recipients,
        "sign": sign,
        "signers": signers
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests for <text> to be Encrypted with <recipient> keys and optionally signed with <signers>
    @member webpg.nativeMessaging
  */
  gpgVerify: function(data, plaintext, callback) {
    var args = {
      "func": "gpgVerify",
      "params": {
        "data": data,
        "plaintext": plaintext
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests for <text> to be Encrypted with <recipient> keys and optionally signed with <signers>
    @member webpg.nativeMessaging
  */
  gpgDecrypt: function(data, callback) {
    var args = {
      "func": "gpgDecrypt",
      "params": [
        data
      ]
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests the Photo information (if any) for the named Key
    @member webpg.nativeMessaging
  */
  gpgGetPhotoInfo: function(name, callback) {
    var args = {
      "func": "gpgGetPhotoInfo",
      "params": [name]
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  getTemporaryPath: function(callback) {
    var args = {
      "func": "getTemporaryPath"
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  setTempGPGOption: function(option, value, callback) {
    var args = {
      "func": "setTempGPGOption",
      "params": {"option": option, "value": value}
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  restoreGPGConfig: function(option, value, callback) {
    var args = {
      "func": "restoreGPGConfig"
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgShowPhoto: function(name, callback) {
    var args = {
      "func": "gpgShowPhoto",
      "params": [name]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgExportPublicKey: function(name, callback) {
    var args = {
      "func": "gpgExportPublicKey",
      "async": true,
      "params": [name]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },
  
  gpgImportExternalKey: function(name, callback) {
    var args = {
      "func": "gpgImportExternalKey",
      "params": [name]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgSetHomeDir: function(path, callback) {
    var args = {
      "func": "gpgSetHomeDir",
      "params": [path]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgImportKey: function(path, callback) {
    var args = {
      "func": "gpgImportKey",
      "params": [path]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgGenKey: function(algo, size, subkey_algo, subkey_size, name, comment, email, expire, passphrase, callback) {
    var args = {
      "func": "gpgGenKey",
      "async": true,
      "params": [algo, size, subkey_algo, subkey_size, name, comment, email, expire, passphrase]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgGenSubKey: function(keyid, subkey_algo, subkey_size, expire, sign, enc, auth, callback) {
    var args = {
      "func": "gpgGenSubKey",
      "async": true,
      "params": [keyid, subkey_algo, subkey_size, expire, sign, enc, auth]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgChangePassphrase: function(name, callback) {
    var args = {
      "func": "gpgChangePassphrase",
      "params": [name]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgAddUID: function(keyid, name, email, comment, callback) {
    var args = {
      "func": "gpgAddUID",
      "params": [keyid, name, email, comment]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDeleteUID: function(keyid, uid_idx, callback) {
    var args = {
      "func": "gpgDeleteUID",
      "params": [keyid, uid_idx]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgAddPhoto: function(keyid, filename, data, callback) {
    var args = {
      "func": "gpgAddPhoto",
      "params": [keyid, filename, data]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDeletePublicKey: function(keyid, callback) {
    var args = {
      "func": "gpgDeletePublicKey",
      "params": [keyid]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDeletePrivateKey: function(keyid, callback) {
    var args = {
      "func": "gpgDeletePrivateKey",
      "params": [keyid]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDeletePrivateSubKey: function(keyid, idx, callback) {
    var args = {
      "func": "gpgDeletePrivateSubKey",
      "params": [keyid, idx]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgEnableKey: function(keyid, callback) {
    console.log(params);
    var args = {
      "func": "gpgEnableKey",
      "params": [keyid]
    }
    console.log(args);
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDisableKey: function(params, callback) {
    var args = {
      "func": "gpgDisableKey",
      "params": [keyid]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  sendMessage: function(params, callback) {
    var args = {
      "func": "sendMessage",
      "params": params
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

};
//webpg.nativeMessaging.init();
