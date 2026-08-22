/* ==========================================================================
   AidaPulse 工作流看板 - app.js
   1. 交互：点击阶段卡片展开/收起详情（Panel-1a）
   2. 数据：fetch('data.json') 动态渲染当前阶段、顶栏状态、Backlog 列表（Panel-1b）
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     降级数据：仅在 data.json 读取失败（如 file:// 协议被浏览器拦截）时使用，
     保证工作流高亮与顶栏仍可显示。正常路径以 data.json 为准，不在此硬编码。
     ------------------------------------------------------------------ */
  var DEFAULT_DATA = {
    current: {
      sprint: 'Sprint D',
      stage: 'Sprint In Progress',
      status: 'In Progress',
      next: 'Sprint Completed → Review',
      blocked: '无'
    }
  };

  var STATUS_META = {
    done:        { label: '已完成', cls: 'b-done' },
    in_progress: { label: '进行中', cls: 'b-progress' },
    pending:     { label: '待办',   cls: 'b-pending' }
  };

  /* ======================================================================
     Panel-1a：节点详情展开/收起
     ====================================================================== */

  var nodes = document.querySelectorAll('.node-main');

  function toggleDetail(node) {
    var detailId = node.getAttribute('aria-controls');
    var detail = document.getElementById(detailId);

    if (!detail) {
      return;
    }

    var isOpen = node.getAttribute('aria-expanded') === 'true';
    node.classList.toggle('open', !isOpen);
    node.setAttribute('aria-expanded', String(!isOpen));
    detail.hidden = isOpen;

    // 展开时确保详情面板可见（就近滚动，不做页面级跳转）
    if (!isOpen) {
      detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  nodes.forEach(function (node) {
    node.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDetail(node);
    });

    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDetail(node);
      }
    });
  });

  /* ======================================================================
     Panel-1b：从 data.json 动态渲染
     ====================================================================== */

  /** 安全设置文本（元素不存在时静默跳过） */
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  /** 数据状态横幅 */
  function showBanner(message, isError) {
    var banner = document.getElementById('data-banner');
    if (!banner) {
      return;
    }
    banner.hidden = false;
    banner.textContent = message;
    banner.className = 'data-banner' + (isError ? ' is-error' : ' is-info');
  }

  /**
   * 高亮当前阶段：以 data.current.stage 匹配节点 data-stage 属性，
   * 由 JS 添加 node-current 类、呼吸圆点与"当前阶段"标签（不再硬编码在 HTML）。
   */
  function applyCurrentStage(stage, sprint) {
    nodes.forEach(function (node) {
      node.classList.remove('node-current');
      var badge = node.querySelector('.tag-current');
      if (badge) {
        badge.remove();
      }
      var dot = node.querySelector('.pulse-dot');
      if (dot) {
        dot.remove();
      }
    });

    if (!stage) {
      return;
    }

    var current = document.querySelector('.node-main[data-stage="' + stage + '"]');
    if (!current) {
      return;
    }

    current.classList.add('node-current');

    var head = current.querySelector('.node-head');
    var caret = current.querySelector('.caret');

    // 当前阶段标签
    var tag = document.createElement('span');
    tag.className = 'tag tag-current';
    tag.textContent = '当前阶段 · ' + (sprint || stage);
    if (caret) {
      head.insertBefore(tag, caret);
    } else {
      head.appendChild(tag);
    }

    // 呼吸圆点
    var dot = document.createElement('span');
    dot.className = 'pulse-dot';
    dot.setAttribute('aria-hidden', 'true');
    current.appendChild(dot);
  }

  /** 顶栏"当前阶段 / 下一步 / 当前阻塞" + 页脚更新时间 */
  function updateTopBar(current, updatedAt) {
    var stageText = ((current.sprint ? current.sprint + ' / ' : '') +
      (current.stage || current.status || ''));
    setText('status-stage', stageText);
    setText('status-next', current.next || '—');
    setText('status-blocked', current.blocked || '—');
    setText('footer-updated', updatedAt || '—');
    setText('backlog-meta', '数据源：data.json · 更新时间：' + (updatedAt || '—'));
  }

  /* ---------------- Backlog 列表 ---------------- */

  var filterStatus = document.getElementById('filter-status');
  var filterPriority = document.getElementById('filter-priority');
  var backlogData = [];

  /** 构建单个 Backlog 行（用 createElement 防注入） */
  function buildRow(item) {
    var meta = STATUS_META[item.status] || { label: item.status, cls: 'b-pending' };

    var li = document.createElement('li');
    li.className = 'backlog-item';

    var status = document.createElement('span');
    status.className = 'badge-status ' + meta.cls;
    status.textContent = meta.label;
    li.appendChild(status);

    var id = document.createElement('span');
    id.className = 'badge-id';
    id.textContent = item.id;
    li.appendChild(id);

    var prio = document.createElement('span');
    prio.className = 'badge-prio p-' + String(item.priority || 'x').toLowerCase();
    prio.textContent = item.priority || '—';
    li.appendChild(prio);

    var title = document.createElement('span');
    title.className = 'backlog-title';
    title.textContent = item.title;
    li.appendChild(title);

    return li;
  }

  /** 按当前筛选条件渲染列表 */
  function applyFilter() {
    var list = document.getElementById('backlog-list');
    if (!list) {
      return;
    }

    var fs = filterStatus ? filterStatus.value : 'all';
    var fp = filterPriority ? filterPriority.value : 'all';

    var filtered = backlogData.filter(function (item) {
      var okStatus = fs === 'all' || item.status === fs;
      var okPrio = fp === 'all' || item.priority === fp;
      return okStatus && okPrio;
    });

    var frag = document.createDocumentFragment();

    if (filtered.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'backlog-empty';
      empty.textContent = '无匹配任务';
      frag.appendChild(empty);
    } else {
      filtered.forEach(function (item) {
        frag.appendChild(buildRow(item));
      });
    }

    list.textContent = '';
    list.appendChild(frag);
  }

  /** 渲染汇总（总数 + 各状态计数） */
  function renderSummary() {
    var counts = { done: 0, in_progress: 0, pending: 0 };
    backlogData.forEach(function (item) {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });
    setText('backlog-summary',
      '共 ' + backlogData.length + ' 项 · 已完成 ' + counts.done +
      ' · 进行中 ' + counts.in_progress + ' · 待办 ' + counts.pending);
  }

  /**
   * 阶段节点任务数量角标（建议完成项）：
   * 待办 → Backlog Grooming，进行中 → Sprint In Progress，已完成 → Sprint Completed
   */
  function renderBadges() {
    var counts = { done: 0, in_progress: 0, pending: 0 };
    backlogData.forEach(function (item) {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });

    var mapping = [
      { nodeId: 'stage-bg',          count: counts.pending,     label: '项待办任务' },
      { nodeId: 'stage-sprint',      count: counts.in_progress, label: '项进行中任务' },
      { nodeId: 'stage-sprint-done', count: counts.done,        label: '项已完成任务' }
    ];

    mapping.forEach(function (m) {
      var node = document.getElementById(m.nodeId);
      if (!node) {
        return;
      }
      var old = node.querySelector('.node-badge');
      if (old) {
        old.remove();
      }
      if (m.count <= 0) {
        return;
      }
      var badge = document.createElement('span');
      badge.className = 'node-badge';
      badge.textContent = m.count;
      badge.title = m.count + m.label;
      var head = node.querySelector('.node-head');
      var caret = node.querySelector('.caret');
      if (caret) {
        head.insertBefore(badge, caret);
      } else {
        head.appendChild(badge);
      }
    });
  }

  /* ======================================================================
     Panel-3：Sprint 时间轴 / 燃尽图 / 事件流 / 自动定位
     ====================================================================== */

  var EVENT_TYPE_META = {
    sis:        { label: 'SIS 执行', cls: 'ev-sis' },
    broadcast:  { label: '广播',     cls: 'ev-broadcast' },
    doc_update: { label: '文档更新', cls: 'ev-doc' },
    change:     { label: '变更',     cls: 'ev-change' }
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** 创建 SVG 元素（用 createElementNS 防注入） */
  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        el.setAttribute(k, attrs[k]);
      });
    }
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }
    return el;
  }

  /* ---------------- Sprint 迭代时间轴 ---------------- */

  function renderSprints(sprints) {
    var track = document.getElementById('sprint-track');
    if (!track) {
      return;
    }
    track.textContent = '';

    if (!sprints.length) {
      var empty = document.createElement('p');
      empty.className = 'panel-placeholder';
      empty.textContent = '暂无 Sprint 数据';
      track.appendChild(empty);
      return;
    }

    var statusText = { done: '已完成', in_progress: '进行中' };

    sprints.forEach(function (s) {
      var item = document.createElement('div');
      item.className = 'sprint-item';
      if (s.status === 'in_progress') {
        item.className += ' sprint-current';
      } else if (s.status === 'done') {
        item.className += ' sprint-done';
      }

      var name = document.createElement('span');
      name.className = 'sprint-name';
      name.textContent = s.name || '未命名 Sprint';
      item.appendChild(name);

      var goal = document.createElement('span');
      goal.className = 'sprint-goal';
      goal.textContent = s.goal || '';
      item.appendChild(goal);

      var status = document.createElement('span');
      status.className = 'sprint-status';
      status.textContent = statusText[s.status] || s.status || '未开始';
      item.appendChild(status);

      track.appendChild(item);
    });
  }

  /* ---------------- 燃尽图（纯 SVG，不引入第三方库） ---------------- */

  function renderBurnout(burnout) {
    var chart = document.getElementById('burnout-chart');
    if (!chart) {
      return;
    }
    chart.textContent = '';

    if (!burnout || !Array.isArray(burnout.points) || burnout.points.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'panel-placeholder';
      empty.textContent = '暂无燃尽图数据';
      chart.appendChild(empty);
      return;
    }

    var legend = document.createElement('div');
    legend.className = 'burnout-legend';
    legend.innerHTML = '<span class="bl-ideal">理想线</span><span class="bl-actual">实际剩余</span>';
    chart.appendChild(legend);
    chart.appendChild(buildBurnoutSvg(burnout));
  }

  function buildBurnoutSvg(burnout) {
    var total = Number(burnout.total) || 0;
    var points = burnout.points;

    // 日期转"天数序号"（按本地时区构造，避免 UTC 偏移导致跨日）
    function dayIndex(dateStr) {
      var parts = String(dateStr).split('-');
      if (parts.length === 3) {
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return Math.floor(d.getTime() / 86400000);
      }
      return 0;
    }

    var first = points[0];
    var last = points[points.length - 1];
    var d0 = dayIndex(first.date);
    var dEnd = dayIndex(last.date);
    if (dEnd <= d0) {
      dEnd = d0 + 3;   // 仅单点数据时，理想线向后延展 3 天
    }

    // Y 轴上限取 total 与所有 remaining 的最大值
    var maxY = total;
    points.forEach(function (p) {
      var r = Number(p.remaining);
      if (!isNaN(r) && r > maxY) {
        maxY = r;
      }
    });
    if (maxY <= 0) {
      maxY = 1;
    }

    var W = 640;
    var H = 320;
    var padL = 46;
    var padR = 18;
    var padT = 22;
    var padB = 44;

    function x(d) {
      return padL + (d - d0) / (dEnd - d0) * (W - padL - padR);
    }
    function y(v) {
      return padT + (1 - v / maxY) * (H - padT - padB);
    }

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': '燃尽图：剩余任务数随时间变化'
    });

    // 水平网格线 + Y 轴刻度（0 / 中间值 / 上限）
    var yTicks = [0, Math.round(maxY / 2), maxY];
    yTicks.forEach(function (v) {
      svg.appendChild(svgEl('line', {
        x1: padL, y1: y(v), x2: W - padR, y2: y(v),
        stroke: '#e5e7eb', 'stroke-width': '1', 'stroke-dasharray': '3 4'
      }));
      svg.appendChild(svgEl('text', {
        x: padL - 8, y: y(v) + 4, 'text-anchor': 'end',
        'font-size': '11', fill: '#6b7280'
      }, String(v)));
    });

    // X 轴日期标签（数据点多时隔点显示，避免重叠）
    points.forEach(function (p, i) {
      if (points.length > 4 && i % 2 !== 0 && i !== points.length - 1) {
        return;
      }
      svg.appendChild(svgEl('text', {
        x: x(dayIndex(p.date)), y: H - padB + 18,
        'text-anchor': 'middle', 'font-size': '11', fill: '#6b7280'
      }, String(p.date).slice(5)));
    });

    // 理想线：从 total 线性下降到 0
    svg.appendChild(svgEl('line', {
      x1: x(d0), y1: y(total), x2: x(dEnd), y2: y(0),
      stroke: '#94a3b8', 'stroke-width': '2', 'stroke-dasharray': '6 4'
    }));

    // 实际线：按 points 的 remaining 连接折线
    var dPath = '';
    points.forEach(function (p, i) {
      var px = x(dayIndex(p.date));
      var py = y(Number(p.remaining) || 0);
      dPath += (i === 0 ? 'M' : ' L') + px.toFixed(1) + ' ' + py.toFixed(1);
    });
    svg.appendChild(svgEl('path', {
      d: dPath, fill: 'none', stroke: '#0288d1',
      'stroke-width': '2.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    // 实际数据点
    points.forEach(function (p) {
      svg.appendChild(svgEl('circle', {
        cx: x(dayIndex(p.date)), cy: y(Number(p.remaining) || 0),
        r: '4', fill: '#fff', stroke: '#0288d1', 'stroke-width': '2'
      }));
    });

    return svg;
  }

  /* ---------------- 事件流 ---------------- */

  function renderEvents(events) {
    var list = document.getElementById('events-list');
    if (!list) {
      return;
    }
    list.textContent = '';

    if (!events.length) {
      var empty = document.createElement('li');
      empty.className = 'panel-placeholder';
      empty.textContent = '暂无事件数据';
      list.appendChild(empty);
      return;
    }

    // 按时间倒序（日期字符串可直接字典序比较）
    var sorted = events.slice().sort(function (a, b) {
      return String(b.time || '').localeCompare(String(a.time || ''));
    });

    sorted.forEach(function (ev) {
      var meta = EVENT_TYPE_META[ev.type] || { label: ev.type || '事件', cls: 'ev-other' };

      var li = document.createElement('li');
      li.className = 'event-item';

      var head = document.createElement('div');
      head.className = 'event-head';

      var tag = document.createElement('span');
      tag.className = 'event-type ' + meta.cls;
      tag.textContent = meta.label;
      head.appendChild(tag);

      var time = document.createElement('span');
      time.className = 'event-time';
      time.textContent = ev.time || '—';
      head.appendChild(time);

      li.appendChild(head);

      var content = document.createElement('span');
      content.className = 'event-content';
      content.textContent = ev.content || '';
      li.appendChild(content);

      list.appendChild(li);
    });
  }

  /* ---------------- 自动定位到当前阶段 ---------------- */

  function scrollToCurrentStage(stage) {
    if (!stage) {
      return;
    }
    var current = document.querySelector('.node-main[data-stage="' + stage + '"]');
    if (!current) {
      return;
    }
    requestAnimationFrame(function () {
      current.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }

  /* ======================================================================
     Panel-2：阶段检查表（数据来自 data.checklist，只读展示）
     ====================================================================== */

  var checklistSelect = document.getElementById('checklist-stage');
  var checklistCard = document.getElementById('checklist-card');
  var checklistData = {};   // { 阶段名: { input:[], action:[], output:[], transition:"" } }
  var currentStageName = '';

  /** 阶段检查项总数（输入 + 动作 + 输出 + 转换条件） */
  function countCheckItems(stage) {
    var n = 0;
    n += Array.isArray(stage.input) ? stage.input.length : 0;
    n += Array.isArray(stage.action) ? stage.action.length : 0;
    n += Array.isArray(stage.output) ? stage.output.length : 0;
    if (stage.transition) {
      n += 1;
    }
    return n;
  }

  /** 构建检查项列表（动作用有序列表，其余用无序列表） */
  function buildCheckItems(items, ordered) {
    var list = document.createElement(ordered ? 'ol' : 'ul');
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    return list;
  }

  /** 渲染指定阶段的检查表卡片 */
  function renderChecklist(stageName) {
    if (!checklistCard) {
      return;
    }
    checklistCard.textContent = '';

    var stage = checklistData[stageName];
    if (!stage) {
      var empty = document.createElement('p');
      empty.className = 'checklist-placeholder';
      empty.textContent = '暂无该阶段的检查表数据';
      checklistCard.appendChild(empty);
      return;
    }

    var isCurrent = stageName === currentStageName;
    checklistCard.classList.toggle('is-current', isCurrent);

    // 卡片头部：阶段名 + 当前阶段标记 + 检查项总数
    var head = document.createElement('div');
    head.className = 'checklist-card-head';

    var title = document.createElement('h3');
    title.className = 'checklist-stage-name';
    title.textContent = stageName;
    head.appendChild(title);

    if (isCurrent) {
      var tag = document.createElement('span');
      tag.className = 'checklist-tag';
      tag.textContent = '当前阶段';
      head.appendChild(tag);
    }

    var count = document.createElement('span');
    count.className = 'checklist-count';
    count.textContent = '共 ' + countCheckItems(stage) + ' 项检查';
    head.appendChild(count);

    checklistCard.appendChild(head);

    // 四类检查项：输入检查 / 动作执行 / 输出验证 / 转换条件
    var sections = [
      { key: 'input',      cls: 'is-input',      label: '输入检查', ordered: false },
      { key: 'action',     cls: 'is-action',     label: '动作执行', ordered: true },
      { key: 'output',     cls: 'is-output',     label: '输出验证', ordered: false },
      { key: 'transition', cls: 'is-transition', label: '转换条件', ordered: false }
    ];

    var grid = document.createElement('div');
    grid.className = 'checklist-grid';

    sections.forEach(function (sec) {
      var block = document.createElement('div');
      block.className = 'checklist-block ' + sec.cls;

      var h = document.createElement('h4');
      h.className = 'checklist-block-title';
      h.textContent = sec.label;
      block.appendChild(h);

      var value = stage[sec.key];
      if (sec.key === 'transition') {
        var p = document.createElement('p');
        p.className = 'checklist-transition-text';
        p.textContent = value || '—';
        block.appendChild(p);
      } else if (Array.isArray(value) && value.length > 0) {
        block.appendChild(buildCheckItems(value, sec.ordered));
      } else {
        var none = document.createElement('p');
        none.className = 'checklist-none';
        none.textContent = '无';
        block.appendChild(none);
      }

      grid.appendChild(block);
    });

    checklistCard.appendChild(grid);
  }

  /** 填充阶段下拉框（角标显示检查项数量），默认选中当前阶段 */
  function renderChecklistSelector() {
    if (!checklistSelect) {
      return;
    }

    var names = Object.keys(checklistData);
    checklistSelect.textContent = '';

    if (names.length === 0) {
      renderChecklist('');
      return;
    }

    names.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + '（' + countCheckItems(checklistData[name]) + ' 项）';
      checklistSelect.appendChild(opt);
    });

    // 默认选中 current.stage 对应阶段；找不到时取第一个阶段
    var target = names.indexOf(currentStageName) !== -1 ? currentStageName : names[0];
    checklistSelect.value = target;
    renderChecklist(target);
  }

  /** 整体渲染入口 */
  function renderAll(data) {
    var current = data.current || {};
    var updatedAt = data.updated_at || '';

    // 高亮匹配优先用 stage_main（主阶段），回退到 stage（AS-Panel 值域对齐规则）
    var stageForMatch = current.stage_main || current.stage || '';
    applyCurrentStage(stageForMatch, current.sprint);
    updateTopBar(current, updatedAt);

    backlogData = Array.isArray(data.backlog) ? data.backlog : [];
    renderSummary();
    applyFilter();
    renderBadges();

    // Panel-2：阶段检查表（data.checklist 缺失时展示空占位，不抛错）
    checklistData = (data.checklist && typeof data.checklist === 'object') ? data.checklist : {};
    currentStageName = stageForMatch;
    renderChecklistSelector();

    // Panel-3：Sprint 时间轴 / 燃尽图 / 事件流
    renderSprints(Array.isArray(data.sprints) ? data.sprints : []);
    renderBurnout(data.burnout);
    renderEvents(Array.isArray(data.events) ? data.events : []);

    // Panel-3：自动定位到当前阶段（横向滚动容器内）
    scrollToCurrentStage(stageForMatch);
  }

  /** 读取 data.json（仅读取，绝不修改） */
  function loadData() {
    fetch('data.json')
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.current) {
          throw new Error('缺少 current 对象');
        }
        renderAll(data);
        showBanner('已同步 data.json（更新时间：' + (data.updated_at || '—') + '）', false);
      })
      .catch(function (err) {
        // file:// 协议下浏览器会拦截本地 fetch，这里捕获并以降级数据渲染，不产生未捕获异常
        showBanner(
          '无法读取 data.json（' + err.message + '）。若为直接双击打开（file:// 协议），' +
          '浏览器会拦截本地文件请求，请改用本地 HTTP 服务打开本页面（如在该目录执行 ' +
          'python -m http.server 后访问 http://localhost:8000/），再刷新。',
          true
        );
        renderAll(DEFAULT_DATA);
      });
  }

  // 筛选控件联动
  if (filterStatus) {
    filterStatus.addEventListener('change', applyFilter);
  }
  if (filterPriority) {
    filterPriority.addEventListener('change', applyFilter);
  }

  // 阶段检查表切换联动（Panel-2）
  if (checklistSelect) {
    checklistSelect.addEventListener('change', function () {
      renderChecklist(checklistSelect.value);
    });
  }

  // 页面加载时读取数据源（script 位于 body 末尾，DOM 已就绪）
  loadData();
})();
