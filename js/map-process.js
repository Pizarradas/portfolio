/* Interactive media map — the "static image → structured data" figure.
 *
 * The argument the section makes is that the locations stopped being pixels
 * and became rows, so that is what the motion shows: the points start in a
 * plain block, one slot per row of the sheet, and travel to the coordinates
 * they actually hold. Nothing else moves much, because nothing else is the
 * point.
 *
 * The markup ships in its finished state — every circle already carries its
 * geographic cx/cy, and the block position lives in data-gx/data-gy. With no
 * JS, or with GSAP unavailable, the correct map is what renders. Same contract
 * as career-timeline.js.
 */
(() => {
  'use strict';

  const figure = document.querySelector('.mol-map-shift');
  if (!figure || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const raster = figure.querySelectorAll('.mol-map-shift__raster');
  const land = figure.querySelector('.mol-map-shift__land');
  const regions = figure.querySelector('.mol-map-shift__regions');
  const frame = figure.querySelector('.mol-map-shift__frame');
  const points = Array.from(figure.querySelectorAll('.mol-map-shift__points circle'));

  if (!land || !regions || !points.length) return;

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // The region mesh is one path made of many subpaths. A dash the length of
    // the whole thing still draws them in document order, which reads as the
    // borders being surveyed rather than switched on.
    const meshLength = regions.getTotalLength();
    gsap.set(regions, { strokeDasharray: meshLength, strokeDashoffset: meshLength });

    gsap.set([land, frame], { opacity: 0 });
    gsap.set(raster, { opacity: 0, scale: 0.985, transformOrigin: 'center' });

    // Offsets, not absolute coordinates: the circle keeps the geographic
    // position it was built with, and the transform is what gets animated
    // away. Nothing here can leave the map in a wrong state.
    points.forEach(point => {
      gsap.set(point, {
        x: Number(point.dataset.gx) - Number(point.getAttribute('cx')),
        y: Number(point.dataset.gy) - Number(point.getAttribute('cy')),
        opacity: 0,
        scale: 0.6,
        transformOrigin: 'center',
      });
    });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: figure,
        start: 'top 80%',
        end: 'bottom 65%',
        scrub: 0.6,
      },
    });

    tl.to(raster, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.12 }, 0)
      .to(land, { opacity: 1, duration: 0.6 }, 0.2)
      .to(regions, { strokeDashoffset: 0, duration: 1.6 }, 0.3)
      .to(frame, { opacity: 1, duration: 0.5 }, 1.1)
      // The block dissolves into the country. Points leave in the order they
      // sit in the sheet, so the stagger reads as rows being processed.
      .to(
        points,
        {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: { each: 0.012, from: 'start' },
        },
        0.55
      )
      .to(
        points,
        {
          x: 0,
          y: 0,
          duration: 1.1,
          ease: 'power2.inOut',
          stagger: { each: 0.012, from: 'start' },
        },
        0.6
      );

    return () => {
      // Hand the finished figure back before the reduced-motion branch takes
      // over, rather than whatever frame the scrub happened to stop on.
      gsap.set([...raster, land, regions, frame, ...points], { clearProps: 'all' });
    };
  });
})();
