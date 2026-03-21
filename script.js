const { createApp, ref, reactive, nextTick, onMounted, watch } = Vue;

// --- 独立的 MathBlock 组件 (修复了动态更新Bug) ---
const MathBlock = {
    props: ['html'],
    template: `<div ref="root" v-html="html"></div>`,
    setup(props) {
        const root = ref(null);

        const applyStyles = () => {
            if (!root.value) return;
            // 执行 KaTeX
            try {
                if (typeof renderMathInElement !== 'undefined') {
                    renderMathInElement(root.value, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\]', display: true}
                        ],
                        throwOnError: false
                    });
                }
            } catch (e) { console.error(e); }

            const spans = root.value.querySelectorAll('span.mord');
            spans.forEach(span => {
                if (span.textContent.trim() === "f" || span.textContent.trim() === "′") {
                    span.style.paddingLeft = '0.1em';
                }
            });
        };

        onMounted(applyStyles);
        
        // [修复点] 监听 props 变化，确保左侧编辑时右侧实时渲染公式
        watch(() => props.html, () => {
            nextTick(applyStyles);
        });

        return { root };
    }
};

createApp({
    components: { MathBlock },
    setup() {
        // 初始示例
        const defaultText = `#font simsun
#size 15px

#0a 2050 年上海市普通高校冬季招生统一文化考试
#0b 数学试卷
#note （考试时间 120 分钟，满分 150 分）
#note （试卷共 4 页，答题纸共 2 页）
### 一、填空题（本大题共 12 题，第 1—6 题每题 4 分，第 7—12 题每题 5 分，共 54 分）
1. 欧拉公式的提出者是___。
2. 上海高中数学共有选择性必修___册。(精确到 $0.01$)
11. 已知抛物线 $\\Gamma: y^2=2px(p>0)$，对 $\\Gamma$ 上的任意一点 $P$，在 $\\Gamma$ 上均存在两点 $A,B$ (与 $P$ 不重合)，使得 $\\triangle ABP$ 为等边三角形，则 $\\Gamma$ 离心率的取值范围为___。
12. 已知 $\\vec{a}, \\vec{b}, \\vec{c}$ 为平面内的单位向量，若对任意 $\\vec{a}, \\vec{b}$，均存在 $\\vec{c}$ 使 $\\vec{a} \\cdot \\vec{c}$ 与 $\\vec{b} \\cdot \\vec{c}$ 均小于 $\\dfrac 1 2$，则 $| \\vec{a} | + | \\vec{b} |$ 的最小值为___。

### 二、选择题（本大题共 4 题，第 13、14 题每题 4 分，第 15、16 题每题 5 分，共 18 分）
13. 下列关于等式 “$1+1=2$” 的说法正确的是(_)。(不定项)
A. 既是真命题也是数学公理；
B. 体现了数学公式的对称美；
C. 体现了数学公式的简洁性；
D. 运用了“等量代换”的思想。
16. 给出以下两个命题，下列说法正确的是(_)。
（1）$\\left(\\sin \\dfrac \\pi 2\\right)'= \\cos \\dfrac \\pi 2$；
（2）$\\left(\\cos \\dfrac \\pi 2\\right)'= \\sin \\dfrac \\pi 2$。
A. (1) 为真命题， (2) 为真命题；
B. (1) 为真命题， (2) 为假命题；
C. (1) 为假命题， (2) 为真命题；
D. (1) 为假命题， (2) 为假命题。

### 三、解答题（本大题共 5 题，第 17—19 题每题 14 分，第 20—21 题每题 18 分，共 78 分）

21.  (第 1 小题满分 4 分，第 2 小题满分 6 分，第 3 小题满分 8 分)
若函数 $f(x)$ 的定义域为 $D_f$，当对 $\\forall x \\in D_f$ 均有 $f(x)=f_0(x)$ 时，我们称 $f(x)$ 为 $f_0(x)$-函数。
（1）判断 $f(x)=\\sin x$ 是否为 $\\sin x$-函数，并说明理由；
（2）已知 $a \\in \\mathbb{R}$，$f(x)=a\\sqrt{1-x}$，当 $f(x)$ 为 $\\pi\\sqrt{1-x}$-函数时，求 $a$ 的值，并判断此时 $a$ 是否是有理数；
（3）证明：“$f(x)$ 是 $g(x)$-函数”不是“$g(x)$ 是 $f(x)$-函数”的充分必要条件。`;

        const rawInput = ref(defaultText);
        const allBlocks = ref([]);
        const pages = ref([]);
        const statusText = ref("就绪");
        const statusColor = ref("text-gray-500");

        const FORMAT_CONFIG = {
            // 指令 : { 块类型, 渲染函数 }
            '#0a ': { type: 'title0a', render: (content) => `<div class="title-0a">${content}</div>` },
            '#0b ': { type: 'title0b', render: (content) => `<div class="title-0b">${content}</div>` },
            '#note ':    { type: 'note',    render: (content) => `<div class="note-text">${content}</div>` },
            '# ':        { type: 'title',   render: (content) => `<div class="title-text">${content}</div>` },
            '## ':       { type: 'title2',  render: (content) => `<div class="small-title">${content}</div>` },
            '### ':      { type: 'title3',  render: (content) => `<div class="third-title">${content}</div>` },
        };

        const FONT_CONFIG = {
            'simsun': { family: 'simsun', offset: '-0.03em', scale: '1.05em' },
            'zhongsong': { family: '"STZhongsong", serif', offset: '0.045em', scale: '1em' },
            'shusong': { family: '"STShusong-Z01S", serif', offset: '0.045em', scale: '1em' },
        }

        // --- 解析器 (包含新 Feature) ---
        const parse = () => {
            statusText.value = "解析中...";
            const text = rawInput.value.replace(/。/g, '．'); // 保留你原有的替换
            const lines = text.split(/\r?\n/);
            
            const blocks = [];
            let current = null;
            let idSeq = 1;
            let optionBuffer = []; // 选择题缓冲区
            let currentFont = 'zhongsong'; // 字体缓冲区
            let currentSize = '16px';

            const fixFont = (str) => str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // [新增] 专门用于将缓存的选择题推入块中
            const flushOptions = () => {
                if (optionBuffer.length > 0) {
                    // 启发式测算：剥除KaTeX标识符后计算最大字符长度
                    const getVisualLength = s => s.replace(/\$.*?\$/g, "###").replace(/<[^>]+>/g, "").split('').reduce((l, c) => l + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
                    let maxLen = Math.max(...optionBuffer.map(o => getVisualLength(o.text)));
                    console.log(optionBuffer, "选项最大长度:", maxLen);
                    let colsClass = maxLen <= 18 ? 'mcq-cols-4' : (maxLen <= 30 ? 'mcq-cols-2' : 'mcq-cols-1');
                    
                    let optionsHtml = `<div class="mcq-options ${colsClass}">`;
                    optionBuffer.forEach(opt => {
                        optionsHtml += `<div class="mcq-item"><span style="font-family:'Times New Roman'">${opt.letter}．</span><span>${opt.rawHtml}</span></div>`;
                    });
                    optionsHtml += `</div>`;

                    // 如果当前是在题目块下，则归属给题目；否则单独成块
                    if (current && (current.type === 'question' || current.type === 'sub_question')) {
                        current.rawContent += optionsHtml;
                    } else {
                        flushCurrent(); 
                        current = { id: idSeq++, type: 'text', rawContent: optionsHtml, spacing: 0, forcePageBreak: false };
                    }
                    optionBuffer = [];
                }
            };

            const flushCurrent = () => {
                if (!current) return;
                const content = fixFont(current.rawContent);
                const config = Object.values(FORMAT_CONFIG).find(c => c.type === current.type);
                if (config) { // 匹配到特殊格式
                    current.html = config.render(content);
                } else if (current.type === 'question') { // 题目
                    current.html = `<ol start="${current.number}"><li>${content}</li></ol>`;
                } else { // 普通文本
                    current.html = `<div>${content}</div>`;
                }
                blocks.push(current);
            };

            lines.forEach(line => {
                const trim0 = line.trim().replace('___', '_________').replace('(_)', '($\\hspace{0.8cm}$)');
                // 处理中文字体包裹
                const trim = trim0.replace(/([\u4e00-\u9fff]+)/g, '<span class="chinese-fix">$1</span>');

                // -1. 解析 meta 信息（字体大小等）
                // 匹配字体设置
                if (trim0.startsWith('#font ')) {
                    currentFont = trim0.substring(6).trim();
                    return;
                }
                // 匹配大小设置
                if (trim0.startsWith('#size ')) {
                    currentSize = trim0.substring(6).trim();
                    return;
                }

                // 0. 判断是否为选择题选项 (兼容 A. A。A、A．)
                const mcqMatch = trim0.match(/^([A-D])[.。、．]\s*(.*)/);
                if (mcqMatch) {
                    optionBuffer.push({
                        letter: mcqMatch[1],
                        // 估算长度：去掉匹配头，并粗略去掉 $ 和 \ 以评估排版空间
                        text: mcqMatch[2].replace(/[\$\\]/g, ''), 
                        // HTML本体使用已经包裹过中文字体的 trim 结果
                        rawHtml: trim.replace(/^([A-D])[.。、．]\s*/, '') 
                    });
                    return; // 被判定为选项，直接进入下一循环
                } else {
                    flushOptions(); // 遇到非选项内容，立即结算之前的选项排版
                }

                if (!trim0) {
                    flushCurrent();
                    current = null;
                    return;
                }

                // 1. 解析标题特殊指令
                const prefix = Object.keys(FORMAT_CONFIG).find(p => trim0.startsWith(p));
                if (prefix) {
                    flushCurrent();
                    current = { 
                        id: idSeq++, 
                        type: FORMAT_CONFIG[prefix].type, 
                        rawContent: trim0.substring(prefix.length).trim(), 
                        spacing: 0, forcePageBreak: false 
                    };
                    return;
                }

                // 2. 题目解析
                const matchQ = trim.match(/^(\d+)[.。、．]\s*(.*)/); // 强化正则，容错句号
                if (matchQ) {
                    flushCurrent();
                    current = { id: idSeq++, type: 'question', number: matchQ[1], rawContent: matchQ[2].trim(), spacing: 10, forcePageBreak: false };
                    return;
                }

                // 3. 小题解析
                const matchSub = trim.match(/^(\(\d+\)|（\d+）)(.*)/);
                if (matchSub && current && current.type == 'question') {
                    current.rawContent += `<ol class='sub-question' start="${matchSub[1].replace(/\D/g, '')}"><li>${matchSub[2].trim()}</li></ol>`;
                    return;
                }

                // 4. 普通续行逻辑优化 (解决长文本隐藏Bug)
                if (current) {
                    const isHeader = ['title', 'title2', 'title3', 'title0a', 'title0b', 'note'].includes(current.type);
                    if (isHeader || current.type === 'text') {
                        // 如果当前是无格式的纯文本，每一行独立成块，以触发自然分页
                        flushCurrent();
                        current = { id: idSeq++, type: 'text', rawContent: trim, spacing: 0, forcePageBreak: false };
                    } else {
                        // 题目块内的续行，依然拼接到一起（保证缩进样式不断裂）
                        current.rawContent += `<br>${trim}`;
                    }
                } else {
                    current = { id: idSeq++, type: 'text', rawContent: trim, spacing: 0, forcePageBreak: false };
                }
            });
            
            flushOptions(); // 收尾时检查是否还有未渲染的选项
            flushCurrent();

            // 状态保留... (保持原有逻辑)
            if (allBlocks.value.length > 0) {
                blocks.forEach((b, i) => {
                    if (allBlocks.value[i] && allBlocks.value[i].type === b.type) {
                        b.spacing = allBlocks.value[i].spacing;
                        b.forcePageBreak = allBlocks.value[i].forcePageBreak;
                    }
                });
            }

            console.log(currentFont, currentSize);
            if (FONT_CONFIG[currentFont]) {
                const cfg = FONT_CONFIG[currentFont];
                document.documentElement.style.setProperty('--paper-font-family', cfg.family);
                document.documentElement.style.setProperty('--paper-font-vertical-align', cfg.offset);
                document.documentElement.style.setProperty('--paper-font-scale-size', cfg.scale);
            }
            document.documentElement.style.setProperty('--paper-base-size', currentSize);

            allBlocks.value = blocks;
            nextTick(layout);
        };

        const layout = () => {
            statusText.value = "排版中...";
            setTimeout(() => {
                const PAGE_H = 1000; // 1060
                const newPages = [];
                let curPage = { blocks: [], h: 0 };

                allBlocks.value.forEach(block => {
                    const el = document.getElementById('measure-' + block.id);
                    const realH = el ? el.getBoundingClientRect().height : 50; 
                    const totalH = realH + block.spacing;

                    if (block.forcePageBreak || (curPage.h + totalH > PAGE_H && curPage.blocks.length > 0)) {
                        newPages.push(curPage);
                        curPage = { blocks: [], h: 0 };
                        console.log('分页');
                    }
                    curPage.blocks.push(block);
                    curPage.h += totalH;
                });
                if (curPage.blocks.length) newPages.push(curPage);
                
                pages.value = newPages;
                statusText.value = "已更新";
                statusColor.value = "text-green-600";
            }, 100);
        };

        let inputTimer = null;
        const handleInput = () => {
            statusText.value = "输入中...";
            statusColor.value = "text-yellow-600";
            clearTimeout(inputTimer);
            inputTimer = setTimeout(parse, 700); // 防抖调整为 1000ms
        };

        const isDragging = ref(false);
        const dragData = reactive({ startY: 0, startSpace: 0, block: null });
        
        const startDrag = (e, block) => {
            isDragging.value = true;
            dragData.startY = e.clientY;
            dragData.startSpace = block.spacing;
            dragData.block = block;
            document.body.style.cursor = 'ns-resize';
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        };

        const onDrag = (e) => {
            if (!isDragging.value) return;
            const dy = e.clientY - dragData.startY;
            let newSpace = Math.max(0, dragData.startSpace + dy);
            dragData.block.spacing = newSpace;
            layout();
        };

        const stopDrag = () => {
            isDragging.value = false;
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        const toggleBreak = (id) => {
            const b = allBlocks.value.find(x => x.id === id);
            if (b) {
                b.forcePageBreak = !b.forcePageBreak;
                layout();
            }
        };

        const printDoc = () => window.print();

        onMounted(() => {
            const checkKatex = setInterval(() => {
                if (typeof renderMathInElement !== 'undefined') {
                    clearInterval(checkKatex);
                    parse();
                }
            }, 50);
        });

        return {
            rawInput, pages, allBlocks, statusText, statusColor,
            handleInput, startDrag, toggleBreak, printDoc
        };
    }
}).mount('#app');