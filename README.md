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

## Round 8 (V150): QR backup in the printed logbook

Goal: if the app, the phone, the JSON backups and Google Drive are all gone,
the **printed logbook alone** is enough to rebuild the digital logbook,
without retyping anything.

**What gets printed** (Print customization → *QR backup*):

- **One QR code per logbook page.** Each one is self-contained: that page's
  entries, its printed PAGE TOTAL and its BROUGHT FORWARD totals. Losing a
  sheet loses only that sheet's code, and the brought-forward chain shows
  exactly which page is missing. A page is split into two codes only if it
  would otherwise need a code denser than QR version 27 (it doesn't with
  24 entries per page; a heavy 30-entry page occasionally does).
- **One INDEX code** (plain text, readable by any phone camera/QR app):
  pilot, print date, entry/page counts and **totals per year**, plus START
  (brought forward before page 1) and END (final accumulated) totals.
- **A "How to recover" sheet** next to the index, which documents the format
  on paper, so recovery works even without this README.
- Placement: **At end of book** (index sheet + 8 codes per landscape sheet,
  9 per portrait sheet), **After each page** (one sheet after every logbook
  page, so in double-sided printing each page carries its own backup on the
  back; in the two-page layout it follows the right-hand page), or **Off**.
- QR sheets are always black on white (also with *Dark print*) and use error
  correction Q (25%) where that fits within version 25, otherwise M (15%).

Monthly codes were considered and left out: months don't line up with
printed pages, so they would add codes without adding anything that can be
recovered or checked.

**Restoring**

- *In the app:* Flights tab → **Restore from QR**. Paste the scanned text of
  any number of codes (one per line or back to back). The dialog shows pages
  found/missing and checks: every page against its printed totals, the
  brought-forward chain, page 1 vs the index, every year vs the index, and
  final totals vs the index. Entries already in the app are skipped, and the
  aircraft, crew and simulator profiles are recreated. In browsers with the
  BarcodeDetector API (e.g. Chrome on Mac/Android) there's also *Read QR from
  photos…*. Safari/iOS doesn't offer that API: scan with the camera or any QR
  app and paste the text.
- *Without the app:* `logbook_qr_recover.py` (Logbook folder) reads photos,
  scanned PDFs or pasted text and writes `logbook_recovered.csv`,
  `logbook_recovered_backup.json` (load with *Restore JSON*) and a check
  report. Needs `pip3 install opencv-python` (+ `pymupdf` for PDFs).
- *By hand:* CyberChef recipe "From Base45" → "Zlib Inflate" on the data
  part of a page code gives the CSV.

**Format `EASALOG1`** (stable, documented, open standards only)

    page code  = EASALOG1 ID<yymmdd-hhmm> PAGE <n>/<N> PART <p>/<P> N<len> <data>
    <data>     = <len> chars, Base45 (RFC 9285) of zlib (RFC 1950) compressed UTF-8 CSV
    index code = "EASALOG1 INDEX ID<id>" + plain-text lines (byte mode)

The whole page code uses only QR alphanumeric characters, so it is encoded in
the denser alphanumeric mode. Decompressed CSV:

    #EASALOG1,1
    #book,<id>,<pilot>
    #page,<n>,<N>,<part>,<parts>
    #totals,SE,ME,MP,TOTAL,LDG_D,LDG_N,NIGHT,IFR,PIC,COP,DUAL,INSTR,SIM
    #brought_forward,<13 values>
    #this_page,<13 values>
    kind,date,dep,out,arr,in,type,reg,eng,op,total,night,ifr,pic,cop,dual,instr,picus,sim,ldgD,ldgN,role,flags,name,crew,captain,remarks
    F,2026-08-21,LSZH,18:39,EDDH,20:03,A320,LY-CAP,ME,MP,1:24,0:57,1:24,,1:24,,,,,,1,Co-pilot,IMS,DIMOS ASSOS,,,

kind F = flight, S = simulator session (type/reg = simulator profile, sim =
session time, name = instructor). Times H:MM, blank = 0. `pic/cop/dual/instr`
are the times exactly as the printed page counts them (stored allocation, or
the role-based fallback for older records). flags: I IFR, F PF, M PM, P PIC,
S SIC, D dual, T instructor, U PICUS, X aircraft profile is a simulator.
Totals use the same rules as the printed page (`printTimeBuckets`).

Not in the codes: internal IDs, the signature images (PICUS/pilot), and
library-only fields (crew licence/operator, aircraft power). They're recreated
empty on restore.

**Verification done for this round** (headless Chromium + zbar/OpenCV):

- QR encoder: all 40 versions × 4 error-correction levels filled to capacity
  decode correctly (zbar 160/160); format/version BCH bits checked against
  the spec values.
- Compressor: 400+ fuzz cases round-trip through Node's zlib and the built-in
  inflater; Base45 matches the RFC 9285 test vectors.
