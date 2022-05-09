// ==UserScript==
// @name    CodeWars - Mark solved languages
// @description User script which provides some extra functionalities to Codewars
// @version 1.13.17
// @downloadURL https://github.com/hobovsky/polyglot/releases/latest/download/polyglot.js
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

WHAT IS IT?
-----------
 This piece of code is a Tampermonkey user script which provides some
 additional per-language filtering and display capabilities,
 effectively making it easier for you to obtain POLYGLOT badge.

WHERE CAN I DOWNLOAD IT FROM?
-----------------------------
 You can get the script [here](https://github.com/hobovsky/polyglot/releases/latest/download/polyglot.js).

 HOW TO INSTALL IT?
------------------
 - Install Tampermonkey extension for your browser,
 - Copy&paste the script to your scripts library.
 - Go to Solutions tab of your Codewars profile to let
   the script fetch/update information about your solutions.

 WHAT FEATURES DOES IT PROVIDE?
------------------------------
 - All 'available language' icons show whether you've completed
   given kata in some particular language. Languages are marked
   also in language selection dropdowns.
 - When you filter kata search results by a language of your choice,
   additional filter option appears which lets you see which kata
   you have or haven't completed in this language.
 - You can copy content of code boxes into clipboard.
 - "Spoiler" flags are visible all the time and do not dis/re-appear
   in a very annoying manner.
 - Contents of "Solutions" and "Past solutions" views are displayed in
   tabs by language.
 - Leaderboards: "Solved kata is default leaderboard (since "Overall"
   ranking does not measure anything useful). Also, leaderboards are
   automatically scrolled to show your score.
 - Leaderboards: Rank leaderboards utilizing Codewars API, to show users
   ranked by overall rank or a language rank.

 Features removed from Polyglot as they got implemented directly on Codewars:
 - ~~"Show Kata Description" and "Show Kata Test Cases" sections can be toggled
   now and can be collapsed after once expanded.~~
 - ~~Show "Translations" tab on kata page and kata tabs on "/kata/####/translations"
   page.~~


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

 WHAT CAN I DO WITH THE SCRIPT?
------------------------------
 - You are allowed to use it, unless someone authoritative (CW staff?) says you can't.
 - You can modify it ONLY IF your modifications are going to bring any improvement
   into the way it works, AND you are going to share improved version with CW community.
 - You can send all your critical remarks to `/dev/null`, unless it's something I could
   learn or otherwise benefit from - in such case, you can contact me on Codewars
   Discord server.

 THIS CODE IS CRAP, LOOKS LIKE CRAP, AND WORKS LIKE CRAP! WHY?
-------------------------------------------------------------
 I am really sorry if this code hurts your eyes, brain, or feelings
 in any way, but I am not a professional HTML developer and each and
 every technique present here (JavaScript, jQuery, TamperMonkey,
 CW API) I've used for the first time.

 CREDITS
-------
 - Codewars
 - TamperMonkey
 - StackOverflow
 - jQuery
 - notify.js
****************************************************************/

/* globals jQuery, $, waitForKeyElements, App */
var $ = window.jQuery;

$.noConflict();

const DROPDOWN_STYLE_CLASS = 'mt-1 block w-full pl-3 pr-10 py-2 text-base dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-cgray-300 dark:focus:ring-cgray-600 focus:border-cgray-300 dark:focus:border-cgray-600 sm:text-sm rounded-md';

jQuery("head").append("<link " + 'href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/themes/dark-hive/jquery-ui.min.css" ' + 'rel="stylesheet" type="text/css">');

function isElementInViewport(el) {
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    let rect = el.getBoundingClientRect();
    let wnd = jQuery(window);
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= wnd.height() && rect.right <= wnd.width();
}

/********************************
 *          Solved languages     *
 *********************************/

function store(data) {
    for (let kata of data) {
        GM_setValue("glot.katalangs." + kata.id, kata.completedLanguages);
    }
}

