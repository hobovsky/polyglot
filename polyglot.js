// ==UserScript==
// @name    Polyglot for Codewars
// @description User script which provides some extra functionalities to Codewars
// @version 1.18.0
// @downloadURL https://github.com/hobovsky/polyglot/releases/latest/download/polyglot.js
// @updateURL https://github.com/hobovsky/polyglot/releases/latest/download/polyglot.js
// @match https://www.codewars.com/*
// @grant   GM_xmlhttpRequest
// @grant   GM_setValue
// @grant   GM_getValue
// @grant   GM_deleteValue
// @grant   GM_addStyle
// @grant   GM_setClipboard
// @connect self
// @require http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @require http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/jquery-ui.min.js
// @require https://greasyfork.org/scripts/21927-arrive-js/code/arrivejs.js?version=198809
// @require https://rawgit.com/notifyjs/notifyjs/master/dist/notify.js
// @require https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
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
 - You can copy content of code boxes to clipboard.
 - "Spoiler" flags are visible all the time and do not dis/re-appear in a very annoying manner.
 - Contents of "Solutions" and "Past solutions" views are displayed in tabs by language.
 - Leaderboards: "Solved kata is default leaderboard (since "Overall"
   ranking does not measure anything useful). Also, leaderboards are
   automatically scrolled to show your score.
 - Beta kata: uses Codwewars API to fetch and present breakdown of rank votes.
 - Show attempted languages of a user in "Discourse".
 - Show timestamps of solution groups.
 - Show a toggle for raw markdown comments.
 - Show notifications after ranking up on leaderboards.

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
/* eslint no-multi-spaces: off */
/* globals jQuery, $, waitForKeyElements, App */
var $ = window.jQuery;
const JQUERYUI_CSS_URL = '//ajax.googleapis.com/ajax/libs/jqueryui/1.11.1/themes/dark-hive/jquery-ui.min.css';

$.noConflict();

const DROPDOWN_STYLE_CLASS = 'mt-1 block w-full pl-3 pr-10 py-2 text-base dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-cgray-300 dark:focus:ring-cgray-600 focus:border-cgray-300 dark:focus:border-cgray-600 sm:text-sm rounded-md';

jQuery("head").append(`<link href="${JQUERYUI_CSS_URL}" rel="stylesheet" type="text/css">`);

GM_deleteValue("glot.user.session_id");

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
li:has(> .switch) {
    margin-top: -3px;
}
.switch {
    position: relative;
    width: 30px;
    height: 10px;
    display: inline-block;
    white-space: pre;
}
.switch span {
    position: absolute;
    background-color: #ccc;
    border-radius: 5px;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transition: background-color 1s;
}
.switch span::before {
    background-color: white;
    border-radius: 50%;
    content: "";
    position: absolute;
    left: 3px;
    bottom: 2px;
    height: 6px;
    width: 6px;
}
input:checked + span {
  background-color: darkgreen;
}
input:checked + span::before {
  transform: translateX(18px);
}
.switch input {
    display: none;
}
.switch p {
    position: absolute;
    left: 0;
    top: 9px;
    font-size: 7pt;
    color: var(--color-ui-text-lc);
}
#sidenav #navConfigButtons {
    display: none;
}
#sidenav:hover #navSettings.active #navConfigButtons {
    display: inline;
}
#navSettings.active #navSettingsBtn {
    opacity: 0.4;
}
#navSettings.active #navOkBtn {
    color: green;
}
#navSettings.active #navCancelBtn {
    color: red;
}

@keyframes wiggle {
    0% { transform: rotate(0deg); }
   25% { transform: rotate(0.75deg); }
   75% { transform: rotate(-0.75deg); }
  100% { transform: rotate(0deg); }
}

#sidenav.active li:hover {
  animation: wiggle 0.5s;
  animation-iteration-count: 2;
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

function getTrainingLanguage() {
    const currentUrl = window.location.href;
    const parts = currentUrl.split('/');
    if (parts.length < 2 || parts.at(-2) != 'train') {
        return null;
    }
    return parts.at(-1);
}

// "Current" here meaning the last trained
function getCurrentLanguage() {
    return App.instance.currentUser.current_language;
}