- Real data (681 flights + 43 FSTD, 31 pages): every page's code totals equal
  the totals printed on that page (one-page layout, 24 and 30 per page, with
  and without a date window). PDF → 200 dpi raster → all 32 codes decode;
  restore into an empty app reproduces every flight with **zero field
  differences**, plus all simulator sessions and the aircraft/crew/sim
  libraries; all year/final checks pass.
- Missing page, corrupted code, codes pasted back to back, and re-importing
  over existing data (duplicates skipped) all behave correctly.
- Print variants: end/after-each × one/two-page × portrait × dark print ×
  front page produce the expected number of PDF pages (no blank or
  overflowing pages).

Replaces the V148/V149 "QR flight data" checkbox, which never worked: its
pasted QR library referenced Node's `module` object, so the whole script
crashed when the page loaded.

### Found during this round, not fixed (needs a decision)

- **Two-page layout misprints from the second spread on** (also in V149):
  the left page shows dates that belong to other flights, and its totals row
  sits under the wrong columns; on the right page the columns are shifted
  (dates appear under NIGHT). Page 1 is correct. The QR codes are built from
  the data, not the printed sheet, so they're correct either way.

## Round 9 (V150.1): Safari print fixes

Chrome output is unchanged: one-page, two-page, dark and portrait+front-page
PDFs were compared pixel by pixel against V149 with QR off, and every page is
identical.

- **Blank page between QR sheets in Safari:** each QR sheet had both a page
  break before and after it. Chrome merges two breaks in a row; Safari prints
  both, which adds a blank page. Each QR sheet now only breaks after itself
  (the logbook page before it already breaks after itself).
- **Tables spilling onto a second page in Safari:** several older print
  patches (V122/V127/V134/V139/V140) set the same explicit height on every
  table cell as on its row. Chrome counts a cell's padding and border inside
  that height; Safari adds them on top (0.265 mm padding + 0.265 mm border,
  top and bottom). Every row grew by ~0.4 mm, about 11 mm over 24 rows, so the
  ACCUMULATED TOTAL row moved to a new page. A final pass
  (`normalizeCellHeights` in the V150 script, run last before printing) keeps
  the height on the row and gives cells the row height minus 1.06 mm. Chrome
  already used the row height, so it renders the same.
- **Orientation:** Safari ignores the `@page` orientation the app requests
  (Chrome applies it), so in Safari you must pick Landscape in the print panel.
  This is a browser limitation with no workaround from the page; the
  "Before you print" reminder and the tip under the print buttons now say so.

## Round 10 (V150.2): Safari scaling — the real cause

Measured on two real Safari 26 PDFs (A4 landscape, Save as PDF): **every
fixed size prints ×1.066**. The 64 mm QR codes print 68 mm, 6.54 mm rows
print 6.97 mm, 4 mm rows print 4.2 mm, and widths look right only because
they're percentages. Safari ignores the `@page` size, lays the printout out
about 265 mm wide (matches US Letter width minus margins), and stretches it to
the A4 width. So every fixed-height page (198.5 mm logbook page, front page,
QR sheet) became ~211 mm on paper against ~202 mm printable: the last table
row moved to a new page, and a blank page followed every QR sheet.

Fix: in Safari only (user-agent check that excludes Chrome/Edge/Firefox/
Opera/Android), the print area gets `zoom: 0.938` (= 1/1.066), so it prints
at the intended size. Chrome output is still pixel-identical to V149.
`SAFARI_PRINT_ZOOM` in the V150 script is the single value to tune if a
different Safari/paper setup measures differently. The Round 9 cell-height
change stays: harmless, and correct for engines that add cell padding to
explicit heights.

## Round 11 (V151): 2nd and 3rd logbooks

- **Settings → Logbooks:** "Logbooks in use" 1 (standard) / 2 / 3, plus
  optional names for the 2nd and 3rd (e.g. "Gliders"; default "2nd logbook" /
  "3rd logbook"). It also shows how many flights/FSTD sessions each logbook
  holds. Lowering the count asks for confirmation if entries would be hidden;
  nothing is deleted.
- **New Flight page:** next to *Add flight* (which still adds to the 1st
  logbook) there are *Add to 2nd logbook* / *Add to 3rd logbook*. The FSTD
  form gets the same buttons. While editing, a chip shows which logbook the
  flight is in, plus *Move to …* buttons. *Save Changes* keeps the flight in
  its logbook.
- **Flights list:** still one list; entries in the 2nd/3rd logbook carry a
  small "2nd"/"3rd" badge.
- **Printing:** Print customization → *Logbook* (with entry counts) chooses
  which logbook to print. Only that logbook's flights and FSTD sessions are
  printed, brought-forward totals only count that logbook, and the page header
  says which logbook it is. The QR backup covers only the printed logbook. Its
  print ID gets "-L2"/"-L3", page codes carry `#logbook,<n>,<name>`, and the
  index has a LOGBOOK line. *Restore from QR* and `logbook_qr_recover.py`
  put entries back into the right logbook (and switch the extra logbooks on
  if needed). The recovery CSV has a `logbook` column.