let fetchInProgress = false;
let userName = null;
function getUserName() {
    if (!userName) {
        let url = jQuery("#header_profile_link").attr("href");
        url = url.split("/");
        userName = url[url.length - 1];
        console.info("Detected username: " + userName);
    }
    return userName;
}

function solutionsPageDownloaded(resp) {
    if (resp.readyState !== 4) return;
    resp.context = resp.context || 0;
    let cwResp = resp.response;
    store(cwResp.data);
    jQuery.notify("Downloaded page " + (resp.context + 1) + " of " + cwResp.totalPages, "success");
    if (resp.context) {
        if (resp.context + 1 == cwResp.totalPages) {
            fetchInProgress = false;
        }
        return;
    }
    for (let i = 1; i < cwResp.totalPages; ++i) {
        updateSolutions(i);
    }
}

function updateSolutions(pageNo) {
    let url = "/api/v1/users/" + getUserName() + "/code-challenges/completed?page=";
    function fetchAborted() {
        fetchInProgress = false;
        jQuery.notify("Fetch aborted.", "info");
    }
    function fetchError() {
        fetchInProgress = false;
        jQuery.notify("ERROR!", "error");
    }
    let opts = {
        method: "GET",
        url: url + (pageNo || 0),
        onreadystatechange: solutionsPageDownloaded,
        onabort: fetchAborted,
        onerror: fetchError,
        context: pageNo || 0,
        responseType: "json"
    };
    GM_xmlhttpRequest(opts);
}

function dimSolved(elem) {
    let id =
        elem.id ||
        jQuery(elem)
            .children("div.flex.flex-col")
            .children("div.w-full")
            .children("div.mt-1.mb-3")
            .attr("data-id");
    if (!id) return;
    let langs = GM_getValue("glot.katalangs." + id, []);
    for (let lang of langs) {
        jQuery(elem)
            .find("a[data-language='" + lang + "']")
            .children("div")
            .children("i")
            .addClass("glotDimmed");
    }
}

function highlightDropdownLangs(divLangSelector) {
    divLangSelector = jQuery(divLangSelector);
    let kataHref = divLangSelector
        .find("dl>dd[data-href]")
        .first()
        .data("href");
    let kataId = kataHref.split("/")[2];
    let langs = GM_getValue("glot.katalangs." + kataId, []);

    let itemByLang = new Map();
    divLangSelector.find("dl>dd[data-value]").each((i, e) => itemByLang.set(e.dataset.value, e));

    for (let lang of langs) {
        let langElem = itemByLang.get(lang);
        jQuery(langElem).addClass("glotDimmed");
    }
}

/********************************
 *           Search result       *
 *********************************/

let topUpInProgress = false;
function toppedUp(resp) {
    if (resp.readyState !== 4) return;
    topUpInProgress = false;
    let cwResp = resp.responseText;
    let toAppend = jQuery.parseHTML(cwResp);
    let kataList = jQuery(toAppend).find("div.list-item-kata");
    if (!kataList.length) {
        jQuery.notify("No more kata available.", "info");
        return;
    }
    let marker = jQuery("div.js-infinite-marker");
    marker.before(kataList);
    let vsb = isElementInViewport(marker);
    if (vsb) {
        topUpList(marker);
    }
}

function topUpList(marker) {
    if (topUpInProgress) {
        return;
    }

    let nextPage = marker.data("page");
    let ub = new App.UriBuilder();
    ub.params.page = nextPage;
    marker.data("page", nextPage + 1);
    marker.attr("data-page", nextPage + 1);
    let url = ub.build();
    let opts = {
        method: "GET",
        url: url,
        onreadystatechange: toppedUp
    };
    GM_xmlhttpRequest(opts);
    jQuery.notify("Downloading page " + nextPage + " of available kata...", "info");
    topUpInProgress = true;
}

