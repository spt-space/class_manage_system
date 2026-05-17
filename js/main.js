// ==================== JSONbin 数据库配置（多Bin架构） ====================
const JSONBIN_CONFIG = {
    apiUrl: 'https://api.jsonbin.io/v3/b',
    masterKey: '$2a$10$ebYZ74Vevdtj4LtmNemtHOLSPBk0CeTdPa0PuqybhSoRsAQiXBbxi',
    bins: {
        classes: { binId: '69fb491daaba8821977ade0c', name: 'classes' },
        students: { binId: '69fb4958aaba8821977adf13', name: 'students' },
        driftBottles: { binId: '69fb4979856a682189b2f6fe', name: 'driftBottles' },
        timeCapsules: { binId: '69fb499a36566621a830da9e', name: 'timeCapsules' },
        errorBanks: { binId: '69fb49c3856a682189b2f8ed', name: 'errorBanks' },
        dutyRosters: { binId: '69fb49f4856a682189b2f9a3', name: 'dutyRosters' },
        borrowItems: { binId: '69fb4ab536566621a830e08b', name: 'borrowItems' }
    }
};

// ==================== 排序状态 ====================
const sortState = {
    drift: { order: 'desc', by: 'date' },
    time: { order: 'desc', by: 'date' },
    error: { order: 'desc', by: 'date' }
};

// ==================== KaTeX 渲染引擎（替代 MathJax） ====================
let katexReady = false;

