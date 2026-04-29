const sections = Array.from(document.querySelectorAll('.scroll-section'));
const variantContents = Array.from(document.querySelectorAll('.variant-content'));
const variantComponent = document.getElementById('variantComponent');

// Maps each scroll section to the variant shown while scrolling through it
const sectionToVariant = ['variant2', 'ctx-a', 'variant4', 'ctx-b', 'variant3', 'ctx-c', 'variant5', 'ctx-d'];
let activeVariant = 'default';
let variantLocked = false;

function setVariant(name) {
  if (name === activeVariant) return;

  variantContents.forEach((node) => {
    node.classList.toggle('active', node.dataset.variant === name);
  });

  document.querySelectorAll('.toc-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.variant === name);
  });

  activeVariant = name;

  // Hide scroll hint inside UC (back hint replaces it); restore otherwise
  const scrollHint = document.querySelector('.scroll-hint');
  if (scrollHint) scrollHint.style.visibility = (name === 'variant-uc' || name === 'ctx-d') ? 'hidden' : '';

  // Compute scale once when entering interactive variants
  if (name === 'variant3') updateVariableStudioScale();
  if (name === 'variant4') updateMcpConsoleScale();
  if (name === 'variant5') updateWireframeScale();
  if (name === 'variant-uc') updateUcScale();

  updateContentBoxHeight(name);
}

function getVariantForScroll() {
  const y = window.scrollY;

  if (y < 180) return 'default';

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const top = section.offsetTop - window.innerHeight * 0.35;
    const bottom = section.offsetTop + section.offsetHeight - window.innerHeight * 0.35;
    if (y >= top && y < bottom) return sectionToVariant[i] || 'default';
  }

  const lastSection = sections[sections.length - 1];
  if (lastSection && y >= lastSection.offsetTop - window.innerHeight * 0.35) {
    return sectionToVariant[sectionToVariant.length - 1] || 'default';
  }

  return 'default';
}

let ticking = false;

function updateProgressBar() {
  const divider = document.getElementById('headerDivider');
  if (!divider) return;
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
  divider.style.setProperty('--progress', `${(progress * 100).toFixed(2)}%`);
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    if (!variantLocked) setVariant(getVariantForScroll());
    updateProgressBar();
    ticking = false;
  });
}

function onResize() {
  updateVariableStudioScale();
  updateMcpConsoleScale();
  updateWireframeScale();
  updateUcScale();
  updateContentBoxHeight(activeVariant);
  if (wfActiveElement && wfActiveTriggers.size > 0) setTimeout(drawWfWires, 60);
  if (ucActiveElement && ucActiveTriggers.size > 0) setTimeout(drawUcWires, 60);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onResize);
window.addEventListener('load', () => {
  setVariant('default');
  updateContentBoxHeight('default');
  updateProgressBar();
  initVariableStudio();
  initMcpConsole();
  initWireframeLab();
  initUltimateCards();
  initToc();
  initCtxDButtons();
});

function initToc() {
  const tocLinks = document.querySelectorAll('.toc-link');
  tocLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const variant = link.dataset.variant;
      if (variant === 'default') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const idx = sectionToVariant.indexOf(variant);
        if (idx >= 0 && sections[idx]) {
          window.scrollTo({ top: sections[idx].offsetTop, behavior: 'smooth' });
        }
      }
    });
  });
}

// ─── Variable Studio ────────────────────────────────────────────────────────

const vsTokens = [
  { id: 'tile',          name: '--tile-color',    type: 'color', value: '#d9d9d9', note: '/* Panel background */' },
  { id: 'card',          name: '--card-color',    type: 'color', value: '#855454', note: '/* 5 card rectangles */' },
  { id: 'action',        name: '--action-color',  type: 'color', value: '#515151', note: '/* 3 action ovals */' },
  { id: 'card-radius',   name: '--card-radius',   type: 'size',  value: '16', unit: 'px', min: 2,  max: 30,  step: 1, note: '/* Card corner rounding */' },
  { id: 'action-radius', name: '--action-radius', type: 'size',  value: '90', unit: 'px', min: 20, max: 130, step: 1, note: '/* Action button radius */' },
  { id: 'card-gap',      name: '--card-gap',      type: 'size',  value: '17', unit: 'px', min: 6,  max: 30,  step: 1, note: '/* Spacing between cards */' }
];

let vsActiveTokenId = null;

function initVariableStudio() {
  const rowsHost = document.getElementById('vsTokenRows');
  const preview = document.getElementById('vsPreviewPanel');
  if (!rowsHost || !preview) return;
  renderVsRows();
  updateVsPreview();
  updateVariableStudioScale();
}

function updateVariableStudioScale() {
  const layout = document.querySelector('.variant-variables .vs-layout');
  const box = document.getElementById('variantComponent');
  if (!layout || !box) return;

  const root = getComputedStyle(document.documentElement);
  const safeTop = parseFloat(root.getPropertyValue('--variant-safe-top')) || 112;
  const bottomSpace = 60;
  const leftMargin = Math.max(28, Math.min(0.067 * window.innerWidth, 108));
  const availableWidth = Math.max(box.clientWidth - leftMargin, 0);
  const availableHeight = Math.max(box.clientHeight - safeTop - bottomSpace, 0);
  const scaleX = availableWidth / 1497;
  const scaleY = availableHeight / 736;
  const nextScale = Math.min(scaleX, scaleY, 1);
  const topSpace = Math.max(Math.round(box.clientHeight - bottomSpace - 736 * nextScale), safeTop);

  layout.style.setProperty('--vs-scale', String(nextScale > 0 ? nextScale : 0.1));
  layout.style.setProperty('--vs-top-space', `${topSpace}px`);
}

function updateContentBoxHeight(_activeName) {
  // Height is fully CSS-driven via calc(100dvh - --header-offset - --box-side-margin)
}

