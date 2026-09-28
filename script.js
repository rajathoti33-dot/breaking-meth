/* ==================================================
   1. CONFIGURATION & 2. GLOBAL STATE
================================================== */
const THEME_KEY = 'breaking_math_theme';
const state = { activeFormula: null, currentCategory: 'All', searchQuery: '', chartInstance: null };

/* ==================================================
   3. DOM REFERENCES
================================================== */
const DOM = {
    search: document.getElementById('search-input'),
    catList: document.getElementById('category-list'),
    grid: document.getElementById('formula-grid'),
    viewExplorer: document.getElementById('view-explorer'),
    viewCalc: document.getElementById('view-calculator'),
    explorerTitle: document.getElementById('explorer-title'),
    calcTitle: document.getElementById('calc-title'),
    calcDesc: document.getElementById('calc-desc'),
    calcCategory: document.getElementById('calc-category'),
    calcLatex: document.getElementById('calc-latex'),
    calcForm: document.getElementById('calc-form'),
    calcInputs: document.getElementById('calc-inputs'),
    calcResults: document.getElementById('calc-results'),
    calcSteps: document.getElementById('calc-steps'),
    calcFinal: document.getElementById('calc-final'),
    calcError: document.getElementById('calc-error'),
    calcVis: document.getElementById('calc-vis'),
    canvas: document.getElementById('math-canvas'),
    themeToggle: document.getElementById('theme-toggle'),
    btnLogin: document.getElementById('btn-login'),
    modal: document.getElementById('login-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnBack: document.getElementById('btn-back')
};

/* ==================================================
   14. INPUT PARSING / VALIDATION 
================================================== */
const v = {
    num: (val, name) => { const n = parseFloat(val); if (isNaN(n)) throw new Error(`Input '${name}' must be a number.`); return n; },
    nz: (val, name) => { const n = v.num(val, name); if (n === 0) throw new Error(`'${name}' cannot be zero.`); return n; },
    pos: (val, name) => { const n = v.num(val, name); if (n <= 0) throw new Error(`'${name}' must be positive.`); return n; },
    prob: (val, name) => { const n = v.num(val, name); if (n < 0 || n > 1) throw new Error(`'${name}' must be between 0 and 1.`); return n; },
    int: (val, name) => { const n = v.num(val, name); if (!Number.isInteger(n) || n < 0) throw new Error(`'${name}' must be a positive integer.`); return n; },
    csv: (val, name) => {
        if (!val.trim()) throw new Error(`Dataset '${name}' is empty.`);
        const arr = val.split(',').map(s => { const n = parseFloat(s.trim()); if (isNaN(n)) throw new Error(`Invalid value in '${name}'.`); return n; });
        if (arr.length === 0) throw new Error(`Dataset '${name}' requires values.`); return arr;
    }
};

const util = {
    fact: (n) => n <= 1 ? 1 : n * util.fact(n - 1),
    mean: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
    median: (arr) => { const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length % 2 !== 0 ? s[m] : (s[m-1]+s[m])/2; },
    std: (arr, pop=true) => { const m = util.mean(arr); return Math.sqrt(arr.reduce((a, x) => a + Math.pow(x - m, 2), 0) / (pop ? arr.length : arr.length - 1)); }
};

/* ==================================================
   4. FORMULA DATABASE
================================================== */
const MathDB = [
    // --- BASIC OPERATIONS ---
    { id: 'b_add', category: 'Basic Operations', name: 'Addition', desc: 'Sum of a and b.', latex: 'a + b', inputs: [{id:'a',label:'Value a'},{id:'b',label:'Value b'}], calculate: (i) => { const a=v.num(i.a,'a'), b=v.num(i.b,'b'); return {steps:[`${a} + ${b}`], result:`${a+b}`}; } },
    { id: 'b_sub', category: 'Basic Operations', name: 'Subtraction', desc: 'Difference between a and b.', latex: 'a - b', inputs: [{id:'a',label:'Value a'},{id:'b',label:'Value b'}], calculate: (i) => { const a=v.num(i.a,'a'), b=v.num(i.b,'b'); return {steps:[`${a} - ${b}`], result:`${a-b}`}; } },
    { id: 'b_mul', category: 'Basic Operations', name: 'Multiplication', desc: 'Product of a and b.', latex: 'a \\times b', inputs: [{id:'a',label:'Value a'},{id:'b',label:'Value b'}], calculate: (i) => { const a=v.num(i.a,'a'), b=v.num(i.b,'b'); return {steps:[`${a} * ${b}`], result:`${a*b}`}; } },
    { id: 'b_div', category: 'Basic Operations', name: 'Division', desc: 'Quotient of a and b.', latex: '\\frac{a}{b}', inputs: [{id:'a',label:'Numerator a'},{id:'b',label:'Denominator b'}], calculate: (i) => { const a=v.num(i.a,'a'), b=v.nz(i.b,'b'); return {steps:[`${a} / ${b}`], result:`${a/b}`}; } },
    { id: 'b_mod', category: 'Basic Operations', name: 'Modulus', desc: 'Remainder of a divided by b.', latex: 'a \\bmod b', inputs: [{id:'a',label:'Value a'},{id:'b',label:'Divisor b'}], calculate: (i) => { const a=v.num(i.a,'a'), b=v.nz(i.b,'b'); return {steps:[`${a} % ${b}`], result:`${a%b}`}; } },

    // --- PROBABILITY ---
    { id: 'p_bas', category: 'Probability', name: 'Basic Probability', desc: 'Favorable / Total outcomes.', latex: 'P(A) = \\frac{f}{t}', inputs: [{id:'f',label:'Favorable'},{id:'t',label:'Total'}], calculate: (i) => { const f=v.pos(i.f,'f'), t=v.pos(i.t,'t'); if(f>t) throw new Error("Favorable > Total"); return {steps:[`${f} / ${t}`], result:`${(f/t).toFixed(4)}`}; } },
    { id: 'p_comp', category: 'Probability', name: 'Probability of Complement', desc: 'Probability of NOT occurring.', latex: 'P(A\') = 1 - P(A)', inputs: [{id:'p',label:'P(A) [0-1]'}], calculate: (i) => { const p=v.prob(i.p,'P(A)'); return {steps:[`1 - ${p}`], result:`${(1-p).toFixed(4)}`}; } },
    { id: 'p_add', category: 'Probability', name: 'Addition Rule', desc: 'P(A or B)', latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)', inputs: [{id:'pa',label:'P(A)'},{id:'pb',label:'P(B)'},{id:'pab',label:'P(A∩B)'}], calculate: (i) => { const pa=v.prob(i.pa,'P(A)'), pb=v.prob(i.pb,'P(B)'), pab=v.prob(i.pab,'P(A∩B)'); return {steps:[`${pa} + ${pb} - ${pab}`], result:`${(pa+pb-pab).toFixed(4)}`}; } },
    { id: 'p_mul', category: 'Probability', name: 'Multiplication Rule', desc: 'P(A and B)', latex: 'P(A \\cap B) = P(A) \\times P(B|A)', inputs: [{id:'pa',label:'P(A)'},{id:'pba',label:'P(B|A)'}], calculate: (i) => { const pa=v.prob(i.pa,'P(A)'), pba=v.prob(i.pba,'P(B|A)'); return {steps:[`${pa} * ${pba}`], result:`${(pa*pba).toFixed(4)}`}; } },
    { id: 'p_perm', category: 'Probability', name: 'Permutations', desc: 'Ways to choose r from n (order matters).', latex: 'P(n,r) = \\frac{n!}{(n-r)!}', inputs: [{id:'n',label:'n (Total)'},{id:'r',label:'r (Chosen)'}], calculate: (i) => { const n=v.int(i.n,'n'), r=v.int(i.r,'r'); if(r>n) throw new Error("r > n"); return {steps:[`${n}! / (${n}-${r})!`], result:`${util.fact(n)/util.fact(n-r)}`}; } },
    { id: 'p_comb', category: 'Probability', name: 'Combinations', desc: 'Ways to choose r from n (order ignored).', latex: 'C(n,r) = \\frac{n!}{r!(n-r)!}', inputs: [{id:'n',label:'n (Total)'},{id:'r',label:'r (Chosen)'}], calculate: (i) => { const n=v.int(i.n,'n'), r=v.int(i.r,'r'); if(r>n) throw new Error("r > n"); return {steps:[`${n}! / (${r}! * (${n}-${r})!)`], result:`${util.fact(n)/(util.fact(r)*util.fact(n-r))}`}; } },

    // --- STATISTICS ---
    { id: 's_mean', category: 'Statistics', name: 'Mean', desc: 'Average of dataset.', latex: '\\mu = \\frac{\\sum x_i}{N}', inputs: [{id:'d',label:'Dataset (csv)'}], calculate: (i) => { const d=v.csv(i.d,'Data'); const m = util.mean(d); return {steps:[`Sum = ${d.reduce((a,b)=>a+b,0)}`, `N = ${d.length}`], result:`Mean = ${m.toFixed(4)}`, meta:{type:'stat', d, m}}; } },
    { id: 's_med', category: 'Statistics', name: 'Median', desc: 'Middle value of sorted dataset.', latex: '\\text{Median}', inputs: [{id:'d',label:'Dataset (csv)'}], calculate: (i) => { const d=v.csv(i.d,'Data'); return {steps:[`Sorted: ${[...d].sort((a,b)=>a-b).join(', ')}`], result:`Median = ${util.median(d).toFixed(4)}`}; } },
    { id: 's_rng', category: 'Statistics', name: 'Range', desc: 'Max - Min', latex: 'R = \\max(x) - \\min(x)', inputs: [{id:'d',label:'Dataset (csv)'}], calculate: (i) => { const d=v.csv(i.d,'Data'); const mx=Math.max(...d), mn=Math.min(...d); return {steps:[`Max = ${mx}`, `Min = ${mn}`], result:`Range = ${mx-mn}`}; } },
    { id: 's_varp', category: 'Statistics', name: 'Population Variance', desc: 'Measure of spread.', latex: '\\sigma^2 = \\frac{\\sum (x_i - \\mu)^2}{N}', inputs: [{id:'d',label:'Dataset (csv)'}], calculate: (i) => { const d=v.csv(i.d,'Data'); const m=util.mean(d), vrc=d.reduce((a,x)=>a+Math.pow(x-m,2),0)/d.length; return {steps:[`Mean = ${m.toFixed(4)}`, `Sum( (x-μ)² ) / N`], result:`σ² = ${vrc.toFixed(4)}`}; } },
    { id: 's_stdp', category: 'Statistics', name: 'Population Standard Deviation', desc: 'Square root of variance.', latex: '\\sigma = \\sqrt{\\frac{\\sum (x_i - \\mu)^2}{N}}', inputs: [{id:'d',label:'Dataset (csv)'}], calculate: (i) => { const d=v.csv(i.d,'Data'); const sd = util.std(d, true); return {steps:[`√Variance`], result:`σ = ${sd.toFixed(4)}`, meta:{type:'stat', d, m:util.mean(d)}}; } },
    { id: 's_z', category: 'Statistics', name: 'Z Score', desc: 'Distance from mean in std devs.', latex: 'Z = \\frac{x - \\mu}{\\sigma}', inputs: [{id:'x',label:'Value (x)'},{id:'m',label:'Mean (μ)'},{id:'s',label:'Std Dev (σ)'}], calculate: (i) => { const x=v.num(i.x,'x'), m=v.num(i.m,'μ'), s=v.nz(i.s,'σ'); return {steps:[`(${x} - ${m}) / ${s}`], result:`Z = ${((x-m)/s).toFixed(4)}`}; } },

    // --- VECTORS ---
    { id: 'v_add', category: 'Vectors', name: 'Vector Addition', desc: 'Sum of two vectors.', latex: '\\vec{u} + \\vec{v}', inputs: [{id:'u',label:'Vector U (csv)'},{id:'v',label:'Vector V (csv)'}], calculate: (i) => { const u=v.csv(i.u,'U'), vecV=v.csv(i.v,'V'); if(u.length!==vecV.length) throw new Error("Mismatched dimensions."); const r=u.map((x,idx)=>x+vecV[idx]); return {steps:[`[${u}] + [${vecV}]`], result:`[${r.join(', ')}]`}; } },
    { id: 'v_sub', category: 'Vectors', name: 'Vector Subtraction', desc: 'Difference of two vectors.', latex: '\\vec{u} - \\vec{v}', inputs: [{id:'u',label:'Vector U (csv)'},{id:'v',label:'Vector V (csv)'}], calculate: (i) => { const u=v.csv(i.u,'U'), vecV=v.csv(i.v,'V'); if(u.length!==vecV.length) throw new Error("Mismatched dimensions."); const r=u.map((x,idx)=>x-vecV[idx]); return {steps:[`[${u}] - [${vecV}]`], result:`[${r.join(', ')}]`}; } },
    { id: 'v_dot', category: 'Vectors', name: 'Dot Product', desc: 'Sum of product of components.', latex: '\\vec{u} \\cdot \\vec{v}', inputs: [{id:'u',label:'Vector U (csv)'},{id:'v',label:'Vector V (csv)'}], calculate: (i) => { const u=v.csv(i.u,'U'), vecV=v.csv(i.v,'V'); if(u.length!==vecV.length) throw new Error("Mismatched dimensions."); const dp = u.reduce((a,x,idx)=>a+(x*vecV[idx]),0); return {steps:[`Sum of (u[i] * v[i])`], result:`${dp}`}; } },
    { id: 'v_mag', category: 'Vectors', name: 'Vector Magnitude', desc: 'Length of a vector.', latex: '|\\vec{v}| = \\sqrt{\\sum v_i^2}', inputs: [{id:'v',label:'Vector V (csv)'}], calculate: (i) => { const vecV=v.csv(i.v,'V'); const mag = Math.sqrt(vecV.reduce((a,x)=>a+x*x,0)); return {steps:[`√(${vecV.map(x=>x+'²').join(' + ')})`], result:`${mag.toFixed(4)}`}; } },

    // --- MATRICES ---
    { id: 'm_add2', category: 'Matrices', name: 'Matrix Addition (2x2)', desc: 'Add two 2x2 matrices.', latex: 'A + B', inputs: [{id:'a',label:'Mat A (a,b,c,d csv)'},{id:'b',label:'Mat B (e,f,g,h csv)'}], calculate: (i) => { const a=v.csv(i.a,'A'), b=v.csv(i.b,'B'); if(a.length!==4||b.length!==4) throw new Error("Requires 4 values per matrix."); const r = a.map((x,idx)=>x+b[idx]); return {steps:[`Element-wise addition`], result:`[${r[0]}, ${r[1]}] \n[${r[2]}, ${r[3]}]`}; } },
    { id: 'm_det2', category: 'Matrices', name: 'Determinant (2x2)', desc: 'Matrix determinant.', latex: '|A| = ad - bc', inputs: [{id:'a',label:'a (0,0)'},{id:'b',label:'b (0,1)'},{id:'c',label:'c (1,0)'},{id:'d',label:'d (1,1)'}], calculate: (i) => { const a=v.num(i.a,'a'),b=v.num(i.b,'b'),c=v.num(i.c,'c'),d=v.num(i.d,'d'); return {steps:[`(${a} * ${d}) - (${b} * ${c})`], result:`${a*d - b*c}`}; } },
    { id: 'm_tr2', category: 'Matrices', name: 'Trace (2x2)', desc: 'Sum of main diagonal.', latex: '\\text{Tr}(A) = a + d', inputs: [{id:'a',label:'a (0,0)'},{id:'d',label:'d (1,1)'}], calculate: (i) => { const a=v.num(i.a,'a'), d=v.num(i.d,'d'); return {steps:[`${a} + ${d}`], result:`${a+d}`}; } },

    // --- GEOMETRY ---
    { id: 'g_rect', category: 'Geometry', name: 'Rectangle Area', desc: 'Area = L × W', latex: 'A = l \\times w', inputs: [{id:'l',label:'Length'},{id:'w',label:'Width'}], calculate: (i) => { const l=v.pos(i.l,'L'), w=v.pos(i.w,'W'); return {steps:[`${l} * ${w}`], result:`${l*w}`, meta:{type:'rect', l, w}}; } },
    { id: 'g_cyl', category: 'Geometry', name: 'Cylinder Volume', desc: 'Volume = πr²h', latex: 'V = \\pi r^2 h', inputs: [{id:'r',label:'Radius'},{id:'h',label:'Height'}], calculate: (i) => { const r=v.pos(i.r,'r'), h=v.pos(i.h,'h'); const vol = Math.PI*r*r*h; return {steps:[`π * (${r}²) * ${h}`], result:`${vol.toFixed(4)}`}; } },
    { id: 'g_sph', category: 'Geometry', name: 'Sphere Volume', desc: 'Volume = 4/3 πr³', latex: 'V = \\frac{4}{3}\\pi r^3', inputs: [{id:'r',label:'Radius'}], calculate: (i) => { const r=v.pos(i.r,'r'); const vol = (4/3)*Math.PI*Math.pow(r, 3); return {steps:[`(4/3) * π * ${r}³`], result:`${vol.toFixed(4)}`}; } },
    { id: 'g_pyth', category: 'Geometry', name: 'Pythagorean Theorem', desc: 'Hypotenuse c.', latex: 'c = \\sqrt{a^2 + b^2}', inputs: [{id:'a',label:'Side a'},{id:'b',label:'Side b'}], calculate: (i) => { const a=v.pos(i.a,'a'), b=v.pos(i.b,'b'); const c = Math.sqrt(a*a + b*b); return {steps:[`√(${a}² + ${b}²)`], result:`c = ${c.toFixed(4)}`, meta:{type:'bar', l:['a','b','c'], d:[a,b,c]}}; } },

    // --- TRIGONOMETRY ---
    { id: 't_sin', category: 'Trigonometry', name: 'Sine Calculator', desc: 'Sine of angle.', latex: '\\sin(\\theta)', inputs: [{id:'a',label:'Angle'},{id:'u',label:'Unit (deg/rad)'}], calculate: (i) => { const a=v.num(i.a,'Angle'), u=i.u.trim().toLowerCase(); const rad = u==='deg'?a*(Math.PI/180):a; return {steps:[`${a} ${u} = ${rad.toFixed(4)} rad`], result:`${Math.sin(rad).toFixed(4)}`}; } },
    { id: 't_cos', category: 'Trigonometry', name: 'Cosine', desc: 'Cosine of angle.', latex: '\\cos(\\theta)', inputs: [{id:'a',label:'Angle'},{id:'u',label:'Unit (deg/rad)'}], calculate: (i) => { const a=v.num(i.a,'Angle'), u=i.u.trim().toLowerCase(); const rad = u==='deg'?a*(Math.PI/180):a; return {steps:[`${a} ${u} = ${rad.toFixed(4)} rad`], result:`${Math.cos(rad).toFixed(4)}`}; } },
    
    // --- CALCULUS ---
    { id: 'c_drv', category: 'Calculus', name: 'Derivative', desc: 'Power rule: d/dx (axⁿ) at x.', latex: '\\frac{d}{dx}ax^n = anx^{n-1}', inputs: [{id:'a',label:'Coef a'},{id:'n',label:'Exp n'},{id:'x',label:'Eval at x'}], calculate: (i) => { const a=v.num(i.a,'a'), n=v.num(i.n,'n'), x=v.num(i.x,'x'); const c=a*n, e=n-1, res=c*Math.pow(x,e); if(!isFinite(res)) throw new Error("Undefined domain."); return {steps:[`f'(x) = (${a}*${n})x^(${n}-1) = ${c}x^${e}`, `f'(${x}) = ${c}(${x})^${e}`], result:`${res.toFixed(4)}`, meta:{type:'deriv', a, n}}; } },
    { id: 'c_int', category: 'Calculus', name: 'Indefinite Integral', desc: 'Power rule: ∫ axⁿ dx', latex: '\\int ax^n dx = \\frac{a}{n+1}x^{n+1} + C', inputs: [{id:'a',label:'Coef a'},{id:'n',label:'Exp n'}], calculate: (i) => { const a=v.num(i.a,'a'), n=v.num(i.n,'n'); if(n===-1) throw new Error("n cannot be -1."); return {steps:[`${a}/(${n}+1) * x^(${n}+1)`], result:`${(a/(n+1)).toFixed(4)}x^${n+1} + C`}; } },

    // --- FINANCE ---
    { id: 'f_comp', category: 'Finance', name: 'Compound Interest', desc: 'Total accumulated amount.', latex: 'A = P(1 + \\frac{r}{n})^{nt}', inputs: [{id:'p',label:'Principal'},{id:'r',label:'Rate %'},{id:'n',label:'Compounds/Yr'},{id:'t',label:'Years'}], calculate: (i) => { const p=v.pos(i.p,'P'), r=v.pos(i.r,'r')/100, n=v.pos(i.n,'n'), t=v.pos(i.t,'t'); const A=p*Math.pow(1+(r/n), n*t); return {steps:[`A = ${p}(1 + ${r}/${n})^(${n*t})`], result:`$${A.toFixed(2)}`, meta:{type:'fin', p, r, n, t}}; } }
];

/* ==================================================
   17. SEARCH & CATEGORY FILTERING & UI GENERATION
================================================== */
const renderCategories = () => {
    const cats = ['All', ...new Set(MathDB.map(f => f.category))];
    DOM.catList.innerHTML = cats.map(c => `<li class="${c === state.currentCategory ? 'active' : ''}" data-cat="${c}">${c}</li>`).join('');
    
    document.querySelectorAll('#category-list li').forEach(li => {
        li.addEventListener('click', (e) => {
            state.currentCategory = e.target.dataset.cat;
            state.searchQuery = '';
            DOM.search.value = '';
            renderCategories();
            renderGrid();
        });
    });
};

const renderGrid = () => {
    let filtered = MathDB;
    if (state.currentCategory !== 'All') filtered = filtered.filter(f => f.category === state.currentCategory);
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q));
    }
    
    DOM.explorerTitle.textContent = state.searchQuery ? `Search Results` : (state.currentCategory === 'All' ? 'All Formulas' : `${state.currentCategory} Formulas`);
    
    DOM.grid.innerHTML = filtered.length ? filtered.map(f => `
        <div class="formula-card" onclick="openCalculator('${f.id}')">
            <span class="text-caption">${f.category}</span>
            <h3>${f.name}</h3>
            <p class="text-muted" style="font-size: 14px;">${f.desc}</p>
        </div>
    `).join('') : '<p class="text-muted">No matching formulas found.</p>';
};

