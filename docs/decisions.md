# Foundation decisions

## Architecture

One private npm-workspace repository contains a client-side React SPA and a standalone Express 5 API. Mongoose is the sole MongoDB data layer. No models or business endpoints exist yet. This keeps local development straightforward without microservices or premature service/repository abstractions.

React Router runs in declarative mode with Home and wildcard NotFound routes. TanStack Query has one root QueryClientProvider but no queries. Tailwind 4 uses its official Vite plugin and CSS import; no legacy PostCSS setup. Layout uses logical inline properties and start-side borders to support future RTL work.

## Toolchain selection

Official npm metadata was queried on 2026-10-13 before installation. Direct versions are pinned and the root lockfile records transitive resolution. Chosen releases: React/React DOM 19.3.0, React Router 8.4.0, Vite 8.3.4, React Vite plugin 6.1.2, Tailwind/plugin 4.3.3, TanStack Query 5.104.2, Express 5.3.0, Mongoose 9.11.2, Zod 4.6.7, ESLint 10.12.0, typescript-eslint 8.71.2.

TypeScript's current latest is 7.0.2, but typescript-eslint requires TypeScript below 6.1.0; use compatible stable 6.0.3. Node 24.21.0 LTS is the supported runtime; ESLint 10 excludes the installed Node 23.8.0. Node types target 24 rather than current Node 26. Optional React Compiler peers are unnecessary for this foundation.

