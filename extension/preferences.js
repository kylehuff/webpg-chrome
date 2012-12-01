/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class: webpg.preferences
        Provides unified getter/setter methods for storing the user/global
        preference items
*/
webpg.preferences = {

    /*
        Function: init
            Ensures the definition of webpg.background is available to the
            webpg.preferences class
    */
    init: function(browserWindow) {
        if (typeof(webpg.background)=='undefined')
            webpg.background = browserWindow;
    },

    /*
        Class: webpg.preferences.webpg_enabled
            Provides methods to get/set the "enabled" preference
    */
    webpg_enabled: {
        /*
            Function: get
                Provides methods to get the preference item
        */
        get: function() {
            return webpg.localStorage.getItem('enabled');
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <bool> The boolean value to set
        */
        set: function(value) {
            webpg.localStorage.setItem('enabled', value);
        },
    },

    /*
        Class: webpg.preferences.decorate_inline
            Provides methods to get/set the "decorate_inline" preference
    */
    decorate_inline: {
        /*
            Function: get
                Provides methods to get the preference item
        */
        get: function() {
            return webpg.localStorage.getItem('decorate_inline')
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <bool> The boolean value to set
        */
        set: function(value) {
            webpg.localStorage.setItem('decorate_inline', value);
        },
    },

    /*
        Class: webpg.preferences.gmail_integration
            Provides methods to get/set the "gmail_integration" preference
    */
    gmail_integration: {
        /*
            Function: get
                Provides methods to get the preference item
        */
        get: function() {
            return webpg.localStorage.getItem('gmail_integration')
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <bool> The boolean value to set
        */
        set: function(value) {
            webpg.localStorage.setItem('gmail_integration', value);
        },
    },

    /*
        Class: webpg.preferences.gmail_action
            Provides methods to get/set the "gmail_action" preference
            
        0: Do not use WebPG by default for gmail messages
        1: Encrypt by default for gmail messages
        2: Sign by default for gmail messages
        3: Sign & Encrypt by default for gmail messages
        4: Symmetric Encryption by default for gmail messages
        
    */
    sign_gmail: {
        /*
            Function: get
                Provides methods to get the preference item
        */
        get: function() {
            return webpg.localStorage.getItem('sign_gmail')
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <bool> The boolean value to set
        */
        set: function(value) {
            webpg.localStorage.setItem('sign_gmail', value);
        },
    },

    /*
        Class: webpg.preferences.encrypt_to_self
            Provides methods to get/set the "encrypt_to_self" preference
    */
    encrypt_to_self: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            encrypt_to = webpg.plugin.gpgGetPreference('encrypt-to').value
            default_key = webpg.plugin.gpgGetPreference('default-key').value
            return (encrypt_to == default_key) ? true : false;
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The KeyID to set as the default key
        */
        set: function(value) {
            // if this setting is disabled, remove the value for 'encrypt-to'
            if (!value) {
                webpg.plugin.gpgSetPreference('encrypt-to', '');
            } else {
                default_key = webpg.plugin.gpgGetPreference('default-key').value
                webpg.plugin.gpgSetPreference('encrypt-to', default_key);
            }
        },
    },

    /*
        Class: webpg.preferences.gnupghome
            Provides methods to get/set the "gnupghome" preference
    */
    gnupghome: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = webpg.localStorage.getItem('gnupghome');
            return (value && value != -1) ? value : '';
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The string value for GNUPGHOME
        */
        set: function(value) {
            webpg.localStorage.setItem('gnupghome', value);
            webpg.plugin.gpgSetHomeDir(value);
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            webpg.localStorage.setItem('gnupghome', '');
            webpg.plugin.gpgSetHomeDir('');
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
        },
    },

    /*
        Class: webpg.preferences.gnupgbin
            Provides methods to get/set the GnuPG binary execututable
    */
    gnupgbin: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = webpg.localStorage.getItem('gnupgbin');
            return (value && value != -1) ? value : '';
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The string value for GNUPGHOME
        */
        set: function(value) {
            webpg.localStorage.setItem('gnupgbin', value);
            webpg.plugin.gpgSetBinary(value);
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            webpg.localStorage.setItem('gnupgbin', '');
            webpg.plugin.gpgSetBinary('');
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
        },
    },

    /*
        Class: webpg.preferences.enabled_keys
            Provides methods to get/set the "enabled_keys" preference
    */
    enabled_keys: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = webpg.localStorage.getItem('enabled_keys');
            return (value && value != -1) ? value.split(",") : [];
        },

        /*
            Function: add
                Provides method to add the preference item

            Parameters:
                keyid - <str> The KeyID to add to the list
        */
        add: function(keyid) {
            var keys_arr = this.get();
            keys_arr.push(keyid);
            webpg.localStorage.setItem('enabled_keys', keys_arr);
        },

        /*
            Function: remove
                Provides method to remove the key from the preference item

            Parameters:
                keyid - <str> The KeyID to remove from the list
        */
        remove: function(keyid) {
            var keys_tmp = this.get();
            var keys_arr = [];
            for (key in keys_tmp) {
                if (keys_tmp[key] != keyid) {
                    keys_arr.push(keys_tmp[key]);
                }
            }
            webpg.localStorage.setItem('enabled_keys', keys_arr);
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            webpg.localStorage.setItem('enabled_keys', '');
        },

        /*
            Function: length
                Returns the length of items stored in preference
        */
        length: function(){
            return this.get().length;
        },

        /*
            Function: has
                Determines if keyid is contained in the preference item

            Parameters:
                keyid - <str> The KeyID to look for; Returns true/false
        */
        has: function(keyid){
            var key_arr = this.get();
            for (var i = 0; i < this.length(); i++) {
                if (key_arr[i] == keyid)
                    return true;
            }
            return false;
        },
    },

    /*
        Class: webpg.preferences.default_key
            Provides methods to get/set the "default_key" preference
    */
    default_key: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            return webpg.plugin.gpgGetPreference('default-key').value
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                keyid - <str> The KeyID to add to the preference item
        */
        set: function(keyid) {
            if (webpg.preferences.encrypt_to_self.get() == 'true') {
                webpg.plugin.gpgSetPreference("encrypt-to", keyid);
            }
            webpg.plugin.gpgSetPreference("default-key", keyid);
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function() {
            webpg.plugin.gpgSetPreference('default-key', '');
        },
    },
};