window.openCalculator = (id) => {
    state.activeFormula = MathDB.find(f => f.id === id);
    DOM.viewExplorer.classList.add('hidden');
    DOM.viewCalc.classList.remove('hidden');
    DOM.calcForm.reset();
    DOM.calcResults.classList.add('hidden');
    DOM.calcError.classList.add('hidden');
    if(state.chartInstance) state.chartInstance.destroy();
    
    DOM.calcCategory.textContent = state.activeFormula.category;
    DOM.calcTitle.textContent = state.activeFormula.name;
    DOM.calcDesc.textContent = state.activeFormula.desc;
    
    katex.render(state.activeFormula.latex, DOM.calcLatex, { displayMode: true, throwOnError: false });

    DOM.calcInputs.innerHTML = state.activeFormula.inputs.map(inp => `
        <div class="input-group">
            <label>${inp.label}</label>
            <input type="text" id="inp_${inp.id}" class="input-control" required autocomplete="off">
        </div>
    `).join('');
};

/* ==================================================
   15. CALCULATION ENGINE
================================================== */
DOM.calcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    DOM.calcError.classList.add('hidden');
    DOM.calcResults.classList.add('hidden');
    
    try {
        const vals = {};
        state.activeFormula.inputs.forEach(inp => { vals[inp.id] = document.getElementById(`inp_${inp.id}`).value; });
        const res = state.activeFormula.calculate(vals);
        
        DOM.calcSteps.innerHTML = res.steps.map((s, i) => `<div class="step-item"><span class="text-muted" style="margin-right: 8px;">Step ${i+1}:</span> ${s}</div>`).join('');
        DOM.calcFinal.textContent = res.result;
        DOM.calcResults.classList.remove('hidden');

        renderVisualization(res.meta);
    } catch (err) {
        DOM.calcError.textContent = err.message;
        DOM.calcError.classList.remove('hidden');
    }
});

