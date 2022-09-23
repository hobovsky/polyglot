// ==UserScript==
// @name    Polyglot for Codewars
// @description User script which provides some extra functionalities to Codewars
// @version 1.13.20.1
// @downloadURL https://github.com/hobovsky/polyglot/releases/latest/download/polyglot.js
// @updateURL https://github.com/hobovsky/polyglot/releases/latest/download/polyglot.js
// @match https://www.codewars.com/*
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
// @require     https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.js
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

 WHAT FEATURES DOES IT PROVIDE?
------------------------------
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
 - Beta kata: uses Codwewars API to fetch and present breakdown of rank votes.

 HOW TO UNINSTALL IT?
--------------------
 I haven't checked.

 KNOWN ISSUES
------------
 - Yes.
 - A race condition here or there.
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
 - Chart.js

****************************************************************/

/* globals jQuery, $, waitForKeyElements, App */
var $ = window.jQuery;
const JQUERYUI_CSS_URL = '//ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/themes/dark-hive/jquery-ui.min.css';

$.noConflict();

const DROPDOWN_STYLE_CLASS = 'mt-1 block w-full pl-3 pr-10 py-2 text-base dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-cgray-300 dark:focus:ring-cgray-600 focus:border-cgray-300 dark:focus:border-cgray-600 sm:text-sm rounded-md';

jQuery("head").append(`<link href="${JQUERYUI_CSS_URL}" rel="stylesheet" type="text/css">`);

function isElementInViewport(el) {
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    let rect = el.getBoundingClientRect();
    let wnd = jQuery(window);
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= wnd.height() && rect.right <= wnd.width();
}

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

let css = `
.glotBtnCopy {
    margin-top: 1px;
    margin-right: 2px;
    float: right;
    padding: 5px 10px 5px;
    opacity: 0.7;
}
`;
GM_addStyle(css);

function getViewedKataId() {
    let currentUrl = window.location.href;
    let parts = currentUrl.split('/');
    let kataPartIdx = parts.indexOf('kata');
    if(kataPartIdx == -1 || kataPartIdx == parts.length - 1) {
        return null;
    }
    return parts[kataPartIdx + 1];
}

function isBetaKata() {
    let rankTag = jQuery("h4").siblings('div.tag').text();
    return rankTag === 'Beta'
}

function getRankColor(rank) {
    switch(rank) {
        case 1: case 2:
        case 3: case 4: return 'black';
        case -1: case -2: return "purple";
        case -3: case -4: return 'blue';
        case -5: case -6: return 'yellow';
        default: return 'white';
    }
}

function getRankValue(rank) { return Math.abs(rank) }
function getRankDenom(rank) { return rank < 0 ? "kyu" : "dan" }
function getRankLabel(rank) { return `${getRankValue(rank)} ${getRankDenom(rank)}`; }

function fetchAborted() {
    jQuery.notify("Fetch aborted.", "info");
}
function fetchError() {
    jQuery.notify("ERROR!", "error");
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
    return `<div class="small-hex is-extra-wide is-${getRankColor(rank)}-rank float-left mt-5px mr-5"><div class="inner-small-hex is-extra-wide "><span>${getRankLabel(rank)}</span></div></div>`
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
    collected.push(...leaderboardEntries);

    if(page < 10 && leaderboardEntries && leaderboardEntries.length) {
        buildLeaderboard(lang, collected, page+1);
    } else {
        fillLeaderboardRows(collected);
    }
}

function buildLeaderboard(lang, collected, page=1) {

    let url = `/api/v1/leaders/ranks/${lang}?page=${page}`;

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

        let tbody = jQuery('div.leaderboard table tbody');
        let tr = tbody.children('tr')[0];
        let th = tr.children[3];
        jQuery(th).text('Rank');

        buildLanguagesDropdown();
        buildLeaderboard('overall', [], 1);
    });
}

/********************************
 *       Rank assessments       *
 *********************************/

