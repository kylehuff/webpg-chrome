/* <![CDATA[ */

var ext = chrome.extension.getBackgroundPage();

$(function(){
    error_map = ext.plugin.webpg_status;

    if (error_map["error"]) {
        error_html = "<p>Error (" + error_map["gpg_error_code"] + "): " + error_map["error_string"] + "</p>";
        error_html += "<h3>Suggestions:</h3>"
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

        $("#system-info-list")[0].innerHTML += "<h1>Error Details</h1>";
        $("#system-info-list")[0].innerHTML += "Error in Method: " + error_map["method"] + "<br/\>";
        $("#system-info-list")[0].innerHTML += "Error Code: " + error_map["gpg_error_code"] + "<br/\>";
        $("#system-info-list")[0].innerHTML += "Error String: " + error_map["error_string"] + "<br/\>";
        file = error_map["file"];
        if (window.navigator.platform.toLowerCase().indexOf("win") !== -1) {
            file = file.substr(error_map["file"].lastIndexOf("\\") + 1);
        } else {
            file = file.substr(error_map["file"].lastIndexOf("/") + 1);
        }
        $("#system-info-list")[0].innerHTML += "File: " + file + "<br/\>";
        $("#system-info-list")[0].innerHTML += "Line: " + error_map["line"] + "<br/\>";
    } else {
        error_html = "<p>Unknown Error</p>";
    }
    $("#error-text")[0].innerHTML += error_html;

    $("#system-info-list")[0].innerHTML += "<h1>System Information</h1>";
    $("#system-info-list")[0].innerHTML += "Platform: " + window.navigator.platform + "<br/\>";
    $("#system-info-list")[0].innerHTML += "App Version: " + window.navigator.appVersion + "<br/\>";
    $("#system-info-list")[0].innerHTML += "User Agent: " + window.navigator.userAgent + "<br/\>";
    $("#system-info-list")[0].innerHTML += "Product: " + window.navigator.product + "<br/\>";
    $("#system-info-list")[0].innerHTML += "productSub: " + window.navigator.productSub + "<br/\>";
    $("#system-info-list")[0].innerHTML += "Vendor: " + window.navigator.vendor + "<br/\>";
    $("#system-info-list")[0].innerHTML += "Language: " + window.navigator.language + "<br/\>";

    $('#refresh').button().click(function(e) {
        ext.location.reload();
        console.log(ext.plugin.webpg_status);
        window.close();
    });

    $('#close').button().click(function(e) { window.close(); });

});
/* ]]> */
