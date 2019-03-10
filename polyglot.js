// ==UserScript==
// @name    CodeWars - Mark solved languages
// @include https://www.codewars.com/*
// @grant   GM_xmlhttpRequest
// @grant   GM_setValue
// @grant   GM_getValue
// @grant   GM_addStyle
// @grant   GM_setClipboard
// @connect self
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @require     http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/jquery-ui.min.js
// @require https://greasyfork.org/scripts/21927-arrive-js/code/arrivejs.js?version=198809
// @require https://rawgit.com/notifyjs/notifyjs/master/dist/notify.js
// ==/UserScript==


/****************************************************************

WHAI IS IT?
-----------
 This piece of code is a Tampermonkey user script which provides some
 additional per-language filtering and display capabilities,
 effectively making it easier for you to obtain POLYGLOT badge.


HOW TO INSTALL IT?
------------------
 - Install Tampermonkey extension for your browser,
 - Copy&paste the script to your scripts library.


HOW TO USE IT?
--------------
 - Go to Solutions tab of your CodeWars profile to let the script
   fetch/update information about your solutions.
 - From now on, all 'available language' icons should show whether
   you've completed given kata in some particular language.
 - When you filter kata search results by a language of your choice,
   additional filter option appears which lets you see which katas
   you have or haven't completed in this language.
 - You can navigate to "Site Events" page from the profile menu.
 - Kata and solution IDs in "Site Events" page are resolved into
   links to their targets, where possible.
 - You can copy content of code boxes into clipboard.
 - "Spoiler" flags are visible all the time and do not dis/re-appear
   in a very annoying manner.
 - Contents of "Solutions" and "Past solutions" views are displayed in
   tabs by language.
 - TODO: Filter discourse threads by resolution status (show only
   resolved/unresolved).
 - TODO: Highlight solved languages in language dropdowns.
 - TODO: You can configure the script and enable/disable features.

HOW TO UNINSTALL IT?
--------------------
 I haven't checked.


KNOWN ISSUES
------------
 - Yes.
 - A race condition here or there.
 - Filters do not properly reset sometimes.
 - Sometimes search results may contain duplicated pages.
 - Selectors, hooks and listeners used are so inefficient that your local power
   plant probably doubles its coal consumption.
 - Some IDs on "Site Events" page cannot be resolved into proper links due to
   a CW bug with solutions not being correctly associated with the solving user.


WHAT CAN I DO WITH THE SCRIPT?
------------------------------
 - You are allowed to use it, unless someone authoritative (CW staff?) says you can't.
 - You can modify it ONLY IF your modifications are going to bring any improvement
   into the way it works, AND you are going to share improved version with CW community.
 - You can send all your critical remarks to /dev/null, unless it's something I could
   learn or otherwise benefit from - in such case, you can contact me on CodeWars
   Gitter channel.


THIS CODE IS CRAP, LOOKS LIKE CRAP, AND WORKS LIKE CRAP! WHY?
-------------------------------------------------------------
 I am really sorry if this code hurts your eyes, brain, or feelings
 in any way, but I am not a proffesional HTML developer and each and
 every technique present here (JavaScript, jQuery, TamperMonkey,
 CW API) I've used for the first time.


CREDITS
-------
 - CodeWars
 - TamperMonkey
 - StackOverflow
 - jQuery
 - notify.js

****************************************************************/

$.noConflict();

jQuery("head").append (
    '<link '
  + 'href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/themes/dark-hive/jquery-ui.min.css" '
  + 'rel="stylesheet" type="text/css">'
);

function isElementInViewport (el) {

    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();
    let wnd = jQuery(window);
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= wnd.height() && rect.right <= wnd.width();
}


/********************************
*          Solved languages     *
*********************************/

function store(data) {
    for(kata of data) {
        GM_setValue('glot.katalangs.' + kata.id, kata.completedLanguages);
    }
}

let fetchInProgress = false;
let userName = null;
function getUserName() {
    if(!userName) {
        let url = jQuery('#header_profile_link').attr('href');
        url = url.split('/');
        userName = url[url.length - 1];
        console.info('Detcted username: ' + userName);
    }
    return userName;
}

function solutionsPageDownloaded(resp) {
    if(resp.readyState !== 4) return;
    resp.context = (resp.context || 0);
    let cwResp = resp.response;
    store(cwResp.data);
    jQuery.notify("Downloaded page " + (resp.context + 1) + " of " + cwResp.totalPages, "success");
    if(resp.context) {
        if(resp.context+1 == cwResp.totalPages)
            fetchInProgress = false;
        return;
    }
    for(let i=1; i<cwResp.totalPages; ++i) {
        updateSolutions(i);
    }
}


