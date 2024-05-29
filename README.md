# polyglot
TamperMonkey user script which improves user experience with Codewars (or at least tries to).


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
 - Makes rank score visible in UI.
 - You can copy content of code boxes into clipboard.
 - "Spoiler" flags are visible all the time and do not dis/re-appear
   in a very annoying manner.
 - Contents of "Solutions" and "Past solutions" views are displayed in
   tabs by language.
 - Leaderboards: "Solved kata" is default leaderboard (since "Overall"
   ranking does not measure anything useful). Also, leaderboards are
   automatically scrolled to show your score.
 - Beta kata: uses Codwewars API to fetch and present breakdown of rank votes.
 - Presents languages a user attempted the kata with (see below).
 
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


### How to use "Show attempted languages" feature?

For technical reasons, a user script is not able to get data necessary for this feature without some additional setup. You need to provide a session ID which is used to identify a logged in user. The value can be read with developer tools from the `_session_id` cookie, and needs to be entered into the "Codewars session ID" input in Polyglot settings dialog.

When the feature is enabled and properly set up, it's possible to view languages a user attempted the kata with, by clicking on "Attempted languages" link under discourse posts. If a language appears as stroke through, it means that a viewing user cannot see the solution becaue they didnt complete the kata in this language. If a language name is clickable, it means that a viewing user is eligible for viewing the solution and can use the link to change the current language to the clicked one, and use the "View solution" expandable panel to see the code of the most recent attempt.