/* ==================================================
   21. GRAPH RENDERING
================================================== */
const renderVisualization = (meta) => {
    if (!meta) { DOM.calcVis.classList.add('hidden'); return; }
    DOM.calcVis.classList.remove('hidden');
    if (state.chartInstance) state.chartInstance.destroy();
    
    const ctx = DOM.canvas.getContext('2d');
    const pColor = getComputedStyle(document.body).getPropertyValue('--primary').trim();
    const mColor = getComputedStyle(document.body).getPropertyValue('--muted').trim();
    const bColor = getComputedStyle(document.body).getPropertyValue('--border').trim();
    const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: mColor } } }, scales: { x: { grid: { color: bColor }, ticks: { color: mColor } }, y: { grid: { color: bColor }, ticks: { color: mColor } } } };

    let config = {};
    if (meta.type === 'deriv') {
        const lbls = [], dF = [], dDf = [];
        for(let i = -5; i <= 5; i++) { lbls.push(i); dF.push(meta.a*Math.pow(i, meta.n)); dDf.push((meta.a*meta.n)*Math.pow(i, meta.n-1)); }
        config = { type: 'line', data: { labels: lbls, datasets: [{ label: 'f(x)', data: dF, borderColor: mColor, borderDash: [5,5] }, { label: "f'(x)", data: dDf, borderColor: pColor }] }, options: baseOpts };
    } else if (meta.type === 'fin') {
        const lbls = [], dt = [];
        for(let i = 0; i <= meta.t; i++) { lbls.push(`Y${i}`); dt.push(meta.p*Math.pow(1+(meta.r/meta.n), meta.n*i)); }
        config = { type: 'bar', data: { labels: lbls, datasets: [{ label: 'Value', data: dt, backgroundColor: pColor }] }, options: baseOpts };
    } else if (meta.type === 'stat') {
        config = { type: 'scatter', data: { datasets: [{ label: 'Data', data: meta.d.map((y,x)=>({x,y})), backgroundColor: pColor }] }, options: baseOpts };
    } else if (meta.type === 'bar') {
        config = { type: 'bar', data: { labels: meta.l, datasets: [{ label: 'Values', data: meta.d, backgroundColor: pColor }] }, options: baseOpts };
    } else if (meta.type === 'rect') {
        config = { type: 'bar', data: { labels: ['Length', 'Width'], datasets: [{ label: 'Dimensions', data: [meta.l, meta.w], backgroundColor: pColor }] }, options: baseOpts };
    }

    if(Object.keys(config).length > 0) state.chartInstance = new Chart(ctx, config);
};

