'use strict';

const MAX_DIMENSION = 8;
const PLAY_INTERVAL = 1600;

/* ------------------------------------------------------------------ *
 * Matrix helpers
 * ------------------------------------------------------------------ */

function identityMatrix(n) {
    return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (__, j) => (i === j ? 1 : 0))
    );
}

// Multiply two matrices
function multiplyMatrices(A, B) {
    const rowsA = A.length, colsA = A[0].length, colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));

    for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsB; j++) {
            for (let k = 0; k < colsA; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return result;
}

// Elimination matrix that zeroes every entry below the k-th pivot
function createEliminationMatrix(matrix, dimension, k) {
    const eliminationMatrix = identityMatrix(dimension);

    for (let i = k + 1; i < dimension; i++) {
        if (matrix[k][k] !== 0) {
            eliminationMatrix[i][k] = -matrix[i][k] / matrix[k][k];
        }
    }

    return eliminationMatrix;
}

// Inverse of a lower triangular matrix, by forward substitution
function calculateInverse(L) {
    const n = L.length;
    const inverse = identityMatrix(n);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            if (i === j) {
                inverse[i][j] /= L[i][i];
            } else {
                let sum = 0;
                for (let k = j; k < i; k++) {
                    sum += L[i][k] * inverse[k][j];
                }
                inverse[i][j] = -sum / L[i][i];
            }
        }
    }

    return inverse;
}

// D: the pivots on the diagonal
function extractDiagonalMatrix(upperMatrix) {
    const n = upperMatrix.length;
    const D = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) D[i][i] = upperMatrix[i][i];
    return D;
}

// U: upper triangular with 1s on the diagonal (rows scaled by their pivot)
function extractUpperTriangularMatrix(upperMatrix) {
    const n = upperMatrix.length;
    const U = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        const pivot = upperMatrix[i][i];
        for (let j = i; j < n; j++) {
            U[i][j] = i === j ? 1 : (pivot !== 0 ? upperMatrix[i][j] / pivot : upperMatrix[i][j]);
        }
    }

    return U;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

// Trim floating point noise: 2.0000000004 -> "2", -0 -> "0"
function formatValue(value) {
    if (!Number.isFinite(value)) return '—';
    const rounded = Math.round(value * 1e6) / 1e6;
    if (Object.is(rounded, -0)) return '0';
    return String(Number(rounded.toFixed(3)));
}

function isZero(value) {
    return Math.abs(value) < 1e-9;
}

/**
 * @param {number[][]} matrix
 * @param {string} [variant]  a | e | l | d | u — drives the accent colour
 * @param {(i:number, j:number) => string} [mark]  extra class per cell
 */
function formatMatrix(matrix, variant, mark) {
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-display' + (variant ? ` matrix-${variant}` : '');

    const grid = document.createElement('div');
    grid.className = 'matrix-grid';
    grid.style.gridTemplateColumns = `repeat(${matrix[0].length}, auto)`;

    matrix.forEach((row, i) => {
        row.forEach((value, j) => {
            const cell = document.createElement('span');
            cell.className = 'matrix-cell';
            cell.dataset.row = String(i);
            cell.dataset.col = String(j);
            if (i === j) cell.classList.add('is-diagonal');
            if (isZero(value)) cell.classList.add('is-zero');

            const extra = (mark && mark(i, j) || '').split(/\s+/).filter(Boolean);
            if (extra.length) cell.classList.add(...extra);

            cell.textContent = formatValue(value);
            grid.appendChild(cell);
        });
    });

    wrapper.appendChild(grid);
    return wrapper;
}

function labelledMatrix(part) {
    const figure = document.createElement('figure');
    figure.className = 'matrix-figure';
    figure.appendChild(formatMatrix(part.matrix, part.variant, part.mark));

    if (part.label) {
        const caption = document.createElement('figcaption');
        caption.textContent = part.label;
        figure.appendChild(caption);
    }

    return figure;
}

function operator(symbol) {
    const span = document.createElement('span');
    span.className = 'operation-symbol';
    span.textContent = symbol;
    return span;
}

