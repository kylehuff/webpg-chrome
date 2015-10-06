/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/**
    @class webpg.preferences
        Provides unified getter/setter methods for storing the user/global
        preference items
*/
webpg.preferences = {

    /**
        @method: init
            Ensures the definition of webpg.background is available to the
            webpg.preferences class
    */
    init: function(browserWindow) {
        if (typeof(webpg.background)=='undefined')
            webpg.background = browserWindow;
    },

    /**
        @property {webpg.preferences.webpg_enabled} webpg_enabled
            Provides methods to get/set the "enabled" preference
        @member webpg.preferences
    */
    webpg_enabled: {
        /**
            @method get
                Provides method to get the preference item
            @member webpg.preferences.webpg_enabled
        */
        get: function() {
            return webpg.localStorage.getItem('enabled');
        },

        /**
            @method set
                Provides method to set the preference item

            @param {Boolean} value The boolean value to set
            @member webpg.preferences.webpg_enabled
        */
        set: function(value) {
            webpg.localStorage.setItem('enabled', value);
        }
    },

    /**
        @property {webpg.preferences.decorate_inline} decroate_inline
            Provides methods to get/set the "decorate_inline" preference
    */
    decorate_inline: {
        /**
            @method get
                Provides method to get the preference item

            @member webpg.preferences.decorate_inline
        */
        get: function() {
            var value = webpg.localStorage.getItem('decorate_inline');
            return (value === null) ? "true" : value;
        },

        /**
            @method set
                Provides method to set the preference item

            @param {Boolean} value The boolean value to set
            @member webpg.preferences.decorate_inline
        */
        set: function(value) {
            webpg.localStorage.setItem('decorate_inline', value);
        },

        /**
            @method mode
                Provides method to get or set the mode preference item

            @param {String} value The value to set - either "window" or "icon"
            @member webpg.preferences.decorate_inline
        */
        mode: function(value) {
            if (typeof(value)!="undefined") {
                webpg.localStorage.setItem('decorate_mode', value);
            } else {
                var mode = webpg.localStorage.getItem('decorate_mode');
                return (mode === null || mode === -1) ? "window" : mode;
            }
        }
    },

    /**
        @property {webpg.preferences.render_toolbar} render_toolbar
            Provides methods to get/set the "render_toolbar" preference
    */
    render_toolbar: {
        /**
            @method get
                Provides method to get the preference item

            @member webpg.preferences.render_toolbar
        */
        get: function() {
            var value = webpg.localStorage.getItem('render_toolbar');
            return (value === null) ? true : value;
        },

        /**
            @method set
                Provides method to set the preference item

            @param {String} value The value to set - "true" "false"
            @member webpg.preferences.render_toolbar
        */
        set: function(value) {
            webpg.localStorage.setItem('render_toolbar', value);
        }
    },

    /**
        @property {webpg.preferences.gmail_integration} gmail_integration
            Provides methods to get/set the "gmail_integration" preference
    */
    gmail_integration: {
        /**
            @method get
                Provides method to get the preference item

            @return {String} 'true'|'false'
            @member webpg.preferences.gmail_integration
        */
        get: function() {
            var value = webpg.localStorage.getItem('gmail_integration');
            return (value && value != -1) ? value : 'false';
        },

        /**
            @method set
                Provides method to set the preference item

            @param {String} value 'true'|'false'
            @member webpg.preferences.gmail_integration
        */
        set: function(value) {
            webpg.localStorage.setItem('gmail_integration', value);
        }
    },

    /**
        @property {webpg.preferences.gmail_action} gmail_action
            Provides methods to get/set the "gmail_action" preference.
    */
    sign_gmail: {
        /**
            @method get
                Provides method to get the preference item.

            @return {Number}

                0: Do not use WebPG by default for gmail messages
                1: Encrypt by default for gmail messages
                2: Sign by default for gmail messages
                3: Sign & Encrypt by default for gmail messages
                4: Symmetric Encryption by default for gmail messages

            @member webpg.preferences.gmail_action
        */
        get: function() {
            var value = webpg.localStorage.getItem('sign_gmail');
            return (value && value != -1) ? value : 'false';
        },

        /**
            @method set
                Provides method to set the preference item.

            @param {Number} value
            @member webpg.preferences.gmail_action
        */
        set: function(value) {
            webpg.localStorage.setItem('sign_gmail', value);
        }
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
            try {
                var encrypt_to = webpg.plugin.gpgGetPreference('encrypt-to').value,
                    default_key = webpg.plugin.gpgGetPreference('default-key').value,
                    encrypt_to_self = (default_key !== "" && encrypt_to === default_key) ? 'true' : 'false';
                webpg.localStorage.setItem('encrypt_to_self', encrypt_to_self);
                return encypt_to_self;
            } catch (e) {
                return webpg.localStorage.getItem('encrypt_to_self');
            }
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
                webpg.plugin.gpgSetPreference('encrypt-to', 'blank');
            } else {
                var default_key = webpg.preferences.default_key.get();
                webpg.plugin.gpgSetPreference('encrypt-to', default_key);
            }
        }
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
        set: function(value, callback) {
            webpg.localStorage.setItem('gnupghome', value);
            webpg.plugin.gpgSetHomeDir(value);
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
            webpg.plugin = (webpg.plugin.valid) ? webpg.plugin :
                webpg.background.webpg.plugin;
            callback();
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
            webpg.plugin = (webpg.plugin.valid) ? webpg.plugin :
                webpg.background.webpg.plugin;
        }
    },

    selectedKeys: {
        get: function() {
            var qtd = webpg.localStorage.getItem('howManySelectedKeys');
            if(qtd && qtd > 0) {
            	var result = new Array(qtd);
            	for(var i = 0; i < qtd; i++) {
            		result[i] = webpg.localStorage.getItem(i+'SelectedKeys');
            	}
            	return result;
            } else {
            	return '';
            }
        },

        set: function(value1) {
        	var value = [];
        	value = value1;
        	var size = 0;
        	size = value.length;
        	var i = 0;
        	for(; i < size; i++) {
        		webpg.localStorage.setItem(i+'SelectedKeys', value[i]);
        	}
        	webpg.localStorage.setItem('howManySelectedKeys', size);
        },

        clear: function(){
            webpg.localStorage.setItem('howManySelectedKeys', '');
        }
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
            webpg.plugin = (webpg.plugin.valid) ? webpg.plugin :
                webpg.background.webpg.plugin;
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
            webpg.plugin = (webpg.plugin.valid) ? webpg.plugin :
                webpg.background.webpg.plugin;
        }
    },

    /*
        Class: webpg.preferences.gpgconf
            Provides methods to get/set the GPGCONF binary execututable
    */
    gpgconf: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function() {
            var value = webpg.localStorage.getItem('gpgconf');
            return (value && value != -1) ? value : '';
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <str> The string value for GPGCONF
        */
        set: function(value) {
            webpg.localStorage.setItem('gpgconf', value);
            webpg.plugin.gpgSetGPGConf(value);
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
            webpg.plugin = (webpg.plugin.valid) ? webpg.plugin :
                webpg.background.webpg.plugin;
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function(){
            webpg.localStorage.setItem('gpgconf', '');
            webpg.plugin.gpgSetGPGConf('');
            (webpg.background.hasOwnProperty("webpg")) ?
                webpg.background.webpg.background.init() :
                webpg.background.init();
            webpg.plugin = (webpg.plugin.valid) ? webpg.plugin :
                webpg.background.webpg.plugin;
        }
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
            for (var key in keys_tmp) {
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
        }
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
        get: function(callback) {
            webpg.plugin.gpgGetPreference('default-key', callback);
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
            webpg.plugin.gpgSetPreference('default-key', 'blank');
        }
    },

    /*
        Class: webpg.preferences.groups
            Provides methods to create/manage groups
    */
    group: {
        /*
            Function: get
                Provides method to get the preference item
        */
        get: function(group) {
            var value = JSON.parse(webpg.localStorage.getItem('groups'));
            return (value && value.hasOwnProperty(group)) ? value[group] : [];
        },

        /*
            Function: get_groups
                Provides method to get all defined groups
        */
        get_group_names: function() {
            var value = JSON.parse(webpg.localStorage.getItem('groups'));
            return (value && typeof(value)=='object') ? Object.keys(value) : [];
        },

        /*
            Function: get_groups_for_key
                Provides method to get all defined groups
        */
        get_groups_for_key: function(keyid) {
            var groups = JSON.parse(webpg.localStorage.getItem('groups'));
            var ingroups = [];
            for (var group in groups) {
                if (groups[group].indexOf(keyid) != -1)
                    ingroups.push(group);
            }
            return ingroups;
        },

        /*
            Function: add
                Provides method to add a recipient to the named group

            Parameters:
                group - <str> The group to add the recipient to
                recipient - <str> The recipient to add to the group
        */
        add: function(group, recipient) {
            if (!group && !recipient)
                return "usage: add('group', 'recipient')";

            // Get the currently defined group object (if any) and convert it
            //  to an object
            var groups = webpg.localStorage.getItem('groups');
            groups = (groups && groups.length > 1) ? JSON.parse(groups) : {};

            groups = (groups !== null) ? groups : {};

            // Check if the groups object contains the named group, if not
            //  create it
            if (!groups.hasOwnProperty(group))
                groups[group] = [];

            // Check if the recipient is alredy in the named group, if not
            //  add it
            if (groups[group].indexOf(recipient) == -1)
                groups[group].push(recipient);
            else
                return { 'error': false, 'group': group, 'modified': false};

            // Convert the groups object back to a string and store it
            webpg.localStorage.setItem('groups', JSON.stringify(groups));

            // Set the group via gpgconf
            var groupstr =
                this.get(group).toString().replace(RegExp(",", "g"), " ");

            webpg.plugin.gpgSetGroup(group, groupstr);

            return { 'error': false, 'group': group, 'modified': true};
        },

        /*
            Function: remove
                Provides method to remove a recipient from the named group

            Parameters:
                group - <str> The group to remove the recipient from
                recipient - <str> The recipient to remove from the group
        */
        remove: function(group, recipient) {
            // Get the currently defined group object (if any) and convert it
            //  to an object
            var groups = JSON.parse(webpg.localStorage.getItem('groups'));

            groups = (groups !== null) ? groups : {};

            // Check if the groups object contains the named group, if not
            //  create it
            if (!groups.hasOwnProperty(group))
                groups[group] = [];

            // Check if the recipient is in the named group, if so
            //  remove it
            var recipIndex = groups[group].indexOf(recipient);
            if (recipIndex > -1)
                groups[group].splice(recipIndex, 1);
            else
                return { 'error': false, 'group': group, 'modified': false};

            // Convert the groups object back to a string and store it
            webpg.localStorage.setItem('groups', JSON.stringify(groups));

            // Set the modified group via gpgconf
            var groupstr =
                this.get(group).toString().replace(RegExp(",", "g"), " ");

            // Set the group, and retreive the entire gpgconf "group" string
            var group_res = webpg.plugin.gpgSetGroup(group, groupstr);

//            // Check if there are any empty groups laying around
//            if (group_res.indexOf("= ,") > -1 || group_res.search(new RegExp(/[^=]$/gm)) > -1) {
//                group_res = group_res.split(", ");

//                // TODO:
//                // FIXME:
//                // The following kludge is due to the fact that, when removing the last
//                //  entry in a group, it leaves "group groupname =" in the gpg.conf file
//                //  since the npapi library does not (yet) permit removing the value entirely

//                // Clear all the groups
//                webpg.plugin.gpgSetPreference("group", "");
//                // Iterate through the array of "group = values"
//                for (var rgroup in group_res) {
//                    // check if this group contains a string like "groupname ="
//                    if (group_res[rgroup].length != group_res[rgroup].indexOf("=") + 1) {
//                        // Break out the group name it's values
//                        group_res[rgroup].replace(
//                            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
//                            function($0, $1, $2, $3) {
//                                // Set the new group value
//                                webpg.plugin.gpgSetGroup($1.trim(), $3.trim());
//                            }
//                        );
//                    }
//                }
//            }

            return { 'error': false, 'group': group, 'modified': true};
        },

        delete_group: function(group) {
          var gpg_groups = webpg.plugin.gpgGetPreference("group");
          if (gpg_groups.value !== undefined)
            groups = gpg_groups.value.split(", ");
          else
            return false;

          // Clear all the groups, and we will add them back without the group
          //  specified.
          webpg.plugin.gpgSetPreference("group", "");

          for (var rgroup in groups) {
            // Break out the group name it's values
            groups[rgroup].replace(
              new RegExp("([^?=&]+)(=([^&]*))?", "g"),
              function($0, $1, $2, $3) {
                // Set the new group value
                if ($1.trim() !== group)
                  webpg.plugin.gpgSetGroup($1.trim(), $3.trim());
                else
                  webpg.utils.log("INFO")("Removed '" + $1.trim() + "' from gpg.conf");
              }
            );
          }
          groups = JSON.parse(webpg.localStorage.getItem("groups"));
          if (groups.hasOwnProperty(group)) {
            delete groups[group];
            webpg.localStorage.setItem("groups", JSON.stringify(groups));
            webpg.utils.log("INFO")("Removed '" + group + "' from localStorage");
          }
        },

        /*
            Function: refresh_from_config
                Provides method to retrieve the group item(s) in gpg.conf
        */
        refresh_from_config: function() {
          webpg.plugin.gpgGetPreference("group", function(res) {
            if (typeof(res)==="string")
              res = JSON.parse(res);
            if (!res.error) {
                var groups = res.value.split(", ");
                var groups_json = {};
                for (var rgroup in groups) {
                    if (groups[rgroup] === "")
                        return;
                    var g_v = groups[rgroup].split(" = ");
                    if (g_v.length > 1)
                      groups_json[g_v[0]] = g_v[1].split(" ");
                }
                webpg.localStorage.setItem('groups', JSON.stringify(groups_json));
            }
          });
        },

        /*
            Function: clear
                Provides method to clear the preference item (erase/unset)
        */
        clear: function() {
            webpg.localStorage.setItem('groups', '');
        }
    },

    /*
        Class: webpg.preferences.banner_version
            Provides methods to get/set the "banner_version" preference

    */
    banner_version: {
        /*
            Function: get
                Provides methods to get the preference item
        */
        get: function() {
            var value = webpg.localStorage.getItem('banner_version');
            return (value && value != -1) ? value : 0;
        },

        /*
            Function: set
                Provides method to set the preference item

            Parameters:
                value - <bool> The boolean value to set
        */
        set: function(value) {
            webpg.localStorage.setItem('banner_version', value);
        }
    },

    xoauth2_data: {
        get: function() {
            var stored_data = webpg.localStorage.getItem('xoauth2_data');
            return (stored_data && stored_data.length > 1) ? JSON.parse(stored_data) : {};
        },

        set: function(data) {
            webpg.localStorage.setItem('xoauth2_data', JSON.stringify(data));
        }
    }
};

if (webpg.utils.detectedBrowser.product === "chrome") {
    try {
        webpg.browserWindow = chrome.extension.getBackgroundPage();
    } catch (err) {
        // We must be loading from a non-background source, so the method
        //  chrome.extension.getBackgroundPage() is expected to fail.
        webpg.browserWindow = null;
    }
    webpg.localStorage = window.localStorage;
} else if (webpg.utils.detectedBrowser.product === "safari") {
    webpg.browserWindow = safari.extension.globalPage.contentWindow;
    webpg.localStorage = window.localStorage;
// If this is Firefox, set up required objects
} else if (webpg.utils.detectedBrowser.vendor === "mozilla") {
    webpg.browserWindow = webpg.utils.mozilla.getChromeWindow();
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
        }
    };
} else if (webpg.utils.detectedBrowser.vendor === "opera") {
    webpg.browserWindow = opera.extension.bgProcess;
    webpg.localStorage = window.localStorage;
}

webpg.preferences.init(webpg.browserWindow);
/* ]]> */
