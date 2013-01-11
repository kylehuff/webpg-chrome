/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

/*
    Class: webpg.inline
        Handles all inline GPG/PGP data found on content pages
*/
webpg.inline = {

    /*
        Function: init
            Sets up the context and calls the PGPDataSearch method to find
            PGP data in the page.

        Parameters:
            doc - <document> The document object to parse
    */
    init: function(doc, mode) {
        // Initialize webpg.doc
        this.doc = doc;

        this.mode = mode;

        // Determine if inline decration has been disabled for this page
        // TODO: Implement this
        //if (!webpg.inline.enabledForPage(doc.location))
        //    return;

        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            if(typeof(doc.nodeName)!='undefined' && doc.nodeName != "#document")
                return;

            // Don't parse Firefox chrome pages
            try {
                if(doc.location.protocol == "chrome:")
                    return;
            } catch (err) {
                return;
            }
        }

        webpg.inline.PGPDataSearch(doc);

        var ifrms = doc.querySelectorAll("iframe");
        webpg.inline.existing_iframes = [];

        for (var ifrm in ifrms) {
            if (!isNaN(ifrm) && ifrms[ifrm].className.indexOf("webpg-") == -1) {
                webpg.inline.existing_iframes.push(ifrms[ifrm]);
                ifrms[ifrm].contentDocument.removeEventListener("contextmenu",
                    webpg.overlay.contextHandler, true);
                ifrms[ifrm].contentDocument.addEventListener("contextmenu",
                    webpg.overlay.contextHandler, true);
                webpg.inline.PGPDataSearch(ifrms[ifrm].contentDocument);
            }
        }

        window.addEventListener("DOMSubtreeModified", function(e) {
            if (e.target.nodeName == "IFRAME" && e.target.className.indexOf("webpg-") == -1 &&
                webpg.inline.existing_iframes.indexOf(e.target) == -1) {
                webpg.inline.existing_iframes.push(e.target);
                try {
                    e.target.contentDocument.documentElement.removeEventListener("contextmenu",
                        webpg.overlay.contextHandler, true);
                    e.target.contentDocument.documentElement.addEventListener("contextmenu",
                        webpg.overlay.contextHandler, true);
                } catch (err) {
                    //
                }
                webpg.inline.PGPDataSearch(e.target.contentDocument, true);
            }
        }, true);

    },

    /*
        Function: PGPDataSearch
            Searches the document for elements that contain PGP Data blocks.
            Calls the PGPBlockParse method if PGP data is found

        Parameters:
            doc - <document> The document to search
    */
    PGPDataSearch: function(doc, onchange) {
        var node, range, idx, search, baseIdx;

        var elementFilter = function(node) {
            if (node.tagName == "IMG" || node.tagName == "SCRIPT")
                return NodeFilter.FILTER_SKIP;
            return NodeFilter.FILTER_ACCEPT;
        };

        var textFilter = function(node) {
            return NodeFilter.FILTER_ACCEPT;
        };

        if (onchange == true) {
            try {
                var tw = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT, elementFilter, false);
            } catch (err) {
                return; // no access
            }
        } else {
            var tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, elementFilter, false);
        }

        while ((node = tw.nextNode())) {
            var previousElement = (node.previousSibling) ?
                node.previousSibling.previousSibling : node.previousSibling;
            if ((node.nodeName == "TEXTAREA" || node.getAttribute("contenteditable") == "true") && (!previousElement
            || previousElement.className != "webpg-toolbar")) {
                if (node.style.display != "none" && node.offsetHeight > 30) {
                    webpg.inline.addWebPGToolbar(node);
                }
            }
        }

        var haveStart = false;
        var blockType;
        var tw = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT, textFilter, false);

        while((node = tw.nextNode())) {
            idx = 0;

            while(true) {
                if(!haveStart) {

                    if (node.parentNode.nodeName == "SCRIPT")
                        break;

                    if (node.parentNode.className.indexOf("webpg-node-odata") != -1)
                        break;

                    if (node.textContent.indexOf(webpg.constants.PGPTags.PGP_DATA_BEGIN, idx) == -1)
                        break;

                    if (node.parentNode && node.parentNode.nodeName == 'TEXTAREA')
                        break;

                    if (node.parentNode && node.parentNode.nodeName == 'PRE' && node.parentNode.parentNode && node.parentNode.parentNode.parentNode  && typeof node.parentNode.parentNode.parentNode.getAttribute == 'function' && node.parentNode.parentNode.parentNode.getAttribute('id') == 'storeArea') {

                        // Possible TidyWiki document
                        var topwinjs = node.ownerDocument.defaultView.parent.wrappedJSObject;
                        if ("version" in topwinjs && topwinjs.version.title == "TiddlyWiki")
                            break; // It is, bail out
                    }

                    baseIdx = idx;
                    idx = node.textContent.indexOf(webpg.constants.PGPTags.PGP_KEY_BEGIN, baseIdx);
                    blockType = webpg.constants.PGPBlocks.PGP_KEY;
                    search = webpg.constants.PGPTags.PGP_KEY_END;
                    if(idx == -1   || idx > node.textContent.indexOf(webpg.constants.PGPTags.PGP_SIGNATURE_BEGIN, baseIdx)) {
                        idx = node.textContent.indexOf(webpg.constants.PGPTags.PGP_SIGNATURE_BEGIN, baseIdx);
                        search = webpg.constants.PGPTags.PGP_SIGNATURE_END;
                        blockType = webpg.constants.PGPBlocks.PGP_SIGNATURE;
                    }
                    if(idx == -1   || idx > node.textContent.indexOf(webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN, baseIdx)) {
                        idx = node.textContent.indexOf(webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN, baseIdx);
                        search = webpg.constants.PGPTags.PGP_SIGNATURE_END;
                        blockType = webpg.constants.PGPBlocks.PGP_SIGNED_MSG;
                    }
                    if(idx == -1 || idx < node.textContent.indexOf(webpg.constants.PGPTags.PGP_ENCRYPTED_BEGIN, baseIdx)) {
                        idx = node.textContent.indexOf(webpg.constants.PGPTags.PGP_ENCRYPTED_BEGIN, baseIdx);
                        search = webpg.constants.PGPTags.PGP_ENCRYPTED_END;
                        blockType = webpg.constants.PGPBlocks.PGP_ENCRYPTED;
                    }
                    if(idx == -1 || idx < node.textContent.indexOf(webpg.constants.PGPTags.PGP_KEY_BEGIN, baseIdx)) {
                        idx = node.textContent.indexOf(webpg.constants.PGPTags.PGP_KEY_BEGIN, baseIdx);
                        search = webpg.constants.PGPTags.PGP_KEY_END;
                        blockType = webpg.constants.PGPBlocks.PGP_KEY;
                    }
                    if(idx == -1 || idx < node.textContent.indexOf(webpg.constants.PGPTags.PGP_PKEY_BEGIN, baseIdx)) {
                        idx = node.textContent.indexOf(webpg.constants.PGPTags.PGP_PKEY_BEGIN, baseIdx);
                        search = webpg.constants.PGPTags.PGP_PKEY_END;
                        blockType = webpg.constants.PGPBlocks.PGP_PKEY;
                    }

                    if(idx == -1)
                        break;

                    haveStart = true;
                    range = document.createRange();
                    range.setStart(node, idx);
                    idx += 6;
                }
                if(haveStart) {
                    var filter = function(node) {
                        return NodeFilter.FILTER_ACCEPT;
                    };

                    var tryOne = node.textContent.indexOf(search, idx);

                    if(tryOne == -1)
                        break;

                    idx = node.textContent.indexOf(search,
                        this.ignoreInners(idx, tryOne, node.textContent));

                    if(idx == -1) {
                        break;
                    }

                    haveStart = false;
                    range.setEnd(node, idx + search.length);

                    webpg.inline.PGPBlockParse(range, node, blockType);
                    range.detach();
                    idx =0;
                }
            }
        }
    },

    /*
        Function: ignoreInners
            Avoids detection of PGP blocks found inside of other PGP blocks.

        Parameters:
            idx - <int> The current position of the block detected
            end - <int> The last position of the block detected
            node - <object> The node we are currently working on
    */
    ignoreInners: function(idx, end,node) {
        if  (end == -1)
            return -1;

        var baseIdx = idx;

        idx = node.indexOf(webpg.constants.PGPTags.PGP_KEY_BEGIN, baseIdx);
        var search = webpg.constants.PGPTags.PGP_KEY_END;

        if(idx == -1) {
            idx = node.indexOf(webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN, baseIdx);
            search = webpg.constants.PGPTags.PGP_SIGNATURE_END;
        }
        if(idx == -1) {
            idx = node.indexOf(webpg.constants.PGPTags.PGP_ENCRYPTED_BEGIN, baseIdx);
            search = webpg.constants.PGPTags.PGP_ENCRYPTED_END;
        }
        if(idx == -1) {
            idx = node.indexOf(webpg.constants.PGPTags.PGP_PKEY_BEGIN, baseIdx);
            search = webpg.constants.PGPTags.PGP_PKEY_END;
        }

        if(idx == -1 || idx > end)
            return end;

        return node.indexOf(search,
            this.ignoreInners(idx + 6,node.indexOf(search,idx + 6),node)
        ) + 6;
    },

    /*
        Function: PGPBlockParse
            Parses range contents and sends the appropriate request for
            the PGP blocks discovered. Calls the addResultsFrame method
            for any matching PGP blocks.

        Parameters:
            range - <range> The range containing the identified PGP block
            node - <obj> The node that PGP data was discovered in
            blockType - <int> The type of webpg.constants.PGPBlocks found
    */
    PGPBlockParse: function(range, node, blockType) {
        var s = new XMLSerializer();
        var d = range.cloneContents();
        var str = s.serializeToString(d);
        var xmlnsReg = new RegExp(" xmlns=\"http://www.w3.org/1999/xhtml\"", "gi");
        var wbrReg = new RegExp("\<wbr\>", "gi");

        str = str.replace(xmlnsReg, "");
        str = str.replace(wbrReg, "");

        var html = node.parentNode.innerHTML;

        while (html.lastIndexOf("\n") + 1 == html.length) {
            html = html.substring(0, html.lastIndexOf("\n"));
        }

        var scontent = (webpg.utils.detectedBrowser['product'] == "chrome") ?
                node.parentNode.innerText :
                node.parentNode.textContent;

        // The html contents posted to element is the textContent or innerText
        //  of the element with detected PGP Blocks
        var h = document.createElement("pre");
        jq(h).html(scontent);
        var phtml = h.innerHTML;

        if (html.match("<div><br></div>-----") == null && scontent == phtml) {
            var reg = new RegExp("(&(.){1,4};)", "g")
            if (html.search(reg) > -1)
                scontent = phtml;
            else
                scontent = html
        }

        var fragment = range.extractContents();

        var results_frame = webpg.inline.addResultsFrame(node, range);

        var doc = (webpg.inline.doc) ? webpg.inline.doc : document;

        var originalNodeData = doc.createElement("span");
        originalNodeData.setAttribute("class", "webpg-node-odata");
        originalNodeData.setAttribute("style", "white-space: pre;");
        originalNodeData.setAttribute("id", "webpg-node-odata-" + results_frame.id);
        originalNodeData.textContent = scontent;

        range.insertNode(originalNodeData);

        var posX = jq(originalNodeData).width() - 60;

        var badge = webpg.inline.addElementBadge(doc, posX, results_frame.id, originalNodeData);

        jq(originalNodeData).hide();

        jq(badge).hide();

        originalNodeData.appendChild(badge);

        switch(blockType) {
            case webpg.constants.PGPBlocks.PGP_KEY:
                console.log("WebPG found a public key");
                if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    webpg.utils.sendRequest({
                        'msg': "sendtoiframe",
                        'block_type': blockType,
                        'target_id': results_frame.id,
                        'original_text': scontent
                    });
                } else {
                    results_frame.onload = function(){
                        webpg.utils.sendRequest({
                            'msg': "sendtoiframe",
                            'block_type': blockType,
                            'target_id': results_frame.id,
                            'original_text': scontent
                        });
                    };
                }
                break;

            case webpg.constants.PGPBlocks.PGP_PKEY:
                console.log("WebPG found a private key, which is scary when you think about it... exiting");
                break;

            case webpg.constants.PGPBlocks.PGP_SIGNED_MSG:
                // check for the required PGP BLOCKS
                console.log("WebPG found a signed message");
                if (scontent.indexOf(webpg.constants.PGPTags.PGP_DATA_BEGIN) != -1 &&
                    scontent.indexOf("\n" + webpg.constants.PGPTags.PGP_SIGNATURE_BEGIN) != -1 &&
                    scontent.indexOf("\n" + webpg.constants.PGPTags.PGP_SIGNATURE_END) != -1 ) {
                } else {
                    if (scontent.indexOf(" " + webpg.constants.PGPTags.PGP_SIGNATURE_END) != -1) {
                        console.log("WebPG found a signed message with bad formatting");
                    } else {
                        console.log("WebPG found an incomplete signed message");
                    }
                }
                webpg.utils.sendRequest({
                    msg: 'verify',
                    data: scontent},
                    function(response) {
                        if (response.result.gpg_error_code == "58" || !response.result.error) {
                            webpg.utils.sendRequest({
                                'msg': "sendtoiframe",
                                'block_type': blockType,
                                'target_id': results_frame.id,
                                'verify_result': response.result}
                            );
                            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                                webpg.utils.sendRequest({
                                    'msg': "sendtoiframe",
                                    'block_type': blockType,
                                    'target_id': results_frame.id,
                                    'verify_result': response.result}
                                );
                            } else {
                                results_frame.onload = function() {
                                    webpg.utils.sendRequest({
                                        'msg': "sendtoiframe",
                                        'block_type': blockType,
                                        'target_id': results_frame.id,
                                        'verify_result': response.result}
                                    );
                                };
                            }
                        } else {
                            jq(results_frame).hide();
                            jq(element).children(".original").show();
                            jq(element).children(".pretext, .postext").hide();
                            console.log("error processing signed message", response.result);
                        }
                    }
                );
                break;

            case webpg.constants.PGPBlocks.PGP_SIGNATURE:
                // This should never be reached, because our parser should
                //  normally catch both the text, and the detached sig
                console.log("WebPG found a detached signature, but we don't have the file - exiting");
                break;

            case webpg.constants.PGPBlocks.PGP_ENCRYPTED:
                console.log("WebPG found an encrypted or signed message");
                webpg.utils.sendRequest({
                    // WebPG found a PGP MESSAGE, but it could be a signed. Lets gpgVerify first
                    msg: 'verify',
                    data: scontent,
                    target_id: results_frame.id },
                    function(response) {
                        if (response.result.signatures && response.result.data)
                            blockType = webpg.constants.PGPBlocks.PGP_SIGNED_MSG;
                        else
                            blockType = webpg.constants.PGPBlocks.PGP_ENCRYPTED;
                        webpg.utils.sendRequest({
                            'msg': "sendtoiframe",
                            'block_type': blockType,
                            'target_id': results_frame.id,
                            'verify_result': response.result
                        });
                        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                            webpg.utils.sendRequest({
                                'msg': "sendtoiframe",
                                'block_type': blockType,
                                'target_id': results_frame.id,
                                'verify_result': response.result
                            });
                        } else {
                            results_frame.onload = function() {
                                webpg.utils.sendRequest({
                                    'msg': "sendtoiframe",
                                    'block_type': blockType,
                                    'target_id': results_frame.id,
                                    'verify_result': response.result
                                });
                            };
                        }
                    }
                );
                break;
        }
    },

    addWebPGToolbar: function(element) {
        var _ = webpg.utils.i18n.gettext;
        element.style.whiteSpace = "pre";
        var doc = (webpg.inline.doc) ? webpg.inline.doc : document;
        var toolbar = doc.createElement("div");
        var toolbarWidth = 0;

        toolbar.setAttribute("style", "padding: 0 8px; font-weight: bold; " +
            "font-family: arial,sans-serif; font-size: 11px; position:absolute;" +
            "background-color: #f1f1f1;" +
            "color:#444; width:68px; height:24px; margin: 1px 0 0 1px;" +
            "border: 1px solid gainsboro; cursor:pointer;" +
            "z-index: 9998;");
        toolbar.setAttribute("class", "webpg-toolbar");

        jq(element).hover(
            function(e) {
                webpg.overlay.insert_target = element;
                var _x = 0;
                var _y = 0;
                var el = element;
                while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
                    _x += el.offsetLeft - el.scrollLeft;
                    _y += el.offsetTop - el.scrollTop;
                    el = el.offsetParent;
                }
                if (webpg.utils.detectedBrowser["vendor"] == "mozilla")
                    _x += 2;
                nleft = _x - 8 + ((element.clientWidth) ? element.clientWidth : element.offsetWidth) - toolbarWidth;
                if (element.nodeName != "TEXTAREA" &&
                    nleft + toolbarWidth == element.clientWidth)
                    nleft -= 10;
                toolbar.style.left = nleft + "px";
                jq(toolbar).show();
            },
            function(e) {
                var toElement = e.toElement || e.relatedTarget;
                if (!toElement)
                    jq(toolbar).hide();
                else if (toElement.className.indexOf("webpg-") == -1)
                    jq(toolbar).hide();
            }
        );
        var action_menu = '' +
            '<span class="webpg-current-action">' +
                '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) +
                    "skin/images/webpg-32.png" + '" style="position:relative; ' +
                    'top:4px; left:-4px; width:16px; height:16px;"/>' +
                'WebPG' +
            '</span>' +
            '&nbsp;' +
            '<span class="webpg-action-list-icon">' +
                '&nbsp;' +
            '</span>' +
            '<span>' +
            '<ul class="webpg-action-list">' +
                '<li class="webpg-action-btn">' +
                    '<a class="webpg-toolbar-encrypt" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_encrypted.png" class="webpg-li-icon"/>' +
                        _('Encrypt') +
                    '</a>' +
                '</li>' +
                '<li class="webpg-action-btn">' +
                    '<a class="webpg-toolbar-sign" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_signature-ok.png" class="webpg-li-icon"/>' +
                        _('Sign only') +
                    '</a>' +
                '</li>' +
                '<li class="webpg-action-btn">' +
                    '<a class="webpg-toolbar-cryptsign" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_encrypted_signed.png" class="webpg-li-icon"/>' +
                        _('Sign and Encrypt') +
                    '</a>' +
                '</li>' +
                '<li class="webpg-action-btn">' +
                    '<a class="webpg-toolbar-symcrypt" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_encrypted.png" class="webpg-li-icon"/>' +
                        _('Symmetric Encryption') +
                    '</a>' +
                '</li>' +
                '<li class="webpg-action-btn webpg-pgp-crypttext">' +
                    '<a class="webpg-toolbar-decrypt" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_decrypted.png" class="webpg-li-icon"/>' +
                        _('Decrypt') +
                    '</a>' +
                '</li>' +
                '<li class="webpg-action-btn webpg-pgp-import">' +
                    '<a class="webpg-toolbar-import" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_keypair.png" class="webpg-li-icon"/>' +
                        _('Import') +
                    '</a>' +
                '</li>' +
                '<li class="webpg-action-btn webpg-pgp-signtext">' +
                    '<a class="webpg-toolbar-verify" href="#webpg-link">' +
                        '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_signature-ok.png" class="webpg-li-icon"/>' +
                        _('Verify') +
                    '</a>' +
                '</li>' +
            '</ul>';

        jq(toolbar).append(action_menu);
        jq(toolbar).insertBefore(element);
        toolbarWidth = toolbar.clientWidth - 6;
        jq(toolbar).hide().hover(
            function() {
                // Get the current textarea value or selection
                var selection = webpg.utils.getSelectedText().selectedText;
                webpg.inline.toolbarTextSelection = selection;
                var element_value = null;

                if (element.nodeName == "TEXTAREA")
                    element_value = element.value;
                else if (element.nodeName == "DIV")
                    element_value = element.innerText;

                // Show the appropriate action for the textarea value or selection
                if (element_value.length && element_value.indexOf(
                    webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN) > -1) {
                    // Verify
                    jq(toolbar).find('.webpg-action-btn').hide();
                    jq(toolbar).find('.webpg-pgp-signtext').show();
                } else if (element_value.length && element_value.indexOf(
                    webpg.constants.PGPTags.PGP_ENCRYPTED_BEGIN) > -1) {
                    // Decrypt
                    jq(toolbar).find('.webpg-action-btn').hide();
                    jq(toolbar).find('.webpg-pgp-crypttext').show();
                } else if (element_value.length && element_value.indexOf(
                    webpg.constants.PGPTags.PGP_KEY_BEGIN) > -1) {
                    // Import
                    jq(toolbar).find('.webpg-action-btn').hide();
                    jq(toolbar).find('.webpg-pgp-import').show();
                } else {
                    // Plain text or non-PGP data
                    jq(toolbar).find('.webpg-action-btn').show();
                    jq(toolbar).find('.webpg-pgp-crypttext, .webpg-pgp-signtext, .webpg-pgp-import').hide();
                }
            },
            function() {
                webpg.inline.toolbarTextSelection = null;
                jq(this).hide();
            }
        );
        jq(toolbar).find('.webpg-action-list-icon').css({
            'display': 'inline-block', 'width': '0px',
            'height': '0', 'text-index': '-9999px',
            'position': 'relative', 'top': '-3px',
            'border-left': '4px solid transparent',
            'border-right': '4px solid transparent',
            'border-top': '4px solid black', 'opacity': '0.7',
            'content': '\\2193',
        });
        jq(toolbar).find('ul.webpg-action-list').css({
            'position': 'absolute', 'top': '100%', 'left': '-116px',
            'z-index': '9999', 'float': 'left', 'display': 'none',
            'min-width': '200px', 'padding': '0', 'margin': '0',
            'list-style': 'none', 'background-color': '#ffffff',
            'border-color': '#ccc', 'border-color': 'rgba(0, 0, 0, 0.2)',
            'border-style': 'solid', 'border-width': '1px',
            '-webkit-border-radius': '4px 0 4px 4px',
            '-moz-border-radius': '4px 0 4px 4px',
            'border-radius': '4px 0 4px 4px',
            '-webkit-box-shadow': '0 5px 10px rgba(0, 0, 0, 0.2)',
            '-moz-box-shadow': '0 5px 10px rgba(0, 0, 0, 0.2)',
            'box-shadow': '0 5px 10px rgba(0, 0, 0, 0.2)',
            '-webkit-background-clip': 'padding-box',
            '-moz-background-clip': 'padding',
            'background-clip': 'padding-box',
            '*border-right-width': '2px',
            '*border-bottom-width': '2px',
            'text-align': 'left',
        });
        jq(toolbar).find('.webpg-action-list li').css({
            'font-size': '12px',
            'position': 'relative',
            'padding': '0 6px 2px 6px',
            'display': 'block',
        }).hover(
            function(e) {
                jq(this).css({
                    'background-color': '#e6e6e6',
                })
            },
            function(e) {
                jq(this).css({
                    'background-color': 'transparent',
                 })
            }
        ).find('.webpg-li-icon').css({
            'width': '24px',
            'height': '24px',
            'padding': '0 4px 0 4px',
            'margin': '0',
            'top': '3px',
            'position': 'relative',
        });
        jq(toolbar).find('.webpg-action-list a').css({
            'display': 'block',
            'text-decoration': 'none',
            'color': 'black',
        });
        jq(toolbar).click(function(e) {
            var list = jq(this).find('.webpg-action-list');
            list[0].style.display = (list[0].style.display == "inline") ? "none" : "inline";
        }).bind('mouseleave', function() {
            if (jq(this).find('.webpg-action-list')[0].style.display == "inline")
                jq(this).click();
        });
        jq(toolbar).find('.webpg-action-list a').click(function(e) {
            var textarea = e.currentTarget.parentNode.parentNode.parentNode.parentNode.nextSibling;
            var selection = (webpg.inline.toolbarTextSelection == null) ?
                {'selectionText': textarea.value || textarea.innerText,
                    'pre_selection': '',
                    'post_selection': '',
                } :
                webpg.inline.toolbarTextSelection;
            webpg.overlay.insert_target = textarea;
            var link_class = e.currentTarget.className;
            var action = (link_class == "webpg-toolbar-encrypt") ?
                webpg.constants.overlayActions.CRYPT :
                (link_class == "webpg-toolbar-cryptsign") ?
                webpg.constants.overlayActions.CRYPTSIGN :
                (link_class == "webpg-toolbar-decrypt") ?
                webpg.constants.overlayActions.DECRYPT :
                (link_class == "webpg-toolbar-symcrypt") ?
                webpg.constants.overlayActions.SYMCRYPT :
                (link_class == "webpg-toolbar-sign") ?
                webpg.constants.overlayActions.PSIGN :
                (link_class == "webpg-toolbar-decrypt") ?
                webpg.constants.overlayActions.DECRYPT :
                (link_class == "webpg-toolbar-import") ?
                webpg.constants.overlayActions.IMPORT :
                (link_class == "webpg-toolbar-verify") ?
                webpg.constants.overlayActions.VERIF : false;

            if (action)
                webpg.overlay.onContextCommand(null, action, {}, selection);
        });
        if (webpg.utils.detectedBrowser['vendor'] == 'mozilla') {
            jq(toolbar).css({ 'margin-top': '4px' });
            jq(toolbar).find('.webpg-action-list-icon').css({ 'top': '6px' });
        }
    },

    addElementBadge: function(doc, posX, id, control) {

        var badge = doc.createElement("span");
        var posY = "-6";

        if (control.nodeName.toLowerCase() == "textarea") {
            posX = "-50";
        } else {
            var posY = "-34";
        }

        badge.setAttribute("style", "width:30px;" +
            "display:inline-block;position:relative;top:" + posY + "px;left:" + posX + "px;" +
            "padding:1px 2px 3px 0;border-radius: 70px; z-index:9000;");
        badge.setAttribute("id", "webpg-badge-toggle-" + id);
        badge.setAttribute("class", "webpg-badge-toggle");

        badge.innerHTML = "<a style='border:none;' href='#" + id +
                "' class='webpg-badge-toggle-link'><img style='opacity:0.5;width:28px;height:28px;' src='" +
                webpg.utils.resourcePath + "skin/images/webpg-48.png'/></a>";

        jq(badge).find('img').hover(
            function() {
                this.style.opacity = '1.0';
                jq(this).parent().parent()[0].style.backgroundColor = '#333333';
                jq(this).parent().parent()[0].style.boxShadow = 'black 1px 1px 6px';
            },
            function() {
                this.style.opacity = '0.5';
                jq(this).parent().parent()[0].style.backgroundColor = 'transparent';
                jq(this).parent().parent()[0].style.boxShadow = '';
            }
        );

        jq(badge).find('.webpg-badge-toggle-link').click(function(e) {
            var link_id = jq(this).parent()[0].id
            var target_id = link_id.substr(link_id.lastIndexOf("-") + 1, link_id.length);
            jq(control).hide();
            jq(this).parent().hide();
            jq(this.ownerDocument.getElementById(target_id)).show();
        });

        return badge;
    },

    /*
        Function: addResultsFrame
            Creates the results container(s) and iframe for the inline formatting

        Parameters:
            node - <obj> The node that PGP data was discovered in
            range - <range> The range containing the identified PGP block
    */
    addResultsFrame: function(node, range){
        var doc = (webpg.inline.doc) ? webpg.inline.doc : document;
        var iframe = doc.createElement("iframe");
        var id = (new Date()).getTime();
        iframe.setAttribute('id', id);
        iframe.className = "webpg-result-frame"
        iframe.scrolling = "no";
        iframe.frameBorder = "none";
        iframe.style.border = "1px solid #000";
        iframe.style.position = "relative";
        iframe.style.borderRadius = "6px";
        iframe.style.boxShadow = "2px 2px 2px #000";
        iframe.style.margin = "auto";
        iframe.style.top = "0";
        iframe.style.width = "100%";
        iframe.style.minHeight = "220px";
        iframe.style.backgroundColor = "#efefef";
        iframe.style.zIndex = "9999";
        if (this.mode == "icon")
            iframe.style.display = 'none';
        webpg.utils._onRequest.addListener(function(request) {
            if (request.msg == "toggle") {
                try {
                    if (request.target_id == iframe.id) {
                        jq(node.parentNode).find('.webpg-node-odata').toggle();
                        jq(node.parentNode).find("#webpg-badge-toggle-" + iframe.id).toggle();
                        jq(iframe).toggle();
                    }
                } catch (err) {
                    return;
                }
            } else if (request.msg == "show") {
                try {
                    if (request.target_id == iframe.id) {
                        jq(node.parentNode).find('.webpg-node-odata').hide();
                        jq(node.parentNode).find("#webpg-badge-toggle-" + iframe.id).hide();
                        jq(iframe).show();
                    }
                } catch (err) {
                    return;
                }
            }
        });
        if (range) {
            range.insertNode(iframe);
            var theURL = webpg.utils.resourcePath + "webpg_results.html?id=" + id;
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                iframe.contentWindow.location.href = theURL;
            else
                iframe.src = theURL;
        }
        return iframe;
    },

    /*
        Function: addResultsReplacementFrame
            Creates a results iframe that replaces the element that contained
            the original PGP data

        Parameters:
            element - The HTML element that contained the PGP Data
    */
    addResultsReplacementFrame: function(element){
        var iframe = this.addResultsFrame();
        var doc = (webpg.inline.doc) ? webpg.inline.doc : document;
        iframe.style.minWidth = 300;
        if (element.style.width)
            iframe.style.width = element.style.width;
        jq(iframe).insertAfter(jq(element));
        jq(element).hide();
        webpg.utils._onRequest.addListener(function(request) {
            if (request.msg == "toggle" && request.target_id == iframe.id) {
                jq(element).show();
                jq(iframe).remove();
            }
        });
        var theURL = webpg.utils.resourcePath + "webpg_results.html?id=" + iframe.id;
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            iframe.contentWindow.location.href = theURL;
        else
            iframe.src = theURL;
        return iframe;
    },

    addDialogFrame: function(theURL, height, width) {
        if (!height)
            height = 310;
        if (!width)
            width = 640;
        var doc = (webpg.inline.doc) ? webpg.inline.doc : document;
        var iframe = doc.createElement('iframe');
        var id = (new Date()).getTime();
        iframe.setAttribute('id', id);
        iframe.id = id;
        iframe.className = "webpg-dialog";
        iframe.scrolling = "no";
        iframe.frameBorder = "none";
        iframe.style.position = "absolute";
        iframe.style.border = "none";
        iframe.style.margin = "auto";
        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        iframe.style.marginLeft = "-50px";
        iframe.style.marginTop = "50px";
        iframe.style.zIndex = "9999";
        iframe.style.backgroundColor = "transparent";

        if (webpg.overlay.insert_target)
            jq(iframe).insertAfter(webpg.overlay.insert_target);

        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            iframe.contentWindow.location.href = theURL;
        else if (webpg.utils.detectedBrowser['product'] == "chrome")
            iframe.src = theURL;

        return iframe;
    },
}
/* ]]> */
