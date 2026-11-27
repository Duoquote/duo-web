---
title: "polytini: a polyline codec that came out of a benchmark"
date: 2026-11-27
description: polytini encodes and decodes Google encoded polylines. It's strict by default, has a build per runtime and encodes about twice as fast as the other JavaScript libraries. Decoding is about even.
summary:
  - "A JavaScript library that encodes and decodes Google encoded polylines, for anyone who gets route geometry as polyline strings from Google Maps, OSRM, Valhalla, GraphHopper or Mapbox. It runs in Node, Bun, Deno, browsers and Cloudflare Workers."
  - "In the benchmark it encoded 2.05 times as fast as the next library. Decoding was about even and slower on short lines, and at about 2 KB gzipped it's bigger than the smallest libraries."
  - "Strict by default: a cut-off or corrupted string throws a `PolylineError` instead of decoding to a wrong point."
  - "Install with `pnpm add @duoquote/polytini`, `bun add @duoquote/polytini` or `deno add jsr:@duoquote/polytini`."
tags: [javascript, gis, polyline, performance]
cover: ./cover.png
coverAlt: The polytini logo, a small bird sitting on a line, next to the text "Encode and decode Google polylines in Node, Bun, Deno and the browser"
draft: true
---

polytini is a JavaScript library for Google encoded polylines, the short strings like `_p~iF~ps|U_ulLnnqC` that Google Maps, OSRM, Valhalla, GraphHopper and Mapbox return for route geometry. It's on [npm](https://www.npmjs.com/package/@duoquote/polytini) and [JSR](https://jsr.io/@duoquote/polytini) as `@duoquote/polytini`, and it runs in Node, Bun, Deno, browsers and Cloudflare Workers.

It started at work. We were rendering polygons on maps and sending them to the browser as encoded polylines, because the format is compact. A polyline is only one line, though, so we had our own extension on top: one special character to separate a polygon's inner rings (the holes), and another to separate the polygons of a multipolygon. Sending them was cheap. Encoding and decoding them took noticeable time.

So in September 2021 I wrote [polyline-benchmark](https://github.com/Duoquote/polyline-benchmark) to compare the JavaScript decoders. It decoded 1000 real lines, exported from PostGIS with `ST_AsEncodedPolyline`, a thousand times with each of five libraries on a Ryzen 5 3600. Four of them took 8 to 25 seconds. `decode-google-map-polyline` took 2.45 minutes. The README ended with a TODO list (encoding, GeoJSON, more line lengths), and then nothing happened for five years.

I picked it up again this year and went further. The benchmark now checks every library against a slow reference codec before timing it, and runs on Bun, Node 22 to 26, Deno and Chrome. I wrote polytini along the way. It's in the same tables, so read its rows knowing who made it.

## How it compares

Numbers are from the November 2026 run, with polytini 0.1.0 on a Ryzen 7 5800X. A single cell moved about 30% between rounds, so I count smaller gaps as a tie.

Encoding is the clear win. Across all runtimes and line lengths, polytini was 2.05 times as fast as the next library, `google-polyline` (geometric mean). Most of that comes from not building the string one character at a time. On Node and Bun it writes bytes into a reused `Buffer` and makes the string with one `latin1Slice` call, which on Node 24 was 109 against 66 million points per second. Deno and Chrome do the same for long lines with `TextDecoder`. Each runtime gets its own build through package.json export conditions.

Decoding is about even. polytini led on long lines (1.14x) and on the real-world lines (1.22x), both inside the noise. On short lines (10 and 100 points) it lost 14 of 16 cells to the fastest other library, by 5 to 36%. In the Node 24 chart below it's fourth at 10 points.

It's also bigger. The default entry is about 2 KB gzipped, against 551 bytes for `google-polyline` and 568 for `@googlemaps/polyline-codec`. Most of the extra is error checking and an exact path for precision 7 and up. If every byte counts, one of those two is the better pick.

![Node 24 decode speed at six line lengths, relative to @mapbox/polyline. polytini is behind the fastest library at 10 points (0.93x against 1.07x) and at 100 points (1.25x against 1.43x), and leads from 1,000 points up and on the real-world lines (1.61x against 1.28x).](./node-24-decode.png "Decode on Node 24. polytini's rows are blue.") ![Node 24 decode speed at six line lengths, relative to @mapbox/polyline. polytini is behind the fastest library at 10 points (0.93x against 1.07x) and at 100 points (1.25x against 1.43x), and leads from 1,000 points up and on the real-world lines (1.61x against 1.28x).](./node-24-decode-dark.png)

The other runtimes and the encode charts are in the [results](https://github.com/Duoquote/polyline-benchmark/blob/main/docs/results.md).

## Strict by default

A cut-off polyline still looks like a polyline. Take Google's documented example and cut it in the middle of the second point: `_p~iF~ps|U_ulLnnq`. `@mapbox/polyline` decodes the second point as `[40.7, -120.29464]`. The real one is `[40.7, -120.95]`, about 55 km away, and on a map it looks like any other point. polytini throws a `PolylineError` with the code `truncated` at index 17.

It also throws on invalid characters and NaN coordinates. I made that the default because it's cheap: on 10-point lines the checks cost 0 to 4%, and on longer lines I couldn't tell them apart from the noise. The decoder ORs every character code into one integer and checks it once at the end. `strict: false` turns it off.

## What didn't pay off

WebAssembly mostly didn't help. There's an opt-in build at `@duoquote/polytini/wasm`, a hand-written WAT module of 906 bytes, but for `[lat, lng]` arrays it doesn't help. Building the arrays is most of the work, so those calls go to the JavaScript core. It only wins when you decode many lines in one call. `decodeMany` was 1.36 to 2.70 times as fast as the JavaScript way to the same deck.gl output on Bun, Node and Deno, and a bit slower in Chrome (0.93). `encodeMany` lost everywhere. A Rust version that reads 8 bytes at a time was worse still, at 2.7 KB and 10 to 40% slower than the plain byte loop. Each value starts where the last one ended, so there isn't much to do in parallel.

Cloudflare Workers are only half measured. I've run them locally in workerd, not on Cloudflare's servers, and decoding there was close to Node in some runs and up to 1.8 times slower in others, with nothing changed in between. I haven't found out why.

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

The precision isn't stored in the string, so a `polyline6` string decoded at precision 5 gives coordinates ten times too big, with no error. That's what the presets are for. The adapters for Leaflet, Turf, OpenLayers, MapLibre, deck.gl and Google Maps, and the CLI, are in the [README](https://github.com/Duoquote/polytini#readme) as well.
