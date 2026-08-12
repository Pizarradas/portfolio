
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = [...document.querySelectorAll('.js-reveal')];

  const show = el => {
    el.classList.add('is-visible');
    el.querySelectorAll('.js-count').forEach(counter => {
      if (counter.dataset.done) return;
      counter.dataset.done = '1';
      const target = Number(counter.dataset.count || 0);
      if (reduced) { counter.textContent = target; return; }
      const start = performance.now();
      const duration = 750;
      const tick = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        counter.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .18 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(show);
  }

  const chartEl = document.getElementById('chart-component-inventory');
  let chart;
  const initChart = () => {
    if (!chartEl || !window.echarts || chart) return;
    chartEl.innerHTML = '';
    chart = echarts.init(chartEl);
    chart.setOption({
      animation: !reduced,
      animationDuration: 850,
      animationEasing: 'cubicOut',
      aria: { enabled: true },
      textStyle: { fontFamily: 'Inter, sans-serif', color: '#080F1A' },
      grid: { left: 18, right: 52, top: 26, bottom: 22, containLabel: true },
      xAxis: {
        type: 'value', max: 80,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#6B7280' },
        splitLine: { lineStyle: { color: '#EEF1F6' } }
      },
      yAxis: {
        type: 'category',
        data: ['Atoms', 'Organisms', 'Molecules'],
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#080F1A', fontWeight: 600 }
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      series: [{
        type: 'bar',
        barWidth: 22,
        data: [
          { value: 31, itemStyle: { color: '#CBD2DD', borderRadius: [0,3,3,0] } },
          { value: 32, itemStyle: { color: '#7187FF', borderRadius: [0,3,3,0] } },
          { value: 71, itemStyle: { color: '#1E3AFF', borderRadius: [0,3,3,0] } }
        ],
        label: { show: true, position: 'right', color: '#080F1A', fontWeight: 700 }
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
