/* <![CDATA[ */
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
        document.title = _("About WebPG");
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            if (webpg.utils.detectedBrowser['product'] == "firefox")
                var browserString = "Firefox";
            else if (webpg.utils.detectedBrowser['product'] == "thunderbird")
                var browserString = "Thunderbird";
            else if (webpg.utils.detectedBrowser['product'] == "seamonkey")
                var browserString = "SeaMonkey";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            document.getElementById("webpg-info-version-string").innerHTML +=
                webpg.utils.escape(webpg.about.version);
        } else if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            document.getElementById("webpg-info-browser").innerHTML += "Chrome";
            document.getElementById("webpg-info-version-string").innerText +=
                webpg.utils.escape(chrome.app.getDetails().version);
        }
        jQuery('#close').button().button("option", "label", _("Finished"))
            .click(function(e) { window.top.close(); });
   }
}

window.addEventListener("DOMContentLoaded", function() {
    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
        try {
            // Firefox 4 and later; Mozilla 2 and later
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
            AddonManager.getAddonByID("webpg-firefox@curetheitch.com", function(result) {
                webpg.about.version = result.version;
                webpg.about.init()
            });
        }
        catch (ex) {
            // Firefox 3.6 and before; Mozilla 1.9.2 and before
            var em = Components.classes["@mozilla.org/extensions/manager;1"]
                     .getService(Components.interfaces.nsIExtensionManager);
            webpg.about.version = em.getItemForID("webpg-firefox@curetheitch.com").version;
            webpg.about.init();
        }
    } else {
        webpg.about.init();
    }
}, true);
/* ]]> */
