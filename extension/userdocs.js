/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') webpg.jq = jQuery.noConflict(true);

/*
    Class: webpg.userdocs
        Proivides the class to handle the "userdocs" page
*/
webpg.userdocs = {
    /*
        Function: init
            Sets up the page to reflect the correct host application
    */
    init: function(browserWindow) {
        var _ = webpg.utils.i18n.gettext;
        document.title = _("WebPG User Documentation/Guides");

        webpg.utils.extension.version(function(version) {
            webpg.jq("#webpg-info-version-string").text(
                _("Version") + ": " + webpg.utils.escape(version)
            );
        });
        
        webpg.jq(".webpg-info-title").text(_("WebPG Documentation"));

   }
};

webpg.jq(function() {
    var browserWindow = null;
    if (webpg.utils.detectedBrowser['vendor'] == 'mozilla') {
        browserWindow = webpg.utils.mozilla.getChromeWindow();
      if (browserWindow.webpg.plugin === undefined) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
        var winType = (webpg.utils.detectedBrowser['product'] == "thunderbird") ?
            "mail:3pane" : "navigator:browser";
        browserWindow = wm.getMostRecentWindow(winType);
      }
    }
    webpg.userdocs.init(browserWindow);
});
/* ]]> */
