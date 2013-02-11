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
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            if (webpg.utils.detectedBrowser['product'] == "firefox")
                var browserString = "Firefox";
            else if (webpg.utils.detectedBrowser['product'] == "thunderbird")
                var browserString = "Thunderbird";
            else if (webpg.utils.detectedBrowser['product'] == "seamonkey")
                var browserString = "SeaMonkey";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
        } else if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            document.getElementById("webpg-info-browser").innerHTML += "Chrome";
        }

        document.getElementById("webpg-info-version-string").innerText +=
            _("Version") + ": " + webpg.utils.escape(webpg.utils.extension.version());

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
