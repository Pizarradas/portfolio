/* Selected work — evidence reveals.
 *
 * The section opens the page's argument, so its two strongest pieces of
 * evidence arrive rather than just being there:
 *
 *   - the four mastheads come in one after another, which is the claim the
 *     card makes in visual form: one architecture, four editorial identities
 *   - the study bars grow to the percentage printed beside them
 *
 * Scrubbed against scroll like the career chart and the map figure, so the
 * whole section shares one motion language.
 *
 * Initial states are set from JS. With no JS, with GSAP unavailable, or under
 * prefers-reduced-motion, the finished section is what renders — the bars are
 * already at their measured width because that width comes from --value in the
 * markup, not from the animation.
 */
(() => {
  'use strict';

  const section = document.querySelector('.org-work');
  if (!section || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const mastheads = Array.from(
      section.querySelectorAll('.mol-evidence-system__stack figure')
    );
    const foundation = Array.from(
      section.querySelectorAll('.mol-evidence-system__foundation span')
    );
    const bars = Array.from(section.querySelectorAll('.mol-evidence-study__bars i'));

    const cleanup = [];

    if (mastheads.length) {
      gsap.set(mastheads, { opacity: 0, y: 18 });
      gsap.set(foundation, { opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section.querySelector('.mol-evidence-system'),
          start: 'top 85%',
          end: 'bottom 70%',
          scrub: 0.5,
        },
      });

      tl.to(mastheads, { opacity: 1, y: 0, duration: 0.6, stagger: 0.18 }, 0)
        .to(foundation, { opacity: 1, duration: 0.4, stagger: 0.08 }, 0.7);

      cleanup.push(() => gsap.set([...mastheads, ...foundation], { clearProps: 'all' }));
    }

    if (bars.length) {
      // scaleX rather than width: the width is the measured value and stays
      // exactly where the markup put it, so a half-played animation can never
      // show a percentage that was not observed.
      gsap.set(bars, { scaleX: 0 });

      gsap.to(bars, {
        scaleX: 1,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: bars[0].closest('.mol-evidence-study'),
          start: 'top 85%',
          end: 'bottom 75%',
          scrub: 0.5,
        },
      });

      cleanup.push(() => gsap.set(bars, { clearProps: 'all' }));
    }

    return () => cleanup.forEach(fn => fn());
  });
})();
