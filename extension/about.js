/* <![CDATA[ */
webpg.about = {
    init: function(extensionManager) {
        if (navigator.userAgent.toLowerCase().search("firefox") > -1) {
            document.getElementById("webpg-info-browser").innerHTML += "Firefox";
            document.getElementById("webpg-info-version-string").innerHTML +=
                webpg.utils.clean(webpg.about.version);
        } else if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            document.getElementById("webpg-info-browser").innerHTML += "Chrome";
            document.getElementById("webpg-info-version-string").innerText +=
                chrome.app.getDetails().version;
        }
        jQuery('#close').button().click(function(e) { window.top.close(); });
   }
}

window.addEventListener("DOMContentLoaded", function() {
    if (navigator.userAgent.toLowerCase().search("firefox") > -1) {
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