function renderVsRows() {
  const rowsHost = document.getElementById('vsTokenRows');
  if (!rowsHost) return;

  rowsHost.innerHTML = vsTokens.map((token) => {
    const selectedClass = token.id === vsActiveTokenId ? ' active' : '';
    const displayValue = `${token.value}${token.unit || ''}`;
    const valueStyle = token.type === 'color'
      ? ` style="color:${displayValue}"`
      : ' style="color:#feb4b4"';

    return `
      <div class="vs-token-row${selectedClass}" data-token-id="${token.id}">
        <div class="vs-code-line">${token.note}</div>
        <div class="vs-code-line"><span class="vs-token-name">${token.name}</span>: <span class="vs-token-value" id="vsTokenValue-${token.id}" data-type="${token.type}"${valueStyle}>${displayValue}</span>;</div>
      </div>
    `;
  }).join('');

  rowsHost.querySelectorAll('.vs-token-row').forEach((row) => {
    row.addEventListener('click', () => {
      vsActiveTokenId = row.getAttribute('data-token-id');
      renderVsRows();
      renderVsPopover();
    });
  });

  renderVsPopover();
}

function renderVsPopover() {
  const popHost = document.getElementById('vsEditorPop');
  if (!popHost) return;

  const token = vsTokens.find((item) => item.id === vsActiveTokenId);
  if (!token) { popHost.innerHTML = ''; return; }

  if (token.type === 'color') {
    popHost.innerHTML = `
      <div class="vs-popover">
        <div class="vs-popover-row">
          <span class="vs-pop-swatch" id="vsPopSwatch" style="background:${token.value}"></span>
          <input class="vs-pop-input" id="vsColorInput" type="text" value="${token.value}" maxlength="7" />
          <button class="vs-pop-apply" id="vsColorApply" type="button">Apply</button>
        </div>
      </div>
    `;

    const input = document.getElementById('vsColorInput');
    const apply = document.getElementById('vsColorApply');
    const swatch = document.getElementById('vsPopSwatch');

    if (swatch) {
      swatch.addEventListener('click', () => {
        openColorPickerFly(swatch, token, (val) => {
          if (input) input.value = val;
          updateVsTokenValue(token); updateVsPreview();
        });
      });
    }

    if (input && apply) {
      input.addEventListener('input', () => {
        const val = normalizeHex(input.value);
        if (swatch) swatch.style.background = isValidHex(val) ? val : token.value;
        if (isValidHex(val)) { token.value = val; updateVsTokenValue(token); updateVsPreview(); }
      });
      apply.addEventListener('click', () => {
        const val = normalizeHex(input.value);
        if (!isValidHex(val)) { input.value = token.value; return; }
        token.value = val; updateVsTokenValue(token); updateVsPreview();
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply.click(); });
    }
    return;
  }

  const currentValue = Number(token.value);
  popHost.innerHTML = `
    <div class="vs-popover">
      <input class="vs-pop-range" id="vsRangeInput" type="range" min="${token.min}" max="${token.max}" step="${token.step}" value="${currentValue}" />
      <div class="vs-code-line"><span class="vs-token-name">${token.name}</span>: ${currentValue}${token.unit};</div>
    </div>
  `;

  const range = document.getElementById('vsRangeInput');
  if (range) {
    range.addEventListener('input', () => {
      token.value = String(range.value);
      updateVsTokenValue(token);
      updateVsPreview();
    });
  }
}

function updateVsTokenValue(token) {
  const valueNode = document.getElementById(`vsTokenValue-${token.id}`);
  if (!valueNode) return;
  const displayValue = `${token.value}${token.unit || ''}`;
  valueNode.textContent = displayValue;
  if (token.type === 'color') valueNode.style.color = token.value;
}

function updateVsPreview() {
  const preview = document.getElementById('vsPreviewPanel');
  updateUcCardPreview();
  if (!preview) return;
  const get = (id) => vsTokens.find((t) => t.id === id);
  const tile = get('tile'), card = get('card'), action = get('action');
  const cardRadius = get('card-radius'), actionRadius = get('action-radius'), cardGap = get('card-gap');
  if (!tile || !card || !action || !cardRadius || !actionRadius || !cardGap) return;
  preview.style.setProperty('--vs-tile', tile.value);
  preview.style.setProperty('--vs-card', card.value);
  preview.style.setProperty('--vs-action', action.value);
  preview.style.setProperty('--vs-card-radius', `${cardRadius.value}px`);
  preview.style.setProperty('--vs-action-radius', `${actionRadius.value}px`);
  preview.style.setProperty('--vs-card-gap', `${cardGap.value}px`);
}

const COLOR_PALETTE = [
  '#000000','#222222','#444444','#666666','#888888','#aaaaaa','#cccccc','#dddddd','#eeeeee','#ffffff',
  '#f44336','#ff9800','#ffeb3b','#cddc39','#4caf50','#009688','#2196f3','#673ab7','#e91e63','#795548',
  '#b71c1c','#bf360c','#f57f17','#558b2f','#1b5e20','#004d40','#0d47a1','#311b92','#880e4f','#3e2723',
  '#e53935','#f4511e','#f9a825','#7cb342','#388e3c','#00897b','#1e88e5','#5e35b1','#d81b60','#6d4c41',
  '#ef5350','#ffa726','#ffee58','#aed581','#66bb6a','#4db6ac','#64b5f6','#9575cd','#f06292','#a1887f',
  '#ef9a9a','#ffcc80','#fff176','#dce775','#a5d6a7','#b2dfdb','#bbdefb','#ce93d8','#f48fb1','#d7ccc8',
  '#ffcdd2','#ffe0b2','#fff9c4','#f0f4c3','#c8e6c9','#e0f2f1','#e3f2fd','#f3e5f5','#fce4ec','#efebe9',
];

