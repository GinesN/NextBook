import { addDays, chartSeries, isBookstoreStatistics, sortedBooks, statisticsCsv, statisticsDateRange, todayInTimezone } from './bookstore-statistics.js';

const $ = selector => document.querySelector(selector);
const numberFormat = new Intl.NumberFormat('es-ES');
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const displayDate = date => dateFormat.format(new Date(`${date}T12:00:00Z`));
const svgNamespace = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes = {}, text) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

function drawChart(statistics) {
  const { points, unit } = chartSeries(statistics);
  $('#chart-unit').textContent = { day: 'Por día', month: 'Por mes', year: 'Por año' }[unit];
  const width = window.innerWidth < 600 ? 400 : 960;
  const left = 42;
  const right = width - 24;
  const svg = svgElement('svg', { viewBox: `0 0 ${width} 250`, role: 'img', 'aria-labelledby': 'activity-chart-title activity-chart-description' });
  svg.append(svgElement('title', { id: 'activity-chart-title' }, 'Evolución de cuestionarios completados'));
  svg.append(svgElement('desc', { id: 'activity-chart-description' },
    `${numberFormat.format(statistics.periodCompleted)} cuestionarios entre el ${displayDate(statistics.startDate)} y el ${displayDate(statistics.endDate)}. Los datos diarios completos se incluyen en el CSV.`));
  const max = Math.max(1, ...points.map(point => point.count));
  const step = Math.max(1, Math.ceil(max / 4));
  const ceiling = step * 4;
  const x = index => points.length === 1 ? (left + right) / 2 : left + index * (right - left) / (points.length - 1);
  const y = count => 208 - count * 180 / ceiling;
  for (let tick = 0; tick <= 4; tick++) {
    const height = y(tick * step);
    svg.append(svgElement('line', { x1: left, x2: right, y1: height, y2: height, class: 'chart-grid' }));
    svg.append(svgElement('text', { x: left - 12, y: height + 4, 'text-anchor': 'end', class: 'chart-axis' }, numberFormat.format(tick * step)));
  }
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.count)}`).join(' ');
  if (points.length > 1) {
    svg.append(svgElement('path', { d: `${path} L${right},208 L${left},208 Z`, class: 'chart-area' }));
    svg.append(svgElement('path', { d: path, class: 'chart-line' }));
  }
  const labelEvery = Math.max(1, Math.ceil((points.length - 1) / (width < 600 ? 3 : 5)));
  points.forEach((point, index) => {
    const dot = svgElement('circle', { cx: x(index), cy: y(point.count), r: points.length > 45 ? 2 : 4, class: 'chart-dot' });
    dot.append(svgElement('title', {}, `${displayDate(point.date)}: ${numberFormat.format(point.count)} cuestionarios`));
    svg.append(dot);
    if (index % labelEvery === 0 || index === points.length - 1 && index % labelEvery > labelEvery / 2) {
      const label = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'UTC', ...(unit === 'year' ? { year: 'numeric' } : unit === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }),
      }).format(new Date(`${point.date}T12:00:00Z`));
      svg.append(svgElement('text', { x: x(index), y: 240, 'text-anchor': index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle', class: 'chart-axis' }, label));
    }
  });
  $('#statistics-chart').replaceChildren(svg);
  $('#chart-caption').textContent = statistics.periodCompleted === 0
    ? 'Todavía no hay cuestionarios completados en este periodo. Comparte el QR de tu librería para empezar.'
    : unit === 'day' ? 'Actividad diaria. Los días sin cuestionarios también aparecen en el gráfico.'
      : 'El gráfico agrupa los periodos largos para facilitar la lectura. El CSV conserva el detalle de cada día.';
}

export function createBookstoreDashboard(client) {
  let stores = [];
  let activeStore;
  let statistics;
  let requestVersion = 0;
  let storeVersion = 0;
  let page = 0;
  const pageSize = 10;

  const setStatus = (text, error = false) => {
    $('#statistics-status').textContent = text;
    $('#statistics-status').classList.toggle('is-error', error);
  };

  function reset() {
    requestVersion++;
    storeVersion++;
    stores = [];
    activeStore = undefined;
    statistics = undefined;
    $('#statistics-content').hidden = true;
    $('#statistics-export').disabled = true;
    $('#statistics-content').setAttribute('aria-busy', 'false');
    for (const id of ['#stat-total', '#stat-period', '#stat-recommendations', '#stat-unique']) $(id).textContent = '—';
    for (const id of ['#stats-tracking', '#stats-range', '#statistics-updated']) $(id).textContent = '';
    $('#bookstore-selector').replaceChildren();
    $('#ranking-body').replaceChildren();
    $('#statistics-chart').replaceChildren();
    setStatus('');
  }

  // All URLs must remain inside the site, including for future bookstore records.
  const siteRoot = new URL('../', window.location.href);
  function localLink(path, slug, quiz = false) {
    if (siteRoot.pathname !== '/' && quiz) return `${siteRoot.href}?libreria=${encodeURIComponent(slug)}`;
    if (typeof path !== 'string' || !/^\/[a-z0-9/.-]+$/.test(path) || path.includes('..') || path.startsWith('//')) {
      throw new Error('La configuración de la librería no es válida.');
    }
    return new URL(path.slice(1), siteRoot).href;
  }

  function renderStore(store) {
    const quizUrl = localLink(store.questionnaire_path, store.slug, true);
    const qrUrl = localLink(store.qr_path, store.slug);
    $('#dashboard-title').textContent = store.name;
    $('#bookstore-card-title').textContent = store.name;
    $('#bookstore-catalog-label').textContent = `CATÁLOGO DE ${store.name.toUpperCase()}`;
    $('#bookstore-mark').textContent = store.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('');
    $('#bookstore-quiz-link').href = quizUrl;
    $('#bookstore-qr-link').href = quizUrl;
    $('#bookstore-qr-download').href = qrUrl;
    $('#bookstore-qr-download').download = `NextBook-${store.slug}-QR.svg`;
    $('#bookstore-qr-image').src = qrUrl;
    $('#bookstore-qr-image').alt = `Código QR que abre el cuestionario de NextBook para ${store.name}`;
    $('#bookstore-qr-description').textContent = `Coloca este QR en ${store.name}. Quien lo escanee abrirá directamente el cuestionario de la librería, sin iniciar sesión.`;
    $('#bookstore-qr-caption').textContent = `${store.name} · NextBook`;
    const today = todayInTimezone(store.timezone);
    $('#statistics-start').max = today;
    $('#statistics-end').max = today;
    if (!$('#statistics-start').value) $('#statistics-start').value = addDays(today, -6);
    if (!$('#statistics-end').value) $('#statistics-end').value = today;
  }

  function renderRanking() {
    if (!statistics) return;
    const books = sortedBooks(statistics, $('#ranking-order').value);
    const pages = Math.max(1, Math.ceil(books.length / pageSize));
    page = Math.min(page, pages - 1);
    const body = $('#ranking-body');
    body.replaceChildren();
    for (const [index, book] of books.slice(page * pageSize, (page + 1) * pageSize).entries()) {
      const row = document.createElement('tr');
      const rank = document.createElement('td');
      rank.className = 'rank-cell';
      rank.textContent = String(page * pageSize + index + 1).padStart(2, '0');
      const description = document.createElement('th');
      description.scope = 'row';
      description.className = 'book-description';
      const title = document.createElement('span');
      title.className = 'ranking-book-title';
      title.textContent = book.title;
      const author = document.createElement('span');
      author.className = 'ranking-book-author';
      author.textContent = book.author || 'Autor sin especificar';
      const isbn = document.createElement('span');
      isbn.className = 'ranking-book-id';
      isbn.textContent = book.id;
      description.append(title, author, isbn);
      row.append(rank, description);
      const percent = statistics.periodCompleted ? book.count / statistics.periodCompleted : 0;
      for (const value of [numberFormat.format(book.count), numberFormat.format(book.firstCount),
        new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(percent)]) {
        const cell = document.createElement('td');
        cell.className = 'number-column';
        cell.textContent = value;
        row.append(cell);
      }
      body.append(row);
    }
    $('#ranking-empty').hidden = books.length > 0;
    $('#ranking-table-wrap').hidden = books.length === 0;
    $('#ranking-pagination').hidden = books.length <= pageSize;
    $('#ranking-previous').disabled = page === 0;
    $('#ranking-next').disabled = page >= pages - 1;
    $('#ranking-page-label').textContent = `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, books.length)} de ${numberFormat.format(books.length)} libros`;
  }

  async function refresh() {
    if (!activeStore) return;
    const version = ++requestVersion;
    const store = activeStore;
    statistics = undefined;
    $('#statistics-content').hidden = true;
    $('#statistics-export').disabled = true;
    $('#statistics-refresh').disabled = true;
    $('#statistics-content').setAttribute('aria-busy', 'true');
    setStatus('Consultando la actividad de tu librería…');
    try {
      const range = statisticsDateRange($('#statistics-period').value, store.timezone,
        $('#statistics-start').value, $('#statistics-end').value);
      const { data, error } = await client.rpc('bookstore_statistics', {
        p_bookstore_slug: store.slug, p_start_date: range.start, p_end_date: range.end,
      });
      if (version !== requestVersion) return;
      if (error) throw new Error('No se han podido consultar las estadísticas. Pulsa «Actualizar» para volver a intentarlo.');
      if (!isBookstoreStatistics(data) || data.bookstoreSlug !== store.slug) throw new Error('No se han podido leer las estadísticas. Vuelve a intentarlo.');
      statistics = data;
      page = 0;
      $('#stat-total').textContent = numberFormat.format(data.totalCompleted);
      $('#stat-period').textContent = numberFormat.format(data.periodCompleted);
      $('#stat-recommendations').textContent = numberFormat.format(data.totalRecommendations);
      $('#stat-unique').textContent = numberFormat.format(data.uniqueBooks);
      $('#stats-tracking').textContent = `Desde el ${displayDate(todayInTimezone(store.timezone, new Date(data.trackingSince)))}`;
      $('#stats-range').textContent = `${displayDate(data.startDate)} — ${displayDate(data.endDate)}`;
      drawChart(data);
      renderRanking();
      $('#statistics-updated').textContent = `Actualizado a las ${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: store.timezone }).format(new Date())} · Horario de la librería`;
      $('#statistics-content').hidden = false;
      $('#statistics-export').disabled = false;
      setStatus(data.periodCompleted ? '' : 'El registro está activo. Todavía no hay actividad en el periodo seleccionado.');
    } catch (error) {
      if (version === requestVersion) setStatus(error instanceof Error ? error.message : 'No se ha podido conectar. Vuelve a intentarlo.', true);
    } finally {
      if (version === requestVersion) {
        $('#statistics-refresh').disabled = false;
        $('#statistics-content').setAttribute('aria-busy', 'false');
      }
    }
  }

  async function loadStores() {
    const version = ++storeVersion;
    const { data, error } = await client.from('bookstores')
      .select('slug,name,questionnaire_path,qr_path,timezone,tracking_since').eq('active', true).order('name');
    if (version !== storeVersion) return false;
    if (error) throw new Error('No se ha podido comprobar el acceso a tu librería. Inténtalo de nuevo.');
    stores = data ?? [];
    if (!stores.length) return false;
    activeStore = stores.find(store => store.slug === activeStore?.slug) ?? stores[0];
    const selector = $('#bookstore-selector');
    selector.replaceChildren();
    for (const store of stores) {
      const option = document.createElement('option');
      option.value = store.slug;
      option.textContent = store.name;
      selector.append(option);
    }
    selector.value = activeStore.slug;
    $('#bookstore-selector-wrap').hidden = stores.length < 2;
    renderStore(activeStore);
    void refresh();
    return true;
  }

  $('#bookstore-selector').addEventListener('change', () => {
    activeStore = stores.find(store => store.slug === $('#bookstore-selector').value);
    if (!activeStore) return;
    renderStore(activeStore);
    void refresh();
  });
  $('#statistics-period').addEventListener('change', () => {
    const custom = $('#statistics-period').value === 'custom';
    $('#custom-dates').hidden = !custom;
    // Selecting custom dates immediately invalidates the previous export/data.
    requestVersion++;
    statistics = undefined;
    $('#statistics-content').hidden = true;
    $('#statistics-export').disabled = true;
    if (custom) {
      $('#statistics-refresh').disabled = false;
      setStatus('Elige las fechas y pulsa «Aplicar».');
    } else void refresh();
  });
  for (const id of ['#statistics-start', '#statistics-end']) $(id).addEventListener('change', () => {
    requestVersion++;
    statistics = undefined;
    $('#statistics-content').hidden = true;
    $('#statistics-export').disabled = true;
    $('#statistics-refresh').disabled = false;
    setStatus('Pulsa «Aplicar» para consultar el intervalo elegido.');
  });
  $('#statistics-filters').addEventListener('submit', event => { event.preventDefault(); void refresh(); });
  $('#statistics-refresh').addEventListener('click', () => void refresh());
  $('#ranking-order').addEventListener('change', () => { page = 0; renderRanking(); });
  $('#ranking-previous').addEventListener('click', () => { page--; renderRanking(); });
  $('#ranking-next').addEventListener('click', () => { page++; renderRanking(); });
  $('#statistics-export').addEventListener('click', () => {
    if (!statistics) return;
    const blob = new Blob([statisticsCsv(statistics)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NextBook-${statistics.bookstoreSlug}-${statistics.startDate}-${statistics.endDate}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  let chartFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(chartFrame);
    chartFrame = requestAnimationFrame(() => {
      if (statistics && !$('#statistics-content').hidden) drawChart(statistics);
    });
  });
  return { loadStores, reset };
}
