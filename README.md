EASA Flight Logbook V36

Google Drive backup/session persistence test.
- OAuth client configured for the GitHub Pages origin.
- Scope: https://www.googleapis.com/auth/drive.file
- First backup creates one JSON backup file.
- Later backups update the same Drive file.
- After reload, the app attempts silent Google authorization so the user does not normally need to sign in again.

## Print layout fix (this pass)

Fixed two related bugs in the printed/PDF logbook output:

1. **"Every second page blank, text cut off"** — root cause: printed pages
   were sized to exactly 198mm (the theoretical A4-landscape printable
   height) with `overflow:hidden`. Real content (especially the wrapped
   table sub-header row) actually rendered taller than assumed, so it
   silently overflowed onto a near-blank continuation page for every
   real page. The remarks column was also allowed to wrap across
   unlimited lines, which could push any row — and the whole table —
   past the page boundary depending on remark length.

   Fixed by: removing the hard-clipping fixed height, correcting the
   structural row-height assumptions (the wrapped sub-header row was
   underestimated by ~9mm), building in a safety margin against
   real-world print-engine/margin differences, and capping the remarks
   column to a single line with ellipsis so row heights stay predictable
   (full remarks text is unaffected everywhere else — the app, JSON
   backup, and CSV export).

2. **"Should take up the whole page regardless of flights/page, and stay
   readable"** — the "Auto-scale" checkbox existed in the UI but had no
   effect. It's now wired up: when checked, each page's real flight rows
   stretch to fill the available space (no dead blank space, no forced
   blank filler rows). When unchecked, pages keep a fixed ruled grid
   with blank rows (useful if you want space for handwritten entries).
   Either way, row height is never allowed to shrink below a readable
   minimum (which scales with the chosen font size) — if the selected
   "flights per page" would make text too small to read, the app now
   automatically prints fewer flights per page instead, with a small
   on-screen note explaining why.

Verified by generating actual multi-page PDFs (not just the on-screen
preview) across several scenarios: default settings, the maximum
50-flights-per-page setting, a 2-flight dataset, and Auto-scale off —
no phantom pages or cut-off text in any of them.

Also fixed the same SIC/DUAL/INSTR-shows-0-for-older-records print bug
that was fixed in the other EASA Logbook build (only the PIC column had
a fallback for legacy flight records missing the newer per-role time
fields; SIC/DUAL/INSTR now fall back consistently too).

## Print layout — round 2 fixes

Follow-up pass addressing feedback on the round 1 print fix:

- **Cut-off text at page edges** — bumped @page margin 6mm → 7mm for
  extra breathing room, and added an in-app tip to disable "Headers and
  footers" in the browser's print dialog (that setting adds the
  browser's own URL/date/page-number strip on top of the app's margins,
  which is a browser-controlled setting this app's CSS cannot override).
- **Time values now center-aligned** in every numeric/time column;
  Aircraft Type, PIC/Instructor name, and Remarks stay left-aligned.
- **Restored the "fill the last page with blank ruled rows" behaviour**
  that was accidentally dropped in round 1 — every printed page always
  shows a complete grid (real flights, then blank rows) rather than
  leaving a partially-filled page looking empty.
- **Fixed Day/Night landing column headers** — a first attempt used
  rotated vertical text, which actually clipped "NIGHT" mid-word (worse
  than the original issue). Reverted to normal horizontal text with
  wider columns so both read in full, consistently.
- **Fixed mid-word header wrapping** (e.g. "REGIS-TRATI-ON") by
  reallocating width from Remarks and Simulator Session Time — session
  time is always well under 10 hours, so it never needed as much room —
  into Aircraft Type/Registration, and shortening "Remarks &
  Endorsements" to "Remarks".
- **Fixed landings not accumulating across pages** — BROUGHT FORWARD and
  ACCUMULATED TOTAL never actually tracked landings (a real bug, not
  just cosmetic); `printTimeBuckets()` now tracks ldgDay/ldgNight so
  these carry forward correctly across every page.
- **Added a date-format hint** ("DD/MM/YY") under the Date column header.
- **Auto-scale checkbox clarified**: ON (default) automatically reduces
  flights-per-page if the selected count would print unreadably small;
  OFF uses the exact selected count regardless. Either way, every page
  always fills completely via the ruled-row grid.

Verified via generated PDFs (not just the on-screen preview): default
settings, forced 50-flights-per-page with Auto-scale on and off, and
confirmed landings/hours totals accumulate correctly across a 3-page,
45-flight test set (16+16+13 flights → 45 landings, matching exactly).