function removeFromSearch(kata) {
    jQuery(kata).hide();
    let marker = jQuery("div.js-infinite-marker");
    if (!marker || !marker.length) {
        return;
    }
    let vsb = isElementInViewport(marker);
    if (vsb) {
        topUpList(marker);
    }
}
function addToSearch(kata) {
    jQuery(kata).show();
}

let highlightConfig = "all";
let highlightLang = "";
function shouldHighlight(elem) {
    if (!elem.id || !highlightConfig || highlightConfig == "all" || !highlightLang || highlightLang == "" || highlightLang === "my-languages") return true;

    let langs = GM_getValue("glot.katalangs." + elem.id, []);

    if (highlightConfig == "not_solved") {
        return !langs.some(lg => lg == highlightLang);
    } else if (highlightConfig == "solved") {
        return langs.some(lg => lg == highlightLang);
    }
    console.warn("Unrecognized highlightConfig: " + highlightConfig);
    return false;
}

let css = `
.glotDimmed {
  -webkit-filter: grayscale(0.8) blur(1px);
}
.glotBtnCopy {
    margin-top: 1px;
    margin-right: 2px;
    float: right;
    padding: 5px 10px 5px;
    opacity: 0.7;
}
`;
GM_addStyle(css);

function kataAppeared(elem) {
    if (shouldHighlight(elem)) {
        addToSearch(elem);
    } else {
        removeFromSearch(elem);
    }

    dimSolved(elem);
}

function reHighlight() {
    jQuery("div.list-item-kata").each(function() {
        kataAppeared(this);
    });
}

/********************************
 *           Filter form         *
 *********************************/

function setUpHighlightConfig() {
    let form = jQuery("#filters");
    highlightLang = form.find("#language_filter>option:selected").val();
    if (!highlightLang || highlightLang === "" || highlightLang === "my-languages") {
        highlightConfig = "all";
        highlightLang = "";
        return;
    }
    highlightConfig = jQuery("#glotCmbHighlight>option:selected").val();
}


function setUpForm(form) {
  form = jQuery(form)
  form.find('select').change(setUpHighlightConfig)

  const sel = form.find('#language_filter>option:selected')
  const langVal = sel.val()
  const lang = sel.text()
  if (lang && langVal !== '' && langVal !== 'my-languages') {
    jQuery('div.list-item-kata:first').before(
      `${'<form id="dummy_form">'
        + `<select id="glotCmbHighlight" class="${DROPDOWN_STYLE_CLASS}">`
          + '<option value = "all">Show all</option>'
          + '<option value = "solved">Show kata I\'ve solved in '}${lang}</option>`
          + `<option value = "not_solved">Show kata I haven't solved in ${lang}</option>`
        + '</select>'
      + '</form>')
    const cmbHc = jQuery('#glotCmbHighlight')
    cmbHc.change(setUpHighlightConfig)
    cmbHc.change(reHighlight)
    if (highlightConfig === 'solved' || highlightConfig === 'not_solved') {
      cmbHc.val(highlightConfig)
    }
  }

  setUpHighlightConfig()
}


/********************************
 *            Clipboard          *
 *********************************/

const btnCaption = "Copy to clipboard";
function copyToClipboardFunc(codeElem) {
    return function() {
        let code = codeElem.text().substring(btnCaption.length);
        GM_setClipboard(code, "text");
        jQuery.notify(code.length + " characters copied to clipboard.", "info");
    };
}