/** Build one result block. `parts` mixes operator strings and matrix descriptors. */
function buildStep(title, description, parts) {
    const step = document.createElement('article');
    step.className = 'step-block is-locked';

    const heading = document.createElement('h3');
    heading.textContent = title;
    step.appendChild(heading);

    if (description) {
        const p = document.createElement('p');
        p.className = 'step-description';
        p.textContent = description;
        step.appendChild(p);
    }

    const row = document.createElement('div');
    row.className = 'matrix-step';

    parts.forEach(part => {
        row.appendChild(typeof part === 'string' ? operator(part) : labelledMatrix(part));
    });

    step.appendChild(row);
    return step;
}

/* ------------------------------------------------------------------ *
 * Step playback
 * ------------------------------------------------------------------ */

const playback = {
    steps: [],
    index: 0,
    timer: null,
};

function playbackElements() {
    return {
        bar: document.getElementById('playback'),
        prev: document.getElementById('step-prev'),
        next: document.getElementById('step-next'),
        play: document.getElementById('step-play'),
        all: document.getElementById('step-all'),
        fill: document.getElementById('progress-fill'),
        counter: document.getElementById('step-counter'),
    };
}

function renderPlayback(scrollToActive) {
    const { prev, next, play, fill, counter } = playbackElements();
    const total = playback.steps.length;
    if (!total) return;

    playback.steps.forEach((step, i) => {
        step.classList.toggle('is-locked', i > playback.index);
        step.classList.toggle('is-active', i === playback.index);
    });

    prev.disabled = playback.index === 0;
    next.disabled = playback.index === total - 1;
    play.textContent = playback.timer ? 'Pause' : (playback.index === total - 1 ? 'Replay' : 'Play');
    fill.style.width = `${((playback.index + 1) / total) * 100}%`;
    counter.textContent = `Step ${playback.index + 1} of ${total}`;

    if (scrollToActive) {
        playback.steps[playback.index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function goToStep(index, scrollToActive) {
    const total = playback.steps.length;
    playback.index = Math.min(Math.max(index, 0), total - 1);
    renderPlayback(scrollToActive);
}

function stopPlayback() {
    if (playback.timer) {
        clearInterval(playback.timer);
        playback.timer = null;
    }
}

function togglePlayback() {
    if (playback.timer) {
        stopPlayback();
        renderPlayback(false);
        return;
    }

    // "Replay" from the top once the end is reached
    if (playback.index === playback.steps.length - 1) goToStep(0, true);

    playback.timer = setInterval(() => {
        if (playback.index >= playback.steps.length - 1) {
            stopPlayback();
            renderPlayback(false);
            return;
        }
        goToStep(playback.index + 1, true);
    }, PLAY_INTERVAL);

    renderPlayback(false);
}

function revealAllSteps() {
    stopPlayback();
    goToStep(playback.steps.length - 1, false);
}

/* ------------------------------------------------------------------ *
 * Matrix input grid
 * ------------------------------------------------------------------ */

function readDimension() {
    const raw = parseInt(document.getElementById('matrix-dimension').value, 10);
    if (!Number.isInteger(raw)) return null;
    return Math.min(Math.max(raw, 1), MAX_DIMENSION);
}

function setHint(message, isError) {
    const hint = document.getElementById('form-hint');
    hint.textContent = message;
    hint.classList.toggle('is-error', Boolean(isError));
}

function toggleActions(visible) {
    ['submit-matrix', 'random-matrix', 'fill-example', 'clear-matrix'].forEach(id => {
        document.getElementById(id).hidden = !visible;
    });
}

function generateMatrixInputs(options) {
    const container = document.getElementById('matrix-container');
    const dimension = readDimension();
    const focusFirst = !(options && options.silent);

    container.innerHTML = '';

    if (dimension === null) {
        container.classList.remove('is-populated');
        toggleActions(false);
        setHint(`Enter a dimension between 1 and ${MAX_DIMENSION}.`, true);
        return;
    }

    document.getElementById('matrix-dimension').value = dimension;
    container.style.gridTemplateColumns = `repeat(${dimension}, minmax(0, 1fr))`;

    for (let i = 0; i < dimension; i++) {
        for (let j = 0; j < dimension; j++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.className = 'matrix-input';
            input.id = `matrix-${i}-${j}`;
            input.dataset.row = String(i);
            input.dataset.col = String(j);
            input.placeholder = `a${i + 1}${j + 1}`;
            input.setAttribute('aria-label', `Row ${i + 1}, column ${j + 1}`);
            if (i === j) input.classList.add('is-diagonal');
            // Stagger the entrance so the grid builds up visibly
            input.style.animationDelay = `${(i * dimension + j) * 22}ms`;
            container.appendChild(input);
        }
    }

    container.classList.add('is-populated');
    toggleActions(true);
    setHint(`${dimension}×${dimension} grid ready. Empty cells count as zero.`, false);

    if (focusFirst) {
        const first = document.getElementById('matrix-0-0');
        if (first) first.focus();
    }
}

function readMatrix(dimension) {
    const matrix = [];
    for (let i = 0; i < dimension; i++) {
        const row = [];
        for (let j = 0; j < dimension; j++) {
            const field = document.getElementById(`matrix-${i}-${j}`);
            row.push(field.value === '' ? 0 : Number(field.value));
        }
        matrix.push(row);
    }
    return matrix;
}

function writeMatrix(values) {
    const dimension = readDimension();
    for (let i = 0; i < dimension; i++) {
        for (let j = 0; j < dimension; j++) {
            const field = document.getElementById(`matrix-${i}-${j}`);
            if (field) field.value = values[i][j];
        }
    }
}

function resetResults(message) {
    stopPlayback();
    playback.steps = [];
    playback.index = 0;
    document.getElementById('steps-container').innerHTML = '';
    document.getElementById('playback').hidden = true;
    document.getElementById('result-summary').hidden = true;
    document.getElementById('result-summary').innerHTML = '';
    document.getElementById('result-subtitle').textContent = message;
}

function clearMatrixInputs() {
    document.querySelectorAll('.matrix-input').forEach(input => { input.value = ''; });
    resetResults('Fill in a matrix above and factorize it to see the elimination steps here.');
    setHint('Cleared. Empty cells count as zero.', false);
    const first = document.getElementById('matrix-0-0');
    if (first) first.focus();
}

function fillExample() {
    const dimension = readDimension();
    if (dimension === null) return;

    // A well-conditioned sample with no zero pivots at any size.
    const values = Array.from({ length: dimension }, (_, i) =>
        Array.from({ length: dimension }, (__, j) => (i === j ? dimension + 1 : (j > i ? 1 : -1)))
    );
    writeMatrix(values);
    setHint('Example values filled in — hit “Factorize Matrix”.', false);
}

function randomizeMatrix() {
    const dimension = readDimension();
    if (dimension === null) return;

    // Diagonally dominant, so the pivots stay non-zero and the numbers stay readable.
    const values = Array.from({ length: dimension }, (_, i) =>
        Array.from({ length: dimension }, (__, j) => {
            const off = Math.floor(Math.random() * 9) - 4;   // -4..4
            if (i !== j) return off;
            const sign = Math.random() < 0.5 ? -1 : 1;
            return sign * (dimension * 2 + Math.floor(Math.random() * 4));
        })
    );
    writeMatrix(values);
    setHint('Random matrix generated — hit “Factorize Matrix”.', false);
}

/** Accept a matrix pasted from a spreadsheet or plain text. */
function handlePaste(event) {
    const text = (event.clipboardData || window.clipboardData).getData('text');
    if (!text || !/[\s,;]/.test(text.trim())) return; // single value: let the browser handle it

    const rows = text.trim().split(/\r?\n/).map(line => line.trim().split(/[\s,;]+/).map(Number));
    if (rows.some(row => row.some(value => !Number.isFinite(value)))) return;

    event.preventDefault();

    const size = Math.min(Math.max(rows.length, ...rows.map(r => r.length)), MAX_DIMENSION);
    document.getElementById('matrix-dimension').value = size;
    generateMatrixInputs({ silent: true });

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const field = document.getElementById(`matrix-${i}-${j}`);
            const value = rows[i] && rows[i][j];
            if (field) field.value = Number.isFinite(value) ? value : 0;
        }
    }
    setHint(`Pasted a ${size}×${size} matrix.`, false);
}

/** Arrow keys walk the grid like a spreadsheet. */
function handleGridKeydown(event) {
    const target = event.target;
    if (!target.classList.contains('matrix-input')) return;

    if (event.key === 'Enter') {
        event.preventDefault();
        submitMatrix();
        return;
    }

    const moves = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (!move) return;

    // Arrows always hop cells, spreadsheet style. (The caret-aware version is not
    // an option here: selectionStart/End are null on input[type=number].)
    const dimension = readDimension();
    const row = Number(target.dataset.row) + move[0];
    const col = Number(target.dataset.col) + move[1];
    if (row < 0 || col < 0 || row >= dimension || col >= dimension) return;

    event.preventDefault();
    const nextField = document.getElementById(`matrix-${row}-${col}`);
    if (nextField) {
        nextField.focus();
        nextField.select();
    }
}

/* ------------------------------------------------------------------ *
 * Result summary
 * ------------------------------------------------------------------ */

function renderSummary(dimension, pivots, singular) {
    const summary = document.getElementById('result-summary');
    const determinant = pivots.reduce((product, pivot) => product * pivot, 1);

    const chips = [
        { label: 'Size', value: `${dimension} × ${dimension}` },
        { label: 'Determinant', value: singular ? '0' : formatValue(determinant) },
        { label: 'Pivots', value: pivots.map(formatValue).join(', ') },
        {
            label: 'Invertible',
            value: singular || isZero(determinant) ? 'No' : 'Yes',
            tone: singular || isZero(determinant) ? 'warn' : 'good',
        },
    ];

    summary.innerHTML = '';
    chips.forEach(chip => {
        const item = document.createElement('div');
        item.className = 'summary-chip' + (chip.tone ? ` is-${chip.tone}` : '');
        item.innerHTML = `<span class="chip-label"></span><span class="chip-value"></span>`;
        item.querySelector('.chip-label').textContent = chip.label;
        item.querySelector('.chip-value').textContent = chip.value;
        summary.appendChild(item);
    });
    summary.hidden = false;
}

function matrixToText(matrix, name) {
    const body = matrix.map(row => row.map(formatValue).join('\t')).join('\n');
    return `${name} =\n${body}`;
}

let copyPayload = '';

async function copyResult() {
    const button = document.getElementById('copy-result');
    const original = 'Copy L·D·U';
    try {
        await navigator.clipboard.writeText(copyPayload);
        button.textContent = 'Copied!';
        button.classList.add('is-good');
    } catch {
        button.textContent = 'Copy failed';
    }
    setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-good');
    }, 1800);
}

