/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
if (typeof(webpg.thunderbird)=='undefined') { webpg.thunderbird = {}; }

webpg.thunderbird.utils = {

    accountManager: function() {
        return Components.classes["@mozilla.org/messenger/account-manager;1"]
                        .getService(Components.interfaces.nsIMsgAccountManager);
    }(),

    getIdentities: function() {
        var idSupports = this.accountManager.allIdentities;
        var identities = queryISupportsArray(idSupports,
                                           Components.interfaces.nsIMsgIdentity);

        return identities;
    },

    getCurrentIdentity: function() {
        var msgIdentity = document.getElementById('msgIdentity').value;
        return this.accountManager.getIdentity(msgIdentity);
    },

    getDefaultIdentity: function() {
        // Default identity
        var defaultIDs = this.accountManager.defaultAccount.identities;
        return (defaultIDs.Count() >= 1) ? defaultIDs.QueryElementAt(0,
            Components.interfaces.nsIMsgIdentity) : this.getIdentities()[0];
    },

    setMenuItemLabels: function(menuitems) {
        var _ = webpg.utils.i18n.gettext;
        for (var i = 0; i !== menuitems.length; i++) {
            var itemClasses = menuitems[i].className.split(" ");
            for (var itemClass in itemClasses) {
                if (itemClasses[itemClass].indexOf("webpg-menu-") == 0) {
                    switch (itemClasses[itemClass]) {
                        case 'webpg-menu-webpg':
                            menuitems[i].label = _("WebPG");
                            break;

                        case 'webpg-menu-manager':
                            menuitems[i].label = _("Key Manager");
                            break;

                        case 'webpg-menu-options':
                            menuitems[i].label = _("Options");
                            break;

                        case 'webpg-menu-about':
                            menuitems[i].label = _("About");
                            break;

                        case 'webpg-menu-sign':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Clear-sign this text");
                            else
                                menuitems[i].label = _("Clear Sign");
                            break;

                        case 'webpg-menu-verif':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Verify this text");
                            else
                                menuitems[i].label = _("Verify");
                            break;

                        case 'webpg-menu-crypt':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Encrypt this text");
                            else
                                menuitems[i].label = _("Encrypt");
                            break;

                        case 'webpg-menu-cryptsign':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Sign and Encrypt this text");
                            else
                                menuitems[i].label = _("Sign and Encrypt");
                            break;

                        case 'webpg-menu-decrypt':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Decrypt this text");
                            else
                                menuitems[i].label = _("Decrypt");
                            break;

                        case 'webpg-menu-import':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Import this Public key");
                            else
                                menuitems[i].label = _("Import");
                            break;

                        case 'webpg-menu-export':
                            if (menuitems[i].className.indexOf("context-menu-item") > -1)
                                menuitems[i].label = _("Paste Public Key");
                            else
                                menuitems[i].label = _("Export");
                            break;
                    }
                }
            }
        }
    },

    // jQuery must be loaded via the onload handler, as loading it prior renders
    //  the context menu FUBAR
    loadjQuery: function(wnd) {
        var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
            .getService(Components.interfaces.mozIJSSubScriptLoader);
        loader.loadSubScript("chrome://webpg-firefox/content/jquery/js/jquery-1.10.2.min.js", wnd);
        var jQuery = wnd.jQuery.noConflict(true);
        return jQuery;
    },
}

/* ]]> */
