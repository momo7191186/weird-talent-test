(() => {
  const data = window.QUIZ_DATA;
  const app = document.getElementById("app");
  const brandButton = document.getElementById("brand-button");
  const STORAGE_KEY = "weird-talent-quiz-v1";
  const ACCESS_STORAGE_KEY = "weird-talent-access-v2";
  const DEVICE_STORAGE_KEY = "weird-talent-device-v1";
  const REDEEM_ENDPOINT = window.APP_CONFIG?.redeemEndpoint || "";

  const resultStyles = {
    T01: { color: "#b79cff", symbol: "◉" },
    T02: { color: "#ff6c8f", symbol: "⚠" },
    T03: { color: "#ffd65a", symbol: "⌁" },
    T04: { color: "#57e5e5", symbol: "↗" },
    T05: { color: "#ff9e57", symbol: "↳" },
    T06: { color: "#c8ff4d", symbol: "▦" },
    T07: { color: "#ff79ca", symbol: "☏" },
    T08: { color: "#75a7ff", symbol: "◆" },
    T09: { color: "#69e6a6", symbol: "∞" },
    T10: { color: "#ffbb5d", symbol: "✓" },
    T11: { color: "#d7b5ff", symbol: "≡" },
    T12: { color: "#8cf6ff", symbol: "✦" },
  };

  const state = {
    screen: "unlock",
    current: 0,
    answers: loadAnswers(),
    result: null,
    resultContent: null,
    unlocked: (() => {
      try {
        const access = JSON.parse(localStorage.getItem(ACCESS_STORAGE_KEY) || "null");
        return Boolean(access?.code && access?.deviceId);
      } catch (_) {
        return false;
      }
    })(),
  };

  function renderUnlock() {
    state.screen = "unlock";
    app.innerHTML = `
      <section class="unlock-shell">
        <article class="unlock-card">
          <div class="unlock-seal" aria-hidden="true"><span>密</span></div>
          <div class="eyebrow">付费内容 · 凭密钥解锁</div>
          <h1 class="unlock-title">先对一下<br><span>暗号</span></h1>
          <p class="unlock-copy">请输入购买后收到的专属兑换码。首次激活后会绑定这台设备，以后不用反复输入。</p>
          <form class="unlock-form" id="unlock-form" novalidate>
            <label for="access-key">测试密钥</label>
            <div class="unlock-input-row">
              <input id="access-key" name="access-key" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="48" placeholder="例如：XMTF-XXXX-XXXX-XXXX" aria-describedby="unlock-hint unlock-error" />
              <button class="primary-button" type="submit">解锁测试 →</button>
            </div>
            <p class="unlock-hint" id="unlock-hint">密钥不区分大小写，复制粘贴也可以。</p>
            <p class="unlock-error" id="unlock-error" role="alert" aria-live="polite"></p>
          </form>
          <div class="unlock-footnote"><span>24 道情境题</span><span>12 种结果</span><span>完整成长指南</span></div>
        </article>
      </section>`;

    const form = document.getElementById("unlock-form");
    const input = document.getElementById("access-key");
    const error = document.getElementById("unlock-error");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const entered = input.value.trim().toUpperCase().replace(/\s+/g, "");
      const button = form.querySelector('button[type="submit"]');
      if (!entered) {
        error.textContent = "请先输入兑换码。";
        input.classList.add("is-error");
        input.focus();
        return;
      }
      button.disabled = true;
      button.textContent = "正在核验…";
      try {
        if (!REDEEM_ENDPOINT) throw new Error("核验服务尚未配置，请稍后再试。");
        const deviceId = getOrCreateDeviceId();
        const response = await fetch(REDEEM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "redeem", code: entered, deviceId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          const messages = {
            invalid: "这个兑换码无效，请检查字母、数字和短横线。",
            used: "这个兑换码已经在另一台设备激活。如需换设备，请联系店铺处理。",
            revoked: "这个兑换码已停用，请联系店铺处理。",
            busy: "刚刚访问的人有点多，请稍等几秒再试。",
          };
          throw new Error(messages[result.reason] || "暂时无法核验，请检查网络后再试。 ");
        }
        localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify({ code: entered, deviceId }));
        state.unlocked = true;
        renderHome();
      } catch (failure) {
        error.textContent = failure.message || "暂时无法核验，请稍后再试。";
        input.classList.add("is-error");
        input.focus();
      } finally {
        button.disabled = false;
        button.textContent = "解锁测试 →";
      }
    });
    input.addEventListener("input", () => {
      input.classList.remove("is-error");
      error.textContent = "";
    });
    focusApp();
    setTimeout(() => input.focus(), 80);
  }

  function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
      const randomPart = crypto.getRandomValues(new Uint32Array(4));
      deviceId = Array.from(randomPart, (item) => item.toString(36)).join("");
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
  }

  function loadAnswers() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) {
        const valid = [];
        for (const answer of saved.slice(0, 24)) {
          if (!Number.isInteger(answer) || answer < 0 || answer > 3) break;
          valid.push(answer);
        }
        return valid;
      }
    } catch (_) {}
    return [];
  }

  function saveAnswers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.answers));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function inlineMarkdown(value) {
    return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function markdownToHtml(markdown) {
    const chunks = markdown.split(/\r?\n\r?\n/).filter(Boolean);
    return chunks.map((chunk) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p>${lines.map(inlineMarkdown).join("<br>")}</p>`;
    }).join("");
  }

  function focusApp() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => app.focus({ preventScroll: true }), 20);
  }

  function renderHome() {
    state.screen = "home";
    const canResume = state.answers.length > 0 && state.answers.length < data.questions.length;
    const hasCompleted = state.answers.length === data.questions.length;
    app.innerHTML = `
      <section class="home">
        <div>
          <div class="eyebrow">非正规天赋识别程序</div>
          <h1 class="hero-title">你身上到底藏着哪种<br><span class="scribble">邪门天赋？</span></h1>
          <p class="hero-copy">有些被你嫌弃多年的“毛病”，可能只是一直用错了地方。用24道不端着的情境题，看看你的脑子究竟在偷偷擅长什么。</p>
          <div class="hero-actions">
            <button class="primary-button" id="start-button">${hasCompleted ? "查看上次结果" : canResume ? `继续测（${state.answers.length}/24）` : "开始鉴定 →"}</button>
            ${canResume || hasCompleted ? '<button class="text-button" id="restart-home">清空重来</button>' : '<span class="microcopy">约3—5分钟 · 没有标准答案</span>'}
          </div>
          <div class="spec-row">
            <span>24道原创情境题</span>
            <span>12种邪门结果</span>
            <span>完整使用说明书</span>
          </div>
        </div>
        <div class="mystery-card" aria-hidden="true">
          <div class="card-stamp">本人<br>拆封</div>
          <div class="card-eye"></div>
          <div class="card-lines"><span></span><span></span><span></span><span></span></div>
        </div>
      </section>`;

    document.getElementById("start-button").addEventListener("click", () => {
      if (hasCompleted) {
        state.result = calculateResult(state.answers);
        renderResult();
        return;
      }
      state.current = canResume ? state.answers.length : 0;
      renderQuestion();
    });
    document.getElementById("restart-home")?.addEventListener("click", resetQuiz);
    focusApp();
  }

  function renderQuestion() {
    state.screen = "quiz";
    const question = data.questions[state.current];
    const answered = state.answers[state.current];
    const progress = Math.round((state.current / data.questions.length) * 100);
    app.innerHTML = `
      <section class="quiz-shell">
        <div class="quiz-header">
          <span class="stage-pill">${escapeHtml(question.stage)}</span>
          <span class="progress-meta"><strong>${question.number}</strong> / ${data.questions.length}</span>
        </div>
        <div class="progress-track" aria-label="答题进度"><div class="progress-bar" style="width:${progress}%"></div></div>
        <article class="question-card">
          <div class="question-number">QUESTION ${String(question.number).padStart(2, "0")}</div>
          <h1 class="question-title">${escapeHtml(question.text)}</h1>
          <div class="options" role="radiogroup" aria-label="请选择最像你的答案">
            ${question.options.map((option, index) => `
              <button class="option ${answered === index ? "selected" : ""}" data-index="${index}" role="radio" aria-checked="${answered === index}">
                <span class="option-key">${option.key}</span>
                <span>${escapeHtml(option.text)}</span>
              </button>`).join("")}
          </div>
        </article>
        <div class="quiz-nav">
          <button class="text-button" id="previous-button" ${state.current === 0 ? "disabled" : ""}>← 上一题</button>
          <span class="microcopy">凭第一反应选，别替理想中的自己答</span>
        </div>
      </section>`;

    app.querySelectorAll(".option").forEach((button) => {
      button.addEventListener("click", () => selectAnswer(Number(button.dataset.index)));
    });
    document.getElementById("previous-button").addEventListener("click", () => {
      if (state.current > 0) {
        state.current -= 1;
        renderQuestion();
      }
    });
    focusApp();
  }

  function selectAnswer(index) {
    state.answers[state.current] = index;
    state.answers = state.answers.slice(0, state.current + 1);
    saveAnswers();
    app.querySelectorAll(".option").forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    setTimeout(() => {
      if (state.current < data.questions.length - 1) {
        state.current += 1;
        renderQuestion();
      } else {
        renderAnalysis();
      }
    }, 230);
  }

  function resetQuiz() {
    state.answers = [];
    state.current = 0;
    state.result = null;
    state.resultContent = null;
    localStorage.removeItem(STORAGE_KEY);
    renderHome();
  }

  function dimHash(answers, dim) {
    let hash = 2166136261;
    const text = `${answers.join("")}|${dim}`;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function addPair(bucket, pair) {
    bucket[pair[0]] += 1;
    bucket[pair[1]] += 1;
  }

  function calculateResult(answers) {
    const dims = Object.keys(data.dimensions);
    const raw = Object.fromEntries(dims.map((dim) => [dim, 0]));
    const pressure = Object.fromEntries(dims.map((dim) => [dim, 0]));
    const convergence = Object.fromEntries(dims.map((dim) => [dim, 0]));

    answers.forEach((answer, index) => {
      const pair = data.questions[index].options[answer].pair;
      addPair(raw, pair);
      if (index >= 12 && index <= 19) addPair(pressure, pair);
      if (index >= 20) addPair(convergence, pair);
    });

    const ranked = [...dims].sort((left, right) =>
      raw[right] - raw[left] ||
      convergence[right] - convergence[left] ||
      pressure[right] - pressure[left] ||
      dimHash(answers, right) - dimHash(answers, left)
    );

    const top3 = ranked.slice(0, 3);
    const topSet = [...top3].sort().join("");
    const compact = raw[top3[0]] - raw[top3[2]] <= 5;
    const separated = raw[top3[2]] >= raw[ranked[3]] + 1;
    let code;
    if (topSet === "ABE" && compact && separated) code = "T11";
    else if (topSet === "BDE" && compact && separated) code = "T12";
    else code = data.pairResults[[...ranked.slice(0, 2)].sort().join("")];

    const scores = Object.fromEntries(dims.map((dim) => [
      dim,
      Math.max(40, Math.min(95, Math.round(65 + (raw[dim] - 9.6) * 6))),
    ]));

    const alignmentHits = ranked.slice(0, 2).reduce((sum, dim) => sum + convergence[dim], 0);
    const hasOutputDimension = ranked.slice(0, 3).some((dim) => dim === "D" || dim === "E");
    let usageState;
    if (raw[ranked[0]] <= 10) usageState = "sealed";
    else if (alignmentHits <= 2) usageState = "sparking";
    else if (raw[ranked[0]] >= 13 && alignmentHits >= 4 && hasOutputDimension) usageState = "unlocked";
    else usageState = "steady";

    return { code, raw, scores, ranked, usageState };
  }

  const usageStates = {
    sealed: {
      label: "被封印",
      title: "你不是没有，只是一直不敢认领",
      copy: (talent, high) => `你的答案里已经出现了“${talent}”，但你还不太相信它值得被使用。你可能曾因为${high}被说过太敏感、太奇怪或太爱折腾，于是学会先压住反应。现在不需要突然变得自信，只需要在一个低风险场景里让它成功工作一次。`,
    },
    sparking: {
      label: "乱放电",
      title: "能力很强，但经常先电到自己",
      copy: (talent, high) => `你的“${talent}”已经很活跃，只是开关还不稳定。它会在不需要的时候自动启动，让${high}变成内耗、过度负责或开坑过多。你现在需要的不是增强能力，而是给它增加边界、优先级和停止条件。`,
    },
    steady: {
      label: "稳态输出",
      title: "你已经会用了，只差让价值被看见",
      copy: (talent, high) => `“${talent}”已经成为你比较稳定的做事方式。下一步不必继续证明自己有这个能力，而要记录${high}真正带来的结果：解决了什么、帮到了谁、形成了什么作品。能被说清和复用的能力，才更容易获得机会。`,
    },
    unlocked: {
      label: "开挂兑现",
      title: "别再只当兴趣，它已经具备产出价值",
      copy: (talent, high) => `你不仅拥有“${talent}”，还表现出把${high}推进成现实结果的倾向。可以开始尝试把经验写成方法、把一次成果做成模板、把个人发挥变成作品或服务。先小范围验证，不需要立刻做夸张的人生决定。`,
    },
  };

  function renderAnalysis() {
    state.screen = "analysis";
    state.result = calculateResult(state.answers);
    app.innerHTML = `
      <section class="analysis-screen">
        <div class="analysis-core">
          <div class="scanner" aria-hidden="true"></div>
          <h1>正在翻你的脑内后台<span class="analysis-dots"><span>.</span><span>.</span><span>.</span></span></h1>
          <p class="analysis-copy">识别惯用招式 · 检查乱放电区域 · 翻译成能说人话的结果</p>
        </div>
      </section>`;
    focusApp();
    setTimeout(renderResult, 1800);
  }

  function polarPoint(cx, cy, radius, index, total = 5) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  }

  function radarSvg(scores) {
    const dims = Object.keys(data.dimensions);
    const cx = 170;
    const cy = 165;
    const maxRadius = 105;
    const levels = [0.25, 0.5, 0.75, 1];
    const grids = levels.map((level) =>
      `<polygon class="radar-grid" points="${dims.map((_, i) => polarPoint(cx, cy, maxRadius * level, i).join(",")).join(" ")}" />`
    ).join("");
    const axes = dims.map((_, i) => {
      const [x, y] = polarPoint(cx, cy, maxRadius, i);
      return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`;
    }).join("");
    const shapePoints = dims.map((dim, i) => polarPoint(cx, cy, maxRadius * (scores[dim] / 100), i));
    const labels = dims.map((dim, i) => {
      const [x, y] = polarPoint(cx, cy, maxRadius + 31, i);
      return `<text class="radar-label" x="${x}" y="${y}">${data.dimensions[dim].name}</text>`;
    }).join("");
    return `<svg class="radar" viewBox="0 0 340 330" role="img" aria-label="五维能力雷达图">
      ${grids}${axes}
      <polygon class="radar-shape" points="${shapePoints.map((point) => point.join(",")).join(" ")}" />
      ${shapePoints.map(([x, y]) => `<circle class="radar-dot" cx="${x}" cy="${y}" r="4" />`).join("")}
      ${labels}
    </svg>`;
  }

  async function renderResult() {
    const scored = state.result || calculateResult(state.answers);
    let result = state.resultContent;
    if (!result || result.code !== scored.code) {
      try {
        if (!REDEEM_ENDPOINT) throw new Error("核验服务尚未配置。");
        const access = JSON.parse(localStorage.getItem(ACCESS_STORAGE_KEY) || "null");
        if (!access?.code || !access?.deviceId) throw new Error("请重新输入兑换码。");
        const response = await fetch(REDEEM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "result",
            code: access.code,
            deviceId: access.deviceId,
            resultCode: scored.code,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok || payload.result?.code !== scored.code) {
          if (payload.reason === "used" || payload.reason === "revoked" || payload.reason === "invalid") {
            localStorage.removeItem(ACCESS_STORAGE_KEY);
            state.unlocked = false;
            renderUnlock();
            return;
          }
          throw new Error("报告暂时无法读取，请检查网络后重试。");
        }
        result = payload.result;
        state.resultContent = result;
      } catch (failure) {
        state.screen = "analysis";
        app.innerHTML = `<section class="analysis-screen"><div class="analysis-core"><h1>报告加载失败</h1><p class="analysis-copy">${escapeHtml(failure.message || "请稍后重试。")}</p><button class="primary-button" id="retry-result-button">重新加载结果 →</button></div></section>`;
        document.getElementById("retry-result-button").addEventListener("click", renderResult);
        focusApp();
        return;
      }
    }
    state.screen = "result";
    const visual = resultStyles[scored.code];
    const usage = usageStates[scored.usageState];
    const topNames = scored.ranked.slice(0, 2).map((dim) => data.dimensions[dim].name).join("＋");
    const orderedDimensions = [...scored.ranked];

    app.innerHTML = `
      <section class="result-shell" style="--result-color:${visual.color}">
        <article class="result-hero" data-symbol="${visual.symbol}">
          <div class="result-kicker">你的邪门天赋鉴定结果 · ${result.code}</div>
          <h1 class="result-name">${escapeHtml(result.name)}</h1>
          <p class="result-identity">${escapeHtml(result.identity)}</p>
          <p class="result-verdict">${escapeHtml(result.verdict)}</p>
        </article>

        <div class="result-grid">
          <section class="panel radar-wrap">${radarSvg(scored.scores)}</section>
          <section class="panel">
            <h2>你的五维后台</h2>
            <div class="dimension-list">
              ${orderedDimensions.map((dim) => `
                <div class="dimension-row" title="${escapeHtml(data.dimensions[dim].short)}">
                  <span class="dimension-name">${data.dimensions[dim].name}</span>
                  <span class="dimension-track"><span class="dimension-fill" style="width:${scored.scores[dim]}%"></span></span>
                  <span class="dimension-score">${scored.scores[dim]}</span>
                </div>`).join("")}
            </div>
            <p class="microcopy" style="margin-top:18px">最高组合：${topNames}。分数用于展示你的相对倾向，不代表人群百分位。</p>
          </section>
        </div>

        <section class="panel state-panel">
          <span class="status-chip">当前状态：${usage.label}</span>
          <h2 class="state-title">${usage.title}</h2>
          <p class="state-copy">${escapeHtml(usage.copy(result.name, topNames))}</p>
        </section>

        <section class="guide-entry">
          <div class="guide-entry-copy">
            <span class="guide-entry-index">PART 02 · 天赋使用说明书</span>
            <h2>结果看完了，接下来聊聊怎么用</h2>
            <p>把核心画像、翻车方式、7天行动和岗位参考拆成三页。像翻一份小型提案一样慢慢看，不需要在这个页面硬读到底。</p>
          </div>
          <button class="primary-button guide-entry-button" id="open-guide-button">打开使用说明书 →</button>
        </section>

        <section class="panel share-panel">
          <p class="share-quote">“${escapeHtml(result.share)}”</p>
          <div class="result-actions">
            <button class="primary-button" id="share-button">复制结果文案</button>
            <button class="secondary-button" id="restart-button">重新测一次</button>
          </div>
        </section>
        <p class="disclaimer">本测试用于趣味自我探索，不构成心理、职业或医疗诊断。岗位内容仅用于发现可关注方向，不代表录用资格、职业成功率或唯一选择。</p>
      </section>
      <div class="toast" id="toast">结果文案已复制</div>`;

    document.getElementById("restart-button").addEventListener("click", resetQuiz);
    document.getElementById("share-button").addEventListener("click", () => copyResult(result));
    document.getElementById("open-guide-button").addEventListener("click", () => renderGuide("profile"));
    focusApp();
  }

  function renderGuide(initialGroup = "profile") {
    state.screen = "guide";
    const scored = state.result || calculateResult(state.answers);
    const result = state.resultContent;
    const visual = resultStyles[scored.code];
    const reportGroups = [
      {
        id: "profile",
        number: "01",
        label: "核心画像",
        kicker: "先看懂这份天赋为什么像你",
        titles: ["你的邪门天赋怎么运转", "别人最容易看错你的地方", "你的高能现场"],
      },
      {
        id: "usage",
        number: "02",
        label: "怎么使用",
        kicker: "把优点从乱放电调成稳定输出",
        titles: ["天赋失控时", "邪门天赋使用说明书", "未来7天解锁任务"],
      },
      {
        id: "career",
        number: "03",
        label: "岗位参考",
        kicker: "寻找更容易发挥的任务和环境",
        titles: ["适配岗位参考"],
      },
    ];
    const sectionHtml = (section) => `
      <section class="guide-card">
        <h2>${escapeHtml(section.title)}</h2>
        ${markdownToHtml(section.markdown)}
      </section>`;

    app.innerHTML = `
      <section class="guide-shell" data-guide-theme="${initialGroup}" style="--result-color:${visual.color}">
        <header class="guide-topbar">
          <button class="guide-back" id="guide-back-button">← 返回鉴定结果</button>
          <span class="guide-mini-title">${escapeHtml(result.name)} · 使用说明书</span>
          <span class="guide-page-count" id="guide-page-count">01 / 03</span>
        </header>

        <div class="guide-deck">
          <div class="guide-title-row">
            <div>
              <span class="guide-overline">你的邪门天赋 · AFTER TEST REPORT</span>
              <h1 id="guide-slide-title">核心画像</h1>
              <p id="guide-slide-kicker">先看懂这份天赋为什么像你</p>
            </div>
            <span class="guide-giant-number" id="guide-giant-number">01</span>
          </div>

          <div class="guide-tabs" role="tablist" aria-label="使用说明书页码">
            ${reportGroups.map((group) => `
              <button class="guide-tab ${group.id === initialGroup ? "active" : ""}" data-guide-group="${group.id}" role="tab" aria-selected="${group.id === initialGroup}">
                <span>${group.number}</span>${group.label}
              </button>`).join("")}
          </div>

          <div class="guide-slides">
            ${reportGroups.map((group) => `
              <div class="guide-slide" data-guide-slide="${group.id}" ${group.id === initialGroup ? "" : "hidden"}>
                ${group.titles.map((title) => result.sections.find((section) => section.title === title)).filter(Boolean).map(sectionHtml).join("")}
              </div>`).join("")}
          </div>

          <footer class="guide-controls">
            <button class="secondary-button" id="guide-previous-button">← 上一页</button>
            <div class="guide-dots" aria-hidden="true">
              ${reportGroups.map((group) => `<span class="${group.id === initialGroup ? "active" : ""}" data-guide-dot="${group.id}"></span>`).join("")}
            </div>
            <button class="primary-button" id="guide-next-button">下一页 →</button>
          </footer>
        </div>
        <p class="disclaimer">岗位内容用于发现可关注方向，不代表录用资格、职业成功率或唯一选择。</p>
      </section>`;

    const showGuideGroup = (groupId) => {
      const currentIndex = reportGroups.findIndex((group) => group.id === groupId);
      const group = reportGroups[currentIndex];
      const shell = app.querySelector(".guide-shell");
      shell.dataset.guideTheme = group.id;
      app.querySelectorAll(".guide-tab").forEach((button) => {
        const active = button.dataset.guideGroup === group.id;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      app.querySelectorAll(".guide-slide").forEach((slide) => {
        slide.hidden = slide.dataset.guideSlide !== group.id;
      });
      app.querySelectorAll(".guide-dot").forEach((dot) => dot.classList.toggle("active", dot.dataset.guideDot === group.id));
      document.getElementById("guide-page-count").textContent = `${group.number} / 03`;
      document.getElementById("guide-slide-title").textContent = group.label;
      document.getElementById("guide-slide-kicker").textContent = group.kicker;
      document.getElementById("guide-giant-number").textContent = group.number;
      document.getElementById("guide-previous-button").disabled = currentIndex === 0;
      document.getElementById("guide-next-button").textContent = currentIndex === reportGroups.length - 1 ? "回到结果 →" : "下一页 →";
      window.scrollTo({top: 0, behavior: "smooth"});
    };

    app.querySelectorAll(".guide-tab").forEach((button) => button.addEventListener("click", () => showGuideGroup(button.dataset.guideGroup)));
    document.getElementById("guide-back-button").addEventListener("click", renderResult);
    document.getElementById("guide-previous-button").addEventListener("click", () => {
      const current = reportGroups.findIndex((group) => group.id === app.querySelector(".guide-shell").dataset.guideTheme);
      if (current > 0) showGuideGroup(reportGroups[current - 1].id);
    });
    document.getElementById("guide-next-button").addEventListener("click", () => {
      const current = reportGroups.findIndex((group) => group.id === app.querySelector(".guide-shell").dataset.guideTheme);
      if (current === reportGroups.length - 1) renderResult();
      else showGuideGroup(reportGroups[current + 1].id);
    });
    showGuideGroup(initialGroup);
    focusApp();
  }

  async function copyResult(result) {
    const copy = `${result.share}\n\n我测到的是「${result.name}」。\n你身上到底藏着哪种邪门天赋？`;
    try {
      await navigator.clipboard.writeText(copy);
    } catch (_) {
      const textarea = document.createElement("textarea");
      textarea.value = copy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    const toast = document.getElementById("toast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  }

  brandButton.addEventListener("click", () => state.unlocked ? renderHome() : renderUnlock());
  state.unlocked ? renderHome() : renderUnlock();

  window.__QUIZ_TEST__ = { calculateResult, data };
})();
