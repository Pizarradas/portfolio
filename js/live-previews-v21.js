// El encaje de las previsualizaciones en vivo.
//
// Este script escribe `style` en línea sobre el iframe, así que **gana a
// cualquier regla de la hoja**: mientras esto fije `width: 1440px`, da igual lo
// que diga `_live-preview.scss`. Costó tres intentos de arreglarlo en CSS antes
// de mirar aquí.
//
// Lo que hacía mal: `Math.min(1, ancho / 1440)`. Ese tope en 1 estaba pensado
// para no ampliar el render, pero cuando el marco es más ancho que la fuente
// —la sección corre en registro `showcase`, 2304px— dejaba el iframe clavado en
// 1440 y el resto del marco enseñando su fondo: 863px de azul muerto.
//
// Ahora hay dos casos y cada uno hace lo suyo:
//
//   marco >= 1440  el iframe mide el marco y no se escala. La página embebida
//                  reflowea a su ancho real, que es lo que hace una página de
//                  verdad, y se ve nítida en vez de ampliada.
//   marco <  1440  se mantiene el render a 1440 y se encoge, para que siga
//                  enseñando su composición de escritorio. El alto se
//                  compensa dividiendo por la escala, de modo que el render
//                  cubre el marco entero.
(() => {
  const SOURCE_WIDTH = 1440;

  const scaleFrame = (viewport, iframe) => {
    if (!viewport || !iframe) return;
    const width = viewport.clientWidth;

    if (width >= SOURCE_WIDTH) {
      iframe.style.transform = "none";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      return;
    }

    const scale = width / SOURCE_WIDTH;
    // El origen viaja con la transformacion, no en la hoja.
    //
    // Vivia en el CSS (`transform-origin: 0 0`) y al simplificar esa regla se
    // fue con ella, asi que el `scale` de aqui empezo a encoger **desde el
    // centro**: el render de 1440 escalado a 1140 quedaba centrado dentro de su
    // caja de 1440, o sea metido 150px por la izquierda y cortado por la
    // derecha. Es justo lo que se veia en el duo de ATLAS.
    //
    // Quien escribe `transform` escribe su origen. Separarlos fue el fallo.
    iframe.style.transformOrigin = "0 0";
    iframe.style.transform = `scale(${scale})`;
    iframe.style.width = `${SOURCE_WIDTH}px`;
    // Sin suelo. El alto del iframe **es** la ventana que ve la página embebida,
    // y estas dos son portadas editoriales con héroe a `100vh`: forzar 1000px de
    // fuente dentro de un marco que solo enseña 860 hacía que la página
    // compusiera su héroe contra 1000 y se viera desplazado —franja negra arriba
    // y titular cortado abajo—. Con el alto exacto, lo que se ve es el primer
    // pantallazo real de la página.
    iframe.style.height = `${viewport.clientHeight / scale}px`;
  };

  const frames = [
    ...document.querySelectorAll(
      ".mol-live-preview__stage iframe, .mol-browser-preview__viewport iframe"
    ),
  ];

  frames.forEach((frame) => {
    const viewport = frame.parentElement;
    scaleFrame(viewport, frame);
    frame.addEventListener(
      "load",
      () => {
        viewport.classList.add("is-loaded");
        scaleFrame(viewport, frame);
      },
      { once: true }
    );
  });

  let raf;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() =>
      frames.forEach((f) => scaleFrame(f.parentElement, f))
    );
  });
})();

// Aquí había tres bloques más, cada uno con su propio listener de resize:
// escalaban `.mol-register-preview__viewport`, su variante `--cropped` y
// `.mol-project-hero-v27__viewport`. Ninguna de esas tres clases existe ya en
// el marcado — el bloque de registros usa `.mol-register__frame`, que gestiona
// js/register-previews.js. Eran tres listeners registrados para nada.
