// El grafico de inventario de componentes. La entrada por scroll que vivia
// aqui es ahora `js/reveal.js`, que cargan las seis paginas de caso.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chartEl = document.getElementById('chart-component-inventory');
  let chart;
  const initChart = () => {
    if (!chartEl || !window.echarts || chart) return;
    // Los nombres salen del respaldo HTML, que build-i18n sí traduce: escritos
    // aquí, la página española pintaba «Atoms / Organisms / Molecules». Se
    // casan por la cifra porque el respaldo y el gráfico no van en el mismo
    // orden.
    const names = {};
    chartEl.querySelectorAll('.atom-echart__fallback span').forEach(span => {
      const figure = span.querySelector('b');
      if (figure) names[figure.textContent.trim()] = span.lastChild.textContent.trim();
    });
    const name = (figure, fallback) => names[figure] || fallback;
    // Los colores, del tema: el gris azulado de antes se quedaba frío sobre
    // kinari. Los literales quedan de respaldo.
    const root = getComputedStyle(document.documentElement);
    const tok = (prop, fallback) => root.getPropertyValue(prop).trim() || fallback;
    const ink = tok('--semantic-color-text', '#080F1A');
    const brand = tok('--semantic-color-primary', '#1E3AFF');
    const axis = tok('--semantic-color-text-muted', '#62656F');
    const rule = tok('--semantic-color-border', '#D6D0C3');
    const idle = tok('--semantic-color-border-strong', '#C6BFB0');
    chartEl.innerHTML = '';
    chart = echarts.init(chartEl);
    chart.setOption({
      animation: !reduced,
      animationDuration: 850,
      animationEasing: 'cubicOut',
      aria: { enabled: true },
      textStyle: { fontFamily: 'Inter, sans-serif', color: ink },
      grid: { left: 18, right: 52, top: 26, bottom: 22, containLabel: true },
      xAxis: {
        type: 'value', max: 80,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: axis },
        splitLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: 'category',
        data: [name('31', 'Atoms'), name('32', 'Organisms'), name('71', 'Molecules')],
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: ink, fontWeight: 600 }
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      series: [{
        type: 'bar',
        barWidth: 22,
        data: [
          { value: 31, itemStyle: { color: idle, borderRadius: [0,3,3,0] } },
          { value: 32, itemStyle: { color: '#7187FF', borderRadius: [0,3,3,0] } },
          { value: 71, itemStyle: { color: brand, borderRadius: [0,3,3,0] } }
        ],
        label: { show: true, position: 'right', color: ink, fontWeight: 700 }
      }]
    });
  };

  if (chartEl && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        initChart();
        cio.disconnect();
      }
    }, { threshold: .25 });
    cio.observe(chartEl);
  } else {
    initChart();
  }

  window.addEventListener('resize', () => chart?.resize());
})();