function addRankAssessmentBreakdown(breakdown, elem) {

    if(!jQuery('#glotBreakdownRow').length) {
        let canvas = '<tr style="display:none" id="glotBreakdownRow"><td colspan=2><canvas id="glotChartBreakdown"/></td></tr>';
        jQuery(elem).parent().after(canvas);
    }

    let allRanks = {};
    for(let b of breakdown) {
        allRanks[b.rank] = b.count;
    }

    let ranks = Array.from({length: 8}, (_,idx) => -8 + idx);
    let labels = ranks.map(getRankLabel);
    let yValues = ranks.map(r => allRanks[r] || 0);

    let helperComputedStyles = window.getComputedStyle(document.body);
    function getBarColor(rank) {
        let rankColor = getRankColor(rank);
        return helperComputedStyles.getPropertyValue(`--color-rank-${rankColor}`) || rankColor;
    }
    var barColors = ranks.map(getBarColor);

    new Chart("glotChartBreakdown", {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                backgroundColor: barColors,
                data: yValues,
                label: ''
            }]
        },
        options: {
            legend: { display: false } }
    });
}


function rankAssessmentsBreakdownDownloaded(resp) {
    if (resp.readyState !== 4) return;
    let cwResp = resp.response;
    const breakdownEntries = cwResp.data;
    const {kataId, elem} = resp.context;
    addRankAssessmentBreakdown(breakdownEntries, elem);
}

function fetchRankAssessmentBreakdown(kataId, elem) {

    let url = `/api/v1/code-challenges/${kataId}/assessed-ranks`;
    let opts = {
        method: "GET",
        url: url,
        onreadystatechange: rankAssessmentsBreakdownDownloaded,
        onabort: fetchAborted,
        onerror: fetchError,
        context: {kataId: kataId, elem: elem },
        responseType: "json"
    };
    GM_xmlhttpRequest(opts);
    jQuery.notify(`Fetching rank assessments breakdown...`, "info");
}

function toggleRankAssessmentsBreakdown() {
    jQuery('#glotBreakdownRow').slideToggle({duration: 400});
}

function addRankAssessmentsUi(elem) {

    elem = elem.parent().find('table')[1];
    let allCells = jQuery(elem).find('td');

    let leftCell = jQuery(allCells[8]);

    if(!jQuery('#glotToggleBreakdown').length) {
        leftCell.append(' <a id="glotToggleBreakdown">(see breakdown)</a>');
        jQuery('#glotToggleBreakdown').click(toggleRankAssessmentsBreakdown);
    }

    let kataId = getViewedKataId();
    fetchRankAssessmentBreakdown(kataId, leftCell);
}


/********************************
 *           Settings           *
 *********************************/
const checkBoxes = [
    {name: 'showSolutionsTabs',              label: 'Show solutions in your profile in tabs'},
    {name: 'showastSolutionsTabs',           label: 'Show previous solutions in the trainer in tabs'},
    {name: 'showCopyToClipboardButtons',     label: 'Show "Copy to Clipboard" button'},
    {name: 'preferCompletedKataLeaderboard', label: 'Prefer "Completed kata" leaderboard'},
    {name: 'scrollLeaderboard',              label: 'Auto-scroll leaderboards to show your position'},
    {name: 'showRankLeaderboards',           label: 'Show "Rank" leaderboards'},
    {name: 'alwaysShowSpoilerFlag',          label: 'Always show "Spoiler" flag'},
    {name: 'showRankAssessments',            label: 'Show rank assessments breakdown'}
];

const glotSettingsKey = 'glot.settings';

function getOrCreateSettingsObj() {
    let configObj = GM_getValue(glotSettingsKey);
    if(!configObj) {
        configObj = {};
        checkBoxes.forEach(({name})=>{configObj[name] = true });
    }
    return configObj;
}

// new features are enabled by default
function glotGetOption(optionName) {
    let valueSet = getOrCreateSettingsObj()[optionName];
    if(valueSet === undefined) {
        valueSet = true;
    }
    return valueSet;
}