function updateSolutions(pageNo) {
    let url='/api/v1/users/' + getUserName() + '/code-challenges/completed?page=';
    function fetchAborted() {
        fetchInProgress = false;
        jQuery.notify("Fetch aborted.", "info");
    }
    function fetchError() {
        fetchInProgress = false;
        jQuery.notify("ERROR!", "error");
    }
    let opts = {
        method: 'GET',
        url: url + (pageNo || 0),
        onreadystatechange: solutionsPageDownloaded,
        onabort: fetchAborted,
        onerror: fetchError,
        context: (pageNo || 0),
        responseType: 'json'
    };
    GM_xmlhttpRequest(opts);
}

function dimSolved(elem) {
    let id = elem.id || jQuery(elem).children('div.eight.columns.alpha').children('div.info-row.code-challenge').attr('data-id');
    if(!id) return;
    let langs = GM_getValue('glot.katalangs.' + id, []);
    for(lang of langs) {
        jQuery(elem).find("a[data-language='" + lang + "']").children("div").children("i").addClass('dimmed');
    }
}


/********************************
*           Search result       *
*********************************/

let topUpInProgress = false;
function toppedUp(resp) {
    if(resp.readyState !== 4) return;
    topUpInProgress = false;
    let cwResp = resp.responseText;
    let toAppend = jQuery.parseHTML(cwResp);
    let kataList = jQuery(toAppend).find('div.list-item.kata');
    if(!kataList.length) {
        jQuery.notify("No more katas available.", "info");
        return;
    }
    let marker = jQuery('div.js-infinite-marker');
    marker.before(kataList);
    let vsb = isElementInViewport(marker);
    if(vsb) {
        topUpList(marker);
    }
}

function topUpList(marker) {
    if(topUpInProgress)
        return;

    let nextPage = marker.data('page');
    let ub = new App.UriBuilder();
    ub.params.page= nextPage;
    marker.data('page', nextPage+1);
    marker.attr('data-page', nextPage+1);
    let url = ub.build();
    let opts = {
        method: 'GET',
        url: url,
        onreadystatechange: toppedUp,
    };
    GM_xmlhttpRequest(opts);
    jQuery.notify("Downloading page " + nextPage + " of available katas...", "info");
    topUpInProgress = true;
}

function removeFromSearch(kata) {
    jQuery(kata).hide();
    let marker = jQuery('div.js-infinite-marker');
    if(!marker || !marker.length)
        return;
    let vsb = isElementInViewport(marker);
    if(vsb) {
        topUpList(marker);
    }
}
function addToSearch(kata) {
    jQuery(kata).show();
}

let highlightConfig = 'all';
let highlightLang = '';
function shouldHighlight(elem) {

    if(!elem.id || !highlightConfig || highlightConfig == 'all' || !highlightLang || highlightLang == '' || highlightLang === 'my-languages') return true;

    let langs = GM_getValue('glot.katalangs.' + elem.id, []);

    if(highlightConfig == 'not_solved') {
        return !langs.some(lg => lg == highlightLang);
    } else if(highlightConfig == 'solved') {
        return langs.some(lg => lg == highlightLang);
    }
    console.warn("Unrecognized highlightConfig: " + highlightConfig);
    return false;
}

let css =
`
.dimmed {
  -webkit-filter: grayscale(0.8) blur(2px);
}

.btnCopy {
    margin-top: 1px;
    margin-right: 2px;
    float: right;
    padding: 5px 10px 5px;
    opacity: 0.7;
}
`;
GM_addStyle(css);

function kataAppeared(elem) {
    if(shouldHighlight(elem))
        addToSearch(elem);
    else
        removeFromSearch(elem);

    dimSolved(elem);
}

function reHighlight() {
    jQuery('div.list-item.kata').each(
        function() {
            kataAppeared(this);
        }
    );
}



/********************************
*           Filter form         *
*********************************/

function setUpHighlightConfig() {
    let form = jQuery('form.search.mbx');
    highlightLang = form.find('#language_filter>option:selected').val();
    if(!highlightLang || highlightLang === '' || highlightLang === 'my-languages') {
        highlightConfig = 'all';
        highlightLang = '';
        return;
    }
    highlightConfig = jQuery('#cmbHighlight>option:selected').val();
}

