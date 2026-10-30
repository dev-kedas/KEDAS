import { ic, pad, iso, parse, todayD, fmt } from './utils.js';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2024, i, 1)));
const pop = document.createElement('div');
pop.className = 'dp-pop'; pop.setAttribute('popover', 'manual'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Pilih tanggal');
let cur = null, view = null, mode = 'days';

const label = inp => inp.getAttribute('aria-label') || 'Pilih tanggal';
const sync = (inp, btn) => { btn.querySelector('span').textContent = inp.value ? fmt(inp.value) : label(inp); btn.classList.toggle('empty', !inp.value); };

function draw() {
  const { inp } = cur, sel = inp.value, today = iso(todayD()), min = inp.min, max = inp.max;
  const head = (title, prev, next) => `<div class="dp-head"><button type="button" class="dp-nav" data-dp="${prev}" aria-label="Sebelumnya">${ic('arrow')}</button><button type="button" class="dp-title" data-dp="mode">${title}</button><button type="button" class="dp-nav" data-dp="${next}" aria-label="Berikutnya">${ic('arrow')}</button></div>`;
  let body;
  if (mode === 'months') {
    body = head(view.y, 'py', 'ny') + `<div class="dp-months">${MONTHS.map((n, i) => `<button type="button" data-dp="m" data-v="${i}" class="${i === view.m ? 'on' : ''}">${n.slice(0, 3)}</button>`).join('')}</div>`;
  } else {
    const first = new Date(view.y, view.m, 1), lead = (first.getDay() + 6) % 7, total = new Date(view.y, view.m + 1, 0).getDate();
    const cells = [...Array(lead).fill('<i></i>')];
    for (let d = 1; d <= total; d++) {
      const v = `${view.y}-${pad(view.m + 1)}-${pad(d)}`, off = (min && v < min) || (max && v > max);
      cells.push(`<button type="button" data-dp="d" data-v="${v}" class="${v === sel ? 'on' : ''} ${v === today ? 'today' : ''}" ${off ? 'disabled' : ''}>${d}</button>`);
    }
    body = head(`${MONTHS[view.m]} ${view.y}`, 'pm', 'nm') + `<div class="dp-week">${DAYS.map(d => `<span>${d}</span>`).join('')}</div><div class="dp-days">${cells.join('')}</div>
      <div class="dp-foot"><button type="button" data-dp="today" ${(max && today > max) || (min && today < min) ? 'disabled' : ''}>Hari ini</button>${inp.required ? '' : '<button type="button" data-dp="clear">Hapus</button>'}</div>`;
  }
  pop.innerHTML = body;
}

function place() {
  const r = cur.btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.min(Math.max(8, r.left), innerWidth - w - 8);
  const top = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8 ? r.top - 6 - h : r.bottom + 6;
  Object.assign(pop.style, { left: left + 'px', top: Math.max(8, top) + 'px' });
}

function open(inp, btn) {
  if (cur && cur.inp === inp) return close();
  cur = { inp, btn }; mode = 'days';
  const d = inp.value ? parse(inp.value) : todayD(); view = { y: d.getFullYear(), m: d.getMonth() };
  btn.setAttribute('aria-expanded', 'true');
  (btn.closest('dialog') || document.body).appendChild(pop);
  draw(); pop.showPopover(); place();
}
function close() {
  if (!cur) return;
  cur.btn.setAttribute('aria-expanded', 'false'); cur = null;
  try { pop.hidePopover(); } catch { }
}
function pick(v) {
  const { inp, btn } = cur; inp.value = v; sync(inp, btn); close();
  inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
}

pop.addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('[data-dp]'); if (!b || !cur) return;
  const k = b.dataset.dp;
  if (k === 'd') return pick(b.dataset.v);
  if (k === 'today') return pick(iso(todayD()));
  if (k === 'clear') return pick('');
  if (k === 'mode') mode = mode === 'days' ? 'months' : 'days';
  else if (k === 'm') { view.m = +b.dataset.v; mode = 'days'; }
  else if (k === 'pm') { view.m--; if (view.m < 0) { view.m = 11; view.y--; } }
  else if (k === 'nm') { view.m++; if (view.m > 11) { view.m = 0; view.y++; } }
  else if (k === 'py') view.y--;
  else if (k === 'ny') view.y++;
  draw();
});

function enhance(inp) {
  if (inp.dataset.dp) return; inp.dataset.dp = '1';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = inp.className + ' dp-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', label(inp));
  btn.innerHTML = `<span></span>${ic('cal')}`;
  inp.hidden = true; inp.tabIndex = -1; inp.before(btn); sync(inp, btn);
  btn.addEventListener('click', e => { e.stopPropagation(); open(inp, btn); });
  inp.addEventListener('change', () => sync(inp, btn));
  if (inp.id) document.querySelectorAll(`label[for="${inp.id}"]`).forEach(l => l.addEventListener('click', e => { e.preventDefault(); btn.click(); }));
}

export function initDatePickers() {
  const scan = r => r.querySelectorAll && r.querySelectorAll('input[type=date]').forEach(enhance);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches('input[type=date]')) enhance(n); scan(n); } }))).observe(document.body, { childList: true, subtree: true });
  scan(document);
  document.addEventListener('click', e => { if (cur && !pop.contains(e.target) && !cur.btn.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (cur && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  addEventListener('resize', close);
  addEventListener('scroll', e => { if (cur && !pop.contains(e.target)) close(); }, true);
  addEventListener('hashchange', close);
}