function glotSetOption(optionName) {
    let settingsObj = getOrCreateSettingsObj();
    settingsObj[optionName] = jQuery(`#glotSetting_${optionName}`).prop('checked');
    GM_setValue(glotSettingsKey, settingsObj);
}

var dialog = undefined;

function buildConfigDialog() {
    function makeBox({name, label}) {
        const cbId = `glotSetting_${name}`;
        return `<tr><td style='vertical-align: baseline;'><input type="checkbox" id="${cbId}" name="${name}"></td><td><label for="glotSetting_${name}" >${label}</label></td></tr>`
    }

    function makeHtmlBoxes(boxes) {
        return boxes.map(makeBox).join('');
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
    <div id='glotSettingsDialog' title='Polyglot Settings'>
      <form>
        <fieldset>
          <table style='border-spacing: 5px; border-collapse: separate;'>
            ${makeHtmlBoxes(checkBoxes)}
          </table>
        </fieldset>
      </form>
      <p><b>Note:</b> some settings are applied after refresh.</p>
    </div>`);

    attachBoxListeners(checkBoxes);

    return jQuery('#glotSettingsDialog').dialog({
      autoOpen: false,
      // height: 400,
      width: 500,
      modal: true,
      buttons: [
          {
              text: "OK",
              click: function() { jQuery(this).dialog("close"); }
          }
      ]
    });
}


function getPolyglotConfigDialog() {
    if(!dialog) {
        dialog = buildConfigDialog();
    }
    return dialog;
}

function buildPolyglotConfigMenu(menu) {
    jQuery(menu).append(`<li class="border-t"><a id="glotSettingsLink"><i class="icon-moon-file-text"/>Polyglot Settings</a></li>`);
    jQuery('#glotSettingsLink').click(function() { getPolyglotConfigDialog().dialog('open'); });
}


/********************************
 *          DOM Listeners        *
 *********************************/

const spoilerFlagOpacityChange=function(){
    jQuery(this).css("opacity", "1");
}

const leaderboardRedirection=function(){
    let elem = jQuery(this);
    elem.attr("href", "/users/leaderboard/kata");
}

const languageLeaderboards=function(){
    if(jQuery(this).text() == 'Leaderboards') {
        buildLanguagesLeaderboardTab();
    }
}

const leaderboardScrollView=function(){
    if (!isElementInViewport(this)) {
        this.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

const processRankAssessments=function(){
    let elem = jQuery(this);
    if(elem.text() !== 'Stats:') {
        return;
    }
    addRankAssessmentsUi(elem);
}

const existing=true, onceOnly=false;

const LISTENERS_CONFIG = [
    [tabidizeByLanguage,      "div.list-item-solutions",              {existing, onceOnly}, ['showSolutionsTabs']],
    [tabidizePastSolutions,   'li[data-tab="solutions"]',             {existing, onceOnly}, ['showPastSolutionsTabs']],
    [spoilerFlagOpacityChange,'li.is-auto-hidden',                    {existing},           ['alwaysShowSpoilerFlag']],
    [addCopyButton,           'code',                                 {existing},           ['showCopyToClipboardButtons']],
    [leaderboardRedirection,  'a[title="Leaders"]',                   {existing},           ['preferCompletedKataLeaderboard']],
    [languageLeaderboards,    'h1.page-title',                        {existing},           ['showRankLeaderboards']],
    [leaderboardScrollView,   'tr.is-current-player',                 {existing},           ['scrollLeaderboard']],
    [processRankAssessments,  'h3',                                   {existing},           ['showRankAssessments']],
    [buildPolyglotConfigMenu, 'a.js-sign-out',                        {existing},           []],
];


for(const [func, target, options, conditions] of LISTENERS_CONFIG){
    jQuery(document).arrive(target, options, function() {
        if(conditions.length && conditions.every(prop => !glotGetOption(prop))){
            return;
        }
        const arg = func !== buildPolyglotConfigMenu ? this : this.parentElement.parentElement;
        func.call(this, arg)
    });
}
