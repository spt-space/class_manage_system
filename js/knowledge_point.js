// 全局变量
let currentSubject = '';
let isDirectoryVisible = true;
let isContentFullscreen = false;
let isMobile = window.innerWidth <= 768;
let subjectsData = null;

// 加载数据
async function loadData() {
    const response = await fetch('./data/knowledge_data.json');
    const data = await response.json();
    return data;
}

// DOM元素
const homePage = document.getElementById('homePage');
const knowledgePage = document.getElementById('knowledgePage');
const transitionOverlay = document.getElementById('transitionOverlay');
const transitionText = document.getElementById('transitionText');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const toggleDirBtn = document.getElementById('toggleDirBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const mobileCloseBtn = document.getElementById('mobileCloseBtn');
const directoryContainer = document.getElementById('directoryContainer');
const knowledgeContent = document.getElementById('knowledgeContent');
const subjectTitle = document.getElementById('subjectTitle');
const contentTitle = document.getElementById('contentTitle');
const contentBody = document.getElementById('contentBody');
const directoryList = document.getElementById('directoryList');

// 初始化函数
async function init() {
    try {
        subjectsData = await loadData();
        console.log('[JSON Fetch] 知识数据加载成功\n', subjectsData);
    } catch (err) {
        console.error('加载 data.json 失败:', err);
        alert('加载数据失败，请检查文件路径或网络连接');
        return;
    }

    document.querySelectorAll('.subject-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const subject = this.dataset.subject || 'web';
            switchToSubject(subject);
        });
    });

    backToHomeBtn.addEventListener('click', goBackToHome);
    toggleDirBtn.addEventListener('click', toggleDirectory);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    mobileCloseBtn.addEventListener('click', closeMobileDirectory);
    window.addEventListener('resize', handleResize);
    handleResize();

    setTimeout(() => {
        homePage.classList.add('fade-in');
    }, 100);
}

// 递归生成目录树
function buildDirectoryTree(container, nodes, level = 0) {
    nodes.forEach(node => {
        if (node.items) {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder';
            if (level > 0) {
                folderElement.style.marginLeft = `${level * 8}px`;
            }

            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';

            const folderName = document.createElement('div');
            folderName.className = 'folder-name';
            folderName.innerHTML = `<i class="${node.icon}"></i><span>${node.name}</span>`;

            const folderToggle = document.createElement('i');
            folderToggle.className = 'folder-toggle fas fa-chevron-down';

            folderHeader.appendChild(folderName);
            folderHeader.appendChild(folderToggle);

            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';

            buildDirectoryTree(folderContent, node.items, level + 1);

            folderHeader.addEventListener('click', function (e) {
                e.stopPropagation();
                folderContent.classList.toggle('expanded');
                folderToggle.classList.toggle('fa-chevron-down');
                folderToggle.classList.toggle('fa-chevron-up');
            });

            folderElement.appendChild(folderHeader);
            folderElement.appendChild(folderContent);
            container.appendChild(folderElement);
        } else {
            const itemElement = document.createElement('div');
            itemElement.className = 'knowledge-item';
            itemElement.dataset.id = node.id;
            itemElement.innerHTML = `<i class="far fa-file-alt"></i> ${node.title}`;
            if (level > 0) {
                itemElement.style.marginLeft = `${level * 8}px`;
            }

            itemElement.addEventListener('click', function () {
                document.querySelectorAll('.knowledge-item').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
                showKnowledge(node.id, node.title, node.content);
                if (isMobile) {
                    closeMobileDirectory();
                }
            });

            container.appendChild(itemElement);
        }
    });
}

