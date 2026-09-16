/* Walking line is a fraction of the image height, measured from its top. */
function createWalkEditor(item, preview) {
  const line = document.createElement('div');
  line.className = 'walk-line';
  line.setAttribute('aria-hidden', 'true');
  preview.append(line);
  const controls = document.createElement('div');
  controls.className = 'walk-controls';
  const label = document.createElement('span');
  const status = document.createElement('span');
  status.className = 'walk-status';
  status.setAttribute('role', 'status');
  let y = item.walkLine.y;
  let revision = 0, pending = false, saving = false, timer;
  const render = () => {
    line.style.top = `clamp(0px, ${y * 100}%, calc(100% - 2px))`;
    label.textContent = `Linka chůze · ${(y * 100).toFixed(1)} % shora · ${Math.round(y * item.size[1])} px`;
  };
  async function save() {
    pending = true;
    if (saving) return;
    saving = true;
    while (pending) {
      pending = false;
      const sentRevision = revision;
      status.textContent = 'Ukládám…';
      try {
        const response = await fetch('/api/level-walk-line', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({level: item.id, variant: item.variant, y})
        });
        if (!response.ok) throw new Error('Uložení selhalo');
        const result = await response.json();
        if (!result.ok) throw new Error('Uložení selhalo');
        if (sentRevision === revision) status.textContent = 'Uloženo';
        else pending = true;
      } catch (error) {
        status.textContent = 'Neuloženo — spusť místní editor a stiskni Uložit.';
        pending = false;
        break;
      }
    }
    saving = false;
  }
  function move(direction, event) {
    y = Math.max(0, Math.min(1, y + direction * (event.shiftKey ? 10 : 1) / item.size[1]));
    revision++;
    render();
    status.textContent = 'Neuložená změna…';
    clearTimeout(timer);
    timer = setTimeout(save, 220);
  }
  const up = document.createElement('button');
  up.textContent = '↑'; up.type = 'button';
  up.setAttribute('aria-label', `Linka výš — ${item.title || item.name}`);
  up.title = 'Nahoru o 1 px; Shift o 10 px';
  up.addEventListener('click', event => move(-1, event));
  const down = document.createElement('button');
  down.textContent = '↓'; down.type = 'button';
  down.setAttribute('aria-label', `Linka níž — ${item.title || item.name}`);
  down.title = 'Dolů o 1 px; Shift o 10 px';
  down.addEventListener('click', event => move(1, event));
  const retry = document.createElement('button');
  retry.textContent = 'Uložit'; retry.type = 'button';
  retry.addEventListener('click', () => {clearTimeout(timer); save();});
  status.textContent = item.walkLine.reviewed ? 'Uloženo' : 'Výchozí odhad — dolaď šipkami';
  controls.append(label, up, down, retry, status);
  render();
  return controls;
}