function setUpForm(form) {
    form = jQuery(form);
    form.find('select').change(setUpHighlightConfig);

    let sel = form.find('#language_filter>option:selected');
    let langVal = sel.val();
    let lang = sel.text();
    if(lang && langVal !== '' && langVal !== 'my-languages') {
        jQuery('div.list-item.kata:first').before('<form id="dummy_form"><select id="cmbHighlight"><option value = "all">Show all</option><option value = "solved">Show katas I\'ve solved in ' + lang + '</option><option value = "not_solved">Show katas I\'ven\'t solved in ' + lang + '</option></select></form>');
        let cmbHc = jQuery('#cmbHighlight')
        cmbHc.change(setUpHighlightConfig);
        cmbHc.change(reHighlight);
        if(highlightConfig == 'solved' || highlightConfig == 'not_solved')
            cmbHc.val(highlightConfig);
    }

    setUpHighlightConfig();
}



/********************************
*           Site Events         *
*********************************/

function addSiteEvents(menu) {
    menu = jQuery(menu);
    let url = menu.children('#header_profile_link').attr('href') + '/site-events';
    let menuItem = menu.find('div.menu > div.menu-body > ul > li:first');
    menuItem.after('<li><a href="' + url + '"><i class="icon-moon-info"></i>Site events</a></li>');
}

let upvotedSolutionsInProgress = false;
function resolveUpvotedSolutions(cells, name, pageNo=0) {
    if( (!pageNo && upvotedSolutionsInProgress) || !cells.length || !name || !name.length) return;
    function upvotedSolutionsDownloaded(resp) {
        if(resp.readyState !== 4) return;
        let solutions = jQuery.parseHTML(resp.responseText);
        if(!pageNo)
            solutions = jQuery(solutions).find('div.list-item.solutions').toArray();
        let m = new Map();
        solutions.forEach((solel) => {
            solel = jQuery(solel);
            let kataTitle = solel.find('div.item-title > a').text();

            let links = solel.find('ul.bulleted-text.mbm > li:eq(2) > a');
            //CW bug causes that some solutions do not have the link :(
            //if(!links.length)
            //    console.info('No solutions for ' + kataTitle);
            links.each((i, link) => {
                link = jQuery(link);
                let href = link.attr('href');
                let chunks = href.split('/');
                let solutionId = chunks[chunks.length-1];
                m.set(solutionId, {title: kataTitle, url: href });
            });
        });
        let remaining = [];
        jQuery(cells).each((i,e) => {
            let kataId = getEventCellId(e);
            let kata = m.get(kataId);
            if(kata) {
                let resolvedId = '<a href="' + kata.url + '">' + kata.title + '</a>';
                GM_setValue('glot.eventId.solution.' + kataId, { found: true, resolvedForm: resolvedId});
                replaceEventCellId(e, resolvedId);
            } else {
                remaining.push(e);
            }
        });
        let hasMore = solutions.length && remaining.length;
        if(hasMore) {
            resolveUpvotedSolutions(remaining, name, pageNo+1);
        } else {
            remaining.forEach(e => {
                let solutionId = getEventCellId(e);
                GM_setValue('glot.eventId.solution.' + solutionId, { found: false });
            });
            upvotedSolutionsInProgress = false;
        }
    }

    function upvotedSolutionsAborted() { jQuery.notify('Download aborted.', 'info'); };
    function upvotedSolutionsError() { jQuery.notify('Error!', 'error'); };

    let url='/users/' + name + '/completed_solutions?page=' + pageNo;
    let opts = {
        method: 'GET',
        url: url,
        onreadystatechange: upvotedSolutionsDownloaded,
        onabort: upvotedSolutionsAborted,
        onerror: upvotedSolutionsError,
        headers: {
            referer: 'https://www.codewars.com/users/' + name + '/completed_solutions',
            accept: '*/*',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9',
            'x-requested-with': 'XMLHttpRequest'
        }
    };
    GM_xmlhttpRequest(opts);
    upvotedSolutionsInProgress = true;
    jQuery.notify('Downloading upvoted solutions...', 'info');
}

function getEventCellId(cellElem) {
    return cellElem.childNodes[2].textContent.split(' ')[1];
}

function replaceEventCellId(cellElem, resolvedIdReplacement) {
    let idElem = jQuery(cellElem.childNodes[2]);
    let idElemText = idElem.text();
    idElem[0].textContent = idElemText.split(' ')[0] + ' ';
    idElem.after(resolvedIdReplacement);
}

