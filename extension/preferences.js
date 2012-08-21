/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class: webpg.preferences
        Provides a unified getter/setter methods for storing the user/global
        preference items
*/
webpg.preferences = {

    /*
        Function: init
            Ensures the definition of webpg.background
    */
    init: function(browserWindow) {
        if (typeof(webpg.background)=='undefined')
            webpg.background = browserWindow;
    },

    /*
        Object: webpg_enabled
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
        */
        set: function(value) {
            webpg.localStorage.setItem('enabled', value);
        },
    },

    /*
        Object: decorate_inline
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
        */
        set: function(value) {
            webpg.localStorage.setItem('decorate_inline', value);
        },
    },

    /*
        Object: encrypt_to_self
            Provides methods to get/set the "encrypt_to_self" preference
    */
    encrypt_to_self: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            encrypt_to = webpg.background.plugin.gpgGetPreference('encrypt-to').value
            default_key = webpg.background.plugin.gpgGetPreference('default-key').value
            return (encrypt_to == default_key) ? true : false;
        },

        /*
            Function: set
                Provides method to set the preference item
        */
        set: function(value) {
            // if this setting is disabled, remove the value for 'encrypt-to'
            if (!value) {
                webpg.background.plugin.gpgSetPreference('encrypt-to', '');
            } else {
                default_key = webpg.background.plugin.gpgGetPreference('default-key').value
                webpg.background.plugin.gpgSetPreference('encrypt-to', default_key);
            }
        },
    },

    /*
        Object: gnupghome
            Provides methods to get/set the "gnupghome" preference
    */
    gnupghome: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            return webpg.localStorage.getItem('gnupghome');
        },

        /*
            Function: set
                Provides method to set the preference item
        */
        set: function(value) {
            webpg.localStorage.setItem('gnupghome', value);
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            webpg.localStorage.setItem('gnupghome', '');
        },
    },

    /*
        Object: enabled_keys
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

        add: function(keyid) {
            var keys_arr = this.get();
            keys_arr.push(keyid);
            webpg.localStorage.setItem('enabled_keys', keys_arr);
        },

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
        Object: default_key
            Provides methods to get/set the "default_key" preference
    */
    default_key: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            return webpg.background.plugin.gpgGetPreference('default-key').value
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                keyid - <str> The KeyID to add to the preference item
        */
        set: function(keyid) {
            if (webpg.preferences.encrypt_to_self.get() == 'true') {
                webpg.background.plugin.gpgSetPreference("encrypt-to", keyid);
            }
            webpg.background.plugin.gpgSetPreference("default-key", keyid);
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function() {
            webpg.background.plugin.gpgSetPreference('default-key', '');
        },
    },
};

if (webpg.utils.detectedBrowser == "chrome") {
    try {
        var browserWindow = chrome.extension.getBackgroundPage();
    } catch (err) {
        // We must be loading from a non-background source, so the method
        //  chrome.extension.getBackgroundPage() is expected to fail.
        var browserWindow = null;
    }
    webpg.localStorage = window.localStorage;
// If this is Firefox, set up required objects
} else if (webpg.utils.detectedBrowser == "firefox") {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    // We are a Firefox extension, we need to set the localStorage object to
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
}

webpg.preferences.init(browserWindow);
/* ]]> */
