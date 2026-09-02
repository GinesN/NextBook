const demoUrl = 'https://ginesn.github.io/NextBook/';
const panel = document.querySelector('#step-panel');
const examples = {
  reflexivo: { label: 'Para pensar', description: 'Historias que invitan a mirar el mundo desde otro lugar.', books: [['Don Quijote', 'Miguel de Cervantes'], ['Cien años de soledad', 'Gabriel García Márquez'], ['Orgullo y prejuicio', 'Jane Austen']] },
  emocional: { label: 'Para emocionarme', description: 'Personajes, vínculos y emociones que se quedan contigo.', books: [['Orgullo y prejuicio', 'Jane Austen'], ['Jane Eyre', 'Charlotte Brontë'], ['Mujercitas', 'Louisa May Alcott']] },
  aventura: { label: 'Para evadirme', description: 'Viajes y nuevas perspectivas para salir de lo cotidiano.', books: [['El hobbit', 'J. R. R. Tolkien'], ['La isla del tesoro', 'Robert Louis Stevenson'], ['La vuelta al mundo en ochenta días', 'Jules Verne']] }
};
let mood = 'reflexivo';
function renderStep(index) {
  document.querySelectorAll('[data-step]').forEach(button => {
    const active = Number(button.dataset.step) === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#step-count').textContent = `0${index + 1} / 03`;
  if (index === 0) {
    panel.innerHTML = `<h3>¿Y si tu próximo libro<br>está aquí?</h3><p>Escanea y descubre la demo.</p><a class="qr-link" href="${demoUrl}"><img src="./qr-demo.png" width="128" height="128" alt="Código QR para abrir la demo de NextBook"></a><a class="text-link" style="align-self:center" href="${demoUrl}">O ábrela desde aquí ↗</a>`;
  } else if (index === 1) {
    panel.innerHTML = `<h3>¿Qué te apetece leer?</h3><p>Prueba a elegir un momento.</p><div class="mood-options" aria-label="Tu momento lector">${Object.entries(examples).map(([key, value]) => `<button type="button" data-mood="${key}" aria-pressed="${key === mood}">${value.label}</button>`).join('')}</div><p class="preview-hint" id="mood-hint">${examples[mood].description}</p><button type="button" class="button" id="show-example" style="align-self:center">Ver ejemplo <span aria-hidden="true">→</span></button>`;
    panel.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => {
      mood = button.dataset.mood;
      panel.querySelectorAll('[data-mood]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.mood === mood)));
      document.querySelector('#mood-hint').textContent = examples[mood].description;
    }));
    document.querySelector('#show-example').addEventListener('click', () => renderStep(2));
  } else {
    panel.innerHTML = `<h3 class="result-heading">Tres puertas a otra historia.</h3><p style="text-align:left">${examples[mood].label}. Selección ilustrativa.</p>${examples[mood].books.map(([title, author], index) => `<div class="recommendation"><span>0${index + 1}</span><div><strong>${title}</strong><small>${author}</small></div></div>`).join('')}<a class="text-link preview-demo-link" href="${demoUrl}">Obtener mis recomendaciones reales ↗</a>`;
  }
}
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => renderStep(Number(button.dataset.step))));
renderStep(0);
document.querySelector('#year').textContent = new Date().getFullYear();
