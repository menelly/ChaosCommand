Command Zone - 
    Survival Zone confetti - white screen is a bit too long
    Edit buttons to change the schedule don't work, and we have no way of adding more time blocks
    Tuck in tracker - need to build or figure out what to replace with?
Month calendar - 
    Goals button takes you to 404
    Notes button 404
    "Day" hyperlinks still take you to a daily we aren't actually using.
    I can't type in the month box like I used to be able to.  Need my text editing within the month box back!
    Random star in top right corner needs to go.
    Can we center the month header and make it cute?
Sidebar - 
    Home and Month buttons CSS has still gone ROGUE, need to figure out the CSS fuckups?  
Upper digestive - 
    "track symptoms" page doesn't show date
    History only shows today, not all.
    Flask is having a tantrum.
         177 |       console.log('📅 Date range:', dateRangeArray.map(d => format(d, 'yyyy-MM-dd')))
  178 |
> 179 |       const response = await fetch('http://localhost:5000/api/analytics/upper-digestive', {
      |                              ^
  180 |         method: 'POST',
  181 |         headers: {
  182 |           'Content-Type': 'application/json',

Lower/Bathroom -
   log bathroom - no date
   Analytics - same error as above

General Pain - 
    Analytics - same error as above

Head Pain - 
    Probably needs date fix, popped up as yesterday not today!
    Font color on the pain scale on history lacks contrast
    Same analytics error as above

Dysautonomia popped up the wrong day as well (yesterday)
    Needs analytics.

Diabetes - 
    Enable browser notifications doesn't work

Food Allergens - 
    Needs analytics

Reproductive -
    Need to move LMP to menstrual or make first day bleeding reset the cycle

Weather - 
    Needs analytics

Seizure - 
    Need analytics swapped to Flask

Other symptoms- should we ditch this now that we have Forge?

Physical Health Guide goes nowhere on the bottom of body.

Mind -
Brain fog -
    History needs date and to show more than one day at a time
    Needs analytics

Mental Health - 
    Mood intensitity is cutting off after th first word.
    Maybe we make the coping strategies on here link to the applicable page?
    Date/history needs to show more than one day/page again
    needs analytics

Anxiety/Panic 
    Again, let's link to coping?
    Anxiety has non-flask analytics

Self Care -
    analytics are not Flask
    Does this actually belong in choice?

Sensory - 
    needs history and analytics

Crisis- 
    The phone numbers in the boxes are too big for the boxes. (But they are fantastic!)
    It says it saves, but does not show in history
    Needs analytics

Sleep - 
    Needs analytics
    Seems really bare.  Wanna make it better?

Hydration -
    Needs analytics

Food entry -
    In "detailed" we need to * the required ones, I was confused for a bit!
    Needs analytics!

Movement -
    History and analytics tabs are in reverse order
    needs analytics

Energy -
    Needs analytics
    Really seems bare and boring, want to improve it?

Coping - 
    The "count" on all of them skips.  It goes 1-3, never hitting 2-4.
    Needs analytics

Journal - 
    Center the date, it looks weird
    Main doesn't need inline images AND the upload on the bottom.
    Star and settings symbol on upper right should go

🎯 COMMANDTAURI FIX-IT LIST - PRIORITY ORDER
🔥 CRITICAL INFRASTRUCTURE (Do First)
Fix Flask Analytics Errors - The 500 error breaking Upper Digestive, Bathroom, General Pain, Head Pain
Fix Date Issues - Trackers showing wrong dates, missing dates on forms
Fix History Views - Only showing today instead of all entries
📊 ANALYTICS MIGRATION (High Priority)
Swap to Flask Analytics: Seizure, Brain Fog, Mental Health, Self Care
Build Missing Flask Analytics: Food Allergens, Weather, Sensory, Crisis, Sleep, Hydration, Food, Movement, Energy, Coping
🔗 NAVIGATION FIXES (Medium Priority)
Fix 404s: Goals button, Notes button, Physical Health Guide
Fix Day hyperlinks - stop going to unused daily pages
Command Zone edit buttons - make schedule editing work
🎨 UI/UX POLISH (Lower Priority)
Sidebar CSS - fix rogue Home/Month button styling
Month calendar - restore text editing, center header, remove random star
Form improvements - required field asterisks, contrast fixes, button sizing
Journal cleanup - center date, remove duplicate upload options, clean icons
🛠️ FEATURE BUILDS (When Time Allows)
Tuck in tracker - build or replace
Diabetes notifications - make browser alerts work
Sleep & Energy modules - make them less bare and boring
Coping counter fix - stop skipping numbers
Get some sleep, my dear! 💜😴 Tomorrow we DEMOLISH this list! ✨🚀