/* ------------------------------------------------------------------ *
 * Factorization
 * ------------------------------------------------------------------ */

function submitMatrix() {
    const dimension = readDimension();
    if (dimension === null || !document.getElementById('matrix-0-0')) {
        setHint('Generate a matrix grid first.', true);
        return;
    }

    const matrix = readMatrix(dimension);
    if (matrix.some(row => row.some(value => !Number.isFinite(value)))) {
        setHint('Every cell must be a number.', true);
        return;
    }

    resetResults('Working…');
    const container = document.getElementById('steps-container');
    const steps = [];

    steps.push(buildStep('Starting matrix', 'The matrix A you entered.', [
        { matrix, label: 'A', variant: 'a' }
    ]));

    // Forward elimination: E₍k₎ · … · E₍0₎ · A = upper triangular
    const eliminationMatrices = [];
    let currentMatrix = matrix.map(row => row.slice());
    let singular = false;

    for (let k = 0; k < dimension - 1; k++) {
        if (isZero(currentMatrix[k][k])) {
            singular = true;
            steps.push(buildStep(
                `Step ${k + 1}: pivot ${k + 1} is zero`,
                'This matrix needs a row swap, so a plain LDU factorization does not exist for it. The remaining columns are left as they are.',
                [{ matrix: currentMatrix, label: 'unchanged', mark: (i, j) => (i === k && j === k ? 'is-danger' : '') }]
            ));
            continue;
        }

        const eliminationMatrix = createEliminationMatrix(currentMatrix, dimension, k);
        eliminationMatrices.push(eliminationMatrix);
        const next = multiplyMatrices(eliminationMatrix, currentMatrix);

        const pivotRow = (i, j) => (i === k ? 'is-pivot-row' : '') + (i === k && j === k ? ' is-pivot' : '');

        steps.push(buildStep(
            `Step ${k + 1}: clear below pivot ${k + 1}`,
            `Multiplying by E${k + 1} subtracts multiples of row ${k + 1} from the rows beneath it, zeroing column ${k + 1}.`,
            [
                {
                    matrix: eliminationMatrix, label: `E${k + 1}`, variant: 'e',
                    mark: (i, j) => (i > k && j === k ? 'is-multiplier' : ''),
                },
                '×',
                {
                    matrix: currentMatrix, label: 'current',
                    mark: (i, j) => pivotRow(i, j) + (i > k && j === k ? ' is-target' : ''),
                },
                '=',
                {
                    matrix: next, label: 'result',
                    mark: (i, j) => pivotRow(i, j) + (i > k && j === k ? ' is-cleared' : ''),
                },
            ]
        ));

        currentMatrix = next;
    }

    // E = every elimination matrix rolled into one (last applied first)
    const E = eliminationMatrices.length
        ? eliminationMatrices.reduceRight((acc, matrixK) => multiplyMatrices(acc, matrixK))
        : identityMatrix(dimension);

    const L = calculateInverse(E);
    const D = extractDiagonalMatrix(currentMatrix);
    const U = extractUpperTriangularMatrix(currentMatrix);

    steps.push(buildStep(
        'Combine the elimination matrices',
        'E is every elimination step rolled into one, so E · A is upper triangular. Inverting it gives L — note the signs simply flip.',
        [
            { matrix: E, label: 'E', variant: 'e' },
            '→',
            { matrix: L, label: 'L = E⁻¹', variant: 'l' },
        ]
    ));

    steps.push(buildStep(
        'Split the upper triangular result',
        'The pivots become D, and dividing each row by its pivot leaves U with 1s on the diagonal.',
        [
            { matrix: currentMatrix, label: 'E · A', variant: 'a' },
            '=',
            { matrix: D, label: 'D', variant: 'd' },
            '×',
            { matrix: U, label: 'U', variant: 'u' },
        ]
    ));

    steps.push(buildStep(
        'Final factorization',
        singular
            ? 'A zero pivot was found, so this product may not reproduce A exactly.'
            : 'Multiplying L · D · U reconstructs the original matrix A.',
        [
            { matrix: L, label: 'L', variant: 'l' },
            '×',
            { matrix: D, label: 'D', variant: 'd' },
            '×',
            { matrix: U, label: 'U', variant: 'u' },
            '=',
            { matrix: multiplyMatrices(multiplyMatrices(L, D), U), label: 'A', variant: 'a' },
        ]
    ));

    steps.forEach(step => container.appendChild(step));
    playback.steps = steps;

    const pivots = currentMatrix.map((row, i) => row[i]);
    renderSummary(dimension, pivots, singular);
    copyPayload = [matrixToText(L, 'L'), matrixToText(D, 'D'), matrixToText(U, 'U')].join('\n\n');

    document.getElementById('playback').hidden = false;
    goToStep(0, false);

    document.getElementById('result-subtitle').textContent = singular
        ? `A ${dimension}×${dimension} matrix with a zero pivot — see the note in the steps below.`
        : `Factorization of your ${dimension}×${dimension} matrix — step through it below.`;

    setHint('Done — results are below.', false);
    document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
        document.documentElement.setAttribute('data-theme', theme);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function currentTheme() {
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initTheme() {
    let saved = null;
    try {
        saved = localStorage.getItem('ldu-theme');
    } catch {
        // private mode / storage disabled — fall back to the OS preference
    }
    applyTheme(saved);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try {
            localStorage.setItem('ldu-theme', next);
        } catch {
            // ignore
        }
    });
}