let upvotedKataInProgress = false;
function resolveUpvotedKata(cells, name) {

    if(upvotedKataInProgress || !cells.length || !name || !name.length) return;

    function authoredChallengesDownloaded(resp) {
        if(resp.readyState !== 4) return;
        let cwResp = resp.response;
        let m = new Map();
        cwResp.data.forEach(kata => m.set(kata.id, kata));
        cells.each((e, i) => {
            let kataId = getEventCellId(e);
            let kata = m.get(kataId);
            if(kata) {
                let resolvedId = '<a href="https://www.codewars.com/kata/' + kata.id + '">' + kata.name + '</a>';
                GM_setValue('glot.eventId.kata.' + kataId, { found: true, resolvedForm: resolvedId});
                replaceEventCellId(e, resolvedId);
            } else {
                GM_setValue('glot.eventId.kata.' + kataId, { found: false });
            }
        });

        upvotedKataInProgress = false;
    }

    function authoredChallengesAborted() { jQuery.notify('Download aborted.', 'info'); };
    function authoredChallengesError() { jQuery.notify('Error!', 'error'); };

    let url='/api/v1/users/' + name + '/code-challenges/authored';
    let opts = {
        method: 'GET',
        url: url,
        onreadystatechange: authoredChallengesDownloaded,
        onabort: authoredChallengesAborted,
        onerror: authoredChallengesError,
        responseType: 'json'
    };
    GM_xmlhttpRequest(opts);
    upvotedKataInProgress = true;
    jQuery.notify('Downloading authored challenges...', 'info');
}

let resolveIdsStart = function(kataCells, solutionCells) {

    return function() {
        if(upvotedKataInProgress && upvotedSolutionsInProgress) return;

        let msg = "This feature is still under development.\nIt will take a long time, fetch a ton of data and grind terribly through the CW database.\n\nDo you want to continue?";
        if(!confirm(msg))
            return;

        let name = getUserName();
        let banner = jQuery('div.leaderboard').prevAll('h4:last').text();
        if(banner && banner.startsWith('Site events history for')) {
            let pieces = banner.split(' ');
            name = pieces[pieces.length - 1];
        }

        resolveUpvotedKata(kataCells, name);
        resolveUpvotedSolutions(solutionCells, name);
    }
}

function decorateSiteEvents(alertBox) {

    let rows = jQuery('div.leaderboard > table > tbody > tr');
    let idCells = rows.find('td:first');
    function idHeaderIs(e, header) { return e.childNodes && e.childNodes.length && e.childNodes[0].textContent && e.childNodes[0].textContent === header; };
    //fill out known IDs first
    let kataCells = idCells.filter((i,e) => idHeaderIs(e, 'Authored code challenge up voted')).toArray();
    let solutionCells = idCells.filter((i,e) => idHeaderIs(e, 'Code challenge answer up voted')).toArray();

    let unresolvedKata = [];
    kataCells.forEach((e, i) => {
        let kataId = getEventCellId(e);
        let resolved = GM_getValue('glot.eventId.kata.' + kataId);
        if(resolved) {
            if(resolved.found) {
                replaceEventCellId(e, resolved.resolvedForm);
            }
        } else {
            unresolvedKata.push(e);
        }
    });

    let unresolvedSolutions = [];
    solutionCells.forEach(e => {
        let kataId = getEventCellId(e);
        let resolved = GM_getValue('glot.eventId.solution.' + kataId);
        if(resolved) {
            if(resolved.found) {
                replaceEventCellId(e, resolved.resolvedForm);
            }
        } else {
            unresolvedSolutions.push(e);
        }
    });

    if(unresolvedKata.length || unresolvedSolutions.length) {
        jQuery(alertBox).append('<button type="button" style="margin-left: 10px" id="btn_resolve_ids">Resolve IDs</button>');
        jQuery('#btn_resolve_ids').on("click", resolveIdsStart(unresolvedKata, unresolvedSolutions));
    }
}

/********************************
*            Clipboard          *
*********************************/

const btnCaption = 'Copy to clipboard';
function copyToClipboardFunc(codeElem) {

    return function() {
        let code = codeElem.text().substring(btnCaption.length);
        GM_setClipboard(code, 'text');
        jQuery.notify(code.length + ' characters copied to clipboard.', 'info');
    };
}