Sources: [Node release schedule](https://github.com/nodejs/Release), [Vite requirements](https://vite.dev/guide/), [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite), [React Router declarative routes](https://reactrouter.com/start/declarative/routing), [Express error handling](https://expressjs.com/en/5x/guide/error-handling/), and official package metadata (`npm view <package> version engines peerDependencies --json`).

## API lifecycle and configuration

Zod validates PORT, MONGODB_URI, CLIENT_ORIGIN, and BUSINESS_TIMEZONE at startup. PORT, URI, and origin are required; only timezone defaults. Errors list field names/reasons without echoing configuration values. Node loads a workspace-local `.env` through its built-in env-file option, avoiding dotenv.

The API connects to MongoDB before listening and exits nonzero if connection or configuration fails. Health returns connection state and UTC observation timestamp, with 200 only when Mongoose is connected and 503 otherwise. This is a connection-state probe, not a database write/read or transaction verification. Shutdown drains HTTP requests, disconnects MongoDB, and has a ten-second forced-exit deadline.

The Vite development proxy forwards `/api` to Express. CLIENT_ORIGIN defines the intended frontend origin for future cross-origin policy; the foundation uses same-origin proxy requests and does not add CORS middleware. Production reverse proxy and SPA fallback hosting remain future work.

## Future time and booking conventions

Store appointment timestamps as UTC instants; convert for display and business rules in the configured IANA business timezone (`America/Los_Angeles` by default). Do not store ambiguous local timestamps. Future transaction-based booking requires MongoDB configured as a replica set or a compatible managed deployment; standalone MongoDB suffices only for the current connectivity foundation.

## Milestone 2A: visual design foundation

The identity is an editorial specimen rather than an application dashboard: warm ivory canvas, expressive serif headings, restrained accents, generous spacing, and simple rules. The temporary `/design-system` route is for review; it does not build the finished homepage or any application screens. Existing Home/NotFound content and the minimal foundation header/footer remain, with token styling only; no navigation items, footer features, or menus were added.

### Theme and typography

Tailwind v4 CSS-first `@theme` declares named palette, font, type scale, spacing, radius, and easing tokens. Border/focus widths and interaction duration are plain CSS custom properties. No Tailwind configuration file, component library, new dependencies, external fonts, or image assets are needed. Setup follows the [official Tailwind theme documentation](https://tailwindcss.com/docs/theme).

| Token | Value / use |
| --- | --- |
| `ivory` | `#F5F2EB`: canvas, inverse text |
| `charcoal` | `#242827`: primary text, actions, inverse surface |
| `slate` | `#364B59`: links, keyboard focus, control borders |
| `copper` | `#B58C69`: decorative on ivory; text permitted on charcoal |
| `copper-ink` | `#805735`: readable accent text on ivory |
| `stone` | `#DDD7CE`: surfaces, quiet decorative dividers |
| `muted` | `#565F5B`: supporting text, disabled control text |
| `charcoal-hover` | `#17201E`: primary hover surface |

Georgia (with Cambria/Times New Roman/serif fallbacks) is the editorial display face. The interface uses system-ui, Segoe UI and Arial fallbacks. These use installed system fonts without redistribution or network requests; exact glyphs vary by OS. A custom licensed font can be reviewed later if tighter cross-platform art direction is needed. Mono text is confined to specimen measurements and hex values.

Display is fluid 44–88px; headings 32–56px; subheadings 24px; lead 20px; body 16px; uppercase labels 12px; captions 14px (all rem-based except the fluid viewport contribution). Body line-height is 1.65 and prose uses bounded measures. Semantic heading levels are independent of visual typography classes.

### Components and interaction

`Button` is a typed native button with primary/secondary/quiet variants, standard/compact sizes and default `type="button"`; it accepts native disabled, ARIA and event props. `Container` centralizes width and responsive inline padding. `SectionHeading` supports h2/h3, optional eyebrow and description. `VisuallyHidden` wraps Tailwind's `sr-only` utility for accessible supplementary text. There is no polymorphic component machinery or class-name dependency.

Spacing uses a 4px unit; section spacing is fluid 48–96px. Controls have 2px radii and minimum 48px standard / 44px compact heights. Decorative dividers are 1px stone; control boundaries use slate. No shadows, gradients, or glass treatments. Layout uses start-side borders/padding and logical CSS properties. Spacing samples wrap under enlarged text instead of forcing horizontal scroll.

Focus uses a 3px slate outline offset 4px on light surfaces, and ivory on inverse surfaces. Hover changes the surface; pressed toggles use `aria-pressed`, a visible double border, and adjacent text status. Disabled controls use native `disabled`, a dashed border, and explicit unavailable labels; opacity is not reduced. The review controls really mark/unmark the specimen, expand/collapse explanation, and toggle compact size. They do not pretend to book services. Toggle labels stay stable, and status text reports changes. Transitions affect colors only for 150ms; `prefers-reduced-motion: reduce` disables transitions and animations.

### Contrast and verification scope

Calculated sRGB contrast ratios: charcoal/ivory 13.34:1; slate/ivory 8.14:1; muted/ivory 5.90:1; copper ink/ivory 5.64:1; slate/stone hover 6.36:1; copper/charcoal 4.92:1; muted/stone disabled 4.61:1. The lighter copper is not a text or focus color on ivory. Stone dividers are decorative, not the sole indication of a control. Text pair selection follows [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); focus/control boundaries follow [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html).

These are measured palette-pair checks and browser smoke checks, not a claim of full WCAG certification. Screen-reader and cross-browser audits remain future review work. RTL checks verify layout accommodation only; localization is not implemented.

## Milestone 2B: responsive public shell

Pathless React Router layout routes separate the public website from the review specimen. `PublicLayout` composes PublicHeader, a focusable main/Outlet with Container, and PublicFooter. `SpecimenLayout` supplies only a Container, skip link and main for `/design-system`; it has no public navigation or footer. Existing homepage preview content remains unchanged; no finished homepage sections or business flows were built.

The header and footer share a small typed list of destinations: Home, Services, Barbers, Gallery and Book. Ordinary `NavLink`s supply `aria-current="page"`, with an underline for current navigation and a double border for the booking CTA. Services/Barbers/Gallery/Book each render an honest `ComingSoon` placeholder, not simulated content. Book visibly says "Coming soon" in navigation and explicitly states that appointments cannot be requested or confirmed on its destination. The CTA remains a link, since it navigates rather than executing a booking action.

### Mobile navigation and route focus

Below 64rem (1024px at default browser sizing), a native Button controls a full-width, in-flow disclosure panel with `aria-expanded` and `aria-controls`. Closed navigation uses `display: none`, removing its links from keyboard traversal and the accessibility tree. Desktop uses the same links horizontally. The CSS and matchMedia breakpoint must stay aligned if changed later.

This is a website navigation disclosure, not a modal dialog or an ARIA `menu`: normal Tab/Shift+Tab link navigation and native Enter/Space activation apply, with no focus trap, scroll lock, overlay or arrow-key convention. Escape dismisses the open mobile panel and returns focus to its control. Leaving the header with keyboard focus also closes it. The pattern follows [WAI's disclosure navigation guidance](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).

Header state is reset by keying it to the router location key, covering route changes and history navigation. Explicit click handling also closes current-route links. PublicLayout moves focus to main and scrolls to the top on subsequent public navigation, while leaving initial-load focus untouched. Breakpoint changes close the disclosure and move focus if its control or links become hidden. A cached last-focused element handles browsers that drop focus to body before notifying matchMedia; it is used only when that element has become hidden. Event listeners clean up on unmount.

### Visual and content boundaries

The architectural header uses the existing display/system typography, an understated wordmark and primary charcoal booking link. A visible demo strip precedes page content. Footer information explicitly describes a fictional Los Angeles concept with no physical shop; hours are "To be confirmed" and unpublished, not invented operational hours. Footer links point to actual routes, with no fabricated phone, email, address or social URLs. Future published hours refer to Los Angeles time, consistent with the existing business timezone convention.

Spacing and colors reuse 2A tokens. Header controls/links and footer navigation have at least 44px block-size; the layout wraps for enlarged text. Focus on the inverse footer uses ivory. Logical padding/margins, start-side placement and wrapping keep future RTL feasible. No new packages, shadows, major animation, image assets, backend changes or credentials were introduced.

## Milestone 2B.1: navigation motion and polish

These decisions supersede 2B's instant `display: none` mobile toggle and route-keyed header remount. The footer, typography, routes and overall header identity remain unchanged. Motion is confined to public navigation; there is no animation library or dependency addition.

### Mobile disclosure

The native toggle retains its open/close accessible labels, expanded/control attributes and focus outline. An aria-hidden, two-line CSS icon uses translate/rotate transforms to become an X and reverse in 220ms.

The panel interpolates a single grid row from `0fr` to `1fr` in 280ms, using a zero-minimum, overflow-clipped wrapper around natural-height content. The header uses a two-column grid on mobile with no row gap, so the closed panel does not leave an empty flex row. Inner content fades and moves just 6px during expansion/collapse. CSS transitions reverse from the current visual state on rapid toggles; there are no timers or transition-end state dependencies. Grid-incompatible browsers get an immediate display toggle via `@supports` fallback instead of an attempted `height: auto` animation.

Logical closure applies `inert`, `aria-hidden`, negative link tabindex and blocked pointer events immediately; visibility is delayed only to allow the closing image to finish. Opening restores access immediately. Thus links cannot remain focusable during collapse. See [MDN inert behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert). A shared media query snapshot using React's `useSyncExternalStore` keeps desktop links accessible even while mobile open state is false. Escape, focus departure, breakpoint changes, current-route clicks and route/history navigation retain their closure behavior. Focus recovery also accounts for a previously focused link becoming inert before the breakpoint callback.

Reduced-motion preferences disable all transitions, so the icon/panel reach their logical end states immediately without movement. The fallback and inert support target modern browsers; legacy assistive-technology behavior still needs review.

### Shared desktop route indicator

PublicHeader now persists across route changes. Its guarded previous-route state resets only the disclosure during render, following [React's conditional state adjustment guidance](https://react.dev/reference/react/useState#storing-information-from-previous-renders); this avoids a remount or an effect-driven extra stale frame. Route focus remains owned by PublicLayout.

NavigationIndicator renders one aria-hidden, absolutely positioned list item. It measures the actual `aria-current="page"` anchor and updates local CSS properties for x/y position and width. Initial placement snaps before transitions are enabled; subsequent known-route changes animate translation and width for 240ms. Unknown routes hide it, without a Home fallback. Book participates in the same indicator; its former desktop double border is removed, while mobile and footer current-state cues are preserved. Hover uses a subtle surface change on desktop and keyboard focus retains the separate outline.

Measurement runs in a layout effect on router location-key changes, plus ResizeObserver for the list/links, window resize, font readiness/loading completion, and document direction/style changes. The indicator reads its DOM parent rather than relying on an ancestor ref, which may not yet be attached during child layout effects. Observers/listeners clean up; font-ready work checks disposal. Measured physical DOM coordinates keep RTL alignment correct without guessing link widths or indexing routes. Wrapped desktop layouts place the line below the active link's actual row. No markup or typography is duplicated to calculate widths.

## Milestone 2C: homepage hero

HomeHero replaces the foundation's text-only Home preview and remains the only homepage content section. It uses the existing public layout, palette, display/sans typography, spacing and button styles. Navigation components and their motion/focus behavior were not modified.

At 64rem and above, a slightly wider copy column sits beside a 4:5 photographic crop. Below that breakpoint, content/CTAs precede a 4:3 image. Controls fill available width on small phones and become an inline wrapping group from 40rem. The existing display treatment is retained, with a hero-specific fluid 44–76px scale to keep the two-part headline balanced without changing typography elsewhere. The layout uses zero-minimum grid columns, natural wrapping and no fixed text height. No reveal, parallax or decorative animation is added.

Explore booking navigates to `/book`; its description references the visible "Booking is not available yet" note. Discover our services goes to `/services`. Both are real React Router links using existing primary/secondary `.button` styles, not buttons impersonating navigation. Existing Services/Barbers/Gallery/Book destinations remain intentional ComingSoon pages. The duplicate homepage demo paragraph was removed; the global notice and footer disclosure remain visible.

### Photography and loading

One verified Unsplash photograph by Redd Francisco provides the warm leather/charcoal composition. See [asset provenance, license and URLs](assets.md). Two local WebP variants total approximately 231KiB; the browser selects one. At desktop, `sizes` accounts for the additional source resolution needed by the portrait `object-fit: cover` crop, instead of treating only its narrower displayed width as the resolution requirement. No new optimization dependency, CDN runtime request, external font or supporting visual was needed.

The above-the-fold image loads eagerly with high fetch priority and async decoding. Explicit source dimensions and a reserved CSS aspect ratio avoid resizing its frame when the photo loads. Meaningful alt text describes the photograph. On failure, a local typographic placeholder occupies the same frame; all copy and CTA functionality are independent of image loading. This is a verified stable-frame behavior, not a measured full-page CLS/LCP performance claim.

### Location consistency

The current fictional public location is **Portland, Oregon**, superseding historical Los Angeles copy. Footer hours remain unpublished and refer to Portland local time. The explicit business timezone stays **`America/Los_Angeles`**, the IANA Pacific timezone also used by Portland; no server environment, database configuration or credentials were changed. The photograph remains an atmosphere reference rather than a claimed physical Studio North location.

## Milestone 2C.1: targeted visual polish

Only the homepage main container opts into a desktop maximum of 85rem including its existing inline gutters. At default text sizing, this provides 1200px of usable hero width at a 1280px viewport and a 1280px cap at 1440px and wider. Other routes, header, footer and the shared Container default keep their 72rem maximum. This is a route-specific CSS override rather than a global container redesign.

Hero copy is capped at 33rem (528px), with the supporting text's existing narrower measure preserved. Desktop columns now give photography slightly greater weight (`1fr / 1.1fr`), with a 32–56px fluid gap. The 44–76px headline scale, copy, CTA behavior and 4:5 desktop / 4:3 mobile photo ratios are unchanged. The decorative photo caption is removed without retaining its margin; alt text, failure placeholder, optimized assets and documented attribution remain.

The hamburger has three 2px strokes within the same 20px icon footprint. Its outer strokes sit 6px above/below center and rotate into the existing X; the middle stroke scales to zero when expanded. All transformations use the existing 220ms timing and easing, and existing reduced-motion handling. Button sizing, labels, state management, expansion and desktop indicator behavior are unchanged.

## Milestone 3A: services and pricing

The `/services` route replaces its ComingSoon placeholder with an editorial introduction, five separated service rows and one booking-preview link. Each row uses a semantic list item, heading and definition list for explicitly labeled duration and USD price. Desktop aligns the numeric columns; mobile places the two metrics together below each service description. Existing tokens, typography, focus and reduced-motion conventions are reused without new dependencies or decorative motion.

`client/src/data/services.ts` owns the temporary fictional `Service` content model: id, slug, name, description, durationMinutes and price. Prices are whole-dollar USD amounts, formatted through Intl.NumberFormat in the shared ServiceList. This is frontend demonstration content, not a database schema or an additional live catalog. MongoDB-backed service records will replace it during booking/admin milestones; remove the temporary dataset when switching consumers to the real API. No endpoint, Query request, premature adapter or service CRUD is introduced here.

Home composes the unchanged HomeHero followed by ServicesPreview. The preview derives the first three services from the same dataset and reuses ServiceList without descriptions, keeping the homepage concise. Its centered 67rem maximum aligns with the usable standard container width while the approved hero retains its wider composition. PublicLayout already supplies Container, so no nested gutter container is added. SectionHeading and native React Router links with existing button styles preserve semantics: navigation does not require a button element. Book remains an explicitly unavailable placeholder; no per-service booking action is offered.

## Milestone 3B: fictional team and Services refinements

The temporary typed `Barber` dataset lives separately from presentation in `client/src/data/barbers.ts`. It contains exactly three fictional identities with stable IDs/slugs, title, concise bio, specialty, nullable portrait reference, descriptive image alt text and active status. `isActive` is content for future integration, not current availability or a booking promise. MongoDB-backed records will replace this dataset during booking/admin work; remove the fixture rather than maintaining a parallel authoritative catalog. No API layer, query, Mongoose model or booking selection is added.

BarberProfiles shares the semantic list, portraits and identifying copy between `/barbers` and Home. Full-page names use h2; preview names use h3 beneath its h2 section heading. Only the full page renders biographies. Three equal columns begin at 40rem, with one profile per row on phones; zero-minimum columns, natural text wrapping and logical properties preserve enlarged-text/RTL feasibility. Home adds only TeamPreview after the existing Services preview, at the same 67rem measure. No profile-specific actions or unnecessary booking CTA is added.

BarberPortrait reserves a 4:5 frame with intrinsic 800 x 1000 image dimensions. The same optimized local WebPs serve both contexts; lazy loading keeps below-the-fold portraits deferred. Null images and failed sources render text in the same frame. Failure state tracks the source so a subsequently different portrait can load. Licensed stock illustrates sample identities; visible disclosures on both sections and neutral alt text avoid representing the photographed people as employees. Provenance is recorded in `assets.md`.

Services now has a route-local 62rem (992px) maximum with its existing narrower introduction measures. Inspection found the prior list already used 1072px on large screens, despite the review describing it as too narrow. The implementation follows the explicit requested 900–1000px target instead of globally widening containers. It measures 944px at 1024px and 992px at 1440/1920px. Prices, durations, rows, mobile metrics and the homepage Services preview are unchanged. Visual review at 320/390px found no clipping or awkward metric association, so no additional mobile redesign was necessary.

## Navigation flicker fix: stable scroll geometry

The root scrolling element reserves classic scrollbar space using `scrollbar-gutter: stable`. This keeps actual page content width constant between short placeholders and long public pages without forcing a visible scrollbar. Unsupported browsers retain their native behavior; overlay-scrollbar environments need no reserved space. Container sizes, typography and page designs are unchanged.

Header link closure focuses main with `preventScroll: true`, matching PublicLayout's existing route-focus convention. Previously the click handler focused the outgoing tall main with default scrolling, moving Chrome down 140px before PublicLayout reset scroll to zero. The layout retains ownership of deliberate scroll-to-top after route changes; same-route closure still focuses main without an unintended scroll. Header/main persist, StrictMode stays enabled, and indicator/menu transitions remain intact. Diagnostics confirmed both the focus jump and short/long scrollbar width change in development and production preview.

## Milestone 3C: completed public marketing website

Gallery uses one typed `GalleryPhoto` dataset for seven licensed atmosphere references and a three-photo Home preview. Local WebP pairs, intrinsic dimensions, responsive source selection and reserved frames keep loading independent of page geometry. The editorial six-column grid alternates wide/portrait pairs with three square details; phones retain natural document order in one column. The compact preview uses one large photograph beside two smaller studies on wider screens. Images are noninteractive, with no lightbox, fake actions or extra dependencies. Failure placeholders retain frames and accessible descriptions. Source provenance is in `assets.md`; images never claim Studio North premises, employees or customer results.

Home retains Hero, ServicesPreview and TeamPreview, then adds GalleryPreview, two SampleTestimonials and BusinessLocation. The latter combines location, sample hours and the final unavailable-booking CTA. Existing containers, typography, colors and responsive nav remain; one stone surface gives the quotes a restrained change of tone. Every testimonial carries its own fictional-demo caption without real names, star ratings or verified-review claims. Natural wrapping and zero-minimum grid children accommodate enlarged text without clipping.

`client/src/data/business.ts` supplies one typed public configuration for Studio North, Portland/Oregon/USA, USD, America/Los_Angeles and fictional hours. Shared BusinessHours renders the same definition list in the homepage and footer; service price formatting consumes its currency without changing prices. Day groups carry numeric weekday IDs and nullable 24-hour opening/closing strings; Sunday is closed. These are local wall-clock examples, not UTC timestamps, availability, DST calculations or a booking promise. Future booking must migrate this configuration to authoritative server-backed scheduling rules; appointment instants remain stored in UTC. No address, telephone, form, map or contact integration is fabricated.

RouteMetadata updates the existing description tag, document title and Open Graph title/description/site/type on pathname changes, including direct loads, history, specimen and unknown routes. One small effect manages existing tags without duplicate metadata or a dependency. Generic fallback tags remain in index.html. This is CSR, not SSR or prerendering: social bots and crawlers that do not execute JavaScript may see only the generic metadata. No canonical URL, OG image URL or business/review schema is invented for an undeployed fictional shop. No suitable existing favicon was found, so none is claimed.

This supersedes earlier unpublished-hour and Gallery-placeholder decisions. Book remains unavailable. PublicHeader's preventScroll and the root stable scrollbar gutter are preserved and regression-tested in development and production preview. Approved service data, barber biographies/portraits and hero remain unchanged.

## Milestone 3D: native scrolling with a desktop position indicator

ScrollIndicator lives only in PublicLayout, without changing page components or scroll containers. A fixed, noninteractive 160px track follows actual root scroll progress with a 24px marker and a downward cue. At 90% progress, a native 44 x 48px Back to top button appears at the lower inline edge. Its visible arrow/Top label and accessible name are independent of color; it uses the existing focus tokens. The rail is pointer-transparent and has no keyboard stops. Positioning the button at the lower edge avoids an observed Services CTA overlap at 1024px. Logical positioning preserves RTL feasibility, and ivory outlines keep slate/charcoal elements legible over the inverse footer.

Native document scrolling remains untouched: no wheel/key handlers, overflow:hidden, custom scroll engine, drag affordance or new library. A passive scroll listener coalesces updates through requestAnimationFrame; marker positioning updates a DOM style directly, while React state changes only when overflow visibility or the near-bottom state changes. ResizeObserver handles page/viewport geometry, including route changes; media and root-style observers handle accessibility/layout preferences. Cleanup removes listeners/observers, pending frames and the root mode attribute. Back to top focuses main with preventScroll and uses native smooth scrolling, or instant scrolling under reduced motion. Route focus/reset behavior still belongs to PublicLayout.

Scrollbar hiding is a conservative opt-in for verified Windows desktop Chrome: platform/vendor/UA allowlist plus supported scrollbar CSS and observer APIs, fine pointer/hover, a 64rem viewport, and sufficient width at the computed font size. Edge/Opera/Firefox/Safari and other platforms retain native scrolling. Forced colors, prefers-contrast:more, coarse/touch input, mobile/tablet, enlarged-text layouts and unavailable required APIs also retain native scrollbars and hide the custom guide. These explicit fallbacks avoid claiming untested browser compatibility. Required API absence skips setup entirely.

The root retains `scrollbar-gutter: stable` in native mode. Only active custom mode uses `scrollbar-width: none` and `scrollbar-gutter: auto`, removing the empty classic gutter. Custom mode remains enabled on short public pages even while the guide is hidden, so short/long route changes do not change content width. Mode activation runs in a layout effect before the React page paints. Returning to the specimen or changing browser/accessibility eligibility intentionally restores native gutters. See [MDN scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-width) and [scrollbar-gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter); actual Chrome checks confirm no gutter in custom mode, stable width/history, and the previous focus-scroll fix remains intact.

This does not remove native scrollbar access from environments that were not verified. Physical trackpad hardware, actual Safari/Firefox rendering and screen readers still need separate verification before broadening the opt-in. Forced-colors and touch behavior were tested through Chrome emulation, not a native assistive-technology session.

## Scroll indicator polish: symmetric arrow controls

This supersedes 3D's labeled down cue, 90%-threshold bordered Top button and lower-corner button placement. The 160px track is centered at exactly 50% of viewport height. Both states use the same transparent, borderless native arrow button directly beneath the track; there are no visible labels. Its 40px-wide, 44px-high target fits inside the smallest existing desktop outer gutter without covering page actions. The arrow is slate over ivory and ivory when its position intersects the inverse footer; keyboard focus uses the matching color with the existing 3px outline.

Scroll down is visible only within the first min(32px, 2% of scroll distance). Back to top is visible only within the last min(160px, 8% of scroll distance). The middle retains only decorative progress, with the hidden button absent from keyboard/assistive-technology navigation. Short pages hide the whole guide. Edge changes do not alter track placement or page geometry; both arrows occupy identical coordinates.

The downward action targets the next labeled main section beginning below the upper half of the viewport, avoiding a jump merely to the start of the already-visible hero. Without such a section, it advances 80% of viewport height using native scrollTo. Up returns to zero. Both actions focus main with preventScroll, use native smooth scrolling and become instant under reduced motion. The previous efficient listener/state model, native scrollbar eligibility/fallbacks and route focus/flicker fixes remain intact. No page content, dependency or backend changes were needed.

## Desktop section navigator (supersedes the custom scroll guide)

The public layout now owns a reusable section navigator with explicit section definitions. Home registers six existing semantic sections, with location, hours and unavailable booking sharing one destination; other public pages currently have one meaningful content collection and omit it. The old arrow/progress component and browser-specific scrollbar hiding are removed. Native scrolling and `scrollbar-gutter: stable` apply everywhere, retaining route focus with `preventScroll` and persistent header/main geometry.

A fixed, viewport-centered line stack reveals an ivory navigation panel on pointer hover or focus within. Links use ordinary anchor semantics, `aria-current="location"`, and native scrollTo; section focus uses preventScroll before deliberate scrolling. Closed links are inert. Escape returns focus to main without scrolling. Section targets are programmatically focusable without extra tab stops. The transient panel can overlay imagery on narrow desktops, but does not change document geometry or cover hero actions. No shadows, custom scroll engine or dependencies are introduced.

A passive scroll listener schedules at most one animation-frame measurement. The last section whose top crosses the viewport's upper third becomes current, with the final section selected at document bottom. ResizeObserver handles content geometry changes; media/resize listeners handle eligibility. State equality avoids rerenders between section changes. Reduced motion disables panel transitions and makes section jumps instant. Short pages and touch/mobile/tablet omit the navigator.

### Section navigator reference polish

The collapsed mark now uses twelve equal-width 1px strokes at a 10px pitch, grouped as two decorative ticks per actual section. The active pair uses copper ink; inactive slate ticks are subdued. Transparent control background removes the previous ivory block. Actual destinations remain six, with no extra tab stops. Public desktop fine-pointer routes hide native scrollbar chrome with scrollbar-width:none and a WebKit fallback. The selector applies consistently to short and long public pages, not just Home, preventing route-dependent width changes. Root scrollbar-gutter:stable remains declared; hidden scrollbars reserve no gutter. Native scrolling is unchanged; mobile/specimen and forced-colors/increased-contrast retain native scrollbar presentation. This supersedes the previous decision to show all native desktop scrollbars.

## Dark and light appearance

Studio North opens in a dark editorial theme: warm charcoal canvas, ivory type, light slate interactions and restrained copper accents. The sun/moon button beside the global demo notice switches between dark and the existing warm ivory theme. A saved choice is applied in the document head before the application renders; storage failure falls back to dark and does not disable switching. Preferences are browser-local, with no account or server setting.

Raw brand palette tokens remain unchanged for documented swatches and inverse/footer surfaces. Semantic canvas, ink, surface, line, interactive, accent, secondary and action-hover tokens now serve both CSS and Tailwind utilities. Dark surfaces are #1c211f/#2a3335, text #f5f2eb, links #bdcdd5 and accent #d2aa88; the footer uses #151a18. Light accent text uses #784e30 to pass AA on both ivory and stone (the former copper ink was just under 4.5:1 for the testimonial eyebrow on stone). Photography, typography, content and route layout remain unchanged. No animated theme sweep, image inversion or third-party theme package is introduced.

The collapsed section navigator now has exactly one decorative stroke per actual section, with one active copper stroke. Previous paired ticks are removed. Existing hidden desktop scrollbar behavior, native scrolling, panel semantics and reduced-motion behavior remain.

## Dark theme art direction and control placement

Dark appearance now uses a warmer hierarchy: canvas #181A19, secondary #242725, elevated #30322E, primary text #F1E9DE, secondary #B9B4AC, bronze #C5A17B, and warm-gray dividers #484944. Header and testimonials use secondary surfaces, the demo notice returns to canvas, the section panel uses elevated tone, and the footer uses #141615. Primary actions use bronze with dark text and a restrained #D2B28F hover. Semantic primary/elevated/footer tokens keep dark values centralized; light tokens, original palette swatches, typography and photography remain unchanged. Rhythm comes from existing surfaces rather than adding colored blocks to every section.

One theme control lives in the Book navigation item immediately before its link. Desktop presents a borderless 44px icon; mobile expands it into a labeled action inside the disclosure. The demo notice is again content only. Action-specific accessible labels, pressed state (dark enabled), focus and ordinary button keyboard handling remain. A single mounted control avoids duplicate state owners; the existing validated local preference and pre-render head initialization are preserved. Minimal head canvas CSS provides matching dark/light paint while application styles load, verified with an artificially delayed production stylesheet. Theme changes do not animate every element; only existing local control transitions apply, with reduced-motion overrides.

Forced colors retain native scrollbars; decorative section marks use system colors and active marks also gain thickness. No images are filtered, no new dependencies or backend changes are introduced.

## Milestone 4: booking persistence and scheduling

Mongoose now owns service/barber catalogs, business/barber schedules, appointments, occupancy blocks and shared rate counters. Original frontend IDs and fictional seed copy remain; integer USD cents replace UI whole-dollar values at the API boundary. Frontend integration is intentionally deferred, with no second permanent catalog planned. See [booking API and migration plan](booking-api.md).

Scheduling uses native Node Intl/IANA projection of real UTC instants instead of adding a timezone library. Enumerating quarter-hour UTC starts into a local date handles omitted/repeated DST times; every occupied minute must remain within business and barber periods. UTC duration is elapsed time; local wall-clock recurring schedules are explicit. Default lead is 60 minutes and horizon is 60 rolling UTC days. API validates and normalizes strictly with Zod and never accepts a client price/end/status.

Unique `(barberId,startsAt)` occupancy blocks, appointment creation and atomic cancellation run inside MongoDB snapshot transactions with majority write concern. Required indexes are added before API listen, without dropping existing indexes. Standalone deployments fail startup. Any Available tries eligible barbers in deterministic order after aborted conflicts. Only actual occupancy duplicates map to 409 (including bulk-write wrappers); unrelated failures stay generic errors. The approach follows [Mongoose transaction guidance](https://mongoosejs.com/docs/transactions.html) and [MongoDB transaction considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/). Real database tests verified competing requests from two separate Node processes, forced unique-index collisions, creation rollback and cancellation rollback. No new dependency was necessary.

Public references use 24 cryptographic random bytes (192 bits); the limited public DTO excludes name/email/phone/internal ID/audit timestamps. It is not authorization for customer details or status changes. Cancellation/confirmation/completion are internal functions only; future protected APIs must call them. Database-backed fixed-window rate counters work across Node instances rather than process memory; proxy trust remains disabled until deployment topology is reviewed.

Seed is insert-only and preserves existing timestamps/content, schedules/exceptions and all appointments. Tests override any URI database with a fresh guarded 34-character random test name, short enough for the available Atlas database-name limit, then clean up only that exact database. Development receives fictional catalog/schedules only, never synthetic customers or test appointments.

## Milestones 5–8: booking and protected administration

MongoDB is now the runtime catalog/schedule source of truth: remove the temporary client service/barber datasets and fetch public catalog and hours through TanStack Query without fixture fallback. Keep approved layouts, photos, themes, public navigation and section scrolling. Forms use React Hook Form 7.90.0, @hookform/resolvers 5.9.1 and Zod 4.6.7; bcryptjs 3.0.3 provides maintained password hashing. Official registry versions/engines/React/Zod peer compatibility were verified before installation. No component/auth/animation framework was added.

Customer creation remains the Milestone 4 domain operation. The UI presents success only after 201 following commit, preserves values on slot conflict, refreshes availability, and prevents duplicate clicks. Optional UUID idempotency keys are uniquely indexed, tied to normalized payload hashes and return the original limited DTO on an exact retry; changed payload with the same key conflicts. Public confirmation remains contact-free. Keys persist with appointments until guarded demo reset; there is no separate timed key cache.

Use simple opaque MongoDB-backed sessions rather than JWTs: one operator-initialized owner, bcrypt cost 12, random token/hash storage, absolute expiry, HttpOnly/SameSite Strict scoped cookies and production Secure enforcement. Server sessions guard every admin endpoint, with exact allowed Origin plus CSRF token on mutations. Rate-limit login in the existing database counter system. The client guard is for presentation only. No registration or password-management UI/API.

All booking/status/catalog/schedule/reset transactions acquire one shared BookingState write gate before authoritative reads. Low-volume serialization is a deliberate tradeoff: it prevents concurrent schedule edits or reset from racing availability validation across processes, while retaining the occupancy unique index as a second reservation guarantee. Schedule updates must fit business hours and preserve active pending/confirmed appointments using saved duration. Service edits/deactivation affect future eligibility, never historical snapshots. Cancellation reuses existing atomic block release.

Visitor administration requires explicit DEMO_MODE, a strictly named separate database and persistent operator designation. Normal mode cannot issue demo sessions or reset. Demo startup refuses an uninitialized database. Visitor contact input is replaced with synthetic values before persistence. Guarded reset is a deliberate transactional replacement of listed app collections; no database drop, credential changes or counter reset. Fixture content is deterministic for the Pacific reset date; visitor references remain random. Concurrent booking/reset follows transaction order and never leaves orphan occupancy. Details, operator commands, API contracts and limits are in [admin-demo.md](admin-demo.md).

The current UI is intentionally Pacific/USD and single-business. Keep existing UTC storage and explicit America/Los_Angeles display. Owner operation remains separate from restricted public demo operation. No deployment, real accounts, notifications, payments or retention policy is introduced.
