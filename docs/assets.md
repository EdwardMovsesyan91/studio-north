# Image provenance

## Homepage hero: barber chair

Verified and downloaded on 2026-10-13.

- Creator: **Redd Francisco** (`@reddfrancisco`).
- Source: [A barber shop with a chair and a mirror](https://unsplash.com/photos/a-barber-shop-with-a-chair-and-a-mirror-BBGyxhtPpC0), photo ID `BBGyxhtPpC0`, published December 18, 2023.
- Copyright license: [Unsplash License](https://unsplash.com/license). The source page explicitly states the image is free under this license. It permits downloading, modification and use for commercial/noncommercial purposes; attribution is appreciated but not required. Selling unmodified images and compiling a competing image service are excluded. This is not a claim of public-domain status.
- Primary file: `client/public/images/barber-chair-1200.webp` — 1200×800, 170,616 bytes.
- Smaller file: `client/public/images/barber-chair-640.webp` — 640×427, 66,086 bytes.
- Download URLs: [1200px WebP](https://images.unsplash.com/photo-1702865272115-5afdbae975af?fm=webp&fit=max&w=1200&q=82), [640px WebP](https://images.unsplash.com/photo-1702865272115-5afdbae975af?fm=webp&fit=max&w=640&q=80).
- Processing: Unsplash's image delivery resized and encoded WebP at quality 82/80. The application serves both files locally with `srcset`; it never hotlinks the photo at runtime. CSS applies a 65% horizontal focal point, a 4:5 desktop crop, and a 4:3 mobile/tablet crop.
- Purpose: editorial atmosphere reference. The depicted shop is not represented as Studio North's premises or as a Portland location. Studio North remains a fictional portfolio concept.
- Alternative text: "A brown leather barber chair beneath tall mirrors in a warmly lit barbershop."

The source photograph is the only visual asset in the hero. No inspiration screenshots, customer photographs, generated supporting visuals or unverified stock images are used. Reconfirm provenance if replacing it.

## Milestone 3B: sample-profile portraits

Verified and downloaded on 2026-10-13. These photographs illustrate fictional sample identities, not actual Studio North employees. Neither the character names, titles, specialties nor biographies identify or describe the photographed people. Both public team presentations explicitly disclose this and do not imply endorsement. Alt text describes each photograph without using the fictional name.

All three source pages explicitly link to the [Pexels License](https://www.pexels.com/license/). It permits free website use and modification without required attribution, while prohibiting implied endorsement, offensive depictions, resale of unaltered copies, stock redistribution and use as a trademark. This is licensed stock, not a public-domain claim. The portraits are used only in the disclosed fictional portfolio context; a real business must replace them with authorized employee portraits.

| Local asset | Creator and verified source | Dimensions / size |
| --- | --- | --- |
| `client/public/images/portrait-verfe-800.webp` | Marcelo Verfe, [Portrait of a Happy Barber](https://www.pexels.com/photo/portrait-of-a-happy-barber-18483772/) | 800 x 1000; 53,488 bytes |
| `client/public/images/portrait-rdne-800.webp` | RDNE Stock project, [A Barber with His Hands Raised](https://www.pexels.com/photo/a-barber-with-his-hands-raised-7697485/) | 800 x 1000; 31,146 bytes |
| `client/public/images/portrait-cottonbro-800.webp` | cottonbro studio, [A Man With a Beard and Mustache](https://www.pexels.com/photo/a-man-with-a-beard-and-mustache-10617586/) | 800 x 1000; 51,762 bytes |

Processing: Pexels image delivery performs 800 x 1000 cropping, compression and WebP encoding. Download URL pattern: `https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop&fm=webp`, using source IDs 18483772, 7697485 and 10617586. Verified WEBP file headers and browser-decoded dimensions. Total portrait payload is 136,396 bytes (about 133 KiB); the same local files are reused by page and preview. No runtime hotlinks or additional processing dependency.

Presentation: complementary muted tones, equal 4:5 frames, natural photographic variation in framing. Images declare intrinsic dimensions and load lazily with async decoding. Null references and load errors render a readable, identically proportioned local text placeholder; profile information and navigation remain available. The hero photograph and its provenance are unchanged.

## Milestone 3C: gallery and atmosphere preview

Verified, downloaded and visually reviewed on 2026-10-13. Six new source photographs plus the existing Redd Francisco hero photograph form the seven-image gallery. Home previews the first three from the shared dataset. These are atmosphere references, not Studio North premises, employees, work or customer results; the page and preview explicitly disclose that distinction. No endorsement is claimed.

Each new source page explicitly links to the [Pexels License](https://www.pexels.com/license/), permitting free website use and modification under the restrictions documented above. Attribution is provided here despite not being required. The reused seventh image retains its separately verified Unsplash License and provenance above.

| Asset stem under `client/public/images` | Creator / source | Large variant dimensions; bytes | Small variant dimensions; bytes |
| --- | --- | --- | --- |
| `gallery-interior` | Kawê Rodrigues, [Empty Seats in Barbershop](https://www.pexels.com/photo/empty-seats-in-barbershop-19664872/) | `-1200.webp`: 1200 x 900; 81,718 | `-600.webp`: 600 x 450; 30,944 |
| `gallery-tools` | Pew Nguyen, [Close-up of the Wooden Barbershop Board](https://www.pexels.com/photo/close-up-of-the-wooden-barbershop-board-12164645/) | `-800.webp`: 800 x 1200; 73,920 | `-400.webp`: 400 x 600; 28,528 |
| `gallery-scissor-work` | izzet çakallı, [Shaving and equipment at the barbershop](https://www.pexels.com/photo/shaving-and-equipment-at-the-barbershop-12464843/) | `-800.webp`: 800 x 800; 46,410 | `-400.webp`: 400 x 400; 14,938 |
| `gallery-detail` | Luis Quintero, [Selective Focus Photography of a Barber](https://www.pexels.com/photo/selective-focus-photography-of-a-barber-1453005/) | `-800.webp`: 800 x 800; 14,896 | `-400.webp`: 400 x 400; 6,826 |
| `gallery-chair` | Jonathan Cooper, [View of a Barbershop Interior](https://www.pexels.com/photo/view-of-a-barbershop-interior-12685938/) | `-800.webp`: 800 x 800; 54,556 | `-400.webp`: 400 x 400; 20,696 |
| `gallery-beard-work` | RDNE Stock project, [Man in White Shirt Cutting Hair of Man in Black Apron](https://www.pexels.com/photo/man-in-white-shirt-cutting-hair-of-man-in-black-apron-7697287/) | `-800.webp`: 800 x 1200; 49,306 | `-400.webp`: 400 x 600; 20,502 |

The six new large/small pairs total 443,240 bytes (about 433 KiB); only the selected variant is normally fetched. Delivery URL pattern is `https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w={width}&h={height}&fit=crop&fm=webp` with IDs and dimensions from the table. Pexels delivery cropped, resized, compressed and encoded the downloaded local WebPs; file signatures were verified. Both sizes are copied by the production build and served locally through srcset, without runtime external requests or an optimization dependency.

GalleryImage declares dimensions, reserves wide/portrait/square frames, uses lazy loading and async decoding, and retains the same frame with a readable accessible fallback on error. Meaningful alt text is centralized in `client/src/data/gallery.ts`. The final hero reference is cropped to the gallery's wide proportion without modifying the original files. No lightbox or fabricated before/after results are presented. Browser checks exercised decoded local sources, delayed loading, reserved geometry and blocked-image states in development and production preview.