- **Data:** an entry in the 2nd/3rd logbook has `logbook: 2|3`; no field means
  the 1st. JSON backups, Google Drive backup and Restore JSON carry it as is.
  The settings (`settings.logbooks`) travel with the backup.
- **Implementation:** the app has several layered add/edit/return-leg
  implementations that all end in `saveData()`, so the logbook is applied
  there (V151 script at the end of the file). For printing, `flights` /
  `simSessions` are temporarily narrowed to the chosen logbook around
  `printLogbook` / `proceedToPrint` / `renderPrintPreview`.
- **Verified** (Chromium, real data): adding to 2nd/1st, moving via Edit,
  editing keeps the logbook, FSTD to 3rd, values persisted, badges. Printing
  each logbook gives exactly its own entries (525/184/15 in the test split)
  with all QR checks passing. QR restore and the Python script restore into
  the right logbooks. With one logbook the Chrome print is still
  pixel-identical to V149.
- **Not included:** *Create Return* / *3rd Leg* save the current leg into the
  1st logbook. Use *Edit → Move to …*, or add the leg with the logbook button.
  The CSV export has no logbook column yet.

### Found, not fixed

- **Edit mode (pre-existing in V149):** the *Cancel Edit* button sits
  underneath the Refresh/Clear pair, so only its last letter shows.

## Round 12 (V152): dark mode completion

- **Root cause:** most text and surfaces use the theme variables from `:root`
  (`--ink` near-black, `--card`, `--input-bg`, `--chip-bg`, …), and dark mode
  never redefined them. Section titles, bold text in notes, crew/airport
  suggestions and the Drive status line stayed near-black on dark grey. Dark
  mode now defines all of them.
- **Selected role chips** (PIC/SIC/DUAL/PF/PM/IFR/…) and Settings default
  chips didn't look pressed: the dark theme's `!important` grey overrode the
  blue selected style. Selected chips are now solid blue again.
- **Flights page:** the period total tiles, the Print customization panel and
  the flight table header were still light. All are now dark.
- **Reset Auto** (Flight times): no longer light.
- **Verified:** an automated contrast audit over every page and state (New
  Flight with suggestions open and chips selected, FSTD, edit mode, Flights,
  Aircraft, Crew, Simulators, Airports, Settings, More menu, Restore from QR,
  print reminder, crew/aircraft dialogs) finds no unreadable text and no light
  panels in dark mode. Light mode screenshots are pixel-identical to V151.
  The rules are screen-only, so printing is unaffected.

## Round 13 (V153): Endorsements & remarks

- **More → Endorsements** (new tab): add an *Endorsement* or a *Remark* with an
  optional date, name, licence number, free text and a signature. Ticking
  **Signed** opens a signature pad (finger, Apple Pencil, mouse or trackpad).
  The signature is cropped to the ink, so it prints large in small boxes. Tap
  the signature preview to sign again; untick to remove it. Entries can be
  edited and deleted. With 2nd/3rd logbooks on, each entry belongs to one
  logbook. The list is chronological; undated entries sort by the day they were
  entered.
- **Storage:** `settings.endorsements` (array of `{id, kind, date, name,
  licence, text, signature (PNG data URL), logbook?, created, updated?}`), so
  Backup JSON, Restore JSON and Google Drive backup include them automatically.
  They're not in the QR codes yet (signatures don't fit in a QR code).
- **Printing:** Print customization → **Endorsement pages** plus
  *Endorsements per page*: 3 × 2, 4 × 2, 3 × 3 or 4 × 3 (columns × rows). The
  pages go at the end of the logbook, before the QR backup sheets (in "after
  each page" QR mode, after the last page's code and before the index sheet).
  Each box prints only the fields that were filled (type, date, text, name,
  licence no., signature). Long texts shrink automatically to fit their box
  (measured off-screen before printing). The remaining boxes on the last page
  print empty with Date / Name / Licence No. / Signature guides, for
  handwritten endorsements. When printing the 2nd/3rd logbook, only its own
  entries print, and the title names the logbook.
- **Verified** (Chromium): add/edit/delete, signature drawing, persistence,
  JSON backup content. All four grids, QR end / after-each / off, the one- and
  two-page layouts and the 2nd logbook give the right order and the right number
  of PDF pages, with no blank pages. The dark-mode contrast audit is still clean.
- Dark mode: *Delete* buttons keep their red text.

### V153.1: choosing the logbook for an endorsement

With 2nd/3rd logbooks switched on, **Save** asks "Save endorsement/remark to
which logbook?" and shows one button per logbook. When editing, the current
logbook is highlighted. *Cancel* saves nothing and keeps the form. With one
logbook, Save saves straight away. The logbook dropdown in the form was removed,
and the list shows each entry's logbook when several are in use.
