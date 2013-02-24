/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') webpg.jq = jQuery.noConflict(true);

/*
    Class: webpg.about
        Proivides the class to handle the "about" page
*/
webpg.about = {
    /*
        Function: init
            Sets up the page to reflect the correct host application
    */
    init: function() {
        var _ = webpg.utils.i18n.gettext;
        document.title = _("About WebPG");
        var browserString;
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            if (webpg.utils.detectedBrowser['product'] == "firefox")
                browserString = "Firefox";
            else if (webpg.utils.detectedBrowser['product'] == "thunderbird")
                browserString = "Thunderbird";
            else if (webpg.utils.detectedBrowser['product'] == "seamonkey")
                browserString = "SeaMonkey";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            webpg.plugin = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
               .getInterface(Components.interfaces.nsIWebNavigation)
               .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
               .rootTreeItem
               .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
               .getInterface(Components.interfaces.nsIDOMWindow).webpg.plugin;
        } else if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            browserString = "Chrome";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            webpg.plugin = chrome.extension.getBackgroundPage().webpg.plugin;
        }
        webpg.about.browserString = browserString;

        webpg.utils.extension.version(function(version) {
            webpg.jq("#webpg-info-version-string").text(
                _("Version") + ": " + webpg.utils.escape(version)
            )
        });

        webpg.jq(".webpg-info").each(function() {
            var item = this.className.split(" ")[1];
            switch (item) {
                case "extension-title":
                    webpg.jq(this).text(_("Extension Information"));
                    break;
                case "extension-version-label":
                    webpg.jq(this).text(_("Extension version"))
                    break;
                case "extension-version":
                    webpg.utils.extension.version(function(version) {
                        webpg.jq('.extension-version').text(
                            webpg.utils.escape(version)
                        )
                    });
                    break;
                case "os-label":
                    webpg.jq(this).text(_("Platform"));
                    break;
                case "os-version":
                    webpg.jq(this).text(webpg.utils.escape(window.navigator.platform));
                    break;
                case "browser-label":
                    webpg.jq(this).text(_("Product"));
                    break;
                case "browser":
                    webpg.jq(this).text(webpg.utils.escape(webpg.about.browserString));
                    break;
                case "useragent-label":
                    webpg.jq(this).text(_("User Agent"));
                    break;
                case "useragent":
                    webpg.jq(this).text(webpg.utils.escape(window.navigator.userAgent));
                    break;
                case "language-label":
                    webpg.jq(this).text(_("Language"));
                    break;
                case "language":
                    webpg.jq(this).text(webpg.utils.escape(window.navigator.language));
                    break;
                case "plugin-title":
                    webpg.jq(this).text(_("Plugin Information"));
                    break;
                case "plugin-version-label":
                    webpg.jq(this).text(_("Plugin version"));
                    break;
                case "plugin-version":
                    webpg.jq(this).text(webpg.plugin.webpg_status.plugin.version);
                    break;
                case "plugin-path-label":
                    webpg.jq(this).text("Plugin path");
                    break;
                case "plugin-path":
                    webpg.jq(this).text(webpg.plugin.webpg_status.plugin.path);
                    break;
                case "gnupg-title":
                    webpg.jq(this).text(_("GnuPG Information"));
                    break;
                case "gnupg-version-label":
                    webpg.jq(this).text(_("GnuPG version"));
                    break;
                case "gnupg-version":
                    webpg.jq(this).text(webpg.plugin.webpg_status.OpenPGP.version);
                    break;
                case "gnupg-binary-label":
                    webpg.jq(this).text(_("GnuPG binary"));
                    break;
                case "gnupg-binary":
                    webpg.jq(this).text(webpg.plugin.webpg_status.OpenPGP.file_name);
                    break;
                case "gnupg-homedir-label":
                    webpg.jq(this).text(_("GnuPG home directory"));
                    break;
                case "gnupg-homedir":
                    var homedir = webpg.preferences.gnupghome.get();
                    if (homedir == "")
                        homedir = webpg.plugin.webpg_status.GNUPGHOMEDIR;
                    if (homedir == "")
                        homedir = webpg.plugin.webpg_status.OpenPGP.home_dir;
                    if (typeof(homedir) == 'undefined')
                        homedir = _("default");
                    webpg.jq(this).text(homedir);
                    break;
                case "gpgconf-version-label":
                    webpg.jq(this).text(_("GPGCONF version"));
                    break;
                case "gpgconf-version":
                    if (webpg.plugin.webpg_status.gpgconf_detected)
                        webpg.jq(this).text(webpg.plugin.webpg_status.GPGCONF.version);
                    else
                        webpg.jq(this).text(_("not detected"));
                    break;
                case "assuan-version-label":
                    webpg.jq(this).text(_("Assuan version"));
                    break;
                case "assuan-version":
                    webpg.jq(this).text(webpg.plugin.webpg_status.Assuan.version);
                    break;
            }
        });      
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            webpg.jq('#window_functions').hide();

        webpg.jq('#close').button().button("option", "label", _("Finished"))
            .click(function(e) { window.top.close(); });
   }
}

window.addEventListener("DOMContentLoaded", function() {
    webpg.about.init();
}, true);
/* ]]> */
