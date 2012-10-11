/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

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
    init: function(doc) {
        if (webpg.preferences && webpg.preferences.decorate_inline.get() != "true")
            return;

        // Initialize webpg.doc
        this.doc = doc;

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
    },

    /*
        Function: PGPDataSearch
            Searches the document for elements that contain PGP Data blocks.
            Calls the PGPBlockParse method if PGP data is found

        Parameters:
            doc - <document> The document to search
    */
    PGPDataSearch: function(doc) {
        var filter = function(node) {
            return NodeFilter.FILTER_ACCEPT;
        };

        var haveStart = false;
        var blockType;
        var tw = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT, filter, false);
        var node, range, idx, search, baseIdx;

        while((node = tw.nextNode())) {
            idx = 0;
            while(true) {
                if(!haveStart) {

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

                    tryOne = node.textContent.indexOf(search, idx);

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
                    idx =0; //+= search.length;
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
        search = webpg.constants.PGPTags.PGP_KEY_END;

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

        str = str.replace(xmlnsReg, "");

        var html = node.parentElement.innerHTML;

        while (html.lastIndexOf("\n") + 1 == html.length) {
            html = html.substring(0, html.lastIndexOf("\n"));
        }

        var scontent = (webpg.utils.detectedBrowser['product'] == "chrome") ?
                node.parentElement.innerText :
                node.parentNode.textContent;

        // The html contents posted to element is the textContent or innerText
        //  of the element with detected PGP Blocks
        var h = document.createElement("pre");
        jQuery(h).html(scontent);
        var phtml = h.innerHTML;

        if (scontent == phtml) {
            if (webpg.utils.detectedBrowser['product'] == "chrome") {
                scontent = html;
            } else {
                reg = new RegExp("(&(.){1,4};)", "g")
                if (html.search(reg) > -1)
                    scontent = phtml;
                else
                    scontent = html
            }
        }

        var fragment = range.extractContents();

        var results_frame = webpg.inline.addResultsFrame(node, range);

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
                    return
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
                        } else {
                            jQuery(results_frame).hide();
                            jQuery(element).children(".original").show();
                            jQuery(element).children(".pretext, .postext").hide();
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
                    }
                );
                break;
        }
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
        jQuery(iframe).insertAfter(jQuery(element));
        jQuery(element).hide();
        var theURL = webpg.utils.resourcePath + "webpg_results.html?id=" + iframe.id;
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            iframe.contentWindow.location.href = theURL;
        else
            iframe.src = theURL;
        return iframe;
    },

    addDialogFrame: function() {
        var doc = (webpg.inline.doc) ? webpg.inline.doc : document;
        var iframe = doc.createElement('iframe');
        var id = (new Date()).getTime();
        iframe.setAttribute('id', id);
        iframe.id = id;
        iframe.scrolling = "no";
        iframe.frameBorder = "none";
        iframe.style.position = "absolute";
        iframe.style.border = "none";
        iframe.style.margin = "auto";
        iframe.style.width = "640px";
        iframe.style.height = "310px";
        iframe.style.marginLeft = "-50px";
        iframe.style.marginTop = "50px";
        iframe.style.backgroundColor = "transparent";
        return iframe;
    },
}
/* ]]> */