function openColorPickerFly(swatchEl, token, onPick) {
  const existing = document.getElementById('vsColorPickerFly');
  if (existing) { existing.remove(); return; }

  const fly = document.createElement('div');
  fly.className = 'vs-cpicker';
  fly.id = 'vsColorPickerFly';

  let onOutside;
  const cleanup = () => {
    const f = document.getElementById('vsColorPickerFly');
    if (f) f.remove();
    document.removeEventListener('mousedown', onOutside);
  };

  const applyColor = (color) => {
    token.value = color;
    swatchEl.style.background = color;
    onPick(color);
    cleanup();
  };

  // Color grid
  const grid = document.createElement('div');
  grid.className = 'vs-cpicker-grid';
  COLOR_PALETTE.forEach((color) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'vs-cpicker-cell';
    cell.style.background = color;
    cell.addEventListener('click', (e) => { e.stopPropagation(); applyColor(color); });
    grid.appendChild(cell);
  });
  fly.appendChild(grid);

  // "More Colors..." button with native color input overlaid on top
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'vs-cpicker-more';
  moreBtn.textContent = 'More Colors...';

  const nativeInput = document.createElement('input');
  nativeInput.type = 'color';
  nativeInput.className = 'vs-cpicker-native';
  nativeInput.value = token.value;
  nativeInput.addEventListener('input', () => applyColor(nativeInput.value));
  moreBtn.appendChild(nativeInput);
  fly.appendChild(moreBtn);

  document.body.appendChild(fly);

  // Position to the left of the swatch (flip right if no room)
  const rect = swatchEl.getBoundingClientRect();
  const flyW = fly.offsetWidth;
  const flyH = fly.offsetHeight;
  let left = rect.left - flyW - 8;
  let top = Math.round(rect.top + rect.height / 2 - flyH / 2);
  if (left < 8) left = rect.right + 8;
  top = Math.max(8, Math.min(top, window.innerHeight - flyH - 8));
  fly.style.left = `${Math.round(left)}px`;
  fly.style.top = `${top}px`;

  onOutside = (e) => {
    if (!fly.contains(e.target) && e.target !== swatchEl) cleanup();
  };
  setTimeout(() => document.addEventListener('mousedown', onOutside), 0);
}

