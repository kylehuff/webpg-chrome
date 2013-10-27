/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

const XOAUTH2_AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
const XOAUTH2_APPROVAL_URL = "https://accounts.google.com/o/oauth2/approval";
const XOAUTH2_TOKEN_URL = "https://accounts.google.com/o/oauth2/token";
const XOAUTH2_CLIENT_ID = "378165263974-njculgu1p9eftoi1igcr69opstfd3i0d.apps.googleusercontent.com";
const XOAUTH2_CLIENT_KEY = "tdihzR7NobAJN3Pc7H7lOWlA";
const XOAUTH2_REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
const XOAUTH2_SCOPES = ["https://www.googleapis.com/auth/userinfo.email",
    "https://mail.google.com",
    "https://www.googleapis.com/auth/userinfo.profile"];

/*
    Class:   webpg.xoauth2
        Provides reusable methods for XOAUTH2 implementation.
*/
webpg.xoauth2 = {

    init: function() {
        // Get the stored XOAUTH2 data from localStorage (if any)
        webpg.xoauth2.comp_data = webpg.preferences.xoauth2_data.get();

        // FIXME: there must be a way to do this without a webNavigation listener...
        // Listen for the response back about the XOAUTH2 CODE request
        chrome.webNavigation.onCompleted.addListener(function(details) {
            chrome.tabs.get(details.tabId, function(tab) {
                // If the window that belongs to this webNavigation event is the
                //  one from our request, store the access_code and close the
                //  window
                if (webpg.xoauth2.popup && webpg.xoauth2.popup.id == tab.windowId) {
                    if (!webpg.xoauth2.comp_data.hasOwnProperty(webpg.xoauth2.current_identity))
                        webpg.xoauth2.comp_data[webpg.xoauth2.current_identity] = {}
                    webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].access_code = tab.title.split("=") ? tab.title.split("=")[1] : undefined;
                    webpg.preferences.xoauth2_data.set(webpg.xoauth2.comp_data);
                    // The window.close method is not available in chrome, so
                    //  instead just remove the tab, thus destroying the window
                    chrome.tabs.remove(tab.id);

                    // Request the access token
                    webpg.xoauth2.requestToken(function() {
                        webpg.xoauth2.getUserInfo(function(data) {
                            if (webpg.xoauth2.comp_data.hasOwnProperty('tempid')) {
                                webpg.xoauth2.comp_data[data.email] = webpg.xoauth2.comp_data['tempid'];
                                delete webpg.xoauth2.comp_data.tempid;
                                webpg.xoauth2.current_identity = data.email;
                            }
                            webpg.xoauth2.comp_data[data.email] = {
                                id: data.id,
                                email: data.email,
                                picture: data.picture,
                                code: webpg.xoauth2.comp_data[data.email].access_code,
                                refresh_token: webpg.xoauth2.comp_data[data.email].refresh_token,
                                access_token: webpg.xoauth2.comp_data[data.email].access_token,
                                token_type: webpg.xoauth2.comp_data[data.email].token_type,
                                expires_in: webpg.xoauth2.comp_data[data.email].expires_in,
                                expires_on: webpg.xoauth2.comp_data[data.email].expires_on
                            }
                            webpg.preferences.xoauth2_data.set(webpg.xoauth2.comp_data);
                            if (webpg.xoauth2.requestCodeCallback)
                                webpg.xoauth2.requestCodeCallback();
                        })
                    });
                }
            });
        }, {url: [{urlMatches: XOAUTH2_APPROVAL_URL}]})
    },

    /*
        Function: requestCode
            Opens a popup window for the user to authorize WebPG to access to
            the defined scope(s)

        Parameters:
            scope - <list> A list of scope items to request

    */
    requestCode: function(identity, scope) {
        webpg.xoauth2.current_identity = (identity != undefined) ? identity : 'tempid';
        scope = (!scope == undefined) ? scope : XOAUTH2_SCOPES;
        var URL = XOAUTH2_AUTH_URL + "?scope=" + escape(scope.toString().
            replace(/,/g, '+')) + "&redirect_uri=" +
            XOAUTH2_REDIRECT_URI + "&response_type=code&client_id=" +
            XOAUTH2_CLIENT_ID;

        var left  = (webpg.jq(window).width()/2)-(800/2),
            top   = (webpg.jq(window).height()/2)-(600/2);

        if (webpg.utils.detectedBrowser['vendor'] == "google") {
            chrome.windows.onCreated.addListener(function(w) {
                webpg.xoauth2.popup = w;
            });
        }

        this.popup = window.open(URL, "DescriptiveWindowName", "width=800, \
            height=600, top="+top+", left="+left);
    },

    /*
        Function: requestToken
            Requests an access_token from the XOAUTH2_TOKEN_URL value and
            populates the return into the webpg.xoauth2.comp_data object.

        Parameters:
            callback - <function> A callback method to call on successful
            completion

    */
    requestToken: function(callback) {
        webpg.jq.post(XOAUTH2_TOKEN_URL, {
            code: webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].access_code,
            client_id: XOAUTH2_CLIENT_ID, client_secret: XOAUTH2_CLIENT_KEY,
            redirect_uri: XOAUTH2_REDIRECT_URI, grant_type: "authorization_code" },
            function(data) {
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['access_token'] = data.access_token,
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['token_type'] = data.token_type,
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['expires_in'] = data.expires_in,
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['expires_on'] = new Date().getTime() + data.expires_in,
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['refresh_token'] = data.refresh_token
                if (callback != undefined)
                    callback();
            }
        );
    },

    /*
        Function: refreshToken
            Requests a refresh_token from the XOAUTH2_TOKEN_URL value and
            populates the return into the webpg.xoauth2.comp_data object.
            If the originating access_code is invalid this post will return
            a status of 400; at which point an new access_code request will
            automatically be invoked.

        Parameters:
            callback - <function> A callback method to call on successful
            completion
    */
    refreshToken: function(callback) {
        webpg.jq.post(XOAUTH2_TOKEN_URL, {
            refresh_token: webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].refresh_token,
            client_id: XOAUTH2_CLIENT_ID, client_secret: XOAUTH2_CLIENT_KEY,
            grant_type: "refresh_token" },
            function(data) {
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['access_token'] = data.access_token,
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['token_type'] = data.token_type,
                webpg.xoauth2.comp_data[webpg.xoauth2.current_identity]['expires_in'] = data.expires_in
                if (callback != undefined)
                    callback()
            }
        ).error(function(data) {
            // Need a new code!
            webpg.xoauth2.requestCode();
        });
    },

    // GOOGLE Specific Methods

    /*
        Function: getUserInfo
            Requests the userinfo data object from the google api server

        Parameters:
            callback - <function> A callback method to call on successful
            completion

    */
    getUserInfo: function(callback) {
        var REQUEST_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
        webpg.jq.ajax({
            type: 'GET',
            url: REQUEST_URL,
            beforeSend: function setHeader(xhr) {
                xhr.setRequestHeader("Authorization", "Bearer " +
                    webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].access_token);
            },
            success: function(data) {
                if (callback != undefined)
                    callback(data);
            },
            error: function(data) {
                if (webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].hasOwnProperty('access_code'))
                    webpg.xoauth2.refreshToken();
                else
                    webpg.xoauth2.requestCode();
            },
        });
    },

    getTokenInfo: function(identity, callback) {
        if (identity == undefined || typeof(identity) == "function")
            return "usage: getTokenInfo(<identity>, <optional callback>)";
        webpg.xoauth2.current_identity = identity;
        webpg.jq.ajax({
            url: "https://www.googleapis.com/oauth2/v1/tokeninfo",
            data: {access_token: webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].access_token},
            async: false,
            success: function (data) {
                if (callback != undefined)
                    callback(data);
            },
            error: function(data) {
                if (data.status == 400)
                    webpg.xoauth2.refreshToken(callback);
            },
        });
    },
}

webpg.xoauth2.init();
