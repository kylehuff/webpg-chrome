/* <![CDATA[ */

var ext = chrome.extension.getBackgroundPage();

jQuery(function(){
    error_map = ext.plugin.webpg_status;

    if (error_map["error"]) {
        error_html = "<p>Error (" + error_map["gpg_error_code"] + "): " + error_map["error_string"] + "</p>";
        error_html += "<h3>Suggestions:</h3>";
        error_html += "<ul>";
        if (error_map["gpg_error_code"] == -1) {
            error_html += "<li>There might be a problem with the libgpgme installation;</li>";
        }
        if (error_map["gpg_error_code"] == "150") {
            error_html += "<li>This might be a problem with the gpg installation;";
            if (window.navigator.platform.toLowerCase().indexOf("win") !== -1)
                error_html += " consider reinstalling gpg4win (<a href='http://gpg4win.org/'>gpg4win.org</a>)</li>";
            else
                error_html += "</li>";
        }
        error_html += "</ul>";

        var systemInfoHTML = "<h1>Error Details</h1>";
        systemInfoHTML += "Error in Method: " + error_map["method"] + "<br/\>";
        systemInfoHTML += "Error Code: " + error_map["gpg_error_code"] + "<br/\>";
        systemInfoHTML += "Error String: " + error_map["error_string"] + "<br/\>";
        file = error_map["file"];
        if (window.navigator.platform.toLowerCase().indexOf("win") !== -1) {
            file = file.substr(error_map["file"].lastIndexOf("\\") + 1);
        } else {
            file = file.substr(error_map["file"].lastIndexOf("/") + 1);
        }
        systemInfoHTML += "File: " + file + "<br/\>";
        systemInfoHTML += "Line: " + error_map["line"] + "<br/\>";
    } else {
        error_html = "<p>Unknown Error</p>";
    }
    jQuery("#error-text")[0].innerHTML += error_html;

    systemInfoHTML += "<h1>System Information</h1>";
    systemInfoHTML += "Platform: " + webpg.utils.escape(window.navigator.platform) + "<br/\>";
    systemInfoHTML += "App Version: " + webpg.utils.escape(window.navigator.appVersion) + "<br/\>";
    systemInfoHTML += "User Agent: " + webpg.utils.escape(window.navigator.userAgent) + "<br/\>";
    systemInfoHTML += "Product: " + webpg.utils.escape(window.navigator.product) + "<br/\>";
    systemInfoHTML += "productSub: " + webpg.utils.escape(window.navigator.productSub) + "<br/\>";
    systemInfoHTML += "Vendor: " + webpg.utils.escape(window.navigator.vendor) + "<br/\>";
    systemInfoHTML += "Language: " + webpg.utils.escape(window.navigator.language) + "<br/\>";

    jQuery("#system-info-list")[0].innerHTML = systemInfoHTML;

    jQuery('#refresh').button().click(function(e) {
        ext.webpgBackground.init();
        window.close();
    });

    jQuery('#close').button().click(function(e) { window.close(); });

});
/* ]]> */
