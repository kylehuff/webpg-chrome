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
    this.is_initialized = true;
  },

  /**
    @method
        Creates an instance of a Native Messaging "port". Disconnects any
        previously established ports (is this always desired?)
    @member webpg.nativeMessaging
  */
  portConstructor: function() {
    //try {
    //  if (webpg.nativeMessaging.current_port)
    //    webpg.nativeMessaging.current_port.disconnect();
    //} catch (e) {}; // Do nothing if disconnect fails

    if (webpg.utils.detectedBrowser.product === "chrome") {
      var port = chrome.extension.connectNative("org.webpg.nativehost");
      port.process = {
        killed: false,
        exitCode: undefined,
      };
      port.onDisconnect.addListener(function() {
        //webpg.utils.debug("disconnect");
        port.process.killed = true;
      });
    } else {
      let env_vars = {
        'GNUPGHOME': webpg.utils.env.GNUPGHOME,
        'GPG_AGENT_INFO': webpg.utils.env.GPG_AGENT_INFO,
        'HOME': webpg.utils.env.HOME,
        'USERPROFILE': webpg.utils.env.USERPROFILE,
        'HOMEDRIVE': webpg.utils.env.HOMEDRIVE,
        'HOMEPATH': webpg.utils.env.HOMEPATH,
        'TMP': webpg.utils.env.TMP,
        'TEMP': webpg.utils.env.TEMP,
        'TMPDIR': webpg.utils.env.TMPDIR
      };
      // delete any keys with undefined values
      for (k in env_vars) { if (env_vars[k] === undefined) delete env_vars[k]; }
      let options = {
        encoding: null,
        env: env_vars
      };
      this.process = webpg.utils.child_process.spawn(
          '/home/kylehuff/webpgNativeHost/webpg-native-host',
          ["chrome://webpg-firefox/?system=child_process"],
          options
      );
      var process = this.process,
          port    = this;
      var _appendUint8Array = function(buffer1, buffer2) {
        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return tmp;
      };
      this.buffer = "";
      this.data = [];
      this.onMessage = Object();
      this.disconnect = function() {
        webpg.utils.emit(process.stdin, "end");
      };
      this.bytes = 0;
      this.intToBytes = function(int) {
          let byteString='';
          for (let i=0;i<=3;i++) {
            byteString+=String.fromCharCode((int>>(8*i))&255);
          }
          return byteString;
      };
      this.parse = function(data, callback) {
        var size = 0,
            begin = [];

        if (data.length < 5 && this.bytes < 1) {
          webpg.utils.debug("got a short message...", webpg.utils.utf8_decoder.decode(data));
          this.data = data;
          return;
        } else if (this.data.length > 0) {
          webpg.utils.debug("assmbling previous short message", webpg.utils.utf8_decoder.decode(data));
          data = _appendUint8Array(this.data.buffer, data.buffer);
          this.data = [];
        }

        if (this.bytes > 0) {
          webpg.utils.debug("still need to collect", port.bytes, "bytes... this message is", data.length, webpg.utils.utf8_decoder.decode(data));
          //webpg.utils.debug(data.length, port.bytes);
          this.buffer += webpg.utils.utf8_decoder.decode(data.slice(0, this.bytes));
          begin = data.slice(this.bytes);
          this.bytes -= data.length;
        } else {
          size = (
            (data[0]) |
            (data[1] << 8) |
            (data[2] << 16) |
            (data[3] << 24)
          );
          webpg.utils.debug("gathering message of ", size, "bytes.", webpg.utils.utf8_decoder.decode(data.slice(4)));
          this.buffer = webpg.utils.utf8_decoder.decode(data.slice(4, size + 4));
          this.bytes = size - data.slice(4).length;
          if (size < data.slice(4).length) {
            webpg.utils.debug("we should get the beginning of the next message", size, data.slice(4).length, this.bytes);
            begin = data.slice(this.bytes);
          }
        }

        if (this.bytes < 1) {
          webpg.utils.debug("message is complete, sending message.");
          let msg = this.buffer;
          this.buffer = "";
          this.bytes = 0;

          if (callback)
            callback(JSON.parse(msg))

          if (begin.length && webpg.utils.utf8_decoder.decode(begin) !== '\n') {
            webpg.utils.debug("got another message embedded", webpg.utils.utf8_decoder.decode(begin));
            this.parse(begin, callback);
          }

        }
      };
      this.onMessage.addListener = function(callback) {
        //webpg.utils.debug("adding listener");
        process.stdout.on('data', function (data) {
          let data_array = Uint8Array.from(data, (c) => c.charCodeAt(0));
          port.parse(data_array, callback);
        });

        //process.stderr.on('data', function (data) {
          //webpg.utils.info(data);
        //});

        process.on('close', function(code) {
          webpg.utils.debug("pid", process.pid, "closed with exit code", process.exitCode);
        });

        process.on('error', function(err) {
          webpg.utils.error(err);
        });
      };

      this.postMessage = function(msg) {
        let msg_string = JSON.stringify(msg)
        let msg_array = Uint8Array.from(msg_string, (c) => c.charCodeAt(0));
        let msg_length = this.intToBytes(msg_array.byteLength);

        webpg.utils.debug("posting data to pid:", process.pid, 'for function:', msg_string);

        webpg.utils.emit(process.stdin, 'data', msg_length);
        webpg.utils.emit(process.stdin, 'data', msg_string);
      };
    }

    port.callbacks = {};

    port.callbackRouter = function(result) {
      let func = result.func || result.type || undefined;
      if (func === "onkeygencomplete")
        func = "onkeygenprogress";
      if (func !== undefined) {
        let cb = port.callbacks[func] || undefined;
        delete result.func;
        if (cb) {
          cb(result);
          if (func !== "onstatusprogress" && (func !== "onkeygenprogress" && result.type !== "onkeygencomplete"))
            delete port.callbacks[func];
        }
      }
    };

    return port;
  },

  /**
    @method
        Returns the outcome of the webpg.nativeMessaging.portConstructor();
    @member webpg.nativeMessaging
  */
  port: function() {
    if (!this.current_port || (this.current_port.process.killed || this.current_port.process.exitCode !== undefined)) {
      this.current_port = new webpg.nativeMessaging.portConstructor();
      this.current_port.onMessage.addListener(this.current_port.callbackRouter);
    }

    return this.current_port;
  },

  /**
    @method
        Sends a message to the Native Client host via sendNativeMessage (does
        not use a port)
    @member webpg.nativeMessaging
  */
  sendMessage: function(msg, callback) {
    if (webpg.utils.detectedBrowser.product === "chrome") {
      chrome.runtime.sendNativeMessage('org.webpg.nativehost', msg, callback);
    } else {
      var port = new webpg.nativeMessaging.portConstructor();
      var cb = function(res) {
        if (callback)
          callback(res);
        port.disconnect();
      }
      port.onMessage.addListener(cb);
      //webpg.nativeMessaging.addListener(port, cb);
      port.postMessage(msg);
    }
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
        else {
          try {
            result = (msg.type === "onstatusprogress") ? JSON.parse(msg.data) : msg;
          } catch (e) {
            webpg.utils.error(msg);
          }
        }
      }
      callback(result);
      //webpg.utils.debug(result);
      if (result.status === "complete")// "{\"status\": \"complete\"}")
        try {
          port.disconnect();
        } catch (e) {};
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
    var port = webpg.nativeMessaging.port(),
        func = (
          args.func.search(/get.*Key.*/) > -1 &&
          (args.params && args.params.async == true)
        ) ? "onstatusprogress" : args.func,
        func = (
          args.func.search(/gpgGen.*Key/) > -1 &&
          (
            (args.params && args.params.async == true) ||
            (args && args.async == true)
          )
        ) ? "onkeygenprogress" : func

    port.callbacks[func] = callback;
    port.postMessage(args);
    /*return;
    if (callback && (args.async===true || (args.params && args.params.async))) {
      var port = webpg.nativeMessaging.port();
      webpg.nativeMessaging.addListener(port, callback);
      port.postMessage(args);
    } else {
      webpg.nativeMessaging.sendMessage(args,
        function(res) {
          if (callback && typeof(callback) === "function") {
            if (webpg.utils.detectedBrowser.product === "chrome" && chrome.runtime.lastError)
              callback(chrome.runtime.lastError);
            else
              callback(res);
            return res;
          } else {
            return res;
          }
        }
      );
    }*/
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
    if (navigator.userAgent.toLowerCase().search("chrome") === -1) {
      webpg.nativeMessaging.sendMessage({"func": "get_webpg_status"}, function(res) {
        webpg.plugin.valid = (res && res.plugin && !res.error) ? true : false;
      });
    } else {
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
    }
  },

  addEventListener: function(eventName, callback, useCapture) {
    window.addEventListener("message", function(event) {
      if (event.data.data.type === eventName ||
          event.data.data.type === "on" + eventName) {
        webpg.utils.debug("calling " + eventName + " type event for event type: " + event.data.data.type);
        webpg.utils.debug(event.data.data);
        callback(event.data.data);
      }
    }, useCapture);
  },

  /**
    @method
        Requests the version string from the Native Messaging host
    @member webpg.nativeMessaging
  */
  get_version: function(callback) {
    //if (navigator.userAgent.toLowerCase().search("chrome") === -1)
    //  return;

    webpg.nativeMessaging.sendMessage(
                          {"func": "get_version"},
                          function(res) {
                            webpg.plugin.version = res.version || "unknown";
                            if (callback)
                              callback(res);
                          })
    return "value for webpg.plugin.get_version placed into webpg.plugin.version";
  }(),

  /**
    @method
        Requests the webpg_status object from the Native Messaging host
    @member webpg.nativeMessaging
  */
  get_webpg_status: function(callback) {
    webpg.nativeMessaging.nativeFunction({"func": "get_webpg_status"},
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
    webpg.nativeMessaging.nativeFunction({"func": "gpgSetBinary",
      params: [gnupgbin]},
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
      "params": [keyid, parseInt(subkey_idx, 10), parseInt(subkey_expire, 10)]
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
    name = name || "";
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
  gpgSymmetricEncrypt: function(text, signers, callback) {
    var args = {
      "func": "gpgSymmetricEncrypt",
      "params": {
        "text": text,
        "sign": (signers && signers.length),
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
  gpgEncrypt: function(text, recipients, callback) {
    var args = {
      "func": "gpgEncrypt",
      "params": {
        "text": text,
        "async": true,
        "recipients": recipients,
      }
    };
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  /**
    @method
        Requests for <text> to be Encrypted with <recipient> keys and signed with <signers>
    @member webpg.nativeMessaging
  */
  gpgEncryptSign: function(text, recipients, signers, callback) {
    var args = {
      "func": "gpgEncryptSign",
      "params": {
        "text": text,
        "recipients": recipients,
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

  restoreGPGConfig: function(callback) {
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
      "params": {'keyid': keyid, 'filename': filename, 'data': data}
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
    var args = {
      "func": "gpgEnableKey",
      "params": [keyid]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDisableKey: function(keyid, callback) {
    var args = {
      "func": "gpgDisableKey",
      "params": [keyid]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgSignUID: function(...args) {
    var callback = args.pop(-1);
    var args = {
      "func": "gpgSignUID",
      "params": args
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  gpgDeleteUIDSign: function(...args) {
    var callback = args.pop(-1);
    var args = {
      "func": "gpgDeleteUIDSign",
      "params": args
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

  quotedPrintableDecode: function(params, callback) {
    var args = {
      "func": "quotedPrintableDecode",
      "params": [params]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  verifyPGPMimeMessage: function(params, callback) {
    var args = {
      "func": "verifyPGPMimeMessage",
      "params": [params]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  checkForUpdate: function(params, callback) {
    var args = {
      "func": "checkForUpdate",
      "params": [params]
    }
    return webpg.nativeMessaging.nativeFunction(args, callback);
  },

  deinit: function(callback) {
    webpg.nativeMessaging.current_port.disconnect();
    if (callback)
      callback()
  },

};
//webpg.nativeMessaging.init();
