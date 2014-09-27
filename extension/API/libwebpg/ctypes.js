if (typeof(webpg)==='undefined') { var webpg = {}; }

webpg.plugin = {

  init: function() {
    if (typeof(ctypes)==='undefined')
      Components.utils.import("resource://gre/modules/ctypes.jsm");

    this.cbType = ctypes.FunctionType(ctypes.default_abi,
                                             ctypes.void_t,
                                             [ctypes.char.ptr,
                                              ctypes.char.ptr]);

    this.param_array = new ctypes.ArrayType(ctypes.char.ptr);

    var lib = ctypes.open(this.libFile);
    this.lib = lib;

    this.valid = (lib) ? true : false;

    this.getVersion_r = lib.declare("webpg_version_r",  // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    this.cbType.ptr);     // Callback

    this.getStatusMap_r = lib.declare("webpg_status_r",   // Function Name
                                      ctypes.default_abi, // Function Type
                                      ctypes.char.ptr,    // Return Type
                                      this.cbType.ptr);   // Callback

    this.getPubKeys_r = lib.declare("getPublicKeyList_r", // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.bool,          // Fast list mode
                                    ctypes.bool,          // Async
                                    this.cbType.ptr);     // Callback

    this.getPriKeys_r = lib.declare("getPrivateKeyList_r",// Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.bool,          // Fast list mode
                                    ctypes.bool,          // Async
                                    this.cbType.ptr);     // Callback

    this.getNamedKey_r = lib.declare("getNamedKey_r",     // Function Name
                                     ctypes.default_abi,  // Function Type
                                     ctypes.char.ptr,     // Return Type
                                     ctypes.char.ptr,     // Key ID or UID
                                     ctypes.bool,         // Fast list mode
                                     ctypes.bool,         // Async
                                     this.cbType.ptr);    // Callback

    this.getExternalKey_r = lib.declare("getExternalKey_r",  // Function Name
                                     ctypes.default_abi,  // Function Type
                                     ctypes.char.ptr,     // Return Type
                                     ctypes.char.ptr,     // Key ID or UID
                                     this.cbType.ptr);    // Callback

    this.gpgSetPref_r = lib.declare("gpgSetPreference_r", // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Preference
                                    ctypes.char.ptr,      // Preference Value
                                    this.cbType.ptr);     // Callback

    this.gpgGetPref_r = lib.declare("gpgGetPreference_r", // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Preference
                                    this.cbType.ptr);     // Callback

    this.gpgSetGroup_r = lib.declare("gpgSetGroup_r",     // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Group Name
                                    ctypes.char.ptr,      // Group Value
                                    this.cbType.ptr);     // Callback

    this.setTempOpt_r = lib.declare("setTempGPGOption_r", // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Option
                                    ctypes.char.ptr,      // Option Value
                                    this.cbType.ptr);     // Callback

    this.resGPGConf_r = lib.declare("restoreGPGConfig_r", // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    this.cbType.ptr);     // Callback

    this.gpgSetHome_r = lib.declare("gpgSetHomeDir_r",    // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Homedir Path
                                    this.cbType.ptr);     // Callback

    this.gpgGetHome_r = lib.declare("gpgGetHomeDir_r",    // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    this.cbType.ptr);     // Callback

    this.gpgSetBinary_r = lib.declare("gpgSetBinary_r",   // Function Name
                                      ctypes.default_abi, // Function Type
                                      ctypes.char.ptr,    // Return Type
                                      ctypes.char.ptr,    // GNUPG Binary Path
                                      this.cbType.ptr);   // Callback

    this.gpgGetBinary_r = lib.declare("gpgGetBinary_r",   // Function Name
                                      ctypes.default_abi, // Function Type
                                      ctypes.char.ptr,    // Return Type
                                      this.cbType.ptr);   // Callback

    this.gpgSetGPGConf_r = lib.declare("gpgSetGPGConf_r", // Function Name
                                       ctypes.default_abi,// Function Type
                                       ctypes.char.ptr,   // Return Type
                                       ctypes.char.ptr,   // GPGCONF Binary Path
                                       this.cbType.ptr);  // Callback

    this.gpgGetGPGConf_r = lib.declare("gpgGetGPGConf_r", // Function Name
                                       ctypes.default_abi,// Function Type
                                       ctypes.char.ptr,   // Return Type
                                       this.cbType.ptr);  // Callback

    this.gpgTempPath_r = lib.declare("getTemporaryPath_r", // Function Name
                                     ctypes.default_abi,   // Function Type
                                     ctypes.char.ptr,      // Return Type
                                     this.cbType.ptr);     // Callback

    this.gpgEncrypt_r = lib.declare("gpgEncrypt_r",       // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Data to encrypt
                                    this.param_array,     // Encrypt to keys
                                    ctypes.int32_t,       // Number of keys
                                    this.cbType.ptr);     // Callback

    this.gpgEncSign_r = lib.declare("gpgEncryptSign_r",   // Function Name
                                     ctypes.default_abi,  // Function Type
                                     ctypes.char.ptr,     // Return Type
                                     ctypes.char.ptr,     // Data to encrypt
                                     this.param_array,    // Encrypt to keys
                                     ctypes.int32_t,      // Number of enc keys
                                     this.param_array,    // Sign with keys
                                     ctypes.int32_t,      // Number of sign keys
                                     this.cbType.ptr);    // Callback

    this.gpgSymmetric_r = lib.declare("gpgSymmetricEnc_r",// Function Name
                                      ctypes.default_abi, // Function Type
                                      ctypes.char.ptr,    // Return Type
                                      ctypes.char.ptr,    // Data to Encrypt
                                      ctypes.bool,        // Sign
                                      this.param_array,   // Keys to sign with
                                      ctypes.int32_t,     // Number of keys
                                      this.cbType.ptr);   // Callback

    this.gpgDecrypt_r = lib.declare("gpgDecrypt_r",       // Function Name
                                    ctypes.default_abi,   // Function Type
                                    ctypes.char.ptr,      // Return Type
                                    ctypes.char.ptr,      // Data to Decrypt
                                    this.cbType.ptr);     // Callback

    this.gpgVerify_r = lib.declare("gpgVerify_r",         // Function Name
                                   ctypes.default_abi,    // Function Type
                                   ctypes.char.ptr,       // Return Type
                                   ctypes.char.ptr,       // PGP Data
                                   ctypes.char.ptr,       // Plaintext
                                   this.cbType.ptr);      // Callback

    this.gpgSignText_r = lib.declare("gpgSignText_r",     // Function Name
                                     ctypes.default_abi,  // Function Type
                                     ctypes.char.ptr,     // Return Type
                                     ctypes.char.ptr,     // Data to sign
                                     this.param_array,    // Keys to sign with
                                     ctypes.int32_t,      // Number of keys
                                     ctypes.int32_t,      // Sign method
                                     this.cbType.ptr);    // Callback

    this.gpgGenSubKey_r = lib.declare("gpgGenSubKey_r",   // Function Name
                                      ctypes.default_abi, // Function Type
                                      ctypes.char.ptr,    // Return Type
                                      ctypes.char.ptr,    // KeyID
                                      ctypes.char.ptr,    // 
                                      ctypes.char.ptr,    
                                      ctypes.char.ptr,    
                                      ctypes.bool,        
                                      ctypes.bool,        
                                      ctypes.bool,        
                                      this.cbType.ptr);
  },

  addEventListener: function(eventName, callback, useCapture) {
    window.addEventListener("message", function(event) {
      if (event.data.data.type === eventName ||
          event.data.data.type === "on" + eventName) {
//        console.log("calling " + eventName + " type event for event type: " + event.data.data.type);
        console.log(event.data.data);
        callback(event.data.data);
      }
    }, useCapture);
  },

  callback: function(data) {
    //console.log(data.readStringReplaceMalformed());
  },

  status_cb: function(data, res) {
    console.log(data.readStringReplaceMalformed());
    console.log(res.readStringReplaceMalformed());
  },

  // Overrides the supplied callback so it can be called with the text result
  //  from the executed method.
  setUserCallback: function(callback) {
    if (callback===undefined || !callback)
      return this.cbType.ptr(this.callback);

    return this.cbType.ptr(
      (function(){
        var _cb = callback;
        return function(res) {
          return _cb.apply(this, [res.readStringReplaceMalformed()])
        }
      })()
    );
  },

  createParameterArray: function(list) {
    var params = new this.param_array(list.length);
    for (var p in list) {
      if (params[p])
        params[p].value = ctypes.char.array()(list[p]);
    }
    return {'list': params, 'count': parseInt(p)};
  },

  get_version: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.getVersion_r(cb).readStringReplaceMalformed(),
        result = JSON.parse(result);

    webpg.plugin.version = result;

    return result;
  },

  get_webpg_status: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.getStatusMap_r(cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  getPublicKeyList: function(fastListMode=false, async=false, callback) {
    if (async===true)
      return this.exec_threaded("getPubKeys_r", fastListMode, async);

    cb = this.setUserCallback(callback);

    var result = this.getPubKeys_r(fastListMode, async, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  getPrivateKeyList: function(fastListMode=false, async=false, callback) {
    if (async===true)
      return this.exec_threaded("getPriKeys_r", fastListMode, async);

    cb = this.setUserCallback(callback);

    var result = this.getPriKeys_r(fastListMode, async, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  getNamedKey: function(keyString, fastListMode=false, async=false, callback) {
    if (async===true)
      return this.exec_threaded("getNamedKey_r", keyString, fastListMode, async);

    cb = this.setUserCallback(callback);

    var result = this.getNamedKey_r(keyString, fastListMode, async, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  getExternalKey: function(keyString, callback) {
    cb = this.setUserCallback(callback);

    var result = this.getExternalKey_r(keyString, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSetPreference: function(pref, pref_value, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgSetPref_r(pref, pref_value, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgGetPreference: function(pref, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgGetPref_r(pref, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  setTempGPGOption: function(option, value, callback) {
    cb = this.setUserCallback(callback);

    var result = this.setTempOpt_r(option, value, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  restoreGPGConfig: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.resGPGConf_r(cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSetGroup: function(group, group_value, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgSetGroup_r(group, group_value, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSetHomeDir: function(gnupg_path, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgSetHome_r(gnupg_path, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgGetHomeDir: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgGetHome_r(cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSetBinary: function(gnupg_exec, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgSetBinary_r(gnupg_exec, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgGetBinary: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgGetBinary_r(cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSetGPGConf: function(gpgconf_exec, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgSetGPGConf_r(gpgconf_exec, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgGetGPGConf: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgGetGPGConf_r(cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  getTemporaryPath: function(callback) {
    cb = this.setUserCallback(callback);

    var result = this.getTempPath_r(cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgEncrypt: function(plaintext, enc_to_keys, callback) {
    cb = this.setUserCallback(callback);

    var enc_keys = this.createParameterArray(enc_to_keys);

    var result = this.gpgEncrypt_r(plaintext,
                                enc_keys.list,
                                enc_keys.count,
                                cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgEncryptSign: function(plaintext, enc_to_keys, signers, callback) {
    cb = this.setUserCallback(callback);

    enc_to_keys = this.createParameterArray(enc_to_keys);
    signers = this.createParameterArray(signers);

    var result = this.gpgEncSign_r(plaintext,
                               enc_to_keys.list,
                               enc_to_keys.count,
                               signers.list,
                               signers.count,
                               cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSymmetricEncrypt: function(data, sign, signers, callback) {
    cb = this.setUserCallback(callback);

    if (sign)
      signers = this.createParameterArray(signers);
    else {
      signers = this.createParameterArray([]);
      signers.count = 0;
    }

    var result = this.gpgSymmetric_r(data,
                                 sign,
                                 signers.list,
                                 signers.count,
                                 cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgDecrypt: function(data, callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgDecrypt_r(data, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },


  gpgVerify: function(data, plaintext, callback) {
    if (plaintext==="function" && callback=="undefined") {
      callback = plaintext;
      plaintext = "";
    }
    cb = this.setUserCallback(callback);

    var result = this.gpgVerify_r(data, plaintext, cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgSignText: function(plaintext, signers, sign_mode, callback) {
    if (sign_mode === 0)
      return {
        'error': true,
        'error_string': "GPGME_SIG_MODE_NORMAL (0) is binary; binary output" +
          " is not supported in this module.",
        'file': new Error().fileName,
        'line': new Error().lineNumber,
        'method': 'gpgSignText'
      };
    cb = this.setUserCallback(callback);

    signers = this.createParameterArray(signers);

    var result = this.gpgSignText_r(plaintext,
                                signers.list,
                                signers.count,
                                sign_mode,
                                cb).readStringReplaceMalformed();

    return JSON.parse(result);
  },

  gpgGenSubKey: function(keyid,
                         subkey_type,
                         subkey_length,
                         subkey_expire,
                         sign_flag,
                         enc_flag,
                         auth_flag,
                         callback) {
    cb = this.setUserCallback(callback);

    var result = this.gpgGenSubKey_r(keyid,
                                 subkey_type,
                                 subkey_length,
                                 subkey_expire,
                                 sign_flag,
                                 enc_flag,
                                 auth_flag,
                                 cb).readStringReplaceMalformed();

    return result;
    
  },

  gpgGenSubKey_threaded: function(keyid,
                                  subkey_type,
                                  subkey_length,
                                  subkey_expire,
                                  sign_flag,
                                  enc_flag,
                                  auth_flag) {

    return this.exec_threaded("gpgGenSubKey_r",
                              keyid,
                              subkey_type,
                              subkey_length,
                              subkey_expire,
                              sign_flag,
                              enc_flag,
                              auth_flag);
  },

  /*
    Function: exec_threaded
        Calls a specified method in a webWorker thread.

    Parameters:
        fnc - <str> The name of the function to execute threaded.
  */
  exec_threaded: function(fnc) {
    var args = [];

    function status_cb(data, res) {
      var parsedData = data.readStringReplaceMalformed(),
          parsedResult;

      try {
        parsedResult = JSON.parse(res.readStringReplaceMalformed());
      } catch (e) {
        parsedResult = res.readStringReplaceMalformed();
      }

      postMessage({
        'type': parsedData,
        'data': parsedResult
      });
    }

    if (arguments) {
        args = [].slice.call(arguments);
        args = args.slice(1, args.length);
        args = args.map(function(x){
                      if (typeof(x)!="boolean") return "'" + x + "'";
                      else return x;
                   });
    }

    var arglist = (args.length > 0) ? args.join(", ") + "," : "";
    var cmdstr = this.init.toSource().replace("this.libFile", "\"" + this.libFile + "\"");
    cmdstr = cmdstr.substr(1, cmdstr.length -3);
    cmdstr += "  " + status_cb.toSource() + "\n";
    cmdstr += "    callback = this.cbType.ptr(status_cb);\n";
    cmdstr += "    let res = this." + fnc.toString() + "(" + arglist + " callback);\n";
    cmdstr += "    this.lib.close();\n";
    cmdstr += "    return res;";
    cmdstr += "\n}";
    console.log(cmdstr);
    this.cmdstr = cmdstr;
    var blob = new Blob(['onmessage = ' + cmdstr ], {type: "text/javascript"});
    var blobURL = window.URL.createObjectURL(blob);
    var worker = new ChromeWorker(blobURL);

    worker.onerror = function(e) {
      throw e.message;
    };

    // Does this need to be enabled and changed to pass to extension??
    worker.onmessage = function(e) {
      window.postMessage({"type": e.type, "data": e.data}, "*");
    }

    worker.postMessage(""); // Start the worker.
  }
};

webpg.plugin.libFile = webpg.utils.mozilla.getChromeFile(webpg.utils.resourcePath + "components/x86-64/libwebpg.so").path;
webpg.plugin.init();

//var keyids = ["0DF9C95C3BE1A023"];
//webpg.aplugin.getPublicKeyList(true, false, function(x, y) { console.log(x, y) });

//y = webpg.aplugin.gpgGenSubKey_threaded("3C713FED", "3", "512", "0", true, true, true);