function addCopyButton(codeElem, attempt = 10) {
    //TODO: syntax highlighter treats buttons added by me as regular code which should
    //be highlighted, and destroys them if they are added before highlighting is completed.
    //To avoid such situation, I wait 1 second to let highlighter complete its job,
    //and add button after this time elapses. However, better solution might be just to listen
    //for removal of the buton and simply re-add it?
    setTimeout(function() {
        codeElem = jQuery(codeElem);

        if (codeElem.parents("#description").length) {
            return;
        }

        if (codeElem.parent("pre").length && !codeElem.children("button.glotBtnCopy").length) {
            if (codeElem.children("span").length) {
                codeElem.prepend("<button class='glotBtnCopy' type='button'>" + btnCaption + "</button>");
                let btn = codeElem.children("button").first();
                btn.on("click", copyToClipboardFunc(codeElem));
            } else if (attempt) {
                console.info("Highlight delay...");
                addCopyButton(codeElem, attempt - 1);
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
    let kataTitle = solutionPanel.children("div.item-title:first").first();
    kataTitle.after('<div class="langTabs"><ul class="tabsList"></ul></div>');
    let langTabsList = kataTitle
        .next("div.langTabs")
        .children("ul.tabsList:first")
        .first();

    let langs = solutionPanel.children("h6");
    langs.each((i, langHeader) => {
        langHeader = jQuery(langHeader);
        langTabsList.append('<li><a href="#langTab-' + tabIdSerial + '">' + langHeader.text().slice(0, -1) + "</a></li>");
        let contentElems = langHeader.nextUntil("h6");
        contentElems.wrapAll('<div class="langTab" id="langTab-' + tabIdSerial++ + '"/>');
    });
    langs.remove();
    let langTabs = kataTitle.next("div.langTabs");
    solutionPanel
        .children("div.langTab")
        .detach()
        .appendTo(langTabs);
    let tabsPanel = langTabs.tabs();
}

function tabidizePastSolutions(liElem) {
    let solutionPanel = jQuery(liElem)
        .children("div:first")
        .first();

    let langDivs = solutionPanel.children();
    langDivs.wrapAll('<div class="langTabs"/>');
    let langTabs = solutionPanel.children("div.langTabs").first();
    langTabs.prepend('<ul class="tabsList"></ul>');
    let langTabsList = langTabs.children("ul.tabsList:first").first();

    let langs = langDivs.children("p");
    langs.each((i, langHeader) => {
        langHeader = jQuery(langHeader);
        langTabsList.append('<li><a href="#langTab-' + tabIdSerial + '">' + langHeader.text() + "</a></li>");
        langHeader.parent().attr("id", "langTab-" + tabIdSerial++);
    });
    langs.remove();
    let tabsPanel = langTabs.tabs();
}

/********************************
 *       Rank Leaderboards       *
 *********************************/
function makeRankBadge(rank) {

    function getRankColor() {
        switch(rank) {
            case 1: case 2:
            case 3: case 4: return 'black';
            case -1: case -2: return "purple";
            case -3: case -4: return 'blue';
            case -5: case -6: return 'yellow';
            default: return 'white';
        }
    }

    function getRankValue() { return Math.abs(rank) }
    function getRankDenom() { return rank < 0 ? "kyu" : "dan" }

    return `<div class="small-hex is-extra-wide is-${getRankColor()}-rank float-left mt-5px mr-5"><div class="inner-small-hex is-extra-wide "><span>${getRankValue()} ${getRankDenom()}</span></div></div>`
}

function getCurrentPlayerClass(leaderboardEntry) {
    return leaderboardEntry.username == getUserName() ? 'class="is-current-player"' : ""
}

function createLeaderboardRow(boardEntry) {

    let row = `<tr data-username="${boardEntry.username}" ${getCurrentPlayerClass(boardEntry)}><td class="rank is-small">#${boardEntry.position}</td><td class="is-big">${makeRankBadge(boardEntry.rank)} <a href="/users/${boardEntry.id}">${boardEntry.username}</a></td><td></td><td>${boardEntry.score}</td></tr>`
    return row;
}

function fillLeaderboardRows(collected) {
    const leaderboardRows = jQuery('tr[data-username]');
    leaderboardRows.remove();

    var rowsHtml = collected.sort((r1, r2)=>r2.score-r1.score).map(createLeaderboardRow).join('');
    jQuery('div.leaderboard table tbody').append(rowsHtml);
}

function leaderboardDownloaded(resp) {
    if (resp.readyState !== 4) return;
    let cwResp = resp.response;
    const leaderboardEntries = cwResp.data;
    const {lang, collected, page} = resp.context;
    if(leaderboardEntries && leaderboardEntries.length) {
        collected.push(...leaderboardEntries);
        buildLeaderboard(lang, collected, page+1);
    } else {
        fillLeaderboardRows(collected);
    }
}

function buildLeaderboard(lang, collected, page=1) {

    let url = `/api/v1/leaders/ranks/${lang}?page=${page}`;
    function fetchAborted() {
        jQuery.notify("Fetch aborted.", "info");
    }
    function fetchError() {
        jQuery.notify("ERROR!", "error");
    }
    let opts = {
        method: "GET",
        url: url,
        onreadystatechange: leaderboardDownloaded,
        onabort: fetchAborted,
        onerror: fetchError,
        context: {lang: lang, collected: collected, page: page},
        responseType: "json"
    };
    GM_xmlhttpRequest(opts);
    jQuery.notify(`Fetching leaderboard page ${page}...`, "info");
}

function languageChanged() {
    const selectedLanguage = jQuery('#glotLanguagesDropdown').val();
    buildLeaderboard(selectedLanguage, [], 1);
}

function buildLanguagesDropdown() {
    let url = "/api/v1/languages";
    function fetchAborted() {
        jQuery.notify("Fetch aborted.", "info");
    }
    function fetchError() {
        jQuery.notify("ERROR!", "error");
    }

    function makeLangItems(langItems) {
        return langItems.map(({id, name}) => `<option value='${id}'>${name}</option>`)
    }

    function languagesDownloaded(resp) {
        if (resp.readyState !== 4) return;
        jQuery('div.leaderboard').prepend(`<select id="glotLanguagesDropdown" class="${DROPDOWN_STYLE_CLASS}"><option value="overall">Overall</option>${makeLangItems(resp.response.data).join('')}</select>`);
        jQuery('div.leaderboard').prepend('<p id="glotDisclaimer">Note from Polyglot script: The feature of rank leaderboards is still work in progress. Expect it to be buggy or incomplete.</p>')
        jQuery('#glotLanguagesDropdown').change(languageChanged);
    }

    let opts = {
        method: "GET",
        url: url,
        onreadystatechange: languagesDownloaded,
        onabort: fetchAborted,
        onerror: fetchError,
        responseType: "json"
    };
    GM_xmlhttpRequest(opts);
}

function buildLanguagesLeaderboardTab() {
    jQuery('dl.tabs').append('<dd id="glotLanguagesLeaderboardTab"><a id="glotRankLeaderboardLink">Rank</a></dd>');
    jQuery('#glotRankLeaderboardLink').click(function() {
        if(jQuery('#glotLanguagesDropdown').length) return;
        jQuery('dd.is-active').removeClass('is-active');
        jQuery('#glotLanguagesLeaderboardTab').addClass('is-active');
        buildLanguagesDropdown();
        buildLeaderboard('overall', [], 1);
    });
}

/********************************
 *          DOM Listeners        *
 *********************************/

jQuery(document).arrive("div.list-item-kata", { existing: true }, function() {
    kataAppeared(this);
});

jQuery(document).arrive("#language_dd", { existing: true }, function() {
    highlightDropdownLangs(this);
});

jQuery(document).arrive("#filters", { existing: true }, function() {
    setUpForm(this);
});
jQuery(document).leave("#filters", { existing: true }, function() {
    highlightConfig = "all";
    highlightLang = "";
});

jQuery(document).arrive("div.list-item-solutions:first-child", { existing: true }, function() {
    if (!fetchInProgress) {
        fetchInProgress = true;
        jQuery.notify("Fetching solved languages...", "info");

        let tabs = jQuery(this.parentElement.parentElement.parentElement.previousElementSibling.firstElementChild);
        let href = tabs.find("dd.is-active > a").attr("href");
        updateSolutions(0);
    }
});

jQuery(document).arrive("div.list-item-solutions", { existing: true, onceOnly: false }, function() {
    tabidizeByLanguage(this);
});

jQuery(document).arrive('li[data-tab="solutions"]', { existing: true, onceOnly: false }, function() {
    tabidizePastSolutions(this);
});

jQuery(document).arrive("li.is-auto-hidden", { existing: true }, function() {
    jQuery(this).css("opacity", "1");
});

jQuery(document).arrive("code", { existing: true }, function() {
    addCopyButton(this);
});

jQuery(document).arrive('a[title="Leaders"]', { existing: true }, function() {
    let elem = jQuery(this);
    elem.attr("href", "/users/leaderboard/kata");
});

jQuery(document).arrive("h1.page-title", { existing: true }, function(elem) {
    if(jQuery(elem).text() == 'Leaderboards') {
        buildLanguagesLeaderboardTab();
    }
});

jQuery(document).arrive("tr.is-current-player", { existing: true }, function() {
    if (!isElementInViewport(this)) {
        this.scrollIntoView({ behavior: "smooth", block: "center" });
    }
});


/*  Settings  */
var dialog
function buildPolyglotConfigMenu(menu) {
    jQuery(menu).append(`<li class="border-t"><a id="glotSettingsLink"><i class="icon-moon-file-text "/>Polyglot Settings</a></li>`);

    const checkBoxes = [
        {name: 'markSolvedLanguageIcons',        label: 'Mark solved language icons'},
        {name: 'markSolvedLanguagesInDropdown',  label: 'Mark solved languages in trainer dropdown'},
        {name: 'additionalSearchFilters',        label: 'Additional search filters'},
        {name: 'showSolutionsTabs',              label: 'Show solutions in tabs'},
        {name: 'showPreviousSolutionsTabs',      label: 'Show previous solutions in tabs'},
        {name: 'showCopyToClipboardButtons',     label: 'Show "Copy to Clipboard" button'},
        {name: 'preferCompletedKataLeaderboard', label: 'Prefer "Completed kata" leaderboard'},
        {name: 'scrollLeaderboard',              label: 'Scroll leaderboards'},
        {name: 'showRankLeaderboards',           label: 'Show "Rank" leaderboards'},
        {name: 'alwaysShowSpoilerFlad',          label: 'Always show "Spoiler" flag'}
    ];

    function glotGetOption(optionName) {
        alert(optionName);
        return optionName[0] == 's';
    }

    function glotSetOption(optionName) {
        alert('Setting option ' + optionName);
    }

    function makeBox({name, label}) {
        const cbId = `glotSetting_${name}`;
        return `<input type="checkbox" id="${cbId}" name="${name}"><label for="glotSetting_${name}">${label}</label>`
    }

    function makeHtmlBoxes(boxes) {
        return boxes.map(makeBox).join('</br>');
    }

    function attachBoxListeners(boxes) {
        boxes.forEach(({ name }) => {
            const cbId = `glotSetting_${name}`;
            const cbox = jQuery('#'+ cbId);
            cbox.prop("checked", glotGetOption(name));
            cbox.change(function() { glotSetOption(name) });
        });
    }

    jQuery('body').append(`
    <div id='glotSettingsDialog'>
      <form>
        <fieldset>
          ${makeHtmlBoxes(checkBoxes)}
        </fieldset>
      </form>
    </div>`);

    attachBoxListeners(checkBoxes);

    dialog = jQuery('#glotSettingsDialog').dialog({
      autoOpen: false,
      height: 400,
      width: 350,
      modal: true,
      buttons: [
          {
              text: "OK",
              click: function() { $( this ).dialog( "close" ); }
          }
      ]
    });
    jQuery('#glotSettingsLink').click(function() { dialog.dialog('open'); });
}



jQuery(document).arrive("a.js-sign-out", { existing: true }, function() {
    buildPolyglotConfigMenu(this.parentElement.parentElement);
});

