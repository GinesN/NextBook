const integer = value => Number.isSafeInteger(value) && value >= 0;
export function isBookstoreStatistics(value) {
  return value && typeof value === 'object' && typeof value.bookstoreSlug === 'string'
    && typeof value.bookstoreName === 'string' && typeof value.trackingSince === 'string'
    && validDate(value.startDate) && validDate(value.endDate) && value.startDate <= value.endDate
    && ['totalCompleted', 'periodCompleted', 'totalRecommendations', 'uniqueBooks'].every(key => integer(value[key]))
    && Array.isArray(value.daily) && value.daily.every(day => validDate(day.date) && integer(day.count))
    && Array.isArray(value.books) && value.books.every(book => typeof book.id === 'string'
      && typeof book.title === 'string' && typeof book.author === 'string'
      && integer(book.count) && integer(book.firstCount) && book.firstCount <= book.count);
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayInTimezone(timezone = 'Europe/Madrid', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(value, count) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function statisticsDateRange(period, timezone, customStart, customEnd, now) {
  const today = todayInTimezone(timezone, now);
  if (period === 'today') return { start: today, end: today };
  if (period === '7days') return { start: addDays(today, -6), end: today };
  if (period === 'month') return { start: `${today.slice(0, 7)}-01`, end: today };
  if (period === 'all') return { start: null, end: today };
  if (period === 'custom' && validDate(customStart) && validDate(customEnd) && customStart <= customEnd
    && customEnd <= today && (new Date(customEnd) - new Date(customStart)) / 86400000 <= 36525) {
    return { start: customStart, end: customEnd };
  }
  throw new Error('Elige un intervalo válido, con la fecha final igual o anterior a hoy.');
}

export function completeDailySeries(statistics) {
  const counts = new Map(statistics.daily.map(day => [day.date, day.count]));
  const days = [];
  for (let date = statistics.startDate; date <= statistics.endDate; date = addDays(date, 1)) {
    days.push({ date, count: counts.get(date) ?? 0 });
    if (days.length > 36526) throw new Error('El intervalo es demasiado amplio.');
  }
  return days;
}

export function chartSeries(statistics) {
  const days = completeDailySeries(statistics);
  if (days.length <= 92) return { unit: 'day', points: days };
  const months = new Map();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + day.count);
  }
  if (months.size <= 60) return { unit: 'month', points: [...months].map(([date, count]) => ({ date: `${date}-01`, count })) };
  const years = new Map();
  for (const [month, count] of months) years.set(month.slice(0, 4), (years.get(month.slice(0, 4)) ?? 0) + count);
  return { unit: 'year', points: [...years].map(([date, count]) => ({ date: `${date}-01-01`, count })) };
}

export function sortedBooks(statistics, order = 'count') {
  return [...statistics.books].sort((a, b) => order === 'first'
    ? b.firstCount - a.firstCount || b.count - a.count || a.title.localeCompare(b.title, 'es')
    : b.count - a.count || b.firstCount - a.firstCount || a.title.localeCompare(b.title, 'es'));
}

const csvCell = value => {
  let text = String(value ?? '');
  // Spreadsheet formulas must not execute when a catalog title is exported.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export function statisticsCsv(statistics) {
  const rows = [
    ['Librería', statistics.bookstoreName], ['Identificador', statistics.bookstoreSlug],
    ['Desde', statistics.startDate], ['Hasta', statistics.endDate],
    ['Cuestionarios acumulados', statistics.totalCompleted], ['Cuestionarios del periodo', statistics.periodCompleted],
    ['Recomendaciones del periodo', statistics.totalRecommendations], ['Libros distintos', statistics.uniqueBooks], [],
    ['LIBROS MÁS RECOMENDADOS'], ['Posición', 'ISBN / identificador', 'Título', 'Autor', 'Apariciones', 'Primera opción', '% de cuestionarios'],
    ...sortedBooks(statistics).map((book, index) => [index + 1, book.id, book.title, book.author, book.count,
      book.firstCount, statistics.periodCompleted ? (book.count * 100 / statistics.periodCompleted).toFixed(2).replace('.', ',') : '0']),
    [], ['EVOLUCIÓN DIARIA'], ['Fecha', 'Cuestionarios completados'],
    ...completeDailySeries(statistics).map(day => [day.date, day.count]),
  ];
  return `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}
