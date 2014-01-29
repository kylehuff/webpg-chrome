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
    init: function(browserWindow) {
        var _ = webpg.utils.i18n.gettext;
        document.title = _("About WebPG");
        var browserString;
        if (webpg.utils.detectedBrowser.vendor == "mozilla") {
            if (webpg.utils.detectedBrowser.product == "firefox")
                browserString = "Firefox";
            else if (webpg.utils.detectedBrowser.product == "thunderbird")
                browserString = "Thunderbird";
            else if (webpg.utils.detectedBrowser.product == "seamonkey")
                browserString = "SeaMonkey";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            if (!browserWindow) {
                browserWindow = webpg.utils.mozilla.getChromeWindow();
            }
            webpg.plugin = browserWindow.webpg.plugin;
        } else if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            browserString = "Chrome";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            webpg.plugin = chrome.extension.getBackgroundPage().webpg.plugin;
        }
        webpg.about.browserString = browserString;

        webpg.utils.extension.version(function(version) {
            webpg.jq("#webpg-info-version-string").text(
                _("Version") + ": " + webpg.utils.escape(version)
            );
        });

        webpg.jq(".webpg-info").each(function() {
            var item = this.className.split(" ")[1];
            switch (item) {
                case "extension-title":
                    webpg.jq(this).text(_("Extension Information"));
                    break;
                case "extension-version-label":
                    webpg.jq(this).text(_("Extension version"));
                    break;
                case "extension-version":
                    webpg.utils.extension.version(function(version) {
                        webpg.jq('.extension-version').text(
                            webpg.utils.escape(version)
                        );
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
                    if (homedir === "")
                        homedir = webpg.plugin.webpg_status.GNUPGHOMEDIR;
                    if (homedir === "")
                        homedir = webpg.plugin.webpg_status.OpenPGP.home_dir;
                    if (typeof(homedir) === 'undefined')
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
                    webpg.jq(this).text((typeof(webpg.plugin.webpg_status.Assuan)=='undefined') ? _("not detected") : webpg.plugin.webpg_status.Assuan.version);
                    break;
            }
        });
        if (webpg.utils.detectedBrowser.vendor == "mozilla")
            webpg.jq('#window_functions').hide();

        webpg.jq('#close').button().button("option", "label", _("Finished"))
            .click(function(e) { window.top.close(); });

        webpg.jq('#translation-status-link').click(function() {
            webpg.jq('#translation-status')
            .load('https://translations.launchpad.net/webpg-chrome/trunk/+pots/webpg #language-chart',
            function(responseText, status, xhrObject) {
                if (status == "success") {
                    webpg.jq("#language-chart").find('tr').find('td:gt(2), th:gt(2)').hide();
                    webpg.jq("#language-chart").find('tr').find('td:gt(4), th:gt(4)').show();
                    webpg.jq("#language-chart").find('a').each(function() {
                        this.href = this.href.replace(/.*?\:\/\/.*?\//, "https://translations.launchpad.net/");
                    });
                    webpg.jq("#language-chart").find('img').each(function() {
                        this.src = this.src.replace(/.*?\:\/\/.*?\//, "https://translations.launchpad.net/");
                    });
                    webpg.jq("#language-chart").find('.sortkey').each(function() {
                        if (!webpg.jq(this).next()[0]) {
                            webpg.jq(this.nextSibling).remove();
                        } else {
                            if (webpg.jq(this).next()[0].nodeName == 'IMG')
                                webpg.jq(this).remove();
                            else
                                webpg.jq(this).next().remove();
                        }
                    });
                    webpg.jq("#language-chart").css({
                        'text-align': 'left',
                        'color': '#fff'
                    }).find('th').css({'border': '1px solid #F22'});
                }
            });
        }).button().button("option", "label", _("Translation Status"));
   }
};

webpg.jq(function() {
    var browserWindow = null;
    if (webpg.utils.detectedBrowser['vendor'] == 'mozilla')
      browserWindow = webpg.utils.mozilla.getChromeWindow();
    if (browserWindow.webpg.plugin === undefined) {
      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Components.interfaces.nsIWindowMediator);
      var winType = (webpg.utils.detectedBrowser['product'] == "thunderbird") ?
          "mail:3pane" : "navigator:browser";
      browserWindow = wm.getMostRecentWindow(winType);
    }
    webpg.about.init(browserWindow);
});
/* ]]> */
