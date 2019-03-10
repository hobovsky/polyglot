# polyglot
TamperMonkey user script which improves user experience with CodeWars (or at least tries to).


WHAI IS IT?
-----------
 This piece of code is a Tampermonkey user script which provides some
 additional per-language filtering and display capabilities,
 effectively making it easier for you to obtain a POLYGLOT badge.


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