function loadKaTeXResources() {
    if (!document.querySelector('link[href*="katex@0.16.9/dist/katex.min.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);
    }
}

async function initKaTeX() {
    if (katexReady) return;
    loadKaTeXResources();
    
    await new Promise((resolve, reject) => {
        if (window.katex && window.renderMathInElement) {
            katexReady = true;
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
        script.onload = () => {
            const ar = document.createElement('script');
            ar.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
            ar.onload = () => {
                katexReady = true;
                resolve();
            };
            ar.onerror = reject;
            document.head.appendChild(ar);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 强制 inline 公式中的大型运算符使用 display 样式（limits 在正下方/正上方）
function forceDisplayStyleForOperators(html) {
    if (!html) return html;
    const operators = ['sum', 'prod', 'int', 'lim', 'bigcup', 'bigcap', 'bigoplus', 'bigotimes', 'bigodot', 'bigsqcup', 'biguplus', 'oint', 'coprod'];
    
    // 临时保护 $$...$$，避免被误处理
    const displayBlocks = [];
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        displayBlocks.push(match);
        return `__DISPLAY_BLOCK_${displayBlocks.length - 1}__`;
    });
    
    // 处理 $...$ (inline)：若包含大型运算符且未使用 \displaystyle，则自动添加
    html = html.replace(/\$([^$]*?)\$/g, (match, content) => {
        if (content.includes('\\displaystyle')) return match;
        const hasOperator = operators.some(op => {
            const regex = new RegExp('\\\\' + op + '(?=[_^\\s{|])');
            return regex.test(content);
        });
        if (hasOperator) {
            return '$\\displaystyle ' + content + '$';
        }
        return match;
    });
    
    // 恢复 $$...$$
    displayBlocks.forEach((block, i) => {
        html = html.replace(`__DISPLAY_BLOCK_${i}__`, block);
    });
    
    return html;
}

// 兼容原 MathJax.typesetPromise API，使用 KaTeX 不压缩渲染
async function typesetPromise(elements, options = {}) {
    await initKaTeX();
    if (!window.renderMathInElement) return;
    elements.forEach(el => {
        if (el && el.innerHTML !== undefined) {
            if (options.forceDisplayOperators) {
                el.innerHTML = forceDisplayStyleForOperators(el.innerHTML);
            }
            renderMathInElement(el, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false,
                trust: true,
                strict: false
            });
        }
    });
}

// ==================== LaTeX 预览功能 ====================
function previewLaTeX(inputId, previewId) {
    const input = document.getElementById(inputId);
    const previewBox = document.getElementById(previewId + '-box');
    const preview = document.getElementById(previewId);
    if (!input || !preview || !previewBox) return;

    const text = input.value.trim();
    if (!text) {
        previewBox.style.display = 'none';
        return;
    }

    previewBox.style.display = 'block';
    preview.innerHTML = escapeHtml(text);

    // 使用 KaTeX 精确渲染预览元素，字体正常不压缩，强制大型运算符 display 样式
    typesetPromise([preview], {forceDisplayOperators: true}).catch(err => console.error('KaTeX预览渲染失败:', err));
}

// ==================== LaTeX 快捷输入 ====================
let activeLaTeXInputId = null;

function setActiveLaTeXInput(id) {
    activeLaTeXInputId = id;
}

function insertLaTeX(left, right) {
    if (!activeLaTeXInputId) {
        showNotification('请先点击题目或解析输入框以聚焦', 'warning');
        return;
    }
    const el = document.getElementById(activeLaTeXInputId);
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);

    let insertText = left;
    let cursorOffset = left.length;

    if (right) {
        if (selected) {
            insertText = left + selected + right;
            cursorOffset = left.length + selected.length;
        } else {
            insertText = left + right;
            // 将光标移到左右标记中间
            cursorOffset = left.length;
        }
    } else {
        if (selected) {
            insertText = left.replace('{}', '{' + selected + '}');
            cursorOffset = insertText.length;
        } else {
            insertText = left;
            // 对于 \frac{}{} 这类，把光标放到第一个花括号里
            const firstBrace = insertText.indexOf('{');
            if (firstBrace !== -1 && insertText.indexOf('{}', firstBrace) !== -1) {
                cursorOffset = firstBrace + 1;
            } else {
                cursorOffset = insertText.length;
            }
        }
    }

    el.value = text.substring(0, start) + insertText + text.substring(end);
    el.focus();
    el.setSelectionRange(start + cursorOffset, start + cursorOffset);

    // 触发 input 事件以更新 LaTeX 预览
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

// ==================== 全局状态 ====================
let currentClass = localStorage.getItem('currentClass') || '';
let students = [];
const dbCache = {
    classes: null,
    students: null,
    driftBottles: null,
    timeCapsules: null,
    errorBanks: null,
    dutyRosters: null,
    borrowItems: null
};
let isLoading = false;
let currentDriftFilter = 'all';
let selectedMood = '';
let currentErrorId = null;

// ==================== 上传进度条 ====================
let uploadInterval = null;
let uploadCount = 0;

function showUploadProgress() {
    uploadCount++;
    if (uploadCount > 1) return;
    const overlay = document.getElementById('upload-overlay');
    const bar = document.getElementById('upload-progress');
    overlay.classList.add('active');
    bar.style.width = '0%';
    let progress = 0;
    uploadInterval = setInterval(() => {
        progress += Math.random() * 12 + 3;
        if (progress > 92) progress = 92;
        bar.style.width = progress + '%';
    }, 180);
}

function hideUploadProgress() {
    uploadCount = Math.max(0, uploadCount - 1);
    if (uploadCount > 0) return;
    clearInterval(uploadInterval);
    const bar = document.getElementById('upload-progress');
    bar.style.width = '100%';
    setTimeout(() => {
        document.getElementById('upload-overlay').classList.remove('active');
        setTimeout(() => { bar.style.width = '0%'; }, 10);
    }, 200);
}

// ==================== 各Bin的默认空数据结构 ====================
function getEmptyData(binName) {
    const defaults = {
        classes: [],
        students: {},
        driftBottles: {},
        timeCapsules: {},
        errorBanks: {},
        dutyRosters: {},
        borrowItems: {}
    };
    return defaults[binName] !== undefined ? JSON.parse(JSON.stringify(defaults[binName])) : {};
}

// ==================== JSONbin 数据库操作层（多Bin） ====================

var binCount = 0;

async function fetchFromJSONbin(binName, attempt = 0) {
    const binConfig = JSONBIN_CONFIG.bins[binName];
    if (!binConfig || !binConfig.binId) {
        console.warn(`[${binName}] binId 未设置，使用本地缓存`);
        return dbCache[binName] || getEmptyData(binName);
    }

    const baseDelay = 500;
    const maxDelay = 8000;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${JSONBIN_CONFIG.apiUrl}/${binConfig.binId}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.masterKey,
                'X-Bin-Meta': 'false'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`[${binName}] JSONbin不存在，创建新数据库`);
                const emptyData = getEmptyData(binName);
                await createJSONbin(binName, emptyData);
                return emptyData;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        const data = result.record || result;
        dbCache[binName] = data;
        binCount = binCount + 1;
        console.log(`[JSONbin][${binName}] 读取成功 (${binCount}/7)`);
        document.getElementById('loader-status').style.opacity = '1';
        document.getElementById('loader-status').innerHTML = `[JSONbin] 读取成功 ${binCount}/7`;
        if (binCount === 7) {
            setTimeout(() => {
                document.getElementById('loader').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loader').style.display = 'none';
                }, 500);
                loadInitialData();
            }, 750);
        }
        return data;
    } catch (e) {
        console.error(`[JSONbin][${binName}] 读取失败 (尝试 ${attempt + 1}):`, e.message || e);
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 200;
        await new Promise(r => setTimeout(r, delay + jitter));
        return fetchFromJSONbin(binName, attempt + 1);
    }
}
async function createJSONbin(binName, data) {
    try {
        const response = await fetch(JSONBIN_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.masterKey,
                'X-Bin-Name': JSONBIN_CONFIG.bins[binName].name || binName
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (result.metadata && result.metadata.id) {
            JSONBIN_CONFIG.bins[binName].binId = result.metadata.id;
            console.log(`[JSONbin][${binName}] 创建成功, ID:`, result.metadata.id);
            localStorage.setItem(`jsonbin_${binName}_id`, result.metadata.id);
            showNotification(binName + ' 数据库创建成功！Bin ID: ' + result.metadata.id, 'success');
        }
        return true;
    } catch (e) {
        console.error(`[JSONbin][${binName}] 创建失败:`, e);
        throw e;
    }
}

async function pushToJSONbin(binName, data, attempt = 0) {
    if (attempt === 0) showUploadProgress();
    const binConfig = JSONBIN_CONFIG.bins[binName];
    if (!binConfig || !binConfig.binId) {
        console.warn(`[${binName}] binId 未设置，尝试创建新数据库`);
        try {
            await createJSONbin(binName, data);
            hideUploadProgress();
            return;
        } catch (e) {
            hideUploadProgress();
            throw e;
        }
    }

    const baseDelay = 600;
    const maxDelay = 10000;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout')), 20000);

        const response = await fetch(`${JSONBIN_CONFIG.apiUrl}/${binConfig.binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.masterKey
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();
        console.log(result);

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`[${binName}] JSONbin不存在，重新创建`);
                await createJSONbin(binName, data);
                hideUploadProgress();
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        dbCache[binName] = JSON.parse(JSON.stringify(data));
        console.log(`[JSONbin][${binName}] 保存成功`);
        try {
            localStorage.setItem(`class_db_backup_${binName}`, JSON.stringify(data));
        } catch (e) { }
        hideUploadProgress();
        return true;
    } catch (e) {
        console.error(`[JSONbin][${binName}] 保存失败 (尝试 ${attempt + 1}):`, e.message || e);
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 300;
        await new Promise(r => setTimeout(r, delay + jitter));
        return pushToJSONbin(binName, data, attempt + 1);
    }
}
async function dbGet(binName) {
    if (isLoading) {
        await new Promise(r => setTimeout(r, 100));
        return dbCache[binName] || getEmptyData(binName);
    }
    if (!dbCache[binName]) {
        return await fetchFromJSONbin(binName);
    }
    return dbCache[binName];
}

async function getClassData(key, className) {
    const db = await dbGet(key);
    if (!db[className]) {
        db[className] = (key === 'dutyRosters') ? { positions: [], schedule: [] } : [];
    }
    return db[className];
}

async function setClassData(key, className, value) {
    const db = await dbGet(key);
    db[className] = value;
    await pushToJSONbin(key, db);
}

// ==================== 初始化 ====================
async function initDatabase() {
    Object.keys(JSONBIN_CONFIG.bins).forEach(binName => {
        const savedId = localStorage.getItem(`jsonbin_${binName}_id`);
        if (savedId && !JSONBIN_CONFIG.bins[binName].binId) {
            JSONBIN_CONFIG.bins[binName].binId = savedId;
            console.log(`[初始化] 从localStorage恢复 ${binName} binId:`, savedId);
        }
    });

    isLoading = true;
    let connectedCount = 0;
    let failedCount = 0;
    const binNames = Object.keys(JSONBIN_CONFIG.bins);

    await Promise.all(binNames.map(async (binName) => {
        try {
            await fetchFromJSONbin(binName);
            connectedCount++;
        } catch (e) {
            failedCount++;
            console.error(`[初始化] ${binName} 连接失败:`, e);
        }
    }));

    if (connectedCount === binNames.length) {
        showNotification('JSONbin连接成功 (' + connectedCount + '/' + binNames.length + ')', 'success');
        document.getElementById('conn-status').innerHTML = '<i class="fa-solid fa-check"></i> JSONbin';
        document.getElementById('conn-status').className = 'connection-status status-connected';
    } else if (connectedCount > 0) {
        showNotification('JSONbin部分连接成功 (' + connectedCount + '/' + binNames.length + ')', 'warning');
        document.getElementById('conn-status').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> 部分连接';
        document.getElementById('conn-status').className = 'connection-status status-disconnected';
    } else {
        showNotification('JSONbin连接失败，使用本地缓存', 'error');
        document.getElementById('conn-status').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> 使用本地缓存';
        document.getElementById('conn-status').className = 'connection-status status-disconnected';
    }

    isLoading = false;
}

// ==================== 页面切换 ====================
function navigateTo(pageId) {
    const current = document.querySelector('.page.active');
    const next = document.getElementById(pageId);
    if (!next) return;
    if (current === next) return;
    if (!currentClass && pageId !== 'page-home' && pageId !== 'page-update') { showNotification('请先选择班级！', 'warning'); openClassModal(); return; }
    if (current) {
        current.classList.add('exit');
        current.classList.remove('active');
        setTimeout(() => { current.classList.remove('exit'); current.style.display = 'none'; }, 400);
    }
    next.style.display = 'block';
    requestAnimationFrame(() => next.classList.add('active'));
    if (pageId === 'page-drift') setTimeout(initDriftPage, 100);
    if (pageId === 'page-time') setTimeout(initTimePage, 100);
    if (pageId === 'page-error') setTimeout(initErrorPage, 100);
    if (pageId === 'page-assistant') setTimeout(initAssistantPage, 100);
    setTimeout(() => {
        typesetPromise(document.querySelectorAll('latex'));
    }, 105);
    setTimeout(() => {
        next.style.display = 'block';
    },500)
}

function goHome() { navigateTo('page-home'); }

// ==================== 弹窗工具（带动画） ====================
let currentModalId = null;
let currentModalKeyHandler = null;

const modalConfirmActions = {
    'modal-class': () => createClass(),
    'modal-student': () => addStudent(),
    'modal-drift-publish': () => publishDrift(),
    'modal-drift-receive': () => receiveDrift(),
    'modal-add-error': () => saveError(),
    'modal-borrow': () => confirmBorrow(),
    'modal-edit-error': () => updateError(),
    'modal-op': () => opCheck()
};

function openModal(id) {
    if (currentModalId && currentModalKeyHandler) {
        document.removeEventListener('keydown', currentModalKeyHandler);
        currentModalKeyHandler = null;
        currentModalId = null;
    }

    const modal = document.getElementById(id);
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = 1;
    }, 5);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);

    currentModalId = id;

    currentModalKeyHandler = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeModal(id);
        } else if (e.key === 'Enter') {
            const tag = e.target.tagName.toLowerCase();
            const type = (e.target.type || '').toLowerCase();

            if (tag === 'textarea') return;
            if (tag === 'input' && type === 'file') return;
            if (tag === 'button') return;

            const action = modalConfirmActions[id];
            if (action) {
                e.preventDefault();
                action();
            }
        }
    };

    document.addEventListener('keydown', currentModalKeyHandler);
}

function closeModal(id) {
    if (currentModalKeyHandler && currentModalId === id) {
        document.removeEventListener('keydown', currentModalKeyHandler);
        currentModalKeyHandler = null;
        currentModalId = null;
    }

    const modal = document.getElementById(id);
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    if (content) content.classList.add('closing');
    modal.style.opacity = 0;
    setTimeout(() => {
        modal.style.display = 'none';
        if (content) content.classList.remove('closing');
        const anyOpen = Array.from(document.querySelectorAll('.modal-overlay')).some(m => m.style.display === 'flex');
        if (!anyOpen) document.body.style.overflow = '';
    }, 300);
}

// ==================== 初始化数据 ====================
async function loadInitialData() {
    const classes = await dbGet('classes') || [];
    if (currentClass && !classes.includes(currentClass)) currentClass = '';
    if (classes.length === 1 && !currentClass) await selectClass(classes[0]);
    if (currentClass) {
        document.getElementById('current-class-display').innerHTML = `<div style="font-weight:normal;"><i class="fa-solid fa-school"></i>当前班级 : ` + currentClass + '</div>';
        await refreshStudents();
    }
}

async function refreshStudents() {
    if (!currentClass) return;
    students = await getClassData('students', currentClass);
    updateStudentSelects();
}

function updateStudentSelects() {
    const opts = students.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    ['drift-owner', 'drift-receiver', 'time-name', 'borrow-person'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">请选择</option>' + opts;
    });
}

// ==================== 班级管理 ====================
async function openClassModal() {
    await renderClassList();
    openModal('modal-class');
}

async function renderClassList() {
    const classes = await dbGet('classes') || [];
    if (classes.length === 0) {
        document.getElementById('class-list-container').innerHTML = '<div class="empty-tip">暂无班级，请创建</div>';
        return;
    }
    let html = '';
    classes.forEach(c => {
        html += `<div class="class-item">
                    <span class="class-name ${c === currentClass ? 'current' : ''}" onclick="selectClass('${c}')">${c} ${c === currentClass ? `<i class="fa-solid fa-check"></i>` : ''}</span>
                    <button class="op btn btn-sm btn-danger" onclick="deleteClass('${c}')">删除</button>
                </div>`;
    });
    document.getElementById('class-list-container').innerHTML = html;
}

async function selectClass(name) {
    currentClass = name;
    localStorage.setItem('currentClass', name);
    document.getElementById('current-class-display').innerHTML = `<div style="font-weight:normal;"><i class="fa-solid fa-school"></i>当前班级 : ` + currentClass + '</div>';
    await refreshStudents();
    await renderClassList();
    closeModal('modal-class');
}

async function createClass() {
    const name = document.getElementById('new-class-name').value.trim();
    if (!name) return showNotification('请输入班级名称', 'warning');
    const classes = await dbGet('classes') || [];
    if (classes.includes(name)) return showNotification('该班级已存在', 'warning');
    classes.push(name);

    const studentsDB = await dbGet('students');
    studentsDB[name] = [];
    const driftDB = await dbGet('driftBottles');
    driftDB[name] = [];
    const timeDB = await dbGet('timeCapsules');
    timeDB[name] = [];
    const errorDB = await dbGet('errorBanks');
    errorDB[name] = [];
    const dutyDB = await dbGet('dutyRosters');
    dutyDB[name] = { positions: [], schedule: [] };
    const borrowDB = await dbGet('borrowItems');
    borrowDB[name] = [];

    try {
        await Promise.all([
            pushToJSONbin('classes', classes),
            pushToJSONbin('students', studentsDB),
            pushToJSONbin('driftBottles', driftDB),
            pushToJSONbin('timeCapsules', timeDB),
            pushToJSONbin('errorBanks', errorDB),
            pushToJSONbin('dutyRosters', dutyDB),
            pushToJSONbin('borrowItems', borrowDB)
        ]);
        document.getElementById('new-class-name').value = '';
        await selectClass(name);
    } catch (e) {
        showNotification('创建班级失败:${e.message}', 'error');
    }
}

async function deleteClass(name) {
    if (!confirm(`确定删除班级"${name}"吗？该班级的所有数据将被清空！`)) return;

    const classes = await dbGet('classes') || [];
    const newClasses = classes.filter(c => c !== name);

    const studentsDB = await dbGet('students');
    delete studentsDB[name];
    const driftDB = await dbGet('driftBottles');
    delete driftDB[name];
    const timeDB = await dbGet('timeCapsules');
    delete timeDB[name];
    const errorDB = await dbGet('errorBanks');
    delete errorDB[name];
    const dutyDB = await dbGet('dutyRosters');
    delete dutyDB[name];
    const borrowDB = await dbGet('borrowItems');
    delete borrowDB[name];

    try {
        await Promise.all([
            pushToJSONbin('classes', newClasses),
            pushToJSONbin('students', studentsDB),
            pushToJSONbin('driftBottles', driftDB),
            pushToJSONbin('timeCapsules', timeDB),
            pushToJSONbin('errorBanks', errorDB),
            pushToJSONbin('dutyRosters', dutyDB),
            pushToJSONbin('borrowItems', borrowDB)
        ]);
        if (currentClass === name) {
            currentClass = '';
            localStorage.removeItem('currentClass');
            document.getElementById('current-class-display').textContent = '请先选择班级';
        }
        await renderClassList();
    } catch (e) {
        showNotification('删除班级失败:${e.message}', 'error');
    }
}

// ==================== 学生管理 ====================
async function openStudentModal() {
    if (!currentClass) { showNotification('请先选择班级', 'warning'); openClassModal(); return; }
    await renderStudentList();
    openModal('modal-student');
}

async function renderStudentList() {
    await refreshStudents();
    if (students.length === 0) {
        document.getElementById('student-list-container').innerHTML = '<div class="empty-tip">暂无学生，请添加</div>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>学号</th><th>姓名</th><th>性别</th><th class="op">操作</th></tr></thead><tbody>';
    students.forEach(s => {
        html += `<tr>
                    <td>${s.studentId}</td>
                    <td>${s.name}</td>
                    <td>${s.gender}</td>
                    <td><button class="op btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">删除</button></td>
                </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('student-list-container').innerHTML = html;
}

async function addStudent() {
    const name = document.getElementById('stu-name').value.trim();
    const gender = document.getElementById('stu-gender').value;
    const studentId = document.getElementById('stu-id').value.trim();
    if (!name || !studentId) return showNotification('请填写完整信息', 'warning');
    try {
        const id = Date.now().toString();
        const db = await dbGet('students');
        if (!db[currentClass]) db[currentClass] = [];
        db[currentClass].push({ id, name, gender, studentId });
        await pushToJSONbin('students', db);
        document.getElementById('stu-name').value = '';
        document.getElementById('stu-id').value = '';
        await renderStudentList();
        await updateStudentSelects();
    } catch (e) {
        showNotification('添加学生失败:${e.message}', 'error');
    }
}

async function deleteStudent(id) {
    if (!confirm('确定删除该学生吗？')) return;
    try {
        const db = await dbGet('students');
        if (db[currentClass]) {
            db[currentClass] = db[currentClass].filter(s => s.id !== id);
            await pushToJSONbin('students', db);
        }
        await renderStudentList();
        await updateStudentSelects();
    } catch (e) {
        showNotification('删除学生失败:${e.message}', 'error');
    }
}

// ==================== 闲置漂流瓶 ====================
async function initDriftPage() {
    if (!currentClass) return;
    await updateStudentSelects();
    document.getElementById('drift-date').value = getBeijingTime();
    await loadDriftBottles();
}

function getBeijingTime() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function setDriftFilter(filter) {
    currentDriftFilter = filter;
    await loadDriftBottles();
}

async function loadDriftBottles() {
    const bottles = await getClassData('driftBottles', currentClass);
    let filtered = bottles;
    if (currentDriftFilter === 'unreceived') filtered = bottles.filter(b => !b.received);
    if (currentDriftFilter === 'received') filtered = bottles.filter(b => b.received);

    const sortOrder = document.getElementById('drift-sort-order')?.value || sortState.drift.order;
    const sortBy = document.getElementById('drift-sort-by')?.value || sortState.drift.by;
    sortState.drift.order = sortOrder;
    sortState.drift.by = sortBy;

    filtered = filtered.slice();
    filtered.sort((a, b) => {
        if (sortBy === 'date') {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            return sortOrder === 'desc' ? db - da : da - db;
        }
        return sortOrder === 'desc' ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
    });

    if (filtered.length === 0) {
        document.getElementById('drift-list').innerHTML = '<div class="empty-tip">暂无漂流瓶记录</div>';
        return;
    }
    let html = '';
    filtered.forEach(b => {
        html += `<div class="list-item">
                    <div class="badge ${b.received ? 'badge-success' : 'badge-waiting'}">${b.received ? '已接收' : '待接收'}</div>
                    <div class="list-item-content">
                        <div class="list-item-title">📦 ${b.item}</div>
                        <div class="list-item-meta">
                            主人：${b.owner} &nbsp;|&nbsp; 发布：${formatDate(b.date)}
                            ${b.received ? `<br>接收人：${b.receiver} &nbsp;|&nbsp; 接收：${formatDate(b.receiveDate)}` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        ${!b.received ? `<button class="op btn btn-sm btn-primary" onclick="openReceiveModal('${b.id}')">📥 接收</button>` : ''}
                        <button class="op delete-btn" onclick="deleteDriftBottle('${b.id}')" title="删除"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
    });
    document.getElementById('drift-list').innerHTML = html;
}

async function deleteDriftBottle(id) {
    if (!confirm('确定删除这条漂流瓶记录吗？')) return;
    try {
        const db = await dbGet('driftBottles');
        db[currentClass] = db[currentClass].filter(b => b.id !== id);
        await pushToJSONbin('driftBottles', db);
        await loadDriftBottles();
    } catch (e) {
        showNotification('删除失败:${e.message}', 'error');
    }
}

function openPublishModal() {
    document.getElementById('drift-item').value = '';
    document.getElementById('drift-date').value = getBeijingTime();
    openModal('modal-drift-publish');
}

async function publishDrift() {
    const owner = document.getElementById('drift-owner').value;
    const item = document.getElementById('drift-item').value.trim();
    let date = document.getElementById('drift-date').value;
    if (!owner || !item) return showNotification('请填写完整信息', 'warning');
    if (!date) date = getBeijingTime();
    try {
        const db = await dbGet('driftBottles');
        if (!db[currentClass]) db[currentClass] = [];
        db[currentClass].push({
            id: Date.now().toString(),
            owner, item, date,
            received: false,
            receiver: '',
            receiveDate: ''
        });
        await pushToJSONbin('driftBottles', db);
        closeModal('modal-drift-publish');
        await loadDriftBottles();
    } catch (e) {
        showNotification('发布失败:${e.message}', 'error');
    }
}

function openReceiveModal(id) {
    document.getElementById('drift-receive-id').value = id;
    openModal('modal-drift-receive');
}

async function receiveDrift() {
    const receiver = document.getElementById('drift-receiver').value;
    const id = document.getElementById('drift-receive-id').value;
    if (!receiver) return showNotification('请选择接收人', 'warning');
    try {
        const db = await dbGet('driftBottles');
        const bottles = db[currentClass] || [];
        const b = bottles.find(x => x.id === id);
        if (b) {
            b.received = true;
            b.receiver = receiver;
            b.receiveDate = getBeijingTime();
            await pushToJSONbin('driftBottles', db);
        }
        closeModal('modal-drift-receive');
        await loadDriftBottles();
    } catch (e) {
        showNotification('接收失败:${e.message}', 'error');
    }
}

// ==================== 时光胶囊 ====================
async function initTimePage() {
    if (!currentClass) return;
    await updateStudentSelects();
    await loadTimeCapsules();
    await checkPastMessage();
}

function selectMood(btn) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMood = btn.dataset.mood;
}

async function saveTimeCapsule() {
    const name = document.getElementById('time-name').value;
    const text = document.getElementById('time-text').value.trim();
    if (!name || !text || !selectedMood) return showNotification('请填写完整信息', 'warning');
    try {
        const db = await dbGet('timeCapsules');
        if (!db[currentClass]) db[currentClass] = [];
        db[currentClass].push({
            id: Date.now().toString(),
            name, mood: selectedMood, text,
            date: new Date().toISOString()
        });
        await pushToJSONbin('timeCapsules', db);
        document.getElementById('time-text').value = '';
        selectedMood = '';
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        await loadTimeCapsules();
        await checkPastMessage();
    } catch (e) {
        showNotification('保存失败:' + e.message, 'error');
    }
}

async function loadTimeCapsules() {
    const capsules = await getClassData('timeCapsules', currentClass);

    const sortOrder = document.getElementById('time-sort-order')?.value || sortState.time.order;
    const sortBy = document.getElementById('time-sort-by')?.value || sortState.time.by;
    sortState.time.order = sortOrder;
    sortState.time.by = sortBy;

    let sorted = capsules.slice();
    sorted.sort((a, b) => {
        if (sortBy === 'date') {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            return sortOrder === 'desc' ? db - da : da - db;
        }
        return sortOrder === 'desc' ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
    });

    if (sorted.length === 0) {
        document.getElementById('time-history').innerHTML = '<div class="empty-tip">暂无记录，写下你的第一条心情吧</div>';
        return;
    }
    const moodClass = { '开心': 'mood-happy', '平静': 'mood-calm', '焦虑': 'mood-anxious', '难过': 'mood-sad', '生气': 'mood-angry', '疲惫': 'mood-tired' };
    let html = '';
    sorted.forEach(c => {
        html += `<div class="history-item">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                        <div class="mood-tag ${moodClass[c.mood] || 'mood-calm'}">${c.mood}</div>
                        <button class="op delete-btn" onclick="deleteTimeCapsule('${c.id}')" title="删除"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div style="font-size:0.92rem;line-height:1.7;margin-bottom:10px;color:#2c3e50;">${escapeHtml(c.text)}</div>
                    <div style="font-size:0.82rem;color:#5a6c7d;font-weight:normal;">${c.name} · ${formatDate(c.date)}</div>
                </div>`;
    });
    document.getElementById('time-history').innerHTML = html;
}

async function deleteTimeCapsule(id) {
    if (!confirm('确定删除这条情绪记录吗？')) return;
    try {
        const db = await dbGet('timeCapsules');
        db[currentClass] = db[currentClass].filter(c => c.id !== id);
        await pushToJSONbin('timeCapsules', db);
        await loadTimeCapsules();
        await checkPastMessage();
    } catch (e) {
        showNotification('删除失败:${e.message}', 'error');
    }
}

async function checkPastMessage() {
    const capsules = await getClassData('timeCapsules', currentClass);
    const now = new Date();
    const pushes = [];
    [7, 30, 365].forEach(days => {
        const target = new Date(now);
        target.setDate(target.getDate() - days);
        const targetStr = target.toISOString().split('T')[0];
        const matches = capsules.filter(c => c.date && c.date.startsWith(targetStr));
        if (matches.length > 0) pushes.push({ days, msg: matches[Math.floor(Math.random() * matches.length)] });
    });
    if (pushes.length > 0) {
        const p = pushes[0];
        document.getElementById('past-push').innerHTML = `
                    <div class="push-message">
                        <div style="font-size:0.88rem;opacity:0.95;margin-bottom:12px;font-weight:normal;">💌 ${p.days}天前的你曾说：</div>
                        <div style="font-size:1.15rem;line-height:1.6;">"${escapeHtml(p.msg.text)}"</div>
                        <div style="font-size:0.88rem;opacity:0.9;margin-top:12px;font-weight:normal;">— ${p.msg.name} · ${p.msg.mood} · ${formatDate(p.msg.date)}</div>
                    </div>`;
    } else {
        document.getElementById('past-push').innerHTML = '';
    }
}

async function generateReport() {
    const capsules = await getClassData('timeCapsules', currentClass);
    const keyword = document.getElementById('report-keyword').value.trim();
    let filtered = capsules;
    if (keyword) filtered = capsules.filter(c => c.text.includes(keyword));
    if (filtered.length === 0) {
        document.getElementById('report-result').innerHTML = '<div class="empty-tip">无匹配记录</div>';
        return;
    }
    const stats = {};
    filtered.forEach(c => {
        if (!stats[c.name]) stats[c.name] = {};
        if (!stats[c.name][c.mood]) stats[c.name][c.mood] = 0;
        stats[c.name][c.mood]++;
    });
    const colors = { '开心': '#f9a825', '平静': '#2e7d32', '焦虑': '#c62828', '难过': '#1565c0', '生气': '#b71c1c', '疲惫': '#6a1b9a' };
    let html = '';
    Object.entries(stats).forEach(([name, moods]) => {
        const total = Object.values(moods).reduce((a, b) => a + b, 0);
        html += `<div class="report-person">
                    <div style="color:#2c3e50;">${name}</div> <span style="color:#5a6c7d;font-size:0.85rem;">(共${total}条${keyword ? `含"${keyword}"` : ''})</span>
                    <div class="mood-bar-container">
                        ${Object.entries(moods).map(([mood, count]) => {
            const pct = Math.round(count / total * 100);
            return `<div class="mood-bar" style="background:${colors[mood] || '#888'}">${mood} ${pct}%</div>`;
        }).join('')}
                    </div>
                </div>`;
    });
    document.getElementById('report-result').innerHTML = html;
}

// ==================== 知识错题银行 ====================
async function initErrorPage() {
    if (!currentClass) return;
    document.getElementById('err-date').value = new Date().toISOString().split('T')[0];
    await loadErrors();
}

async function loadErrors() {
    const errors = await getClassData('errorBanks', currentClass);
    const filter = document.getElementById('error-subject-filter').value;
    let filtered = filter ? errors.filter(e => e.subject === filter) : errors;

    const sortOrder = document.getElementById('error-sort-order')?.value || sortState.error.order;
    const sortBy = document.getElementById('error-sort-by')?.value || sortState.error.by;
    sortState.error.order = sortOrder;
    sortState.error.by = sortBy;

    filtered = filtered.slice();
    filtered.sort((a, b) => {
        if (sortBy === 'date') {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            return sortOrder === 'desc' ? db - da : da - db;
        }
        return sortOrder === 'desc' ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
    });

    if (filtered.length === 0) {
        document.getElementById('error-list').innerHTML = '<div class="empty-tip" style="grid-column:1/-1;">暂无错题记录</div>';
        return;
    }
    const subClass = { '数学': 'subject-math', '语文': 'subject-chinese', '英语': 'subject-english', '物理': 'subject-physics', '化学': 'subject-chemistry' };
    let html = '';
    filtered.forEach(e => {
        html += `<div class="error-card" onclick="showErrorDetail('${e.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                        <span class="error-subject ${subClass[e.subject] || 'subject-math'}">${e.subject}</span>
                        <button class="op delete-btn" onclick="event.stopPropagation();deleteError('${e.id}')" title="删除"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div class="error-preview">${escapeHtml(e.question)}</div>
                    <div style="margin-top:12px;font-size:0.82rem;color:#5a6c7d;font-weight:normal;">${formatDate(e.date)}</div>
                </div>`;
    });
    document.getElementById('error-list').innerHTML = html;
    setTimeout(() => {
        const errorList = document.getElementById('error-list');
        if (errorList) {
            typesetPromise([errorList], {forceDisplayOperators: true}).catch(err => console.error('KaTeX错题列表渲染失败:', err));
        }
    }, 1);
}

async function deleteError(id) {
    if (!confirm('确定删除这道错题吗？')) return;
    try {
        const db = await dbGet('errorBanks');
        db[currentClass] = db[currentClass].filter(e => e.id !== id);
        await pushToJSONbin('errorBanks', db);
        await loadErrors();
    } catch (e) {
        showNotification('删除失败:${e.message}', 'error');
    }
}

function openAddErrorModal() {
    document.getElementById('err-subject').value = '数学';
    document.getElementById('err-question').value = '';
    document.getElementById('err-analysis').value = '';
    document.getElementById('err-q-img').value = '';
    document.getElementById('err-a-img').value = '';
    document.getElementById('err-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-add-error');
}

async function saveError() {
    const subject = document.getElementById('err-subject').value;
    const date = document.getElementById('err-date').value;
    const question = document.getElementById('err-question').value.trim();
    const analysis = document.getElementById('err-analysis').value.trim();
    if (!question) return showNotification('请输入题目内容', 'warning');
    const qFile = document.getElementById('err-q-img').files[0];
    const aFile = document.getElementById('err-a-img').files[0];
    const saveToDB = async (qImg, aImg) => {
        try {
            const db = await dbGet('errorBanks');
            if (!db[currentClass]) db[currentClass] = [];
            db[currentClass].push({
                id: Date.now().toString(),
                subject, date, question, analysis,
                questionImage: qImg || '',
                answerImage: aImg || ''
            });
            await pushToJSONbin('errorBanks', db);
            closeModal('modal-add-error');
            await loadErrors();
        } catch (e) {
            showNotification('保存失败:' + e.message, 'error');
        }
    };
    if (qFile || aFile) {
        let qImg = '', aImg = '';
        const process = () => {
            if (!qFile || qImg) {
                if (!aFile || aImg) saveToDB(qImg, aImg);
                else compressImage(aFile, 200, 100, 0.6, img => { aImg = img; saveToDB(qImg, aImg); });
            }
        };
        if (qFile) compressImage(qFile, 200, 100, 0.6, img => { qImg = img; process(); });
        else process();
    } else {
        await saveToDB('', '');
    }
}

async function showErrorDetail(id) {
    const errors = await getClassData('errorBanks', currentClass);
    const err = errors.find(e => e.id === id);
    if (!err) return;
    currentErrorId = id;
    const subClass = { '数学': 'subject-math', '语文': 'subject-chinese', '英语': 'subject-english', '物理': 'subject-physics', '化学': 'subject-chemistry' };
    document.getElementById('error-detail-content').innerHTML = `
                <div class="fullscreen-detail">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <span class="error-subject ${subClass[err.subject] || 'subject-math'}">${err.subject}</span>
                        <button class="op btn btn-primary btn-sm" onclick="event.stopPropagation();editError('${err.id}')"><i class="fa-solid fa-pen"></i> 修改错题</button>
                        <button class="op btn btn-danger btn-sm" onclick="deleteError('${err.id}');goHome();setTimeout(()=>navigateTo('page-error'),100);"><i class="fa-solid fa-trash"></i> 删除错题</button>
                    </div>
                    <div style="margin-top:16px;">
                        <h3 style="margin-bottom:12px;color:#4a90d9;font-weight:normal;">📋 题目</h3>
                        <div class="latex-content">${escapeHtml(err.question)}</div>
                    </div>
                    ${err.questionImage ? `<div style="margin-top:20px;"><div class="img-label">题目图片</div><img src="${err.questionImage}" style="max-width:100%;border-radius:12px;border:1px solid #e1e8ed;box-shadow:0 4px 12px rgba(0,0,0,0.06);"></div>` : ''}
                    ${err.answerImage ? `<div style="margin-top:20px;"><div class="img-label">答案图片</div><img src="${err.answerImage}" style="max-width:100%;border-radius:12px;border:1px solid #e1e8ed;box-shadow:0 4px 12px rgba(0,0,0,0.06);"></div>` : ''}
                    <button class="btn btn-primary" style="margin-top:24px;" onclick="toggleAnalysis()">🔍 查看解析</button>
                    <div id="analysis-box" style="display:none;" class="analysis-box">
                        <h4 style="margin-bottom:12px;font-weight:normal;">解析</h4>
                        <div class="latex-content">${escapeHtml(err.analysis)}</div>
                    </div>
                </div>
            `;
    navigateTo('page-error-detail');
    setTimeout(() => {
        const detailContent = document.getElementById('error-detail-content');
        if (detailContent) {
            typesetPromise([detailContent], {forceDisplayOperators: true}).catch(err => console.error('KaTeX详情渲染失败:', err));
        }
    }, 150);
}

function toggleAnalysis() {
    const box = document.getElementById('analysis-box');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

// ==================== 错题编辑功能 ====================
async function editError(id) {
    const errors = await getClassData('errorBanks', currentClass);
    const err = errors.find(e => e.id === id);
    if (!err) return;

    document.getElementById('edit-err-id').value = err.id;
    document.getElementById('edit-err-subject').value = err.subject;
    document.getElementById('edit-err-date').value = err.date;
    document.getElementById('edit-err-question').value = err.question;
    document.getElementById('edit-err-analysis').value = err.analysis || '';

    previewLaTeX('edit-err-question', 'edit-err-question-preview');
    previewLaTeX('edit-err-analysis', 'edit-err-analysis-preview');

    openModal('modal-edit-error');
}

async function updateError() {
    const id = document.getElementById('edit-err-id').value;
    const subject = document.getElementById('edit-err-subject').value;
    const date = document.getElementById('edit-err-date').value;
    const question = document.getElementById('edit-err-question').value.trim();
    const analysis = document.getElementById('edit-err-analysis').value.trim();

    if (!question) return showNotification('请输入题目内容', 'warning');

    const qFile = document.getElementById('edit-err-q-img').files[0];
    const aFile = document.getElementById('edit-err-a-img').files[0];

    const updateDB = async (qImg, aImg) => {
        try {
            const db = await dbGet('errorBanks');
            const errors = db[currentClass] || [];
            const idx = errors.findIndex(e => e.id === id);
            if (idx === -1) return showNotification('错题不存在', 'error');

            errors[idx] = {
                ...errors[idx],
                subject, date, question, analysis,
                questionImage: qImg !== undefined ? qImg : errors[idx].questionImage,
                answerImage: aImg !== undefined ? aImg : errors[idx].answerImage
            };

            await pushToJSONbin('errorBanks', db);
            closeModal('modal-edit-error');
            await loadErrors();
            showNotification('错题更新成功', 'success');
        } catch (e) {
            showNotification('更新失败:' + e.message, 'error');
        }
    };

    if (qFile || aFile) {
        let qImg = undefined, aImg = undefined;
        const process = () => {
            if (!qFile || qImg !== undefined) {
                if (!aFile || aImg !== undefined) updateDB(qImg, aImg);
                else compressImage(aFile, 200, 100, 0.6, img => { aImg = img; updateDB(qImg, aImg); });
            }
        };
        if (qFile) compressImage(qFile, 200, 100, 0.6, img => { qImg = img; process(); });
        else process();
    } else {
        await updateDB(undefined, undefined);
    }
}

// ==================== 校园小帮办 ====================
async function initAssistantPage() {
    if (!currentClass) return;
    await refreshStudents();
    await renderDutyConfig();
    await renderDutyTable();
    await renderBorrowItems();
}

// --- 值日 ---
let dutyChangesPending = false;
let pendingDutyRoster = null;

async function renderDutyConfig() {
    const roster = await getClassData('dutyRosters', currentClass);
    const positions = roster.positions || [];
    if (positions.length === 0) {
        document.getElementById('duty-positions-list').innerHTML = '<div style="font-size:0.85rem;color:#5a6c7d;margin-bottom:12px;">暂无职位配置，请先添加</div>';
        return;
    }
    let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">';
    positions.forEach((p, idx) => {
        html += `<span style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);color:#1565c0;padding:5px 14px;border-radius:16px;font-size:0.85rem;font-weight:normai;box-shadow:0 2px 4px rgba(0,0,0,0.06);">
                    ${p.name} x${p.count} <button class="op" onclick="removeDutyPos(${idx})" style="background:none;border:none;color:#d9534f;cursor:pointer;margin-left:6px;font-size:1rem;line-height:1;">×</button>
                </span>`;
    });
    html += '</div>';
    document.getElementById('duty-positions-list').innerHTML = html;
}

async function addDutyPosition() {
    const name = document.getElementById('duty-pos-name').value.trim();
    const count = parseInt(document.getElementById('duty-pos-count').value) || 1;
    if (!name) return showNotification('请输入职位名称', 'warning');
    const roster = await getClassData('dutyRosters', currentClass);
    roster.positions = roster.positions || [];
    roster.positions.push({ name, count });
    await setClassData('dutyRosters', currentClass, roster);
    document.getElementById('duty-pos-name').value = '';
    await renderDutyConfig();
}

async function removeDutyPos(idx) {
    const roster = await getClassData('dutyRosters', currentClass);
    roster.positions.splice(idx, 1);
    await setClassData('dutyRosters', currentClass, roster);
    await renderDutyConfig();
}

async function autoAssignDuty() {
    const roster = await getClassData('dutyRosters', currentClass);
    const positions = roster.positions || [];
    if (positions.length === 0) return showNotification('请先配置职位', 'warning');
    if (students.length === 0) return showNotification('请先添加学生', 'warning');
    const today = new Date();
    const schedule = [];
    let studentIdx = 0;
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const assignments = [];
        positions.forEach(pos => {
            for (let j = 0; j < pos.count; j++) {
                assignments.push({ position: pos.name, student: students[studentIdx % students.length].name });
                studentIdx++;
            }
        });
        schedule.push({ date: dateStr, assignments });
    }
    roster.schedule = schedule;
    await setClassData('dutyRosters', currentClass, roster);
    await renderDutyTable();
}

async function renderDutyTable() {
    const roster = await getClassData('dutyRosters', currentClass);
    if (!roster.schedule || roster.schedule.length === 0) {
        document.getElementById('duty-table-container').innerHTML = '<div class="empty-tip">暂无值日安排，点击"自动分配"生成</div>';
        return;
    }
    let html = '<div class="duty-days">';
    roster.schedule.forEach((day, dayIdx) => {
        var alpha = 1 - dayIdx * 0.01;
        html += `
                <div class="duty-day">
                    <div style="--alpha:${alpha};" class="duty-day-header" onclick="toggleDutyDay(${dayIdx})">
                        <span><i class="fa-regular fa-calendar"></i> ${day.date}</span>
                        <i class="fa-solid fa-chevron-down" id="duty-icon-${dayIdx}" style="transition:transform 0.3s;"></i>
                    </div>
                    
                </div>
                <div class="duty-day-content" id="duty-content-${dayIdx}" style="display:none;">
                        <table class="data-table" style="margin:0;">
                            <thead><tr><th>职位</th><th>人员</th></tr></thead>
                            <tbody>
                                ${day.assignments.map((assign, idx) => `
                                <tr>
                                    <td style="font-weight:normal;">${assign.position}</td>
                                    <td>
                                        <select class="point-event" onchange="changeDutyStudent('${day.date}', ${idx}, this.value)" style="padding:6px 10px;border-radius:8px;border:1.5px solid #e1e8ed;background:#fafbfc;font-size:0.9rem;">
                                            ${students.map(s => `<option value="${s.name}" ${s.name === assign.student ? 'selected' : ''}>${s.name}</option>`).join('')}
                                        </select>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
    });
    html += '</div>';
    document.getElementById('duty-table-container').innerHTML = html;
}

function toggleDutyDay(idx) {
    const content = document.getElementById(`duty-content-${idx}`);
    const icon = document.getElementById(`duty-icon-${idx}`);
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            content.classList.add('active');
        }, 5);
    } else {
        content.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
        setTimeout(() => {
            content.style.display = 'none';
        }, 300);
    }
}

async function changeDutyStudent(date, idx, newStudent) {
    const roster = await getClassData('dutyRosters', currentClass);
    const day = roster.schedule.find(d => d.date === date);
    if (day && day.assignments[idx]) {
        day.assignments[idx].student = newStudent;
        pendingDutyRoster = roster;
        dutyChangesPending = true;

        const hint = document.getElementById('duty-unsaved-hint');
        const bar = document.getElementById('duty-save-bar');
        if (hint) hint.classList.remove('hidden');
        if (bar) bar.style.display = 'flex';
    }
}

async function saveDutyChanges() {
    if (!dutyChangesPending || !pendingDutyRoster) {
        showNotification('没有待保存的修改', 'warning');
        return;
    }
    try {
        await setClassData('dutyRosters', currentClass, pendingDutyRoster);
        dutyChangesPending = false;
        pendingDutyRoster = null;

        const hint = document.getElementById('duty-unsaved-hint');
        const bar = document.getElementById('duty-save-bar');
        if (hint) hint.classList.add('hidden');
        if (bar) bar.style.display = 'none';

        showNotification('值日安排已保存', 'success');
    } catch (e) {
        showNotification('保存失败:' + e.message, 'error');
    }
}

// --- 物品借阅 ---
async function renderBorrowItems() {
    const items = await getClassData('borrowItems', currentClass);
    if (items.length === 0) {
        document.getElementById('borrow-items-list').innerHTML = '<div class="empty-tip">暂无物品，请添加</div>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>物品</th><th>总数</th><th>已借</th><th>剩余</th><th>借阅记录</th><th>操作</th></tr></thead><tbody>';
    items.forEach(item => {
        const borrowed = item.records ? item.records.length : 0;
        const remaining = item.total - borrowed;
        html += `<tr>
                    <td>${item.name}</td>
                    <td>${item.total}</td>
                    <td>${borrowed}</td>
                    <td><span style="color:${remaining > 0 ? '#2e7d32' : '#c62828'};font-weight:normal;">${remaining}</span></td>
                    <td style="font-size:0.82rem;">
                        ${(item.records || []).map((r, i) => `<div style="margin-bottom:4px;">${r.student} (${formatDate(r.date)}) 
                            <button class="btn btn-sm btn-secondary" onclick="returnItem('${item.id}', ${i})" style="padding:2px 8px;font-size:0.75rem;margin-left:4px;">归还</button>
                        </div>`).join('') || '-'}
                    </td>
                    <td>
                        ${remaining > 0 ? `<button class="btn btn-sm btn-primary" onclick="openBorrowModal('${item.id}')" style="margin-bottom:4px;">借阅</button>` : ''}
                        <button class="op btn btn-sm btn-danger" onclick="deleteBorrowItem('${item.id}')">删除</button>
                    </td>
                </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('borrow-items-list').innerHTML = html;
}

async function addBorrowItem() {
    const name = document.getElementById('item-name').value.trim();
    const total = parseInt(document.getElementById('item-total').value) || 1;
    if (!name) return showNotification('请输入物品名称', 'warning');
    const db = await dbGet('borrowItems');
    if (!db[currentClass]) db[currentClass] = [];
    db[currentClass].push({ id: Date.now().toString(), name, total, records: [] });
    await pushToJSONbin('borrowItems', db);
    document.getElementById('item-name').value = '';
    document.getElementById('item-total').value = '1';
    await renderBorrowItems();
}

async function deleteBorrowItem(id) {
    if (!confirm('确定删除该物品吗？')) return;
    const db = await dbGet('borrowItems');
    if (db[currentClass]) {
        db[currentClass] = db[currentClass].filter(i => i.id !== id);
        await pushToJSONbin('borrowItems', db);
    }
    await renderBorrowItems();
}

function openBorrowModal(id) {
    document.getElementById('borrow-item-id').value = id;
    openModal('modal-borrow');
}

async function confirmBorrow() {
    const person = document.getElementById('borrow-person').value;
    const id = document.getElementById('borrow-item-id').value;
    if (!person) return showNotification('请选择借阅人', 'warning');
    const db = await dbGet('borrowItems');
    const items = db[currentClass] || [];
    const item = items.find(i => i.id === id);
    if (item) {
        const borrowed = item.records ? item.records.length : 0;
        if (borrowed >= item.total) return showNotification('该物品已全部借出', 'warning');
        item.records = item.records || [];
        item.records.push({ student: person, date: new Date().toISOString() });
        await pushToJSONbin('borrowItems', db);
    }
    closeModal('modal-borrow');
    await renderBorrowItems();
}

async function returnItem(itemId, recordIdx) {
    const db = await dbGet('borrowItems');
    const items = db[currentClass] || [];
    const item = items.find(i => i.id === itemId);
    if (item && item.records) {
        item.records.splice(recordIdx, 1);
        await pushToJSONbin('borrowItems', db);
        await renderBorrowItems();
    }
}

// ==================== 工具函数 ====================
function compressImage(file, maxW, maxH, quality, callback) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
            if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date)) return d;
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==================== op check ====================
async function opCheck() {
    const opPassword = document.getElementById('op-password').value.trim();
    if (opPassword === '030415') {
        showNotification('验证通过', 'success');
        closeModal('modal-op');
        document.documentElement.style.setProperty('--op-display', 'block');
        document.documentElement.style.setProperty('--op-pointer-events', 'all');
        document.querySelectorAll('#op-status').forEach(function (element) {
            element.innerHTML = '当前为管理员模式';
            element.classList.add('text-admin');
            var timeStep = Date.now();
            localStorage.setItem('class-op-status',`${timeStep/1000}`);
        });
    } else {
        showNotification('密码错误,验证失败', 'error');
    }
}

// ==================== 深色模式切换 ====================
function toggleDarkMode() {
    const html = document.documentElement;
    const btnIcon = document.getElementById('theme-icon');
    const btnText = document.getElementById('theme-text');

    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        if (btnIcon) btnIcon.className = 'fa-solid fa-moon';
        if (btnText) btnText.textContent = '深色模式';
        showNotification('已切换至浅色模式', 'success');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (btnIcon) btnIcon.className = 'fa-solid fa-sun';
        if (btnText) btnText.textContent = '浅色模式';
        showNotification('已切换至深色模式', 'success');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const btnIcon = document.getElementById('theme-icon');
    const btnText = document.getElementById('theme-text');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (btnIcon) btnIcon.className = 'fa-solid fa-sun';
        if (btnText) btnText.textContent = '浅色模式';
    } else {
        if (btnIcon) btnIcon.className = 'fa-solid fa-moon';
        if (btnText) btnText.textContent = '深色模式';
    }
}

// ==================== 更新记录渲染 ====================
async function renderUpdates() {
    const container = document.getElementById('update-list');
    if (!container) return;

    const response = await fetch('./data/update_data.json');
    const updates = await response.json();
    console.log('[JSON Fetch] 更新数据加载成功\n', updates);

    let html = '';
    updates.forEach(u => {
        const borderClass = u.color;
        const textClass = u.color;
        const latestBadge = u.latest ? '<div class="updata-latest">最新版本</div>' : '';

        html += `<div class="updata" style="border-left: 5px solid ${borderClass}">
            ${latestBadge}
            <h3 style="color:${textClass}">${u.version}</h3>
            <ul>
                ${u.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>`;
    });

    container.innerHTML = html;
}

// ==================== 启动 ====================
window.onload = () => {
    //
    initTheme();
    initDatabase();
    renderUpdates();
    //
    if (currentClass) document.getElementById('current-class-display').innerHTML = `<div style="font-weight:normal;"><i class="fa-solid fa-school"></i>当前班级 : ` + currentClass + '</div>';
    //
    //const op = 'f';
    //if (op === 't') {
        //document.getElementById('loader').style.opacity = '0';
        //setTimeout(() => {
            //document.getElementById('loader').style.display = 'none';
        //}, 500);
    //}
    //
    var timeStep = Date.now() / 1000;
    if (localStorage.getItem('class-op-status')) {
        var savedTimeStep = localStorage.getItem('class-op-status');
        var timeStepDif = timeStep - savedTimeStep;
        console.log(timeStepDif);
        if (timeStepDif <= 86400) {
            showNotification('管理员模式登录成功', 'success');
            closeModal('modal-op');
            document.documentElement.style.setProperty('--op-display', 'block');
            document.documentElement.style.setProperty('--op-pointer-events', 'all');
            document.querySelectorAll('#op-status').forEach(function (element) {
                element.innerHTML = '当前为管理员模式';
                element.classList.add('text-admin');
            })
        } else {
            showNotification('管理员模式登录过期', 'warning');
            localStorage.removeItem('class-op-status');
        }
    }
    //
    (function () {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    })();
    if (window.innerWidth <= 786) { document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=0.7, user-scalable=no'); }
};

// ==================== 缩放 ====================
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=0.7, user-scalable=no');
    } else {
        document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no');
    }
});