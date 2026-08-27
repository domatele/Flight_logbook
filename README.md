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