/* ------------------------------------------------------------------ *
 * Scroll-driven touches
 * ------------------------------------------------------------------ */

function initReveal() {
    const targets = document.querySelectorAll('.step-card, .calculator-card, .intro > h2, .intro > .section-subtitle');
    targets.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
    });

    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
}

function initActiveNav() {
    const sections = ['main-header', 'matrixform', 'result']
        .map(id => document.getElementById(id))
        .filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const links = new Map(
        [...document.querySelectorAll('.nav-links a')].map(a => [a.getAttribute('href').slice(1), a])
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const link = links.get(entry.target.id);
            if (link) link.classList.toggle('is-current', entry.isIntersecting);
        });
    }, { threshold: 0.35 });

    sections.forEach(section => observer.observe(section));
}

/** Hovering a result cell highlights its row and column. */
function initCrosshair() {
    const container = document.getElementById('steps-container');

    container.addEventListener('mouseover', event => {
        const cell = event.target.closest('.matrix-cell');
        if (!cell) return;
        const grid = cell.parentElement;
        grid.querySelectorAll('.matrix-cell').forEach(other => {
            const sameLine = other.dataset.row === cell.dataset.row || other.dataset.col === cell.dataset.col;
            other.classList.toggle('is-cross', sameLine);
        });
    });

    container.addEventListener('mouseout', event => {
        const cell = event.target.closest('.matrix-cell');
        if (!cell) return;
        cell.parentElement.querySelectorAll('.is-cross').forEach(other => other.classList.remove('is-cross'));
    });
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

function nudgeDimension(delta) {
    const field = document.getElementById('matrix-dimension');
    const current = parseInt(field.value, 10);
    const base = Number.isInteger(current) ? current : 3;
    field.value = Math.min(Math.max(base + delta, 1), MAX_DIMENSION);
    generateMatrixInputs({ silent: true }); // keep focus on the stepper button
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    document.getElementById('gen-matrix').addEventListener('click', () => generateMatrixInputs());
    document.getElementById('submit-matrix').addEventListener('click', submitMatrix);
    document.getElementById('clear-matrix').addEventListener('click', clearMatrixInputs);
    document.getElementById('fill-example').addEventListener('click', fillExample);
    document.getElementById('random-matrix').addEventListener('click', randomizeMatrix);
    document.getElementById('dim-inc').addEventListener('click', () => nudgeDimension(1));
    document.getElementById('dim-dec').addEventListener('click', () => nudgeDimension(-1));

    document.getElementById('matrix-dimension').addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            generateMatrixInputs();
        }
    });

    const grid = document.getElementById('matrix-container');
    grid.addEventListener('keydown', handleGridKeydown);
    grid.addEventListener('paste', handlePaste);
    grid.addEventListener('focusin', event => {
        if (event.target.classList.contains('matrix-input')) event.target.select();
    });

    document.getElementById('step-prev').addEventListener('click', () => {
        stopPlayback();
        goToStep(playback.index - 1, true);
    });
    document.getElementById('step-next').addEventListener('click', () => {
        stopPlayback();
        goToStep(playback.index + 1, true);
    });
    document.getElementById('step-play').addEventListener('click', togglePlayback);
    document.getElementById('step-all').addEventListener('click', revealAllSteps);
    document.getElementById('copy-result').addEventListener('click', copyResult);

    // ← / → step through the results whenever focus is not in a field
    document.addEventListener('keydown', event => {
        if (!playback.steps.length) return;
        if (event.target.matches('input, textarea, button')) return;
        if (event.key === 'ArrowLeft') { stopPlayback(); goToStep(playback.index - 1, true); }
        if (event.key === 'ArrowRight') { stopPlayback(); goToStep(playback.index + 1, true); }
    });

    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.classList.toggle('is-open', open);
    });
    links.addEventListener('click', event => {
        if (event.target.tagName === 'A') {
            links.classList.remove('is-open');
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    initReveal();
    initActiveNav();
    initCrosshair();

    // Start with a grid on screen instead of an empty card, without stealing focus
    generateMatrixInputs({ silent: true });
});
