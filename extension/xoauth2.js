/* <![CDATA[ */
if (typeof(webpg)==='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!=='undefined') { webpg.jq = jQuery.noConflict(true); }

// Provider specific XOAUTH2 constants
const XOAUTH2 = {
  AUTH_URL: {
    google: "https://accounts.google.com/o/oauth2/auth"
  },
  APPROVAL_URL: {
    google: "https://accounts.google.com/o/oauth2/approval"
  },
  TOKEN_URL: {
    google: "https://accounts.google.com/o/oauth2/token"
  },
  CLIENT_ID: {
    google: "378165263974-njculgu1p9eftoi1igcr69opstfd3i0d.apps.googleusercontent.com"
  },
  CLIENT_KEY: {
    google: "tdihzR7NobAJN3Pc7H7lOWlA"
  },
  REDIRECT_URI: {
    google: "urn:ietf:wg:oauth:2.0:oob"
  },
  SCOPES: {
    google: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://mail.google.com",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}

// Set the XOAUTH2 provider
const PROVIDER = 'google';

/*
    Class:   webpg.xoauth2
      Provides reusable methods for XOAUTH2 implementation.
*/
webpg.xoauth2 = {

  init: function() {
    // Get the stored XOAUTH2 data from localStorage (if any)
    try {
      webpg.xoauth2.comp_data = webpg.preferences.xoauth2_data.get();
    } catch (e) {
      webpg.
        utils.
          sendRequest({
                      'msg': "preferences",
                      'item': "xoauth2_data",
                      'action': 'get'
                    }, function(response) {
                        webpg.xoauth2.comp_data = response.result;
                    });
    }
  },

  connectAccount: function(details) {
    processRequest = function(details, tab) {
      if (!webpg.xoauth2.comp_data.hasOwnProperty(webpg.xoauth2.current_identity))
        webpg.xoauth2.comp_data[webpg.xoauth2.current_identity] = {}
      webpg.xoauth2.comp_data[webpg.xoauth2.current_identity].access_code =
          tab.title.split("=") ? tab.title.split("=")[1] : undefined;

    webpg.
      utils.
        sendRequest({
                    'msg': "preferences",
                    'item': "xoauth2_data",
                    'action': 'set',
                    'value': webpg.xoauth2.comp_data
                    });

      // We have what we need from the authorization window - close it
      if (webpg.utils.detectedBrowser['vendor'] === "google") {
          // The window.close method is not available in chrome, so
          //  instead just remove the tab, thus destroying the window
          chrome.tabs.remove(tab.id);
      } else {
          webpg.xoauth2.popup.close();
      }

      // Request the access token
      webpg.xoauth2.requestToken(webpg.xoauth2.current_identity, function() {
        webpg.xoauth2.getUserInfo(webpg.xoauth2.current_identity, function(data) {
          if (webpg.xoauth2.comp_data.hasOwnProperty('tempid')) {
            webpg.xoauth2.comp_data[data.email] = webpg.xoauth2.comp_data['tempid'];
            delete webpg.xoauth2.comp_data.tempid;
            webpg.xoauth2.current_identity = data.email;
          }
          webpg.xoauth2.comp_data[data.email] = {
            id: data.id,
            email: data.email,
            picture: data.picture,
            access_code: webpg.xoauth2.comp_data[data.email].access_code,
            refresh_token: webpg.xoauth2.comp_data[data.email].refresh_token,
            access_token: webpg.xoauth2.comp_data[data.email].access_token,
            token_type: webpg.xoauth2.comp_data[data.email].token_type,
            expires_in: webpg.xoauth2.comp_data[data.email].expires_in,
            expires_on: webpg.xoauth2.comp_data[data.email].expires_on
          }
        webpg.
          utils.
            sendRequest({
                        'msg': "preferences",
                        'item': "xoauth2_data",
                        'action': 'set',
                        'value': webpg.xoauth2.comp_data
                        });
          if (webpg.xoauth2.requestCodeCallback)
            webpg.xoauth2.requestCodeCallback();
        })
      });
    };

    if (webpg.utils.detectedBrowser['vendor'] === 'google') {
      chrome.tabs.get(details.tabId, function(tab) {
        // If the window that belongs to this webRequest event is the
        //  one from our request, store the access_code and close the
        //  window
        if (webpg.xoauth2.popup && webpg.xoauth2.popup.id === tab.windowId) {
          processRequest(details, tab);
        }
      });
    } else {
      //if (webpg.xoauth2.popup.document.location.href.split("?")[0] === XOAUTH2.APPROVAL_URL[PROVIDER])
      if (webpg.xoauth2.popup.content.document.readyState === "complete" &&
          webpg.xoauth2.popup.content.document.location.href.split("?")[0] === XOAUTH2.APPROVAL_URL[PROVIDER]) {
        processRequest(details, webpg.xoauth2.popup.document);
      } else {
        setTimeout(function() { webpg.xoauth2.connectAccount(details) }, 500);
      }
    }
  },

  /*
    Function: requestCode
      Opens a popup window for the user to authorize WebPG to access to
      the defined scope(s)

    Parameters:
      scope - <list> A list of scope items to request

  */
  requestCode: function(identity, scope) {
    // Add an observer to catch the authorization return
    webpg.utils.requestListener.add(function(details) {
      var URL = (details.url.spec || details.url).split("?")[0];

      if (URL === XOAUTH2.APPROVAL_URL[PROVIDER]) {
        webpg.xoauth2.connectAccount(details);
      }
    });

    webpg.xoauth2.current_identity = (identity !== undefined) ? identity : 'tempid';
    scope = (!scope == undefined) ? scope : XOAUTH2.SCOPES[PROVIDER];
    var URL = XOAUTH2.AUTH_URL[PROVIDER] + "?scope=" + escape(scope.toString().
      replace(/,/g, '+')) + "&redirect_uri=" +
      XOAUTH2.REDIRECT_URI[PROVIDER] + "&response_type=code&client_id=" +
      XOAUTH2.CLIENT_ID[PROVIDER];

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
      Requests an access_token from the XOAUTH2.TOKEN_URL[PROVIDER] value and
      populates the return into the webpg.xoauth2.comp_data object.

    Parameters:
      callback - <function> A callback method to call on successful
      completion

  */
  requestToken: function(identity, callback) {
    var result = "queued";
    identity = (identity || webpg.xoauth2.current_identity);

    data = {
        code: webpg.xoauth2.comp_data[identity].access_code,
        client_id: XOAUTH2.CLIENT_ID[PROVIDER],
        client_secret: XOAUTH2.CLIENT_KEY[PROVIDER],
        redirect_uri: XOAUTH2.REDIRECT_URI[PROVIDER],
        grant_type: "authorization_code"
    };

    webpg.jq.ajax({
      method: 'POST',
      async: (callback !== undefined),
      url: XOAUTH2.TOKEN_URL[PROVIDER],
      data: {
        code: webpg.xoauth2.comp_data[identity].access_code,
        client_id: XOAUTH2.CLIENT_ID[PROVIDER],
        client_secret: XOAUTH2.CLIENT_KEY[PROVIDER],
        redirect_uri: XOAUTH2.REDIRECT_URI[PROVIDER],
        grant_type: "authorization_code"
      },
      success: function(data) {
        webpg.xoauth2.comp_data[identity]['access_token'] = data.access_token,
        webpg.xoauth2.comp_data[identity]['token_type'] = data.token_type,
        webpg.xoauth2.comp_data[identity]['expires_in'] = data.expires_in,
        webpg.xoauth2.comp_data[identity]['expires_on'] = new Date().getTime() + data.expires_in,
        webpg.xoauth2.comp_data[identity]['refresh_token'] = data.refresh_token
        if (callback !== undefined)
          callback(data);
        else
          result = data;
      },
      error: function(data) {
          console.log(data);
          console.log(identity);
          console.log(webpg.xoauth2.comp_data[identity].access_code);
      }
    });
    return result;
  },

  /*
    Function: refreshToken
      Requests a refresh_token from the XOAUTH2.TOKEN_URL[PROVIDER] value and
      populates the return into the webpg.xoauth2.comp_data object.
      If the originating access_code is invalid this post will return
      a status of 400; at which point an new access_code request will
      automatically be invoked.

    Parameters:
      callback - <function> A callback method to call on successful
      completion
  */
  refreshToken: function(identity, callback) {
    var result = "queued";
    identity = (identity || webpg.xoauth2.current_identity);
    webpg.jq.ajax({
      type: 'POST',
      async: (callback !== undefined),
      url: XOAUTH2.TOKEN_URL[PROVIDER],
      data: {
        refresh_token: webpg.xoauth2.comp_data[identity].refresh_token,
        client_id: XOAUTH2.CLIENT_ID[PROVIDER],
        client_secret: XOAUTH2.CLIENT_KEY[PROVIDER],
        grant_type: "refresh_token"
      },
      success: function(data) {
        webpg.xoauth2.comp_data[identity]['access_token'] = data.access_token,
        webpg.xoauth2.comp_data[identity]['token_type'] = data.token_type,
        webpg.xoauth2.comp_data[identity]['expires_in'] = data.expires_in
        webpg.
          utils.
            sendRequest({
                        'msg': "preferences",
                        'item': "xoauth2_data",
                        'action': 'set',
                        'value': webpg.xoauth2.comp_data
                        }, function(response) {
                          if (callback !== undefined)
                            callback(data);
                          else
                            result = webpg.xoauth2.comp_data[identity];
                        });
      },
      error: function(data) {
        // Need a new code!
        result = webpg.xoauth2.requestCode();
      }
    });
    return result;
  },

  /*
    Function: getUserInfo
      Requests the userinfo data object from the google api server

    Parameters:
      callback - <function> A callback method to call on successful
      completion

  */
  getUserInfo: function(identity, callback) {
    var result = "queued";
    var REQUEST_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
    identity = (identity || webpg.xoauth2.current_identity);
    webpg.jq.ajax({
      type: 'GET',
      async: (callback !== undefined),
      url: REQUEST_URL,
      beforeSend: function setHeader(xhr) {
        xhr.setRequestHeader("Authorization", "Bearer " +
          webpg.xoauth2.comp_data[identity].access_token);
      },
      success: function(data) {
        if (callback !== undefined)
          callback(data);
        else
          result = data;
      },
      error: function(data) {
        if (webpg.xoauth2.comp_data[identity].hasOwnProperty('access_code'))
          webpg.xoauth2.refreshToken(identity, callback);
        else
          webpg.xoauth2.requestCode();
      },
    });
    return result;
  },

  getTokenInfo: function(identity, callback) {
    var result = "queued";
    if (identity == undefined || typeof(identity) == "function")
      return "usage: getTokenInfo(<identity>, <optional callback>)";
    webpg.xoauth2.current_identity = identity;
    if (webpg.xoauth2.comp_data[identity] === undefined)
      result = identity + " is not a linked identity";
    else
      webpg.jq.ajax({
        url: "https://www.googleapis.com/oauth2/v1/tokeninfo",
        data: {access_token: webpg.xoauth2.comp_data[identity].access_token},
        async: (callback !== undefined),
        success: function (data) {
          data.access_token = webpg.xoauth2.comp_data[identity].access_token;
          if (callback !== undefined)
            callback(data);
          else
            result = data;
        },
        error: function(data) {
          if (data.status == 400) {
            result = webpg.xoauth2.refreshToken(identity, callback);
            result.token = webpg.xoauth2.comp_data[identity];
          }
        },
      });
    return result;
  },
}

webpg.xoauth2.init();