function getKataLanguages() {
    const elts = jQuery("#language_dd>dl>dd").get();
    return elts.map(elt => elt.getAttribute("data-value"));
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
 *            Clipboard         *
 ********************************/

const btnCaption = "\u{1F4CB}";
function copyToClipboardFunc(codeElem) {
    return function() {
        let code = codeElem.text();
        if(isLCcode(codeElem) && glotGetOption('lclambdas')) {
            code = code.replace(/λ/g, '\\');
        }
        GM_setClipboard(code, "text");
        jQuery.notify(code.length + " characters copied to clipboard.", "info");
    };
}

function addCopyButton(codeElem) {
    codeElem = jQuery(codeElem);

    if (codeElem.parents("#description").length) {
        return;
    }

    let parent = codeElem.parent("pre");
    if (parent.siblings(".glot-copy-container").length) {
        return;
    }
    parent.wrap("<div class='glot-code-wrapper' style='position: relative;'></div>");
    parent.before(`
        <div class='glot-copy-container' style='position: absolute; top: 5px; right: 5px; z-index: 100;'>
            <button class='glotBtnCopy' type='button' title='Copy to clipboard'>${btnCaption}</button>
        </div>
    `);

    let btn = parent.prev().find("button").first();
    btn.on("click", copyToClipboardFunc(codeElem));
}

/********************************
 *           LC lambdas         *
 ********************************/

function isLCcode(codeElem) {
    return codeElem.data("language") === "lambdacalc";
}

function lclambdas(codeElem) {
    codeElem = jQuery(codeElem);
    if (!isLCcode(codeElem)) return;

    let keywords = codeElem.children("span.cm-keyword");
    for(let i = 0; i < keywords.length; ++i) {
        if(keywords[i].innerText === '\\') keywords[i].innerText = 'λ';
    }
}

/********************************
 *        Tabbed Languages      *
 ********************************/
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

function tabidizePastSolutions(divElem) {
    let solutionPanel = jQuery(divElem).first();

    // Remove duplicate langs and solutions
    const langGroups = {}; // Key : [Set(codeSnippet), <elt>]
    solutionPanel.children().each((_, child) => {
        const lang = child.children[0].textContent;
        const langExists = Boolean(langGroups[lang]);
        if (!langExists) langGroups[lang] = [new Set(), child];
        const [seenCode, parent] = langGroups[lang];
        for (const codeElt of [...child.children].slice(1)) {
            if (seenCode.has(codeElt.textContent)) {
                if (!langExists) codeElt.remove();
                continue;
            }
            seenCode.add(codeElt.textContent);
            if (langExists) parent.appendChild(codeElt);
        }
        if (langExists) child.remove();
    });

    let langDivs = solutionPanel.children();
    langDivs.wrapAll('<div class="langTabs"/>');
    let langTabs = solutionPanel.children("div.langTabs").first();
    langTabs.prepend('<ul class="tabsList"></ul>');
    let langTabsList = langTabs.children("ul.tabsList:first").first();

    let langs = langDivs.children("p");
    const trainingLang = langNames[getTrainingLanguage()];
    let tabIndex = 0;
    langs.each((i, langHeader) => {
        langHeader = jQuery(langHeader);
        if (langHeader.text() == trainingLang) {
            tabIndex = i;
        }
        langTabsList.append('<li><a href="#langTab-' + tabIdSerial + '">' + langHeader.text() + "</a></li>");
        langHeader.parent().attr("id", "langTab-" + tabIdSerial++);
    });

    langs.remove();
    let tabsPanel = langTabs.tabs({"active": tabIndex ?? 0});
}


/********************************
 *       Rank assessments       *
 ********************************/

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

function getRankAssesmentsUrl(kataId) {
    return `/api/v1/code-challenges/${kataId}/assessed-ranks`;
}

function fetchRankAssessmentBreakdown(kataId, elem) {

    let url = getRankAssesmentsUrl(kataId);
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

    let kataId = getViewedKataId();
    if(!jQuery('#glotToggleBreakdown').length) {
        leftCell.append(` <a id="glotToggleBreakdown">(see breakdown)</a> <a id="glotBreakdownLink" href="${getRankAssesmentsUrl(kataId)}">(link)</a>`);
        jQuery('#glotToggleBreakdown').click(toggleRankAssessmentsBreakdown);
    }

    fetchRankAssessmentBreakdown(kataId, leftCell);
}


/********************************
 *      Solution timestamps     *
 ********************************/

function dateFromObjectId(objectId) {
    return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
}

function formatDate(date) {
  let year = date.getFullYear();
  let month = (date.getMonth()+101).toString().slice(-2);
  let day = (date.getDate()+100).toString().slice(-2);
  let hour = (date.getHours()+100).toString().slice(-2);
  let min = (date.getMinutes()+100).toString().slice(-2);
  let sec = (date.getSeconds()+100).toString().slice(-2);
  return year+"-"+month+"-"+day+" "+hour+":"+min+":"+sec;
}

function solutionTimestamps(sol) {
  let id = sol.attributes.id.textContent;
  addTimeStamp(sol, id);
}

function reviewTimestamps(sol) {
  let id = /groups\/([0-9a-f]{24})/i.exec(window.location.href)[1];
  addTimeStamp(sol, id);
}

function addTimeStamp(sol, id){
  let date = formatDate(dateFromObjectId(id));
  let buttons = sol.getElementsByClassName("piped-text has-keyword-tags").item(0);
  if(buttons.lastChild.textContent == date) return;
  let dateElement = document.createElement("li");
  dateElement.textContent = date;
  dateElement.style = 'color: #c0c0c0; font-size: 9pt';
  buttons.appendChild(dateElement);
}


/********************************
 *         Raw Markdown         *
 ********************************/
const switchButton = `<li><span class="bullet"></span><label class="switch"><input type="checkbox"><span></span><p>markdown</p></label></li>`;
const orginalComments = new Map();
function rawMarkdown(element) {
    let elem = jQuery(element);
    let ul = elem.parent().find('h6').find('ul')[0];
    let button = jQuery(switchButton);
    button.on('change', toggleMarkdown);
    button.appendTo(ul);
}
function toggleMarkdown({ target: toggle }) {
    let comment = jQuery(toggle).parents("h6").first().next().first();
    if(toggle.checked) {
        if(!orginalComments.has(toggle)) orginalComments.set(toggle, comment[0].innerHTML);
        comment.html(`<pre style="white-space:pre-wrap">${comment[0].dataset.markdown}</pre>`);
    } else {
        comment[0].innerHTML = orginalComments.get(toggle);
    }
}


/********************************
 *     Leaderboard Updates      *
 ********************************/

function getLeaderboardPositionUrl(lang, user) {
    return `https://www.codewars.com/api/v1/leaders/ranks/${lang}?user=${user}`;
}

async function fetchLeaderboardRank(lang, user) {
    if (!lang) return null;
    if (!user) user = getUserName();
    const response = await fetch(getLeaderboardPositionUrl(lang, user));
    if (response.status === 404) jQuery.notify("User not found!", "error");
    const userData = await response.json();
    if (!userData) return null;
    return userData.data.find(({ username }) => username === user)?.position;
}

function displayRankUpdate(lang, oldRank, newRank) {
    const langName = langNames[lang] || "Overall";
    const msg = `${langName} leaderboard position improved: ${oldRank} → ${newRank}`;
    jQuery.notify(msg, "success");
}

const langRanksKey = 'glot.langRanks';
function updateRank(lang, rank, display=false) {
    const langRanks = GM_getValue(langRanksKey) || {};
    if ((langRanks[lang] || 0) > rank && display) {
        displayRankUpdate(lang, langRanks[lang], rank);
    }
    langRanks[lang] = rank;
    GM_setValue(langRanksKey, langRanks);
}

async function leaderboardUpdates(elt) {
    const notCompleted = elt.classList.contains('is-hidden');
    const fetchUpdateRank = (lang, display) => fetchLeaderboardRank(lang).then(rank => rank && updateRank(lang, rank, display));
    if (notCompleted) {
        fetchUpdateRank('overall');
        jQuery(document).arrive('#language_dd>.mr-4>i', {existing, fireOnAttributesModification}, function() {
            const lang = document.querySelector('#language_dd>dl>dd[class="is-active"]')?.getAttribute('data-value') || getTrainingLanguage();
            fetchUpdateRank(lang);
        });
        return;
    }
    const trainingLang = getTrainingLanguage();
    fetchUpdateRank('overall', true);
    fetchUpdateRank(trainingLang, true);
}


/********************************
 *       Custom Nav Menu        *
 ********************************/

/*

type MenuItem = {
  url: string,
  icon: keyof icons,
  text: string,
  subtext: string,
  tooltip: string,
  newTab: bool,
  menuDiv: bool
}

*/

const defaultNavMenu = [
    {icon: "CWLogo", url: "/dashboard", text: "Home", subtext: "Report home for your next assignment"},
    {menuDiv: true, text: "Training"},
    {icon: "ninja", url: "/kata/latest/my-languages?beta=false", text: "Practice", subtext: "Complete challenging <strong>Kata</strong> to earn honor and ranks. Re-train to hone technique"},
    {icon: "sparring", url: "/kumite", text: "Freestyle Sparring", subtext: "Take turns remixing and refactoring others code through <strong>Kumite</strong>"},
    {menuDiv: true, text: "Career"},
    {icon: "suitcase", url: "https://talent.andela.com/signup/codewars/?utm_medium=partner&amp;utm_source=codewars&amp;utm_campaign=talent-global-2023-cw-usr-jobboard&amp;utm_content=top-button", newTab: true, tooltip: "Andela Talent", text: "Opportunities", subtext: "Find your next career challenge – powered by Andela"},
    {menuDiv: true, text: "Community"},
    {icon: "stonks", url: "/users/leaderboard", tooltip: "Leaders", text: "Leaderboards", subtext: "Achieve honor and move up the global leaderboards"},
    {icon: "discord", url: "https://discord.gg/mSwJWRvkHA", newTab: true, tooltip: "Discord", text: "Chat", subtext: "Join our <strong>Discord</strong> server and chat with your fellow code warriors"},
    {icon: "chatBubbles", url: "https://github.com/codewars/codewars.com/discussions", newTab: true, tooltip: "GitHub Discussions", text: "Discussions", subtext: "View our <strong>Github Discussions</strong> board to discuss general Codewars topics"},
    {menuDiv: true, text: "About"},
    {icon: "book", url: "https://docs.codewars.com", newTab: true, tooltip: "The Codewars Docs", text: "Docs", subtext: "Learn about all of the different aspects of Codewars"},
    {icon: "blog", url: "https://codewars.com/blog", newTab: true, tooltip: "The Codewars Blog", text: "Blog", subtext: "Read the latest news from Codewars and the community"},
    {menuDiv: true, text: "Moderation"},
    {icon: "gitMerge", url: "/kumite/translations", tooltip: "Pending Translations", text: "Translations", subtext: "Use your special privileges to help approve pending translations"},
];

const defaultMenuLabels = ["Home", "Training section", "Kata", "Kumite", "Career section", "Andela Talent", "Community section", "Leaderboard", "Discord", "Discussions", "About section", "Docs", "Blog", "Moderation section", "Translations"];
const menuTemplates = {
    "Default Menu Items": null,
    ...Object.fromEntries(defaultMenuLabels.map((v,i)=>[v,defaultNavMenu[i]])),
    "Custom Templates": null,
    "Beta kata": {icon: "baby", url: "/kata/search/my-languages?q=&beta=true", text: "Beta", subtext: "Discover Beta kata: the good, the old, and the unhinged", tooltip: "Beta Kata"},
    "Train current lang": {icon: "%currentlang%", url: "/kata/search/%currentlang%?q=&xids=completed&beta=false&order_by=sort_date%20desc", text: "%currentlang% Kata", subtext: "Continue training in %currentlang%", tooltip: "%currentlang% kata"},
    "Current lang leaderboard": {icon: "%currentlang%-leaderboard", url: "/users/leaderboard/ranks?language=%currentlang%", text: "%currentlang% Leaderboard", subtext: "See your progress in %currentlang%", tooltip: "%currentlang% Leaderboard"}
}


const navConfigKey = "glot.navConfig"

function openEditTileWindow(index) {
    const navConfig = GM_getValue(navConfigKey) ?? [...defaultNavMenu];
    const isNew = navConfig.length <= index;
    const tileOpts = navConfig[index] ?? {};
    const idPrefix = "glotNavSetting";

    function buildInput(opt, type="text") {
        const id = idPrefix + opt;
        return `<tr><td><label for="${id}">${opt}</label></td><td><input type="${type}" id="${id}" style="width:100%;"/>`;
    }

    function buildTemplates() {
        const id = "glotmenuTemplates";
        const options = [...Object.entries(menuTemplates)].map(([key, val]) => `<option${val ? "" : " disabled"} value="${key}">${key}</option>`).join("");
        return `<tr><td><label for="${id}">Optionally select template:</label></td><td><select id="${id}" style="width:100%;"><option disabled selected/>${options}</select>`;
    }

    function buildIconChoice() {
        const id = idPrefix + "icon";
        const regularIcons = [...Object.keys(icons)].filter(i => !/-leaderboard$/.test(i) && !langNames[i]).map(opt => `<option value="${opt}">${opt}</option>`).join("");
        const languageIcons = ["%currentlang%", ...[...Object.keys(icons)].filter(i => langNames[i])].map(opt => `<option value="${opt}">${opt}</option>`).join("");
        const langLeaderboardIcons = ["%currentlang%-leaderboard", ...[...Object.keys(icons)].filter(i => /-leaderboard$/.test(i))].map(opt => `<option value="${opt}">${opt}</option>`).join("");
        return `<tr><td><label for="${id}">icon</label></td><td><select id="${id}" style="width:100%;"><option disabled selected/>${regularIcons}<option disabled>Language Icons</option>${languageIcons}<option disabled>Lang Leaderboard Icons</option>${langLeaderboardIcons}</select>`;
    }

    const opts = ["url", "text", "subtext", "tooltip"].map(buildInput);
    jQuery('body').append(`
    <div id='editTileWindow' title='${isNew ? "Add New Link" : "Edit Link"}'>
      <table style="width: 100%;">
      ${buildTemplates()}
      ${buildIconChoice()}
      ${opts.join("")}
      ${buildInput("newTab", "checkbox")}
      ${buildInput("menuDiv", "checkbox")}
      </table>
      <hr style="margin: 10px"/>
      <p style="font-size: 0.9rem;"><i>Tip: Use %currentlang% to dynamically reference the last trained lang.</i></p>
    </div>`);

    const templatesChoiceElt = document.getElementById("glotmenuTemplates");
    templatesChoiceElt.addEventListener("change", e => prefillFields(menuTemplates[e.target.value]));

    function prefillFields(tileOpts) {
        for (const opt of ["icon", "url", "text", "subtext", "tooltip"]) {
            const currentSetting = tileOpts[opt] ?? "";
            const elt = document.getElementById(idPrefix + opt);
            elt.value = currentSetting;
        }

        for (const opt of ["newTab", "menuDiv"]) {
            const currentSetting = tileOpts[opt] ?? false;
            const elt = document.getElementById(idPrefix + opt);
            elt.checked = currentSetting;
        }

        if (isNew && !templatesChoiceElt.value) {
            const currentUrl = String(window.location);
            document.getElementById(idPrefix + "url").value = currentUrl;
            const iconElt = document.getElementById(idPrefix + "icon");
            if (currentUrl.includes("/kata")) iconElt.value = "ninja";
            let m = currentUrl.match(/kata\/search\/([a-z]+)\?/);
            if (m) iconElt.value = m[1];
            if (currentUrl.includes("beta=true")) iconElt.value = "baby";
            if (currentUrl.includes("/users/leaderboard")) iconElt.value = "leaderboard";
            if (currentUrl.includes("/ranks?language=")) iconElt.value = currentUrl.split("=")[1] + "-leaderboard";
            if (currentUrl.includes("kumite")) iconElt.value = "sparring";
        }
    }

    prefillFields(tileOpts);

    function getChoices() {
        return {
            ...Object.fromEntries(["icon", "url", "text", "subtext", "tooltip"].map(v => [v, document.getElementById("glotNavSetting" + v).value])),
            newTab: document.getElementById("glotNavSettingnewTab").checked,
            menuDiv: document.getElementById("glotNavSettingmenuDiv").checked
        }
    }

    const settingsWindow = jQuery('#editTileWindow').dialog({
      autoOpen: false,
      // height: 400,
      width: 500,
      modal: true,
      buttons: [
          {
              text: "OK",
              click: function() {
                  const navConfig = GM_getValue(navConfigKey) ?? [...defaultNavMenu];
                  if (isNew) {
                      navConfig.push(getChoices());
                  } else {
                      navConfig[index] = getChoices();
                  }
                  GM_setValue(navConfigKey, navConfig);
                  loadNavMenu();
                  jQuery(this).dialog("destroy").remove();
              }
          },
          {
              text: "Cancel",
              click: function() {
                jQuery(this).dialog("destroy").remove();
              }
          },
          ...(isNew ? [] : [{
              text: "Delete",
              click: function() {
                  const navConfig = GM_getValue(navConfigKey) ?? [...defaultNavMenu];
                  navConfig.splice(index, 1);
                  GM_setValue(navConfigKey, navConfig);
                  loadNavMenu();
                  jQuery(this).dialog("destroy").remove();
              }
          }])
      ]
    });

    settingsWindow.dialog("open");
}

const navSettingsElts = `
<div id="navSettings" style="position: fixed;bottom: 0px;width: 320px;">
  <a id="navSettingsBtn" class="sidenav-link__icon  icon-container ui-sortable-handle" style="background:none; padding-left: 11px;">
    <i class="icon-moon-settings"></i>
  </a>
  <div id="navConfigButtons" style="padding-left: 12px;">
    <a id="navOkBtn" class="sidenav-link__icon  icon-container ui-sortable-handle" style="background:none; padding: 6px;">
      <i class="icon-moon-check"></i>
    </a>
    <a id="navCancelBtn" class="sidenav-link__icon  icon-container ui-sortable-handle" style="background:none; padding: 6px;">
      <i class="icon-moon-x"></i>
    </a>
    <div style="display: inline;position: absolute;right: 0px;padding-right: 8px;">
      <a id="navAddBtn" class="sidenav-link__icon  icon-container ui-sortable-handle" style="background:none; padding: 11px;">
        <i class="icon-moon-plus"></i>
      </a>
    </div>
  </div>
</div>`;

function customNavMenu(elt) {
    // Check if App is loaded
    try { App } catch {
        return setTimeout(() => customNavMenu(elt), 50);
    }
    // Add the settings buttons
    elt = jQuery(elt);
    const settingsBtn = jQuery(navSettingsElts);
    elt.append(settingsBtn);
    jQuery("#navSettingsBtn").click(() => activateEditing());
    jQuery("#navCancelBtn").click(() => cancelEditing());
    jQuery("#navOkBtn").click(() => applyEditing());
    jQuery("#navAddBtn").click(() => openEditTileWindow(jQuery("#sidenav li").length));
    let startIndex;
    const start = (e,ui) => {
        startIndex = ui.item.index();
    }
    const update = (e,ui) => {
        const newIndex = ui.item.index();
        const navConfig = GM_getValue(navConfigKey) ?? [...defaultNavMenu];
        const tile = navConfig[startIndex];
        const dir = newIndex > startIndex ? 1 : -1;
        for (let i=startIndex; i != newIndex; i += dir) {
            navConfig[i] = navConfig[i+dir];
        }
        navConfig[newIndex] = tile;
        GM_setValue(navConfigKey, navConfig);
    }
    jQuery(elt.children()[0]).sortable({disabled: true, start, update, axis: "y", helper: "clone"});
    loadNavMenu();
}

function loadNavMenu() {
    let navConfig = GM_getValue(navConfigKey);
    if (!navConfig) {
        navConfig = defaultNavMenu;
        GM_setValue(navConfigKey, navConfig);
    }
    let afterBreak = false;
    const menuItems = navConfig.map((tile, i) => {
        let { icon, url = "", text = "", subtext = "", tooltip = "", newTab = false, menuDiv = false } = tile;
        if (menuDiv) {
            afterBreak = true;
            return jQuery(`<li class="sidenav-section"><span>${tile.text}</span></li>`);
        }
        const currentLang = getCurrentLanguage();
        icon = icon.replace("%currentlang%", currentLang);
        url = url.replace("%currentlang%", currentLang);
        text = text.replace("%currentlang%", langNames[currentLang]);
        subtext = subtext.replace("%currentlang%", langNames[currentLang]);
        tooltip = tooltip.replace("%currentlang%", langNames[currentLang]);
        tooltip = tooltip.length ? `title="${tooltip}"` : "";
        const spacing = afterBreak  ? "mt-1" : "";
        const topSpaceText = i == 0 ? "mt-2" : "";
        const topSpaceLogo = i == 0 ? "mt-3" : "";
        afterBreak = false;
        const newTabClass = newTab ? ` rel="noopener" target="_blank"` : "";
        return jQuery(`
 <li class="sidenav-item ${spacing}">
   <a href="${url}" ${newTabClass} ${tooltip}>
     <div class="${topSpaceLogo}" style="position: relative;">
       ${icons[icon]}
     </div>
     <div class="sidenav-link__content ${topSpaceText}">
       <div class="sidenav-link__label">
         ${text}
       </div>
       <div class="sidenav-link__desc">
         ${subtext}
       </div>
     </div>
   </a>
 </li>`);

    }).filter(Boolean).map(j => j[0]);
    jQuery("#sidenav>ul")[0].replaceChildren(...menuItems);
    if (isEditMode) {
        activateEditing();
    }
}

let isEditMode = false;
let currentNavConfig;
function activateEditing() {
    if (!isEditMode) {
        currentNavConfig = GM_getValue(navConfigKey);
    }
    isEditMode = true;
    jQuery("#navSettings").addClass("active");
    jQuery("#sidenav").addClass("active");
    jQuery("#sidenav>ul").sortable( "option", "disabled", false);
    jQuery("#sidenav>ul>li").click(e => e.preventDefault() ?? openEditTileWindow(jQuery(e.target).closest("li").index()));
}

function cancelEditing() {
    isEditMode = false;
    // Reset back to the pre-existing value;
    GM_setValue(navConfigKey, currentNavConfig);
    loadNavMenu();
    applyEditing();
}

function applyEditing() {
    isEditMode = false;
    jQuery("#navSettings").removeClass("active");
    jQuery("#sidenav").removeClass("active");
    jQuery("#sidenav>ul").sortable( "option", "disabled", true);
    jQuery("#sidenav>ul>li").off("click");
}


/********************************
 *           Settings           *
 ********************************/
const checkBoxes = [
    {name: 'showSolutionsTabs',              label: 'Show solutions in your profile in tabs',           choice: Boolean},
    {name: 'showPastSolutionsTabs',          label: 'Show previous solutions in the trainer in tabs',   choice: Boolean},
    {name: 'showCopyToClipboardButtons',     label: 'Show "Copy to Clipboard" button',                  choice: Boolean},
    {name: 'preferLeaderboard',              label: 'Prefer specified leaderboard',                     choice: ["Overall", "Completed Kata", "Authored Kata", "Rank"]},
    {name: 'scrollLeaderboard',              label: 'Auto-scroll leaderboards to show your position',   choice: Boolean},
    {name: 'alwaysShowSpoilerFlag',          label: 'Always show "Spoiler" flag',                       choice: Boolean},
    {name: 'showRankAssessments',            label: 'Show rank assessments breakdown',                  choice: Boolean},
    {name: 'scanSolvedLanguages',            label: 'Show attempted languages',                         choice: Boolean},
    {name: 'solutionTimestamps',             label: 'Show timestamps of solution groups',               choice: Boolean},
    {name: 'lclambdas',                      label: 'Show lambdas for LC solutions',                    choice: Boolean},
    {name: 'rawMarkdown',                    label: 'Show "markdown" switch',                           choice: Boolean},
    {name: 'leaderboardUpdates',             label: 'Show leaderboard position updates',                choice: Boolean},
    {name: 'customNavMenu',                  label: 'Use custom navigation menu',                       choice: Boolean},
];

const glotSettingsKey = 'glot.settings';

function getOrCreateSettingsObj() {
    let configObj = GM_getValue(glotSettingsKey);
    if(!configObj) {
        configObj = {};
        checkBoxes.forEach(({name, choice})=>{configObj[name] = choice === Boolean ? true : choice[0];});
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

function glotSetOption(optionName, setting) {
    let settingsObj = getOrCreateSettingsObj();
    settingsObj[optionName] = setting;
    GM_setValue(glotSettingsKey, settingsObj);
}

function buildConfigDialog() {
    function makeBox({name, label}) {
        const cbId = `glotSetting_${name}`;
        return `<tr><td style='vertical-align: baseline;'><input type="checkbox" id="${cbId}" name="${name}"></td><td><label for="glotSetting_${name}" >${label}</label></td></tr>`
    }

    function makeChoice({name, label, choice}) {
        const cbId = `glotSetting_${name}`;
        const opts = choice.map(c => `<option value="${c}">${c}</option>`).join('')
        return `<tr><td style='vertical-align: baseline;'><select id="${cbId}" name="${name}">${opts}</select></td><td><label for="glotSetting_${name}" >${label}</label></td></tr>`
    }

    function makeHtmlBoxes(boxes) {
        return boxes.map(box => box.choice === Boolean ? makeBox(box) : makeChoice(box)).join('');
    }

    function attachBoxListeners(boxes) {
        boxes.forEach(({ name, choice}) => {
            const cbId = `glotSetting_${name}`;
            const cbox = jQuery('#'+ cbId);
            if (choice === Boolean) {
                cbox.prop("checked", glotGetOption(name));
                cbox.change(function() { glotSetOption(name, this.checked) });
            } else {
                cbox.val(glotGetOption(name));
                cbox.change(function() { glotSetOption(name, this.value) });
            }
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
      <hr style="margin: 10px"/>
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
              click: function() {
                jQuery(this).dialog("close");
              }
          }
      ]
    });
}

function buildPolyglotConfigMenu(menuElement) {
    let menu = jQuery(menuElement);
    if(!menu.find("#glotSettingsLink").length) {
        menu.append(`<li class="border-t"><a id="glotSettingsLink"><i class="icon-moon-file-text"/>Polyglot Settings</a></li>`);
    }
     // handler must be reattached every time
    menu.find('#glotSettingsLink').click(function() { buildConfigDialog().dialog('open'); });
}


/********************************
 *          DOM Listeners       *
 ********************************/

const spoilerFlagOpacityChange=function(){
    jQuery(this).css("opacity", "1");
}

const leaderboardUrls = {
    "Completed Kata": "kata",
    "Authored Kata": "authored",
    "Rank": "ranks"
}

// customNavMenu overrides leaderboardRedirection
const leaderboardRedirection=function(){
    if (glotGetOption("customNavMenu")) return;
    const url = leaderboardUrls[glotGetOption("preferLeaderboard")];
    if (url) {
      const elem = jQuery(this);
      elem.attr("href", `/users/leaderboard/${url}`);
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


// The arrive listener is associated with a selector of each post, and as a result
// the logic related to processing the comments container needs to be guided by some globals
// to avoid repeating it for every post.
let recentKataId;
let allKataLangs;
let userMap = {};

let csrfToken = jQuery.cookie("CSRF-TOKEN"); // GM_getValue("glot.user.csrf_token", null);

const scanSolvedLanguages = function(commentActionsElem) {

    const kataId = getViewedKataId();
    if(kataId !== recentKataId) {

        if(!csrfToken) {
            console.info("CSRF token is not set. Solved languages will not be fetched.");
            return;
        }

        recentKataId = kataId;
        allKataLangs = jQuery('div#language_dd dd').toArray().map(dd => jQuery(dd).data('value')).filter(Boolean).sort();
        let allCommentsData = jQuery('div.comments-list-component').data('view-data');
        userMap = {};
        for(let comment of allCommentsData.comments) {
            userMap[comment.id] = comment.user_id;
            for(let nested of comment.comments) {
                userMap[nested.id] = nested.user_id;
            }
        }
    }

    function doScanLanguages(e) {

        let elem = e.data.link;
        elem.parent().nextAll('li').remove();
        let commentContainer = elem.closest('li.comment');
        let commentId = commentContainer.attr('id');
        let userId = userMap[commentId];
        if (userId === undefined) {
            jQuery.notify("Could not find user id. Try reloading the page.", "error");
            return;
        }

        for(let lang of allKataLangs) {
            let url = `https://www.codewars.com/kata/${kataId}/${lang}/solution/${userId}`;

            function solutionDownloaded(resp) {
                if (resp.readyState !== 4) return;
                let cwResp = resp.response;
                if(cwResp.completed || cwResp.solution || "denied" in cwResp) {
                    let userlink = elem.parents('ul').first();
                    userlink.append('<li><span class="bullet"/>' + (cwResp.denied ? (`<del>${resp.context.lang}</del>`) : (`<a href='https://www.codewars.com/kata/${kataId}/discuss/${lang}#${commentId}'>${resp.context.lang}</a>`)) + "</li>");
                }
            }

            let opts = {
                fetch: true,
                method: "POST",
                url: url,
                onreadystatechange: solutionDownloaded,
                onabort: fetchAborted,
                onerror: fetchError,
                context: {
                    userId: userId,
                    kataId: kataId,
                    lang:   lang
                },
                responseType: "json",
                anonymous: false,
                headers: {
                    'User-Agent': 'Polyglot User Script',
                    'x-csrf-token': csrfToken
                }
            };
            GM_xmlhttpRequest(opts);
        };
    };

    let elem = jQuery(commentActionsElem);
    elem.append(`<li><span class="bullet"/><a class="glotTrainedLanguages">Attempted languages</a></li>`);
    let link = elem.find("a.glotTrainedLanguages").first();
    link.on("click", { link }, doScanLanguages);
}

const existing = true, onceOnly = false, fireOnAttributesModification = true;


const LISTENERS_CONFIG = [
    [tabidizeByLanguage,      "div.list-item-solutions",                  {existing, onceOnly}, ['showSolutionsTabs']],
    [tabidizePastSolutions,   'div.h-full.mb-4.p-4',                      {existing, onceOnly}, ['showPastSolutionsTabs']],
    [spoilerFlagOpacityChange,'li.is-auto-hidden',                        {existing},           ['alwaysShowSpoilerFlag']],
    [addCopyButton,           'code',                                     {existing},           ['showCopyToClipboardButtons']],
    [leaderboardRedirection,  'a[title="Leaders"]',                       {existing},           []],
    [leaderboardScrollView,   'tr.is-current-player',                     {existing},           ['scrollLeaderboard']],
    [processRankAssessments,  'h3',                                       {existing},           ['showRankAssessments']],
    [scanSolvedLanguages,     'ul.comment-actions',                       {existing},           ['scanSolvedLanguages']],
    [solutionTimestamps,      '.js-result-group',                         {existing},           ['solutionTimestamps']],
    [reviewTimestamps,        '.js-solution-group',                       {existing},           ['solutionTimestamps']],
    [lclambdas,               'code',                                     {existing},           ['lclambdas']],
    [rawMarkdown,             '.comment-markdown',                        {existing},           ['rawMarkdown']],
    [buildPolyglotConfigMenu, 'a.js-sign-out',                            {existing},           []],
    [leaderboardUpdates,      '#submit_btn',                              {existing, fireOnAttributesModification}, ['leaderboardUpdates']],
    [customNavMenu,           '#sidenav',                                 {existing},           ['customNavMenu']],
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


// Some larger constants

const langNames = {
    "agda": "Agda",
    "bf": "BF",
    "c": "C",
    "cfml": "CFML",
    "clojure": "Clojure",
    "cobol": "COBOL",
    "coffeescript": "CoffeeScript",
    "commonlisp": "CommonLisp",
    "coq": "Coq",
    "cpp": "C++",
    "crystal": "Crystal",
    "csharp": "C#",
    "d": "D",
    "dart": "Dart",
    "elixir": "Elixir",
    "elm": "Elm",
    "erlang": "Erlang",
    "factor": "Factor",
    "forth": "Forth",
    "fortran": "Fortran",
    "fsharp": "F#",
    "go": "Go",
    "groovy": "Groovy",
    "haskell": "Haskell",
    "haxe": "Haxe",
    "idris": "Idris",
    "java": "Java",
    "javascript": "JavaScript",
    "julia": "Julia",
    "kotlin": "Kotlin",
    "lambdacalc": "λ Calculus",
    "lean": "Lean",
    "lua": "Lua",
    "nasm": "NASM",
    "nim": "Nim",
    "objc": "Objective-C",
    "ocaml": "OCaml",
    "pascal": "Pascal",
    "perl": "Perl",
    "php": "PHP",
    "powershell": "PowerShell",
    "prolog": "Prolog",
    "purescript": "PureScript",
    "python": "Python",
    "r": "R",
    "racket": "Racket",
    "raku": "Raku",
    "reason": "Reason",
    "riscv": "RISC-V",
    "ruby": "Ruby",
    "rust": "Rust",
    "scala": "Scala",
    "shell": "Shell",
    "solidity": "Solidity",
    "sql": "SQL",
    "swift": "Swift",
    "typescript": "TypeScript",
    "vb": "VB",
}

const leaderboardIcon = `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg></div>`;

const icons = {
    // Codewars sourced
    CWLogo:        `<div class="logo shrink-0" style="margin-bottom: 10px;"><img class="w-full h-full" src="https://www.codewars.com/packs/assets/logo.f607a0fb.svg"></div>`,
    ninja:         `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M23.477 7.694c-.395-.559-1.312-.795-1.869-.318L20.342 8.46c-3.71-1.833-7.42-3.663-11.129-5.497-1.651-.817-2.512 1.944-.884 2.748l4.011 1.98-2.83 5.437c-.019.039-.032.08-.05.12L2.053 9.843c-1.66-.762-2.537 1.931-.899 2.685l8.863 4.074.5 2.442a272 272 0 0 1-3.176-1.45c-1.643-.767-3.08 1.672-1.428 2.443 2.031.948 4.082 1.852 6.123 2.776 1.268.572 2.405-.733 2.115-1.708v-.02c-.353-1.726-.708-3.452-1.06-5.179.076-.093.152-.19.21-.3l3.08-5.918 3.405 1.68c.384.191.723.183 1.001.055.172-.036.337-.11.478-.23.631-.54 1.26-1.081 1.893-1.62.555-.477.767-1.242.32-1.879z"></path><path d="M16.482 5.579a2.303 2.303 0 1 0 1.145-4.462l-.016-.003a2.303 2.303 0 0 0-1.145 4.461l.016.004z"></path></svg></div>`,
    sparring:      `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="m9.441 10.67-2.908 1.233-1.06-2.317 1.848-.05c.543 0 .986-.418 1.06-.96l.296-2.416C8.751 5.568 8.332 5 7.74 4.927a1.106 1.106 0 0 0-1.232.961l-.197 1.48-1.627.049a.786.786 0 0 0-.345.074l-2.268.813a.997.997 0 0 0-.64.616 1.02 1.02 0 0 0 .048.888l2.317 4.659-1.109 6.779c-.123.69.37 1.356 1.06 1.479.074 0 .148.025.222.025a1.27 1.27 0 0 0 1.257-1.085l1.134-6.902 6.113-2.589-2.193-.936a2.199 2.199 0 0 1-.838-.567zM4.574 4.136a2.243 2.243 0 1 1-4.07 1.887 2.243 2.243 0 0 1 4.07-1.887Z"></path><path d="m21.94 6.727-2.268-.814a.87.87 0 0 0-.345-.074l-1.652-.05-.197-1.478c-.074-.592-.641-1.011-1.233-.962a1.11 1.11 0 0 0-.961 1.233l.296 2.415c.073.543.517.937 1.06.962l1.848.05-1.06 2.317-5.768-2.441c-.666-.271-1.405.025-1.676.69-.271.666.024 1.405.69 1.676l6.952 2.959 1.134 6.902a1.27 1.27 0 0 0 1.257 1.085c.074 0 .148 0 .222-.025.69-.123 1.183-.789 1.06-1.48l-1.11-6.778 2.317-4.66c.148-.27.148-.616.05-.887a.946.946 0 0 0-.617-.64zm.465-5.268a2.243 2.243 0 1 1-1.888 4.07 2.243 2.243 0 0 1 1.888-4.07z"></path></svg></div>`,
    suitcase:      `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg></div>`,
    stonks:        leaderboardIcon,
    discord:       `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M9.8147 10.0948c-.6792 0-1.2191.5921-1.2191 1.315 0 .7227.5486 1.3236 1.2191 1.3236.6793 0 1.2192-.6008 1.2192-1.3237.0174-.7228-.54-1.315-1.2192-1.315zm4.3715 0c-.6792 0-1.2191.5921-1.2191 1.315 0 .7227.5486 1.3236 1.2191 1.3236.6793 0 1.2192-.6008 1.2192-1.3237 0-.7228-.54-1.315-1.2192-1.315z"></path><path d="M20.0034.0539H3.9889C2.64.0637 1.5506 1.1594 1.5506 2.5096v.0092-.0004 16.1629c0 1.3533 1.0945 2.4508 2.4465 2.4558H17.539l-.627-2.212 1.524 1.4195 1.4455 1.3411 2.569 2.2642V2.5096c0-1.3532-1.0945-2.4508-2.4466-2.4557ZM15.388 15.6595l-.7838-.9667c.889-.2145 1.636-.7207 2.1527-1.4097l.007-.0097c-.4877.3222-.958.5486-1.376.6966-.9578.4145-2.0733.6556-3.2451.6556a8.4005 8.4005 0 0 1-1.6323-.1593l.0531.0088c-.9878-.2002-1.8648-.5165-2.6764-.9407l.0552.0263-.1132-.061-.0435-.0348c-.2177-.122-.3396-.209-.3396-.209s.5747.958 2.09 1.4108c-.3484.4528-.7925.9928-.7925.9928-2.6386-.0871-3.6488-1.8201-3.6488-1.8201 0-3.8404 1.7242-6.9668 1.7242-6.9668 1.7156-1.2801 3.3527-1.2453 3.3527-1.2453l.122.148c-2.151.6183-3.135 1.5676-3.135 1.5676s.2612-.148.6966-.3484c.7886-.3714 1.7038-.6386 2.6657-.7534l.0426-.0042.209-.0174c.3922-.056.8452-.088 1.3056-.088 1.7258 0 3.3467.449 4.7522 1.2367l-.0491-.0253s-.9493-.9057-2.9783-1.5414l.1742-.1916s1.6285-.0348 3.3527 1.2628c0 0 1.7155 3.1176 1.7155 6.9667 0 0-1.0101 1.7243-3.6574 1.8114z"></path></svg></div>`,
    chatBubbles:   `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg></div>`,
    book:          `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg></div>`,
    blog:          `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>`,
    gitMerge:      `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" stroke="none"></path><circle cx="6" cy="18" r="2"></circle><circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="18" r="2"></circle><line x1="6" x2="6" y1="8" y2="16"></line><path d="M11 6h5a2 2 0 0 1 2 2v8"></path><polyline points="14 9 11 6 14 3"></polyline></svg></div>`,
    sparkles:      `<div style="padding-left: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-stars" viewBox="0 0 16 16"><path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828l.645-1.937zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.734 1.734 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.734 1.734 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.734 1.734 0 0 0 3.407 2.31l.387-1.162zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L10.863.1z"></path></svg></div>`,
    plus:          `<div style="padding-left: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"></path></svg></div>`,
    sun:           `<div class="sidenav-link__icon"><svg fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd"></path></svg></div>`,
    moon:          `<div class="sidenav-link__icon"><svg fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg></div>`,

    // Lang Icons
    ...Object.fromEntries(Object.keys(langNames).map(lang => [lang, `<div class="sidenav-link__icon icon-container" style="background:none;width:24px;"><i class="icon-moon-${lang}"></i></div>`])),

    // Lang-leaderboard Icons
    ...Object.fromEntries(Object.keys(langNames).map(lang => [lang+"-leaderboard", `${leaderboardIcon}<i class="icon-moon-${lang}" style="font-size: 16px;position: absolute;top: -2px;left: -3px"></i>`])),

    // Custom
    baby:          `<div class="sidenav-link__icon"><svg class="ml-1.5 w-6 h-6 inline-block" fill="currentColor" stroke="currentColor" viewBox="0 0 489 489"><path d="M76.888,302.386H25.938c0,0-25.938-0.039-25.938,39.483c1.234,25.526,21.148,29.605,24.7,29.605s103.744,0,103.744,0 s25.986,0.033,27.133-31.15c0.043-1.19,0.139-0.033,0.153-1.229c0.052-4.604,0-28.4,0-28.4c0.062-3.386,2.648-7.229,6.134-7.229 h81.233c1.195,0,2.229,0.966,2.338,2.151l19.188,43.399c7.158,17.748,21.076,30.772,44.328,22.405 c22.012-7.923,23.15-25.364,19.264-37.614l-47.713-144.633c-7.172-17.131-25.26-27.124-47.898-27.124h-48.578h-63.299 c-60.559,0-111.36,70.552-42.577,138.374C78.637,301.511,78.078,302.386,76.888,302.386z"/><circle cx="358.346" cy="134.649" r="75.161"/></svg></div>`,
    broken:        `<div class="sidenav-link__icon"><svg fill="currentColor" viewBox="-20 -20 185 185"><path d="m 59.760075,133.96793 c 1.209902,-0.19634 2.23629,-0.67762 3.089406,-1.44863 0.39121,-0.35355 1.74317,-2.01158 3.00437,-3.6845 5.13937,-6.81714 14.28065,-19.09206 14.2448,-19.12791 -0.0211,-0.0211 -1.21474,0.20147 -2.65252,0.49461 l -2.61414,0.53299 0.069,-2.74853 c 0.0499,-1.98725 0.0256,-2.71575 -0.0876,-2.63017 -0.0861,0.0651 -0.95681,0.71617 -1.93483,1.44683 -0.97801,0.73066 -2.30633,1.73889 -2.95182,2.24051 -0.64548,0.50161 -1.17375,0.89071 -1.17392,0.86466 -10e-4,-0.19453 -1.27827,-7.27701 -1.31952,-7.31827 -0.0291,-0.0291 -0.66563,0.85883 -1.41459,1.97308 -0.74896,1.11426 -1.95414,2.85812 -2.67817,3.87525 -7.581555,10.65074 -10.706381,15.19447 -11.26593,16.38152 -0.635498,1.34816 -0.705271,2.70551 -0.20904,4.06663 1.382476,3.79199 4.293986,5.66622 7.894514,5.08193 z m 20.528276,-31.4662 c -0.64703,-4.989742 -2.07383,-14.624092 -2.92355,-19.741152 -0.26635,-1.60394 -0.55941,-3.53238 -0.65125,-4.28543 l -0.16697,-1.36918 1.75526,-3.68092 c 0.9654,-2.02451 2.06136,-4.25706 2.43547,-4.96123 1.3748,-2.58775 4.44943,-9.0035 7.36276,-15.36369 2.46416,-5.37958 4.11552,-8.81661 4.25902,-8.86445 0.20249,-0.0675 1.5709,0.60455 7.42431,3.64616 7.225529,3.7546 11.358149,5.81678 12.002259,5.98912 1.50373,0.40235 3.49406,0.0174 4.98923,-0.96508 1.00038,-0.65731 1.59613,-1.26918 5.69752,-5.85164 7.50535,-8.38569 7.47215,-8.34501 7.88016,-9.65285 0.33791,-1.08312 0.35475,-1.81557 0.0671,-2.91981 -0.43451,-1.66821 -1.61439,-3.03278 -3.30725,-3.82497 -1.31501,-0.61536 -2.97497,-0.70889 -4.2308,-0.23837 -0.99849,0.37411 -1.20668,0.57419 -6.6075,6.35015 l -3.61738,3.86865 -1.57361,-0.8477 c -5.50949,-2.96798 -49.584696,-24.986786 -51.22106,-25.588694 -0.469446,-0.172678 -2.393761,-1.014128 -4.276255,-1.869889 -4.692072,-2.132967 -5.775231,-2.3325796 -7.697751,-1.41861 -1.499332,0.712786 -2.68813,2.318511 -3.039768,4.105854 -0.426024,2.165437 0.1616,4.051697 1.760241,5.650338 0.894179,0.894179 1.04373,0.974294 11.56079,6.193165 5.860194,2.907996 10.987444,5.437866 11.393904,5.621926 l 0.73902,0.33466 -0.36312,0.89436 c -0.89112,2.19485 -9.161794,19.53232 -9.845206,20.6381 -0.161548,0.26139 -0.515066,1.04721 -0.785596,1.74627 -0.270531,0.69905 -0.74299,1.78313 -1.04991,2.40906 -0.306921,0.62592 -1.028192,2.1706 -1.602825,3.43261 l -1.044788,2.29456 -1.075136,-0.46137 c -1.098527,-0.47141 -2.600315,-1.17441 -5.627338,-2.6342 -4.736858,-2.28437 -29.041149,-13.04288 -29.171153,-12.91288 -0.0246,0.0246 0.269963,0.58754 0.654592,1.25096 0.384629,0.66342 0.80421,1.51733 0.932402,1.89759 0.253431,0.75174 0.206356,1.6608 -0.105459,2.03651 -0.422262,0.5088 -2.769012,1.23439 -4.673947,1.44514 l -1.066674,0.11801 2.386871,2.39075 c 1.312779,1.31492 2.369033,2.40336 2.34723,2.41876 -0.0218,0.0154 -1.36796,0.49455 -2.991461,1.06476 -1.6235,0.57021 -2.951819,1.06185 -2.951819,1.09254 0,0.12078 20.506654,10.15368 25.108243,12.28423 7.78752,3.60566 15.416254,6.74586 22.476501,9.25197 1.920323,0.68164 2.062713,0.76335 2.062713,1.18366 0,0.28067 2.15901,12.82743 2.38799,13.87746 l 0.10551,0.4838 1.2576,-1.44403 c 0.69168,-0.79422 1.29893,-1.44142 1.34943,-1.43823 0.11007,0.007 1.02928,1.4711 1.93485,3.08186 l 0.6562,1.167212 1.38213,-0.891912 c 0.76017,-0.49055 1.70221,-1.09612 2.09342,-1.34572 l 0.71128,-0.45381 0.28451,0.33787 c 0.15648,0.18582 1.18073,1.5853 2.2761,3.109952 1.09538,1.52464 2.01688,2.75063 2.04778,2.72442 0.0309,-0.0262 -0.0208,-0.64119 -0.11485,-1.36662 z M 11.819897,58.704328 c 1.073133,-0.16469 1.974179,-0.32109 2.002326,-0.34754 0.02815,-0.0265 -0.503833,-0.92376 -1.182177,-1.99401 -0.678345,-1.07025 -1.204803,-2.02031 -1.169908,-2.11124 0.05634,-0.14683 2.532957,-1.85621 3.761396,-2.59615 l 0.464693,-0.2799 -1.175975,-0.65254 c -2.555656,-1.41809 -9.5902153,-5.22327 -9.8171693,-5.31036 -0.208283,-0.0799 -0.195234,0.0201 0.09647,0.73905 0.185534,0.45731 0.443316,1.19679 0.572848,1.64328 0.377744,1.30208 0.02052,1.60308 -1.665989,1.40373 -0.449886,-0.0532 -0.817974,-0.0417 -0.817974,0.0256 0,0.0672 0.224053,0.66349 0.497897,1.32503 0.273843,0.66153 0.497897,1.2743 0.497897,1.36171 0,0.10653 -0.222725,0.13123 -0.675718,0.0749 -0.371644,-0.0462 -1.067415,-0.12578 -1.546156,-0.17685 l -0.87043895,-0.0929 -0.449936,1.17826 c -0.292593,0.76623 -0.401381,1.22682 -0.311088,1.31711 0.299357,0.29936 9.20750395,4.782 9.51290095,4.78696 0.178723,0.003 1.2029693,-0.12948 2.2761013,-0.29417 z M 101.18756,26.96961 c 5.29955,-0.886757 9.77929,-5.176653 10.89091,-10.429357 0.49238,-2.326647 0.23584,-5.292494 -0.6583,-7.6107136 -1.13941,-2.954115 -3.59223,-5.807423 -6.28429,-7.310356 -2.00404,-1.11882504 -4.7828,-1.75056604 -7.020759,-1.59614204 -5.72237,0.394858 -10.6668,4.43697904 -12.29846,10.05411764 -0.43905,1.511464 -0.5444,4.622285 -0.21212,6.263645 0.80621,3.982397 3.41002,7.483461 6.90539,9.284936 2.82516,1.456057 5.51637,1.872834 8.677629,1.34387 z" /></svg></div>`,
}