function normalizeHex(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function isValidHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// ─── Figma MCP Console ──────────────────────────────────────────────────────

const mcpCommands = [
  {
    label: 'Inspect component',
    prompt: 'Using Figma MCP, inspect the Card component. Read exact dimensions, border-radius, color fill, and flex settings from the CardRow frame.',
    code: `/* .vs-card — from Figma: CardRow */\n.vs-card {\n  width: 88px;\n  height: 135px;\n  border-radius: 16px;\n  background: #855454;\n  flex: 0 0 auto;\n}`,
    highlight: 'mcp-h-inspect'
  },
  {
    label: 'Export color styles',
    prompt: 'Using Figma MCP, call figma_get_styles() and export all color variables from the design as CSS custom properties.',
    code: `:root {\n  --tile-color: #d9d9d9;\n  --card-color: #855454;\n  --action-color: #515151;\n  --text-color: #f0f0f0;\n}`,
    highlight: 'mcp-h-colors'
  },
  {
    label: 'Generate card row',
    prompt: 'Using Figma MCP, read the CardRow frame and scaffold HTML + CSS from Auto Layout gap, padding, and child count.',
    code: `<div class="vs-cards">\n  <div class="vs-card"></div>\n  <div class="vs-card"></div>\n  <div class="vs-card"></div>\n  <div class="vs-card"></div>\n  <div class="vs-card"></div>\n</div>\n\n.vs-cards {\n  display: flex;\n  gap: 17px;\n  height: 135px;\n}`,
    highlight: 'mcp-h-cardrow'
  },
  {
    label: 'Sync text styles',
    prompt: 'Using Figma MCP, read the ActionButton text layer and generate a CSS class matching its font, weight, and color.',
    code: `.vs-action-btn {\n  font-family: "Instrument Sans",\n    sans-serif;\n  font-size: 22px;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n  color: rgba(240,240,240,0.75);\n}`,
    highlight: 'mcp-h-text'
  },
  {
    label: 'Match spacing tokens',
    prompt: 'Using Figma MCP, read spacing variables and map them to CSS custom props for the card layout.',
    code: `:root {\n  --card-gap: 17px;\n  --card-radius: 16px;\n  --action-radius: 90px;\n  --panel-gap: 63px;\n}`,
    highlight: 'mcp-h-spacing'
  }
];

function initMcpConsole() {
  const select = document.getElementById('mcpCommandSelect');
  const promptPanel = document.getElementById('mcpPromptPanel');
  const codePanel = document.getElementById('mcpCodePanel');
  if (!select || !promptPanel || !codePanel) return;

  select.innerHTML = mcpCommands
    .map((cmd, i) => `<option value="${i}">${cmd.label}</option>`)
    .join('');

  select.addEventListener('change', () => applyMcpCommand(Number(select.value)));
  applyMcpCommand(0);
}

function applyMcpCommand(index) {
  const select = document.getElementById('mcpCommandSelect');
  const promptPanel = document.getElementById('mcpPromptPanel');
  const codePanel = document.getElementById('mcpCodePanel');
  const frame = document.getElementById('mcpPreviewPanel');
  const command = mcpCommands[index];
  if (!select || !promptPanel || !codePanel || !command) return;

  select.value = String(index);
  promptPanel.textContent = command.prompt;
  codePanel.textContent = command.code;

  if (frame) {
    // Strip any previous highlight class then apply new one
    const prev = frame.className.replace(/\bmcp-h-\S+/g, '').trim();
    frame.className = prev;
    if (command.highlight) frame.classList.add(command.highlight);
  }
}

function updateMcpConsoleScale() {
  const layout = document.querySelector('.variant-mcp .mcp-layout');
  const box = document.getElementById('variantComponent');
  if (!layout || !box) return;

  const root = getComputedStyle(document.documentElement);
  const safeTop = parseFloat(root.getPropertyValue('--variant-safe-top')) || 112;
  const bottomSpace = 60;
  const leftMargin = Math.max(28, Math.min(0.067 * window.innerWidth, 108));
  const availableWidth = Math.max(box.clientWidth - leftMargin, 0);
  const availableHeight = Math.max(box.clientHeight - safeTop - bottomSpace, 0);
  const scaleX = availableWidth / 1497;
  const scaleY = availableHeight / 736;
  const nextScale = Math.min(scaleX, scaleY, 1);
  const topSpace = Math.max(Math.round(box.clientHeight - bottomSpace - 736 * nextScale), safeTop);

  layout.style.setProperty('--mcp-scale', String(nextScale > 0 ? nextScale : 0.1));
  layout.style.setProperty('--mcp-top-space', `${topSpace}px`);
}

// ─── Wireframe Lab ──────────────────────────────────────────────────────────

const wfElements = ['Card', 'Action', 'Container', 'Label'];
const wfTriggers  = ['Hover', 'Click', 'Load', 'Drag'];

const wfPrompts = {
  'Card_Hover':      'Using Figma MCP, read the PlayingCard component. Generate a CSS :hover rule that lifts the card 6px and adds a box-shadow that matches the card border color.',
  'Card_Click':      'Using Figma MCP, inspect PlayingCard. Write a :active state that scales the card to 0.94 and deepens the background by 10%.',
  'Card_Load':       'Using Figma MCP, read the CardRow frame. Generate a CSS @keyframes animation that fades each card in with a 0.1s stagger using :nth-child.',
  'Card_Drag':       'Using Figma MCP, read the PlayingCard component. Generate a mousedown/mousemove/mouseup drag handler that translates the card to follow the cursor and rotates it proportionally to horizontal movement, then springs back to its original position on mouseup using a cubic-bezier overshoot transition.',
  'Action_Hover':    'Using Figma MCP, read the ActionButton component. Generate a :hover rule that lightens the background by 12% and adds a 2px inset border.',
  'Action_Click':    'Using Figma MCP, inspect ActionButton. Write a :active transform that scales to 0.97 with ease-in-out timing.',
  'Action_Load':     'Using Figma MCP, read ActionButton. Generate a CSS animation that pulses the button border on page load to draw attention.',
  'Action_Drag':     'Using Figma MCP, read the ActionButton component. Generate a mousedown/mousemove/mouseup drag handler that lets the button follow the cursor freely, rotating based on horizontal displacement, then spring-snaps back to its resting position on mouseup.',
  'Container_Hover': 'Using Figma MCP, read the PreviewPanel component. Generate a :hover rule that adds a subtle glow using box-shadow on the outer container.',
  'Container_Click': 'Using Figma MCP, inspect PreviewPanel. Write a :focus-within state that highlights the container border to indicate active selection.',
  'Container_Load':  'Using Figma MCP, read PreviewPanel. Generate a slide-in animation from 20px below at opacity 0, completing in 0.4s ease-out.',
  'Container_Drag':  'Using Figma MCP, read the PreviewPanel component. Generate a mousedown/mousemove/mouseup drag handler that moves the entire panel to track the cursor, applying a subtle rotation based on horizontal offset, then returns it to its original position with a spring overshoot on release.',
  'Label_Hover':     'Using Figma MCP, read the Label text style. Generate a :hover rule that underlines the label text using the accent color.',
  'Label_Click':     'Using Figma MCP, inspect the Label. Write a :active color shift that dims the label to 70% opacity with a 0.1s transition.',
  'Label_Load':      'Using Figma MCP, read the Label component. Generate a letter-spacing animation that expands from 0 to 0.04em on page load.',
  'Label_Drag':      'Using Figma MCP, read the Label component. Generate a mousedown/mousemove/mouseup drag handler that moves the label text to follow the cursor, rotating it proportionally to horizontal movement, and snapping back to its centered position with a spring transition on mouseup.',
};


let wfActiveElement = null;
let wfActiveTriggers = new Set();

function triggerWfClick(el, durationMs) {
  el.classList.remove('wf-clicked');
  void el.offsetWidth;
  el.classList.add('wf-clicked');
  setTimeout(() => el.classList.remove('wf-clicked'), durationMs || 700);
}

function initWireframeLab() {
  const elCol   = document.getElementById('wfElementCol');
  const trigCol = document.getElementById('wfTriggerCol');
  if (!elCol || !trigCol) return;

  elCol.innerHTML = wfElements.map((el, i) => `
    <div class="wf-el-node" id="wf-el-${i}" data-wf-element="${el}">
      <span class="wf-node-name">${el}</span>
      <div class="wf-el-port" id="wf-elport-${i}"></div>
    </div>
  `).join('');

  trigCol.innerHTML = wfTriggers.map((tr, i) => `
    <div class="wf-trig-node" id="wf-trig-${i}" data-wf-trigger="${tr}">
      <div class="wf-trig-port-in" id="wf-trigpin-${i}"></div>
      <span class="wf-node-name">${tr}</span>
      <div class="wf-trig-port-out" id="wf-trigpout-${i}"></div>
    </div>
  `).join('');

  elCol.querySelectorAll('.wf-el-node').forEach((node) => {
    node.addEventListener('click', () => {
      wfActiveElement = node.dataset.wfElement;
      wfActiveTriggers.clear();
      elCol.querySelectorAll('.wf-el-node').forEach((n) => n.classList.remove('active'));
      trigCol.querySelectorAll('.wf-trig-node').forEach((n) => n.classList.remove('active'));
      node.classList.add('active');
      renderWfPrompt();
    });
  });

  trigCol.querySelectorAll('.wf-trig-node').forEach((node) => {
    node.addEventListener('click', () => {
      if (!wfActiveElement) return;
      const trigger = node.dataset.wfTrigger;
      if (wfActiveTriggers.has(trigger)) {
        wfActiveTriggers.delete(trigger);
        node.classList.remove('active');
      } else {
        wfActiveTriggers.add(trigger);
        node.classList.add('active');
      }
      renderWfPrompt();
    });
  });

  updateWireframeScale();

  // Wire up click and drag interactions on preview panel elements
  const previewPanel = document.getElementById('wfPreviewPanel');
  if (previewPanel) {
    const demoLabel = previewPanel.querySelector('.wf-demo-label');

    const hasClickTrigger = () => previewPanel.classList.contains('wf-trig-Click');

    const getWfCssScale = () => {
      const layout = document.querySelector('.variant-wire .wf-layout');
      return parseFloat(layout?.style.getPropertyValue('--wf-scale')) || 1;
    };

    // Real drag: follows cursor, spring-snaps back on release
    function attachWfDrag(el, elemClass, isLabel) {
      el.addEventListener('mousedown', (e) => {
        if (!previewPanel.classList.contains('wf-trig-Drag')) return;
        if (!previewPanel.classList.contains(`wf-elem-${elemClass}`)) return;

        const s0 = getWfCssScale();
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;

        el.style.transition = 'none';
        el.style.zIndex = '20';
        document.body.style.userSelect = 'none';

        const onMove = (me) => {
          me.preventDefault();
          moved = true;
          const dx = (me.clientX - startX) / s0;
          const dy = (me.clientY - startY) / s0;
          const rot = Math.max(-18, Math.min(18, dx * 0.07));
          if (isLabel) {
            el.style.transform = `translateX(calc(-50% + ${dx}px)) translateY(${dy}px) rotate(${rot}deg)`;
          } else {
            el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
          }
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.body.style.userSelect = '';
          el.style.zIndex = '';
          if (moved) {
            el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
            el.style.transform = '';
            setTimeout(() => { el.style.transition = ''; }, 460);
          } else {
            el.style.transition = '';
            el.style.transform = '';
          }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    // Click handlers (Click trigger only)
    previewPanel.querySelectorAll('.vs-card').forEach((card) => {
      attachWfDrag(card, 'Card', false);
      card.addEventListener('click', () => {
        if (!hasClickTrigger()) return;
        if (previewPanel.classList.contains('wf-elem-Card')) triggerWfClick(card, 550);
        else if (previewPanel.classList.contains('wf-elem-Container')) triggerWfClick(previewPanel, 700);
      });
    });

    previewPanel.querySelectorAll('.vs-action-btn').forEach((btn) => {
      attachWfDrag(btn, 'Action', false);
      btn.addEventListener('click', () => {
        if (!hasClickTrigger()) return;
        if (previewPanel.classList.contains('wf-elem-Action')) triggerWfClick(btn, 500);
        else if (previewPanel.classList.contains('wf-elem-Container')) triggerWfClick(previewPanel, 700);
      });
    });

    if (demoLabel) {
      attachWfDrag(demoLabel, 'Label', true);
      demoLabel.addEventListener('click', () => {
        if (previewPanel.classList.contains('wf-elem-Label') && hasClickTrigger()) {
          triggerWfClick(demoLabel, 550);
        }
      });
    }

    attachWfDrag(previewPanel, 'Container', false);
    previewPanel.addEventListener('click', (e) => {
      if (!previewPanel.classList.contains('wf-elem-Container') || !hasClickTrigger()) return;
      if (!e.target.closest('.vs-card') && !e.target.closest('.vs-action-btn') && e.target !== demoLabel) {
        triggerWfClick(previewPanel, 700);
      }
    });
  }
}

function renderWfPrompt() {
  const promptBody   = document.getElementById('wfPromptBody');
  const previewPanel = document.getElementById('wfPreviewPanel');
  const previewPort  = document.getElementById('wfPreviewPort');
  if (!promptBody) return;

  if (!wfActiveElement || wfActiveTriggers.size === 0) {
    promptBody.innerHTML = '<span class="wf-prompt-placeholder">Select an element and trigger.</span>';
    if (previewPort) previewPort.classList.remove('lit');
    if (previewPanel) previewPanel.className = 'vs-preview wf-preview';
    setTimeout(drawWfWires, 30);
    return;
  }

  // Combine all active trigger prompts
  const combinedPrompt = [...wfActiveTriggers]
    .map((t) => wfPrompts[`${wfActiveElement}_${t}`] || '')
    .filter(Boolean)
    .join(' ');
  promptBody.textContent = combinedPrompt || 'Prompt not defined for this combination.';

  if (previewPort) previewPort.classList.add('lit');

  if (previewPanel) {
    previewPanel.className = 'vs-preview wf-preview';
    void previewPanel.offsetWidth; // force reflow to restart CSS animations
    previewPanel.classList.add(`wf-elem-${wfActiveElement}`);
    wfActiveTriggers.forEach((t) => previewPanel.classList.add(`wf-trig-${t}`));
  }

  setTimeout(drawWfWires, 30);
}

function getWfRightCenter(el, board) {
  const b = board.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.right - b.left, y: r.top - b.top + r.height / 2 };
}

function getWfLeftCenter(el, board) {
  const b = board.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - b.left, y: r.top - b.top + r.height / 2 };
}

function wfCubicPath(x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

function drawWfWires() {
  const svg   = document.getElementById('wfWireSvg');
  const board = document.getElementById('wfLayout');
  const layout = document.querySelector('.variant-wire .wf-layout');
  if (!svg || !board || !layout) return;

  // Clear all dynamic wire paths
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (!wfActiveElement || wfActiveTriggers.size === 0) return;

  // getBoundingClientRect → screen space; divide by CSS scale for SVG coords
  const cssScale = parseFloat(layout.style.getPropertyValue('--wf-scale')) || 1;
  const s = (v) => v / cssScale;

  const elIndex = wfElements.indexOf(wfActiveElement);
  const elPort  = document.getElementById(`wf-elport-${elIndex}`);
  const previewPort = document.getElementById('wfPreviewPort');
  if (!elPort || !previewPort) return;

  const ep = getWfRightCenter(elPort, board);
  const pp = getWfLeftCenter(previewPort, board);

  const makePath = (cls) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', cls);
    return p;
  };

  wfActiveTriggers.forEach((trigger) => {
    const trigIndex  = wfTriggers.indexOf(trigger);
    const trigPortIn  = document.getElementById(`wf-trigpin-${trigIndex}`);
    const trigPortOut = document.getElementById(`wf-trigpout-${trigIndex}`);
    if (!trigPortIn || !trigPortOut) return;

    const tp1 = getWfLeftCenter(trigPortIn, board);
    const tp2 = getWfRightCenter(trigPortOut, board);

    const w1 = makePath('wf-wire-path wf-wire-lit');
    w1.setAttribute('d', wfCubicPath(s(ep.x), s(ep.y), s(tp1.x), s(tp1.y)));
    svg.appendChild(w1);

    const w2 = makePath('wf-wire-path wf-wire-path-2 wf-wire-lit');
    w2.setAttribute('d', wfCubicPath(s(tp2.x), s(tp2.y), s(pp.x), s(pp.y)));
    svg.appendChild(w2);
  });
}

// ─── ctx-d pill button handlers ─────────────────────────────────────────────

function initCtxDButtons() {
  const tipsBtn = document.getElementById('tipsPillBtn');
  const tipsBox = document.getElementById('ctxTipsBox');
  const ucBtn   = document.getElementById('ucPillBtn');

  if (tipsBtn && tipsBox) {
    tipsBtn.addEventListener('click', () => {
      const open = tipsBox.classList.toggle('visible');
      tipsBtn.classList.toggle('active', open);
    });
  }

  if (ucBtn) {
    ucBtn.addEventListener('click', () => {
      variantLocked = true;
      setVariant('variant-uc');
    });
  }
}

// ─── Ultimate Cards ──────────────────────────────────────────────────────────

let ucActiveElement = null;
let ucActiveTriggers = new Set();
let ucActiveTab = 'game'; // 'game' | 'code' | 'prompts'

function initUltimateCards() {
  const elCol   = document.getElementById('ucElementCol');
  const trigCol = document.getElementById('ucTriggerCol');
  const backBtn = document.getElementById('ucBackBtn');
  const tabCode    = document.getElementById('ucTabCode');
  const tabPrompts = document.getElementById('ucTabPrompts');

  if (!elCol || !trigCol) return;

  // Render element nodes (reuses wfElements array)
  elCol.innerHTML = wfElements.map((el, i) => `
    <div class="wf-el-node" id="uc-el-${i}" data-uc-element="${el}">
      <span class="wf-node-name">${el}</span>
      <div class="wf-el-port" id="uc-elport-${i}"></div>
    </div>
  `).join('');

  // Render trigger nodes
  trigCol.innerHTML = wfTriggers.map((tr, i) => `
    <div class="wf-trig-node" id="uc-trig-${i}" data-uc-trigger="${tr}">
      <div class="wf-trig-port-in" id="uc-trigpin-${i}"></div>
      <span class="wf-node-name">${tr}</span>
      <div class="wf-trig-port-out" id="uc-trigpout-${i}"></div>
    </div>
  `).join('');

  // Render UC token rows (same vsTokens, separate DOM)
  renderUcTokenRows();

  elCol.querySelectorAll('.wf-el-node').forEach((node) => {
    node.addEventListener('click', () => {
      ucActiveElement = node.dataset.ucElement;
      ucActiveTriggers.clear();
      elCol.querySelectorAll('.wf-el-node').forEach((n) => n.classList.remove('active'));
      trigCol.querySelectorAll('.wf-trig-node').forEach((n) => n.classList.remove('active'));
      node.classList.add('active');
      updateUcPromptView();
      setTimeout(drawUcWires, 30);
    });
  });

  trigCol.querySelectorAll('.wf-trig-node').forEach((node) => {
    node.addEventListener('click', () => {
      if (!ucActiveElement) return;
      const trigger = node.dataset.ucTrigger;
      if (ucActiveTriggers.has(trigger)) {
        ucActiveTriggers.delete(trigger);
        node.classList.remove('active');
      } else {
        ucActiveTriggers.add(trigger);
        node.classList.add('active');
      }
      updateUcPromptView();
      setTimeout(drawUcWires, 30);
    });
  });

  if (tabCode) {
    tabCode.addEventListener('click', () => {
      ucActiveTab = ucActiveTab === 'code' ? 'game' : 'code';
      updateUcTabs();
    });
  }

  if (tabPrompts) {
    tabPrompts.addEventListener('click', () => {
      ucActiveTab = ucActiveTab === 'prompts' ? 'game' : 'prompts';
      updateUcTabs();
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      variantLocked = false;
      // Reset UC state for next visit
      ucActiveElement = null;
      ucActiveTriggers.clear();
      ucActiveTab = 'game';
      setVariant('ctx-d');
    });
  }

  updateUcScale();
  updateUcCardPreview();

  // Wire click + drag to UC game view elements
  const gameView = document.getElementById('ucViewGame');
  if (gameView) {
    const getUcCssScale = () => {
      const layout = document.querySelector('.variant-uc .uc-layout');
      return parseFloat(layout?.style.getPropertyValue('--uc-scale')) || 1;
    };

    function attachUcDrag(el, elemClass, isLabel) {
      el.addEventListener('mousedown', (e) => {
        if (!gameView.classList.contains('wf-trig-Drag')) return;
        if (!gameView.classList.contains(`wf-elem-${elemClass}`)) return;
        const s0 = getUcCssScale();
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        el.style.transition = 'none';
        el.style.zIndex = '20';
        document.body.style.userSelect = 'none';
        const onMove = (me) => {
          me.preventDefault();
          moved = true;
          const dx = (me.clientX - startX) / s0;
          const dy = (me.clientY - startY) / s0;
          const rot = Math.max(-18, Math.min(18, dx * 0.07));
          if (isLabel) {
            el.style.transform = `translateX(calc(-50% + ${dx}px)) translateY(${dy}px) rotate(${rot}deg)`;
          } else {
            el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
          }
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.body.style.userSelect = '';
          el.style.zIndex = '';
          if (moved) {
            el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
            el.style.transform = '';
            setTimeout(() => { el.style.transition = ''; }, 460);
          } else {
            el.style.transition = '';
            el.style.transform = '';
          }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    gameView.querySelectorAll('.vs-card').forEach((card) => {
      attachUcDrag(card, 'Card', false);
      card.addEventListener('click', () => {
        if (!gameView.classList.contains('wf-trig-Click')) return;
        if (gameView.classList.contains('wf-elem-Card')) triggerWfClick(card, 550);
        else if (gameView.classList.contains('wf-elem-Container')) triggerWfClick(gameView, 700);
      });
    });

    gameView.querySelectorAll('.vs-action-btn').forEach((btn) => {
      attachUcDrag(btn, 'Action', false);
      btn.addEventListener('click', () => {
        if (!gameView.classList.contains('wf-trig-Click')) return;
        if (gameView.classList.contains('wf-elem-Action')) triggerWfClick(btn, 500);
        else if (gameView.classList.contains('wf-elem-Container')) triggerWfClick(gameView, 700);
      });
    });

    attachUcDrag(gameView, 'Container', false);
    gameView.addEventListener('click', (e) => {
      if (!gameView.classList.contains('wf-elem-Container') || !gameView.classList.contains('wf-trig-Click')) return;
      if (!e.target.closest('.vs-card') && !e.target.closest('.vs-action-btn')) triggerWfClick(gameView, 700);
    });
  }
}

function renderUcTokenRows() {
  const rowsHost = document.getElementById('ucTokenRows');
  const popHost  = document.getElementById('ucEditorPop');
  if (!rowsHost) return;

  rowsHost.innerHTML = vsTokens.map((token) => {
    const displayValue = `${token.value}${token.unit || ''}`;
    const valueStyle = token.type === 'color'
      ? ` style="color:${displayValue}"`
      : ' style="color:#feb4b4"';
    return `
      <div class="vs-token-row" data-uc-token-id="${token.id}">
        <div class="vs-code-line">${token.note}</div>
        <div class="vs-code-line"><span class="vs-token-name">${token.name}</span>: <span class="vs-token-value" id="ucTokenValue-${token.id}" data-type="${token.type}"${valueStyle}>${displayValue}</span>;</div>
      </div>
    `;
  }).join('');

  rowsHost.querySelectorAll('.vs-token-row').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-uc-token-id');
      renderUcPopover(id, popHost);
    });
  });
}

function renderUcPopover(tokenId, popHost) {
  if (!popHost) return;
  const token = vsTokens.find((t) => t.id === tokenId);
  if (!token) { popHost.innerHTML = ''; return; }

  if (token.type === 'color') {
    popHost.innerHTML = `
      <div class="vs-popover">
        <div class="vs-popover-row">
          <span class="vs-pop-swatch" id="ucPopSwatch" style="background:${token.value}"></span>
          <input class="vs-pop-input" id="ucColorInput" type="text" value="${token.value}" maxlength="7" />
          <button class="vs-pop-apply" id="ucColorApply" type="button">Apply</button>
        </div>
      </div>`;
    const input  = document.getElementById('ucColorInput');
    const apply  = document.getElementById('ucColorApply');
    const swatch = document.getElementById('ucPopSwatch');

    if (swatch) {
      swatch.addEventListener('click', () => {
        openColorPickerFly(swatch, token, (val) => {
          if (input) input.value = val;
          syncUcTokenValue(token); updateVsPreview(); updateUcCardPreview(); updateUcCodeView();
        });
      });
    }

    if (input && apply) {
      input.addEventListener('input', () => {
        const val = normalizeHex(input.value);
        if (swatch) swatch.style.background = isValidHex(val) ? val : token.value;
        if (isValidHex(val)) { token.value = val; syncUcTokenValue(token); updateVsPreview(); updateUcCardPreview(); updateUcCodeView(); }
      });
      apply.addEventListener('click', () => {
        const val = normalizeHex(input.value);
        if (!isValidHex(val)) { input.value = token.value; return; }
        token.value = val; syncUcTokenValue(token); updateVsPreview(); updateUcCardPreview(); updateUcCodeView();
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply.click(); });
    }
    return;
  }

  const currentValue = Number(token.value);
  popHost.innerHTML = `
    <div class="vs-popover">
      <input class="vs-pop-range" id="ucRangeInput" type="range" min="${token.min}" max="${token.max}" step="${token.step}" value="${currentValue}" />
      <div class="vs-code-line"><span class="vs-token-name">${token.name}</span>: ${currentValue}${token.unit};</div>
    </div>`;
  const range = document.getElementById('ucRangeInput');
  if (range) {
    range.addEventListener('input', () => {
      token.value = String(range.value);
      syncUcTokenValue(token);
      updateVsPreview();
      updateUcCardPreview();
      updateUcCodeView();
    });
  }
}

function syncUcTokenValue(token) {
  // Keep UC editor display in sync with updated token
  const ucNode = document.getElementById(`ucTokenValue-${token.id}`);
  const vsNode = document.getElementById(`vsTokenValue-${token.id}`);
  const displayValue = `${token.value}${token.unit || ''}`;
  if (ucNode) { ucNode.textContent = displayValue; if (token.type === 'color') ucNode.style.color = token.value; }
  if (vsNode) { vsNode.textContent = displayValue; if (token.type === 'color') vsNode.style.color = token.value; }
}

function updateUcCardPreview() {
  const panel = document.getElementById('ucCardPanel');
  if (!panel) return;
  const get = (id) => vsTokens.find((t) => t.id === id);
  const tile = get('tile'), card = get('card'), action = get('action');
  const cardRadius = get('card-radius'), actionRadius = get('action-radius'), cardGap = get('card-gap');
  if (!tile || !card || !action || !cardRadius || !actionRadius || !cardGap) return;
  panel.style.setProperty('--vs-tile', tile.value);
  panel.style.setProperty('--vs-card', card.value);
  panel.style.setProperty('--vs-action', action.value);
  panel.style.setProperty('--vs-card-radius', `${cardRadius.value}px`);
  panel.style.setProperty('--vs-action-radius', `${actionRadius.value}px`);
  panel.style.setProperty('--vs-card-gap', `${cardGap.value}px`);
}

function updateUcCodeView() {
  const pre = document.getElementById('ucCodePre');
  if (!pre) return;
  const get = (id) => vsTokens.find((t) => t.id === id);
  const tile = get('tile'), card = get('card'), action = get('action');
  const cr = get('card-radius'), ar = get('action-radius'), cg = get('card-gap');
  pre.textContent =
`:root {\n  --tile-color: ${tile?.value};\n  --card-color: ${card?.value};\n  --action-color: ${action?.value};\n  --card-radius: ${cr?.value}px;\n  --action-radius: ${ar?.value}px;\n  --card-gap: ${cg?.value}px;\n}\n\n.vs-preview {\n  background: var(--tile-color);\n  border-radius: 90px;\n  padding: 128px 45px 43px;\n  gap: 63px;\n}\n\n.vs-card {\n  width: 88px;\n  height: 135px;\n  border-radius: var(--card-radius);\n  background: var(--card-color);\n}\n\n.vs-action-btn {\n  width: 170px;\n  height: 249px;\n  border-radius: var(--action-radius);\n  background: var(--action-color);\n}`;
}

function updateUcPromptView() {
  const text     = document.getElementById('ucPromptText');
  const gameView = document.getElementById('ucViewGame');
  if (!text) return;

  if (!ucActiveElement || ucActiveTriggers.size === 0) {
    text.innerHTML = '<span class="wf-prompt-placeholder">Select an element and trigger on the left.</span>';
    if (gameView) {
      const wasActive = gameView.classList.contains('active');
      gameView.className = 'uc-view uc-view-game wf-preview' + (wasActive ? ' active' : '');
    }
    return;
  }

  const combined = [...ucActiveTriggers]
    .map((t) => wfPrompts[`${ucActiveElement}_${t}`] || '')
    .filter(Boolean)
    .join(' ');
  text.textContent = combined || 'Prompt not defined for this combination.';

  // Apply interaction classes to the game view so WF CSS rules fire
  if (gameView) {
    const wasActive = gameView.classList.contains('active');
    gameView.className = 'uc-view uc-view-game wf-preview' + (wasActive ? ' active' : '');
    void gameView.offsetWidth; // force reflow so Load animations restart
    gameView.classList.add(`wf-elem-${ucActiveElement}`);
    ucActiveTriggers.forEach((t) => gameView.classList.add(`wf-trig-${t}`));
  }
}

function updateUcTabs() {
  const tabCode    = document.getElementById('ucTabCode');
  const tabPrompts = document.getElementById('ucTabPrompts');
  const viewGame   = document.getElementById('ucViewGame');
  const viewCode   = document.getElementById('ucViewCode');
  const viewPrompts = document.getElementById('ucViewPrompts');

  if (tabCode)    tabCode.classList.toggle('active', ucActiveTab === 'code');
  if (tabPrompts) tabPrompts.classList.toggle('active', ucActiveTab === 'prompts');

  if (viewGame)    viewGame.classList.toggle('active', ucActiveTab === 'game');
  if (viewCode)    viewCode.classList.toggle('active', ucActiveTab === 'code');
  if (viewPrompts) viewPrompts.classList.toggle('active', ucActiveTab === 'prompts');

  if (ucActiveTab === 'code') updateUcCodeView();
}

function updateUcScale() {
  const layout = document.querySelector('.variant-uc .uc-layout');
  const box = document.getElementById('variantComponent');
  if (!layout || !box) return;

  const root = getComputedStyle(document.documentElement);
  const safeTop = parseFloat(root.getPropertyValue('--variant-safe-top')) || 112;
  const bottomSpace = 60;
  const leftMargin = Math.max(28, Math.min(0.067 * window.innerWidth, 108));
  const availableWidth = Math.max(box.clientWidth - leftMargin, 0);
  const availableHeight = Math.max(box.clientHeight - safeTop - bottomSpace, 0);
  const scaleX = availableWidth / 1497;
  const scaleY = availableHeight / 736;
  const nextScale = Math.min(scaleX, scaleY, 1);
  const topSpace = Math.max(Math.round(box.clientHeight - bottomSpace - 736 * nextScale), safeTop);

  layout.style.setProperty('--uc-scale', String(nextScale > 0 ? nextScale : 0.1));
  layout.style.setProperty('--uc-top-space', `${topSpace}px`);
}

function drawUcWires() {
  const svg   = document.getElementById('ucWireSvg');
  const board = document.getElementById('ucLayout');
  const layout = document.querySelector('.variant-uc .uc-layout');
  if (!svg || !board || !layout) return;

  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (!ucActiveElement || ucActiveTriggers.size === 0) return;

  const cssScale = parseFloat(layout.style.getPropertyValue('--uc-scale')) || 1;
  const s = (v) => v / cssScale;

  const elIndex = wfElements.indexOf(ucActiveElement);
  const elPort  = document.getElementById(`uc-elport-${elIndex}`);
  if (!elPort) return;

  const ep = getWfRightCenter(elPort, board);

  const makePath = (cls) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', cls);
    return p;
  };

  ucActiveTriggers.forEach((trigger) => {
    const trigIndex   = wfTriggers.indexOf(trigger);
    const trigPortIn  = document.getElementById(`uc-trigpin-${trigIndex}`);
    const trigPortOut = document.getElementById(`uc-trigpout-${trigIndex}`);
    if (!trigPortIn || !trigPortOut) return;

    const tp1 = getWfLeftCenter(trigPortIn, board);
    const tp2 = getWfRightCenter(trigPortOut, board);

    const w1 = makePath('wf-wire-path wf-wire-lit');
    w1.setAttribute('d', wfCubicPath(s(ep.x), s(ep.y), s(tp1.x), s(tp1.y)));
    svg.appendChild(w1);

    // Second leg from trigger output leads nowhere (no preview port in UC right panel)
    // so we draw a short stub instead
    const stubX = s(tp2.x) + 30;
    const w2 = makePath('wf-wire-path wf-wire-path-2 wf-wire-lit');
    w2.setAttribute('d', `M ${s(tp2.x)} ${s(tp2.y)} L ${stubX} ${s(tp2.y)}`);
    svg.appendChild(w2);
  });
}

function updateWireframeScale() {
  const layout = document.querySelector('.variant-wire .wf-layout');
  const box = document.getElementById('variantComponent');
  if (!layout || !box) return;

  const root = getComputedStyle(document.documentElement);
  const safeTop = parseFloat(root.getPropertyValue('--variant-safe-top')) || 112;
  const bottomSpace = 60;
  const leftMargin = Math.max(28, Math.min(0.067 * window.innerWidth, 108));
  const availableWidth = Math.max(box.clientWidth - leftMargin, 0);
  const availableHeight = Math.max(box.clientHeight - safeTop - bottomSpace, 0);
  const scaleX = availableWidth / 1497;
  const scaleY = availableHeight / 736;
  const nextScale = Math.min(scaleX, scaleY, 1);
  const topSpace = Math.max(Math.round(box.clientHeight - bottomSpace - 736 * nextScale), safeTop);

  layout.style.setProperty('--wf-scale', String(nextScale > 0 ? nextScale : 0.1));
  layout.style.setProperty('--wf-top-space', `${topSpace}px`);
}