## Round 3: browser header/footer + iOS print + name truncation

- **Browser-added header/footer strip** (URL top-left, page number
  top-right, title/date bottom) is generated by the browser's print
  dialog itself ("Headers and footers" setting) — there's no CSS or JS
  way for a web page to suppress it. Since a passive text tip wasn't
  enough, the Print button now shows a blocking "Before you print"
  reminder with exact steps for Chrome/Edge and Safari before opening
  the print dialog, with a "don't show again on this device" option.
- **"Print / Save PDF" doing nothing when opened from the iOS Home
  Screen icon** — this is a real, documented iOS limitation:
  `window.print()` is a silent no-op in standalone/installed web apps on
  iOS (there's no browser chrome to own the print sheet). The app now
  detects this (`navigator.standalone`) and shows a clear explanation
  plus a copyable link, instead of the button silently doing nothing —
  printing only works by opening the same address in an actual Safari
  tab.
- **Long PIC/Instructor names getting cut off** — the column was using
  `text-overflow:clip`, so overflowing names were silently chopped with
  no indication. Changed to `ellipsis` everywhere (not just this column)
  so truncation is at least visible, and widened the Name column
  (9.4%, up from 7.2%) by trimming a little slack from Registration,
  SE/ME, and the simulator Date/Type columns.

## Round 4: sub-pixel clipping fix + simulator sessions merged into print

- **Missing letters/numbers in printed cells** (e.g. airport codes cut to
  "EY…", dates cut short) — root cause was a genuine sub-pixel rendering
  edge case: several columns were sized so tightly that the CSS layout
  technically didn't overflow (`scrollWidth === clientWidth`), but actual
  text rendering still clipped a character depending on font hinting —
  inconsistent from row to row even with identical-length text. Fixed by
  pinning the print table to an explicit Arial/Helvetica font (instead of
  the unpredictable system-font fallback chain) and re-measuring real
  intrinsic text widths for the tightest columns (Date, departure/arrival
  codes) to give them genuine safety margin rather than an exact fit.

- **FSTD/simulator sessions merged into the printed logbook** — these
  were tracked in a completely separate list from real flights and never
  appeared in the printed PDF at all. Simulator sessions are now merged
  with flights and sorted chronologically, so a printed page reads as
  one continuous timeline regardless of which tab an entry was logged
  from. Each session prints as its own row: blank route/aircraft columns
  (it isn't a flight), populated Simulator Type/Time columns, and the
  instructor's name. The Simulator Date sub-column is no longer repeated
  (redundant with the row's main Date column) — that space was given to
  the Type column instead, since simulator names are often the longest
  content in that row.

  Verified with a 50-entry combined dataset (45 flights + 5 sessions):
  entries interleave in the correct date order, sessions correctly
  contribute to the Simulator column totals (page/brought-forward/
  accumulated), pagination remains stable (4 correct physical pages, no
  phantom pages), and printing is no longer blocked if a logbook has
  only simulator sessions and no real flights yet.

## Round 5: black text, narrower Date/Type, simplified Simulator columns

- **All printed text was gray instead of black** — a real bug, not a
  display artifact. The print stylesheet set the page background to
  white but never overrode the body's text colour, so it was silently
  inheriting the app's on-screen dark-theme colour (`#F3F5FC`, a
  near-white meant for light text on a dark background). Printed/PDF'd
  onto white paper, that renders as washed-out grey. Fixed by explicitly
  forcing black text throughout the print output.
- **Date and Aircraft Type columns were wider than needed** — trimmed
  both down. Date still keeps a small safety margin (learned from the
  clipping bug fixed last round) so "13/07/26" continues to display in
  full rather than getting cut short again.
- **Simulator columns simplified** — since a session's date is already
  shown in the row's main Date column, and its registration/type are
  now shown in the row's main Aircraft Reg/Type columns (see below),
  the separate "Date" and "Type" sub-columns under Simulator were
  redundant and have been removed. The Simulator group is now just a
  single "(FSTD)" time column, and that reclaimed width was put back
  into Registration, Remarks, and the Pilot Function Time columns.
- **Simulator sessions now show their simulator's registration/type in
  the main Aircraft columns** (matching how a real flight shows its
  aircraft's registration/type), instead of those columns sitting
  blank. `simulatorLibrary` entries already had a `reg` field for this
  that wasn't being used anywhere.

Re-verified the full pipeline after this pass: a 50-entry combined
flights+sessions dataset still paginates correctly (4 pages, no phantom
pages), row cell counts are consistent across every row (22, down from
24 after removing the redundant Simulator sub-columns), and accumulated
totals carry forward correctly across pages (checked: 1:00 + 1:30 + 1:10
FSTD minutes across three pages sums to the 3:40 shown in the
accumulated total).

## Round 6: Visual redesign — light "liquid glass" theme

Purely a visual pass: no HTML structure, layout, spacing, element sizes,
or JS/business logic were touched, and the printed/PDF logbook page
(`@media print`) was intentionally left exactly as it was — this only
restyles the on-screen app.

- Replaced the dark navy theme with a light, Apple-style theme: soft
  light-gray/blue-tinted background, translucent frosted-glass surfaces
  (`backdrop-filter: blur + saturate`) on the header, bottom nav, "More"
  menu, dropdown suggestion lists, and modals, and near-white glass
  cards for content sections.
- Switched the single accent colour to Apple system blue (`#0A84FF`)
  everywhere — segmented control, role chips (PIC/SIC/DUAL/etc.),
  toggles, focus rings, active tab — and moved the "primary" action
  buttons (Add flight, Save, etc.) from the old gold/amber fill to the
  same blue, matching a native iOS look.
- Softer, shallower shadows; slightly larger corner radii on cards,
  inputs and buttons for a more "continuous curve" Apple feel.
- Updated `<meta name="theme-color">` and `manifest.json`'s
  `background_color`/`theme_color` to match the new light palette (the
  browser/PWA chrome tint).
- Styled the three unclassed Google Drive backup buttons (Connect /
  Backup now / Restore backup), which had no button styling at all
  before and were rendering as bare native browser buttons.

### Known issues found during this pass (not fixed — flagged for a decision)

1. **PWA wiring is disconnected.** `index.html` never links
   `manifest.json`, never sets an `apple-touch-icon`, and never
   registers `sw.js`. "Add to Home Screen" won't use the custom icon,
   and the offline caching implied by the Settings-page copy
   ("remains available offline") isn't actually active.
2. `sw.js`'s cache list (`app.js`, `style.css`) is stale — it still
   reflects the old multi-file build, not the current single
   `index.html`.
3. `style.css` and `app.js` are unused leftovers from an earlier
   prototype (different element IDs entirely) — dead weight in the zip.
4. The "Flights/page" dropdown on the Flights tab has a duplicate
   `24` option.
5. Nine different places in the code set `document.title`/`.sub` text
   to old version strings (V32, V36, V44, V66…) that overwrite each
   other; it happens to resolve to the correct "V68" today only because
   of script order, plus two static leftovers (`v36VersionBadge` corner
   badge and a Settings-page note) still hard-code "V66".
6. `selectCrewProfile()` is dead code — it targets a `picProfile`
   element that no longer exists anywhere in the HTML (superseded by
   the `crewSearch` autocomplete).
7. The "Captain signature" modal (PICUS flights) tries to show the
   selected captain's name via a `picusCaptainDisplay` element, but
   that element was dropped from the modal's markup at some point, so
   the name never actually displays there before signing.

## Round 7: floating glass tab bar, 3-tab nav, icon refresh

- Cut the bottom navigation down to 3 tabs — **New Flight**, **Flights**,
  **More** — and moved Aircraft and Crew into the More menu alongside
  Simulators, Airports, and Settings & Signature (now 5 items there).
  `aircraftTab`/`crewTab` are the same IDs, just re-homed as more-menu
  rows instead of dedicated bottom tabs; the active-tab logic
  (`window.showTab` override) was updated so the Aircraft/Crew pages
  now correctly light up the More tab, the same way Simulators/
  Airports/Settings already did.
- Restyled the nav itself as a compact floating glass pill — detached
  from the screen edge with margin on all sides, fully rounded corners,
  stronger blur/saturation, and a soft outer shadow — instead of the
  old full-width bar docked flush to the bottom. The "More" popup menu
  now opens centered above that pill instead of pinned to the screen's
  right edge, to stay visually anchored to it.
- New icons: **New Flight** now uses a paper-airplane/send glyph
  instead of reusing the same aircraft-silhouette icon as the Aircraft
  page; **Aircraft** (now in the More menu) got its own distinct plane
  icon so the two no longer look identical; **More** now renders as
  three solid dots instead of three faint outlined rings (the old
  icon's stroke-only style left them looking like hollow circles).
  Crew/Simulators/Airports/Settings icons were left as-is. Happy to do
  a pass on the rest of the field icons throughout the forms too, if
  wanted — this round focused on navigation only, since that's what
  was raised.

## Round 8: fixing dark mode and print customization (added elsewhere, not working correctly)

Between the last round and this one, dark mode, print customization
(layout/font/orientation/date-format/front-page/2-page-split), the PWA
manifest/service-worker/icon wiring, and several other unrelated tweaks
(nav restyle, flight-entry field order) were added outside this thread.
This round only touches dark mode and print customization, which is what
was reported as broken.

**Dark mode** — the existing implementation redefined CSS variables
(`--surface`, `--text`, etc.) that nothing in the stylesheet actually
reads, so large parts of the UI (the print-customization panel among
others) never changed color at all, while ~150 lines of `!important`
overrides tried to patch individual elements one at a time. More
seriously, none of it was scoped to screen-only, so if dark mode was on
while printing, the printed page could come out with a black background
and white (invisible) text. Rewrote it to redefine the app's actual
variables under a `@media screen` block — so it cannot affect
printing — with a short list of explicit overrides only for the
handful of surfaces that use a hardcoded color instead of a variable
(the floating nav tabs, header, modals, one translucent note box). Also:
gave "Appearance" its own Settings card (it was unlabeled, stacked above
"Data import" with no heading of its own), added an early inline script
so dark mode applies before first paint instead of flashing light mode
on load, and the browser/PWA chrome color (`theme-color`) now switches
with it.

**Print customization** — the root cause of "most of it doesn't work":
`renderPrintPreview()` fully rebuilds `#printArea` from scratch on every
call (flights/page change, date-range change, font-size change, adding
or editing any flight — i.e. constantly), and the customization settings
(front page, date format, SIM/INSCTR renaming, 2-page split) were only
applied as a one-off DOM post-processing pass with nothing telling it to
re-run afterward. So the moment you touched almost anything, those
settings silently reverted to default even though the controls still
showed your choices. Fixed by wrapping `renderPrintPreview` so the
customization pass always re-applies after every render.

Also fixed:
- The front page's "Pilot name" line could never work — it read
  `window.settings.pilotName`, but `settings` is declared with `let`,
  which (unlike `var`) never becomes a `window` property. Reads the
  variable directly now.
- The "Two pages — standard EASA" layout was cutting the table at the
  wrong column (after column 16 instead of 14) and, more fundamentally,
  was trying to hide columns by position on rows that use `colspan`
  (the header row and the three totals rows), which doesn't work —
  `nth-child` counts actual cells, not visual columns, so those rows
  never actually got hidden on either half. Replaced the whole
  clone-and-hide approach with two properly-built tables matching the
  reference photo's real column groups: page **A** carries Date /
  Departure / Arrival / Aircraft / Single-Pilot time / Multi-Pilot time
  / Total time / Name PIC / Landings; page **B** carries Operational
  Condition time / Pilot Function time / Simulator / Remarks (with the
  signature block, matching the reference).
- The front page's fixed A4-landscape dimensions never switched for
  Vertical/portrait orientation, so it could overflow the printed page
  in that mode; it now resizes with the rest of the layout.
- A leftover global column-width rule kept `!important`-forcing every
  `.print-table`'s column widths to a fixed 22-column layout — with the
  2-page split now building genuinely different tables (14 and 8
  columns), that rule would have corrupted both of them. Folded its
  (better) proportions into the one-page table's own column widths and
  removed the global override.
- The print-customization panel was crammed inside the same horizontal
  toolbar strip as the small "Flights/page, Font, dates, buttons" row,
  which squeezed it into a cramped, narrow space when expanded; it's
  now a full-width block below that row.
- Removed the leftover duplicate `24` option in "Flights/page" (added a
  genuine `22` option instead of the accidental repeat).
- The new "Font" control (typeface: Arial/Helvetica/Times/Courier) had
  the same label as the pre-existing "Font" control (point size), which
  would read as one broken control rather than two working ones;
  relabeled to "Typeface".
- Added an "Open in Safari" button next to "Copy link" on the
  iOS-Home-Screen print notice — a same-origin `window.open()` from a
  standalone iOS web app hands off to a real Safari tab, which is the
  one-tap version of what "Copy link" already asked the user to do
  manually. The underlying diagnosis (iOS blocks `window.print()`
  entirely for Home-Screen-installed web apps; there's no in-app
  workaround, only opening the same page in Safari) was already
  correct.
- The service worker's cached file list still referenced the unused
  `style.css`/`app.js` and was missing several icons actually in use,
  including the front page's logo image — so that image could fail to
  load if the print preview was opened while offline. Updated the list
  and bumped the cache version so the fixes above actually reach the
  installed app instead of serving a stale cached copy.
