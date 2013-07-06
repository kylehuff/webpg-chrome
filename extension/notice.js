/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

webpg.notice = {
    init: function() {
        document.removeEventListener("DOMContentLoaded", arguments.callee, false);
        var _ = webpg.utils.i18n.gettext;
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            if (webpg.utils.detectedBrowser['product'] == "firefox")
                browserString = "Firefox";
            else if (webpg.utils.detectedBrowser['product'] == "thunderbird")
                browserString = "Thunderbird";
            else if (webpg.utils.detectedBrowser['product'] == "seamonkey")
                browserString = "SeaMonkey";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            if (!browserWindow) {
                var browserWindow = webpg.utils.mozilla.getChromeWindow();
            }
            webpg.plugin = browserWindow.webpg.plugin;
        } else if (navigator.userAgent.toLowerCase().search("chrome") > -1) {
            browserString = "Chrome";
            document.getElementById("webpg-info-browser").innerHTML += browserString;
            webpg.plugin = chrome.extension.getBackgroundPage().webpg.plugin;
        }
        webpg.notice.browserString = browserString;
        webpg.notice.vendor = webpg.utils.detectedBrowser['vendor'];
        webpg.notice.product = webpg.utils.detectedBrowser['product'];
        webpg.notice.desc_key = (webpg.utils.detectedBrowser['product'] == 'thunderbird')
            ? 'thunderbird' : 'general';

        webpg.utils.extension.version(function(version) {
            webpg.notice.version = version;
            var notice = {
                title: "Welcome to WebPG v" + version,
                desc: {
                    google: "WebPG for Chrome",
                    mozilla: "WebPG for Mozilla",
                    thunderbird: "provides the ability to Sign, Encrypt, Verify and Decrypt PGP data within Thunderbird",
                    general: "provides the ability to Sign, Encrypt, Verify and Decrypt PGP data on the Web, \
                        and can also be used to add GnuPG/PGP operations to GMAIL",
                },
                news: {
                    general: _("News"),
                    new_this_version: _("New features"),
                },
            }
            webpg.notice.buildNotice(notice);
        });
    },

    buildNotice: function(notice) {
        webpg.jq(".webpg-info-title").html(notice.title);

        var desc = "<span class='webpg-options-text'>" + 
            notice.desc[webpg.notice.vendor] + " " +
            notice.desc[webpg.notice.desc_key] +
            "</span>";

        var newsURL = "http://webpg.org/rss/?product=webpg-extension&version=" + webpg.notice.version;

        webpg.jq.ajax({type: "GET", url: newsURL, success: xmlParser, dataType: 'xml'}).fail(function(e, a) { console.log(e, a) });

        function xmlParser(xml) {
            webpg.jq(xml).find("item").each(function() {
                $this = webpg.jq(this);
                item = "<h3 class='news-title'>" + $this.find("title").text() + "</h3>" +
                    "<div class='news-desc'>" + $this.find("description").text() + "</div>";
                webpg.jq("#news").append("<div class='news-item'>" + item + "</div>");
                webpg.jq(".news-desc").find("li[class!=feed-all]|li[class!=feed-extension]|li[class!=feed-" + webpg.utils.detectedBrowser['product'] + "]|li[class!=feed-" + webpg.utils.detectedBrowser['vendor'] + "]").css({'display': 'none'});
            });
        }

        webpg.jq("#main_body .webpg-info-box").first().html(desc);
    },
}

document.addEventListener("DOMContentLoaded", webpg.notice.init, false);
/* ]]> */