function addCopyButton(codeElem, attempt=10) {

    //TODO: syntax highlighter treats buttons added by me as regular code which should
    //be highlighted, and destroys them if they are added before highlighting is completed.
    //To avoid such situation, I wait 1 second to let highlighter complete its job,
    //and add button after this time elapses. However, better solution might be just to listen
    //for removal of the buton and simply re-add it?
    setTimeout( function() {
        codeElem = jQuery(codeElem);

        if(codeElem.parents('#description').length)
            return;

        if(codeElem.parent('pre').length && !codeElem.children('button.btnCopy').length) {

            if(codeElem.children('span').length) {
                codeElem.prepend("<button class='btnCopy'>" + btnCaption + "</button>");
                let btn = codeElem.children('button').first();
                btn.on("click", copyToClipboardFunc(codeElem));
            } else if(attempt) {
                console.info('Highlight delay...');
                addCopyButton(codeElem, attempt-1);
            }
        }
    }, 1000);
}

/********************************
*        Tabbed Languages       *
*********************************/
let tabIdSerial = 1;
function tabidizeByLanguage(solutionPanel) {

    solutionPanel = jQuery(solutionPanel);
    let kataTitle = solutionPanel.children('div.item-title:first').first();
    kataTitle.after('<div class="langTabs"><ul class="tabsList"></ul></div>');
    let langTabsList = kataTitle.next('div.langTabs').children('ul.tabsList:first').first();

    let langs = solutionPanel.children('h6');
    langs.each((i, langHeader) => {
        langHeader = jQuery(langHeader);
        langTabsList.append('<li><a href="#langTab-' + tabIdSerial + '">' + langHeader.text().slice(0, -1) + '</a></li>');
        let contentElems = langHeader.nextUntil('h6');
        contentElems.wrapAll('<div class="langTab" id="langTab-' + tabIdSerial++ + '"/>');
    });
    langs.remove();
    let langTabs = kataTitle.next('div.langTabs');
    solutionPanel.children('div.langTab').detach().appendTo(langTabs);
    let tabsPanel = langTabs.tabs();
}

function tabidizePastSolutions(liElem) {
    let solutionPanel = jQuery(liElem).children('div:first').first();

    let langDivs = solutionPanel.children();
    langDivs.wrapAll('<div class="langTabs"/>');
    let langTabs = solutionPanel.children('div.langTabs').first();
    langTabs.prepend('<ul class="tabsList"></ul>');
    let langTabsList = langTabs.children('ul.tabsList:first').first();

    let langs = langDivs.children('h5');
    langs.each((i, langHeader) => {
        langHeader = jQuery(langHeader);
        langTabsList.append('<li><a href="#langTab-' + tabIdSerial + '">' + langHeader.text() + '</a></li>');
        //let contentElems = langHeader.nextUntil('h5');
        //contentElems.wrapAll('<div class="langTab" id="langTab-' + tabIdSerial++ + '"/>');
        langHeader.parent().attr('id', 'langTab-' + tabIdSerial++);
    });
    langs.remove();

    //solutionPanel.children('div.langTab').detach().appendTo(langTabs);
    let tabsPanel = langTabs.tabs();
}

/********************************
*          DOM Listeners        *
*********************************/

jQuery(document).arrive('div.list-item.kata', {existing: true}, function() {
    kataAppeared(this);
});

jQuery(document).arrive('form.search.mbx', {existing: true}, function() {
    setUpForm(this);
});
jQuery(document).leave('form.search.mbx', {existing: true}, function() {
    highlightConfig = 'all';
    highlightLang = '';
});

jQuery(document).arrive('div.list-item.solutions:first-child', {existing: true}, function() {
    if(!fetchInProgress) {
        fetchInProgress = true;
        jQuery.notify("Fetching solved languages...", "info");

        let tabs = jQuery(this.parentElement.parentElement.previousElementSibling.firstElementChild);
        let href = tabs.find('dd.is-active > a').attr('href');
        updateSolutions(0);
    }
});

jQuery(document).arrive('div.list-item.solutions', {existing: true, onceOnly: false}, function() {
    tabidizeByLanguage(this);
});

jQuery(document).arrive('li[data-tab="solutions"]', {existing: true, onceOnly: false}, function() {
    tabidizePastSolutions(this);
});

jQuery(document).arrive('li.profile-item.has-menu', {existing: true}, function() {
    addSiteEvents(this);
});

jQuery(document).arrive('div.alert-box', {existing: true}, function() {
    if(this.childNodes && this.childNodes.length && this.childNodes[1] && this.childNodes[1].textContent && this.childNodes[1].textContent.startsWith('Too much data')) {
        decorateSiteEvents(this);
    }
});

jQuery(document).arrive('li.is-auto-hidden', {existing: true}, function() {
    jQuery(this).css('opacity', '1');
});

jQuery(document).arrive('code', {existing: true}, function() {
    addCopyButton(this);
});