if (webpg.utils.detectedBrowser['product'] == "chrome") {
    try {
        webpg.browserWindow = chrome.extension.getBackgroundPage();
    } catch (err) {
        // We must be loading from a non-background source, so the method
        //  chrome.extension.getBackgroundPage() is expected to fail.
        webpg.browserWindow = null;
    }
    webpg.localStorage = window.localStorage;
} else if (webpg.utils.detectedBrowser['product'] == "safari") {
    webpg.browserWindow = safari.extension.globalPage.contentWindow;
    webpg.localStorage = window.localStorage;
// If this is Firefox, set up required objects
} else if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
    webpg.wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
    webpg.winType = (webpg.utils.detectedBrowser['product'] == "thunderbird") ?
        "mail:3pane" : "navigator:browser";
    webpg.browserWindow = webpg.wm.getMostRecentWindow(webpg.winType);
    // We are running on Mozilla, we need to set our localStorage object to
    //  use the 'mozilla.org/preference-service'
    webpg.localStorage = {
        getItem: function(item) {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.webpg.");
            var prefType = prefs.getPrefType(item);
            return (prefType == 32) ? prefs.getCharPref(item) :
                   (prefType == 64) ? prefs.getIntPref(item).toString() :
                   (prefType == 128) ? prefs.getBoolPref(item).toString() : -1;
        },
        setItem: function(item, value) {
            value = (typeof(value) == "object") ? value.toString() : value;
            var prefType = webpg.constants.ff_prefTypes[typeof(value)];
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.webpg.");
            return (prefType == 32) ? prefs.setCharPref(item, value) :
                   (prefType == 64) ? prefs.setIntPref(item, value) :
                   (prefType == 128) ? prefs.setBoolPref(item, value): -1;
        },
    }
} else if (webpg.utils.detectedBrowser['vendor'] == "opera") {
    webpg.browserWindow = opera.extension.bgProcess;
    webpg.localStorage = window.localStorage;
}

webpg.preferences.init(webpg.browserWindow);
/* ]]> */
