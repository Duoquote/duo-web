---
title: "polytini: a polyline codec that came out of a benchmark"
date: 2026-11-27
description: polytini encodes and decodes Google encoded polylines. It's strict by default, has a build per runtime and encodes about twice as fast as the other JavaScript libraries. It decodes long lines faster and short ones slower.
summary:
  - "A JavaScript library that encodes and decodes Google encoded polylines, for anyone who gets route geometry as polyline strings from Google Maps, OSRM, Valhalla, GraphHopper or Mapbox. It runs in Node, Bun, Deno, browsers and Cloudflare Workers."
  - "In the benchmark it encoded 2.01 times as fast as the next library. It decoded long and real-world lines 1.20 to 1.27 times as fast, but 10-point lines 11 to 21% slower on every runtime except Bun. At about 2 KB gzipped it's bigger than the smallest libraries."
  - "Strict by default: a cut-off or corrupted string throws a `PolylineError` instead of decoding to a wrong point."
  - "Install with `pnpm add @duoquote/polytini`, `bun add @duoquote/polytini` or `deno add jsr:@duoquote/polytini`."
tags: [javascript, gis, polyline, performance]
cover: ./cover.png
coverAlt: The polytini logo, a small bird sitting on a line, next to the text "Encode and decode Google polylines in Node, Bun, Deno, browsers and Workers" and the command pnpm add @duoquote/polytini
draft: true
---

polytini is a JavaScript library for Google encoded polylines, the short strings like `_p~iF~ps|U_ulLnnqC` that Google Maps, OSRM, Valhalla, GraphHopper and Mapbox return for route geometry. It's on [npm](https://www.npmjs.com/package/@duoquote/polytini) and [JSR](https://jsr.io/@duoquote/polytini) as `@duoquote/polytini`, and it runs in Node, Bun, Deno, browsers and Cloudflare Workers.

It started at work, where we sent polygons to the browser as encoded polylines because the format is compact. A polyline is only one line, though, so we added one separator character for a polygon's holes and another for the parts of a multipolygon. Sending them was cheap, but encoding and decoding took noticeable time.

In September 2021 I wrote [polyline-benchmark](https://github.com/Duoquote/polyline-benchmark) to compare the JavaScript decoders. It decoded 1000 real lines from PostGIS a thousand times with each of five libraries on a Ryzen 5 3600. Four of them took 8 to 25 seconds. `decode-google-map-polyline` took 2.45 minutes. Then nothing happened for five years.

I picked it up again this year. The benchmark now checks every library against a slow reference codec, then times it on Bun, Node 22 to 26, Deno and Chrome. I wrote polytini along the way. It's in the same tables, so read its rows knowing who made it.

## How it compares

Numbers are from the 27 November 2026 run, with polytini 0.1.4 on a Ryzen 7 5800X. Each runtime ran alone, pinned to four logical cores, and a cell moved by 5 to 7% between rounds, so I count smaller gaps as a tie. A first run on a busy machine moved about 30%.

Encoding is the clear win. Across all runtimes and line lengths polytini was 2.01 times as fast as the next library, `google-polyline`, and ahead in 46 of 48 cells. Most of that comes from how it builds the string. On Node and Bun it writes bytes into a reused `Buffer` and makes the string with one `latin1Slice` call, which on Node 24 was 114 against 72 million points per second for the portable build. Deno and Chrome do the same for long lines with `TextDecoder`. Each runtime gets its own build.

Decoding depends on the length. On long lines polytini was 1.20 times as fast as the next library, `@googlemaps/polyline-codec`, and 1.27 times on the real-world lines. Short lines are where it loses. At 10 points it was behind on every runtime except Bun, by 11 to 21%. 0.1.4 made that 13 to 30% faster on Node, Deno and Chrome, but didn't close the gap. At 100 points it was mixed: ahead on Bun, Node 22 and 24, and 6 to 12% behind on Node 25, Deno and Chrome. Chrome is the weak spot, behind at four of six lengths.

It's also bigger. The default entry is about 2 KB gzipped, against 551 bytes for `google-polyline` and 568 for `@googlemaps/polyline-codec`. Most of the extra is error checking and an exact path for precision 7 and up. If every byte counts, one of those two is the better pick.

![Heatmap of polytini 0.1.4 against the fastest other library, a row per runtime (Bun, Node 22 to 26, Deno, Chrome), decode above encode. Encoding is 1.08 to 7.1 times as fast in 46 of 48 cells and even in the other two. Decoding at 10 points is 0.79 to 0.89 times as fast on every runtime except Bun, where it's even. From 100 points up it's mostly 1.05 to 1.45 times as fast, with Node 25, Deno and Chrome behind in some cells.](./overview.png "polytini divided by the fastest other library in each cell. Hatched cells are inside the noise.") ![Heatmap of polytini 0.1.4 against the fastest other library, a row per runtime (Bun, Node 22 to 26, Deno, Chrome), decode above encode. Encoding is 1.08 to 7.1 times as fast in 46 of 48 cells and even in the other two. Decoding at 10 points is 0.79 to 0.89 times as fast on every runtime except Bun, where it's even. From 100 points up it's mostly 1.05 to 1.45 times as fast, with Node 25, Deno and Chrome behind in some cells.](./overview-dark.png)

The full tables are in the [benchmark](https://github.com/Duoquote/polyline-benchmark#readme).

## Strict by default

A cut-off polyline still looks like a polyline. Cut Google's documented example in the middle of the second point: `_p~iF~ps|U_ulLnnq`. `@mapbox/polyline` decodes the second point as `[40.7, -120.29464]`. The real one is `[40.7, -120.95]`, about 55 km away, and on a map it looks like any other point. polytini throws a `PolylineError` with the code `truncated` at index 17.

It also throws on invalid characters and NaN coordinates. I made that the default because it's cheap: on 10-point lines the checks cost 0 to 4%, and on longer lines they were lost in the noise. `strict: false` turns it off.

## What didn't pay off

The opt-in `@duoquote/polytini/wasm` build, a hand-written WAT module of 906 bytes, is no faster for `[lat, lng]` arrays, because building the arrays is most of the work. It only wins when you decode many lines in one call. `decodeMany` was 1.40 to 2.31 times as fast as the JavaScript way to the same deck.gl output on Bun, Node and Deno, and about even in Chrome (1.06). `encodeMany` lost everywhere. A Rust version that reads 8 bytes at a time was worse still: 2.7 KB, and 10 to 40% slower than the plain byte loop, because each value starts where the last one ended.

Cloudflare Workers are half measured. Locally in workerd, decoding was close to Node in some runs and up to 1.8 times slower in others, and I haven't found out why.

## Using it

```sh
pnpm add @duoquote/polytini
```

```sh
bun add @duoquote/polytini
```

```sh
deno add jsr:@duoquote/polytini
```

For Yarn and npm, see the [README](https://github.com/Duoquote/polytini#install).

```js
import { encode, decode } from '@duoquote/polytini';
import { osrm6 } from '@duoquote/polytini/presets';

encode([[38.5, -120.2], [40.7, -120.95]]); // '_p~iF~ps|U_ulLnnqC'
decode('_p~iF~ps|U_ulLnnqC');              // [[38.5, -120.2], [40.7, -120.95]]
decode(route.geometry, osrm6);             // OSRM polyline6, as [lng, lat]
```

The precision isn't stored in the string, so a `polyline6` string decoded at precision 5 gives coordinates ten times too big, with no error. That's what the presets are for. The [README](https://github.com/Duoquote/polytini#readme) has the adapters for Leaflet, Turf, OpenLayers, MapLibre, deck.gl and Google Maps, and the CLI.