// 生成目录
function generateDirectory(subject) {
    directoryList.innerHTML = '';
    const subjectData = subjectsData[subject];

    if (!subjectData || !subjectData.folders || subjectData.folders.length === 0) {
        directoryList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>暂无目录数据</h3>
                <p>该科目目前没有可用的知识点</p>
            </div>
        `;
        return;
    }

    buildDirectoryTree(directoryList, subjectData.folders, 0);

    const firstLevelFolders = directoryList.querySelectorAll('.folder');
    firstLevelFolders.forEach(folder => {
        const folderContent = folder.querySelector('.folder-content');
        const folderToggle = folder.querySelector('.folder-toggle');
        if (folderContent && folderToggle) {
            folderContent.classList.add('expanded');
            folderToggle.classList.remove('fa-chevron-down');
            folderToggle.classList.add('fa-chevron-up');
        }
    });
}

// 切换到科目页面
function switchToSubject(subject) {
    currentSubject = subject;
    const subjectData = subjectsData[subject];

    if (!subjectData) {
        alert('该科目数据不存在');
        return;
    }

    transitionText.textContent = `切换到${subjectData.name}...`;
    transitionOverlay.style.display = 'flex';
    setTimeout(() => {
        transitionOverlay.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        document.getElementById('page-knowledge-header').style.display = 'none';
        subjectTitle.textContent = subjectData.name;
        subjectTitle.style.color = subjectData.color;
        generateDirectory(subject);
        homePage.style.display = 'none';
        knowledgePage.style.display = 'block';

        if (isMobile) {
            directoryContainer.classList.remove('hidden');
            directoryContainer.classList.add('mobile-open');
            isDirectoryVisible = true;
        } else {
            directoryContainer.classList.remove('hidden');
            isDirectoryVisible = true;
        }

        function findFirstItem(nodes) {
            for (const node of nodes) {
                if (node.items) {
                    const item = findFirstItem(node.items);
                    if (item) return item;
                } else if (node.id) {
                    return node;
                }
            }
            return null;
        }

        if (subjectData.folders.length > 0) {
            const firstItem = findFirstItem(subjectData.folders);
            if (firstItem) {
                showKnowledge(firstItem.id, firstItem.title, firstItem.content);
                setTimeout(() => {
                    const firstItemElement = directoryList.querySelector(`[data-id="${firstItem.id}"]`);
                    if (firstItemElement) {
                        firstItemElement.classList.add('active');
                    }
                }, 300);
            }
        }

        transitionOverlay.style.opacity = '0';
        setTimeout(() => {
            transitionOverlay.style.display = 'none';
        }, 300);
    }, 600);
}

// 显示知识点内容
function showKnowledge(id, title, content) {
    window.scrollTo(0, 0);
    contentTitle.textContent = title;
    let bodyContent = `<div class="content-section fade-in">
        <h3>${title}</h3>
        ${content}
    </div>`;
    contentBody.classList.add('fade-in');
    contentBody.innerHTML = bodyContent;
    setTimeout(() => {
        contentBody.classList.remove('fade-in');
    }, 500);
    knowledgeContent.scrollTop = 0;
    // 使用 KaTeX 渲染，字体正常不压缩，强制大型运算符使用 display 样式（图一效果）
    if (typeof typesetPromise === 'function') {
        typesetPromise([contentBody], {forceDisplayOperators: true}).catch(err => console.error('KaTeX知识点渲染失败:', err));
    }
}

// 返回首页
function goBackToHome() {
    window.scrollTo(0, 0);
    transitionText.textContent = "返回首页...";
    transitionOverlay.style.display = 'flex';
    setTimeout(() => {
        transitionOverlay.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        document.getElementById('page-knowledge-header').style.display = 'block';
        homePage.style.display = 'flex';
        knowledgePage.style.display = 'none';
        transitionOverlay.style.opacity = '0';
        setTimeout(() => {
            transitionOverlay.style.display = 'none';
        }, 500);
    }, 600);
}

// 切换目录显示/隐藏
function toggleDirectory() {
    if (isMobile) {
        directoryContainer.classList.toggle('mobile-open');
    } else {
        isDirectoryVisible = !isDirectoryVisible;
        directoryContainer.classList.toggle('hidden');
        knowledgeContent.classList.toggle('hidden-dir');
        const icon = toggleDirBtn.querySelector('i');
        if (isDirectoryVisible) {
            icon.className = 'fas fa-list';
            toggleDirBtn.title = '隐藏目录';
        } else {
            icon.className = 'fas fa-outdent';
            toggleDirBtn.title = '显示目录';
        }
    }
}

// 切换全屏模式
function toggleFullscreen() {
    isContentFullscreen = !isContentFullscreen;
    knowledgeContent.classList.toggle('fullscreen');
    const icon = fullscreenBtn.querySelector('i');
    if (isContentFullscreen) {
        icon.className = 'fas fa-compress';
        fullscreenBtn.title = '退出全屏';
    } else {
        icon.className = 'fas fa-expand';
        fullscreenBtn.title = '全屏显示';
    }
}

// 关闭手机端目录
function closeMobileDirectory() {
    directoryContainer.classList.remove('mobile-open');
}

// 处理窗口大小变化
function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    if (wasMobile !== isMobile) {
        if (isMobile) {
            directoryContainer.classList.remove('hidden');
            knowledgeContent.classList.remove('hidden-dir');
            directoryContainer.classList.remove('mobile-open');
            const icon = toggleDirBtn.querySelector('i');
            icon.className = 'fas fa-list';
            toggleDirBtn.title = '显示目录';
        } else {
            directoryContainer.classList.remove('mobile-open');
            if (isDirectoryVisible) {
                directoryContainer.classList.remove('hidden');
                knowledgeContent.classList.remove('hidden-dir');
            } else {
                directoryContainer.classList.add('hidden');
                knowledgeContent.classList.add('hidden-dir');
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);