/* ==================================================
   23. THEME MANAGEMENT & LOGIN INTERFACE
================================================== */
const initTheme = () => {
    const pref = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', pref);
};

DOM.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    if(state.activeFormula && !DOM.calcResults.classList.contains('hidden')) DOM.calcForm.dispatchEvent(new Event('submit'));
});

DOM.btnLogin.addEventListener('click', () => DOM.modal.classList.remove('hidden'));
DOM.btnCloseModal.addEventListener('click', () => DOM.modal.classList.add('hidden'));

/* ==================================================
   30. EVENT LISTENERS & 31. INITIALIZATION
================================================== */
DOM.search.addEventListener('input', (e) => { state.searchQuery = e.target.value; renderGrid(); });
document.getElementById('btn-reset').addEventListener('click', () => { DOM.calcForm.reset(); DOM.calcResults.classList.add('hidden'); DOM.calcError.classList.add('hidden'); if(state.chartInstance) state.chartInstance.destroy(); });
const goHome = (e) => { e.preventDefault(); DOM.viewCalc.classList.add('hidden'); DOM.viewExplorer.classList.remove('hidden'); state.activeFormula = null; };
DOM.btnBack.addEventListener('click', goHome);
document.getElementById('nav-home').addEventListener('click', goHome);

// Boot
initTheme();
renderCategories();
renderGrid();