// Token Radar Application Script - Offline
(function () {
  'use strict';

  var DATA = window.BOARD_DATA || window.RADAR;
  if (!DATA || !DATA.rows) return;

  var rows = DATA.rows;
  var state = {
    search: '',
    category: 'all',
    watchlistOnly: false,
    sortKey: 'rank',
    sortAsc: true,
    selectedSlug: null
  };

  // DOM Elements
  var statRanked = document.getElementById('statRanked');
  var statWatchlist = document.getElementById('statWatchlist');
  var statMedianVal = document.getElementById('statMedianVal');
  var statTotalVal = document.getElementById('statTotalVal');
  var asOfTag = document.getElementById('asOfTag');

  var searchInput = document.getElementById('searchInput');
  var categorySelect = document.getElementById('categorySelect');
  var watchlistToggle = document.getElementById('watchlistToggle');
  var resetBtn = document.getElementById('resetBtn');

  var resultCount = document.getElementById('resultCount');
  var tableBody = document.getElementById('tableBody');
  var headers = document.querySelectorAll('th.sortable');

  var modalBackdrop = document.getElementById('modalBackdrop');
  var modalClose = document.getElementById('modalClose');
  var modalTitle = document.getElementById('modalTitle');
  var modalSubtitle = document.getElementById('modalSubtitle');
  var modalBadges = document.getElementById('modalBadges');
  var modalMetrics = document.getElementById('modalMetrics');
  var modalFarmSteps = document.getElementById('modalFarmSteps');
  var stepCountBadge = document.getElementById('stepCountBadge');

  // Formatters
  function fmtUsd(n) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function fmtFullUsd(n) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function fmtPct(n) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    var sign = n > 0 ? '+' : '';
    return sign + n.toFixed(1) + '%';
  }

  // Populate Header Stats
  function initHeader() {
    if (asOfTag && DATA.as_of) {
      asOfTag.textContent = 'Snapshot: ' + DATA.as_of;
    }
    if (statRanked) statRanked.textContent = rows.length.toLocaleString();
    if (statWatchlist) statWatchlist.textContent = DATA.watchlist_size || rows.filter(function (r) { return r.is_watchlist; }).length;
    if (statMedianVal) statMedianVal.textContent = fmtUsd(DATA.median_implied_usd);

    var totalImplied = rows.reduce(function (sum, r) { return sum + r.implied_value_usd; }, 0);
    if (statTotalVal) statTotalVal.textContent = fmtUsd(totalImplied);

    // Populate category dropdown
    var catMap = {};
    rows.forEach(function (r) {
      var cat = r.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    var cats = Object.keys(catMap).sort();
    cats.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat + ' (' + catMap[cat] + ')';
      categorySelect.appendChild(opt);
    });
  }

  // Filter & Sort
  function getFilteredRows() {
    var query = state.search.toLowerCase().trim();
    return rows.filter(function (r) {
      if (state.watchlistOnly && !r.is_watchlist) return false;
      if (state.category !== 'all') {
        var cat = r.category || 'Uncategorized';
        if (cat !== state.category) return false;
      }
      if (query) {
        var nameMatch = r.name && r.name.toLowerCase().indexOf(query) !== -1;
        var slugMatch = r.slug && r.slug.toLowerCase().indexOf(query) !== -1;
        var catMatch = r.category && r.category.toLowerCase().indexOf(query) !== -1;
        var chainMatch = r.chains && r.chains.some(function (c) { return c.toLowerCase().indexOf(query) !== -1; });
        if (!nameMatch && !slugMatch && !catMatch && !chainMatch) return false;
      }
      return true;
    }).sort(function (a, b) {
      var valA = a[state.sortKey];
      var valB = b[state.sortKey];
      if (valA === null || valA === undefined) valA = state.sortAsc ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = state.sortAsc ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
        return state.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return state.sortAsc ? valA - valB : valB - valA;
    });
  }

  // Render Table
  function renderTable() {
    var filtered = getFilteredRows();
    if (resultCount) {
      resultCount.textContent = 'Showing ' + filtered.length + ' of ' + rows.length + ' protocols';
    }

    // Update sort headers indicators
    headers.forEach(function (th) {
      var key = th.getAttribute('data-key');
      var indicator = th.querySelector('.sort-indicator');
      if (key === state.sortKey) {
        indicator.textContent = state.sortAsc ? '▲' : '▼';
      } else {
        indicator.textContent = '';
      }
    });

    tableBody.innerHTML = '';
    var frag = document.createDocumentFragment();

    filtered.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-slug', r.slug);

      // Rank
      var tdRank = document.createElement('td');
      tdRank.className = 'col-rank' + (r.rank <= 3 ? ' top-rank' : '');
      tdRank.textContent = r.rank;
      tr.appendChild(tdRank);

      // Name & badges
      var tdName = document.createElement('td');
      tdName.className = 'col-name';
      var nameDiv = document.createElement('div');
      nameDiv.className = 'name-cell';
      var nameText = document.createElement('span');
      nameText.textContent = r.name;
      nameDiv.appendChild(nameText);
      if (r.is_watchlist) {
        var wBadge = document.createElement('span');
        wBadge.className = 'badge-watchlist';
        wBadge.textContent = 'Watchlist';
        nameDiv.appendChild(wBadge);
      }
      tdName.appendChild(nameDiv);
      tr.appendChild(tdName);

      // Category
      var tdCat = document.createElement('td');
      tdCat.className = 'col-cat';
      tdCat.textContent = r.category || 'Uncategorized';
      tr.appendChild(tdCat);

      // Chains
      var tdChains = document.createElement('td');
      tdChains.className = 'col-chains';
      var primaryChain = r.chains && r.chains.length > 0 ? r.chains[0] : 'None';
      var badge = document.createElement('span');
      badge.className = 'chain-badge';
      badge.textContent = primaryChain;
      tdChains.appendChild(badge);
      if (r.chains && r.chains.length > 1) {
        var more = document.createElement('span');
        more.className = 'chain-more';
        more.textContent = '+' + (r.chains.length - 1);
        tdChains.appendChild(more);
      }
      tr.appendChild(tdChains);

      // TVL
      var tdTvl = document.createElement('td');
      tdTvl.className = 'col-tvl';
      tdTvl.textContent = fmtUsd(r.tvl_usd);
      tr.appendChild(tdTvl);

      // 7d Change
      var td7d = document.createElement('td');
      td7d.className = 'col-7d';
      var pctSpan = document.createElement('span');
      if (r.change_7d === null || r.change_7d === undefined) {
        pctSpan.className = 'pct-badge pct-neutral';
        pctSpan.textContent = 'n/a';
      } else {
        pctSpan.className = 'pct-badge ' + (r.change_7d > 0 ? 'pct-positive' : r.change_7d < 0 ? 'pct-negative' : 'pct-neutral');
        pctSpan.textContent = fmtPct(r.change_7d);
      }
      td7d.appendChild(pctSpan);
      tr.appendChild(td7d);

      // Implied Value
      var tdImplied = document.createElement('td');
      tdImplied.className = 'col-implied';
      tdImplied.textContent = fmtUsd(r.implied_value_usd);
      tr.appendChild(tdImplied);

      // Action button
      var tdAction = document.createElement('td');
      tdAction.className = 'col-action';
      var btn = document.createElement('button');
      btn.className = 'btn-inspect';
      btn.textContent = 'Inspect';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openModal(r.slug);
      });
      tdAction.appendChild(btn);
      tr.appendChild(tdAction);

      // Row click opens detail
      tr.addEventListener('click', function () {
        openModal(r.slug);
      });

      frag.appendChild(tr);
    });

    tableBody.appendChild(frag);
  }

  // Open Protocol Detail Modal
  function openModal(slug) {
    var p = rows.find(function (r) { return r.slug === slug; });
    if (!p) return;

    state.selectedSlug = slug;
    modalTitle.textContent = p.name;
    modalSubtitle.textContent = p.slug + ' • Listed: ' + (p.listed_at || 'Undated') + ' (' + (p.age_days !== null ? p.age_days + ' days' : 'unknown') + ')';

    modalBadges.innerHTML = '';
    var statusBadge = document.createElement('span');
    statusBadge.className = 'badge-tag badge-tag-record';
    statusBadge.textContent = 'Records no token';
    modalBadges.appendChild(statusBadge);

    if (p.is_watchlist) {
      var wBadge = document.createElement('span');
      wBadge.className = 'badge-tag badge-watchlist';
      wBadge.textContent = 'Watchlist Floor';
      modalBadges.appendChild(wBadge);
    }

    // Valuation Metrics Grid
    modalMetrics.innerHTML = '';
    var metrics = [
      { label: 'Rank', val: '#' + p.rank },
      { label: 'Reported TVL', val: fmtFullUsd(p.tvl_usd) },
      { label: 'Implied Valuation', val: fmtFullUsd(p.implied_value_usd) },
      { label: 'Category Multiple', val: (p.category_ratio ? p.category_ratio.toFixed(4) : '0.2138') + 'x' },
      { label: 'Momentum Multiplier', val: (p.momentum_mult ? p.momentum_mult.toFixed(2) : '1.00') + 'x' },
      { label: 'Maturity Premium', val: (p.maturity_mult ? p.maturity_mult.toFixed(2) : '1.00') + 'x' }
    ];

    metrics.forEach(function (m) {
      var box = document.createElement('div');
      box.className = 'metric-box';
      var l = document.createElement('div');
      l.className = 'metric-box-label';
      l.textContent = m.label;
      var v = document.createElement('div');
      v.className = 'metric-box-val';
      v.textContent = m.val;
      box.appendChild(l);
      box.appendChild(v);
      modalMetrics.appendChild(box);
    });

    // Farm Steps
    modalFarmSteps.innerHTML = '';
    var steps = p.farm_steps || [];
    if (stepCountBadge) stepCountBadge.textContent = steps.length + ' Concrete Steps';

    steps.forEach(function (stepStr, i) {
      var item = document.createElement('div');
      item.className = 'farm-step-item';

      var num = document.createElement('div');
      num.className = 'step-num';
      num.textContent = (i + 1);
      item.appendChild(num);

      var content = document.createElement('div');
      content.className = 'step-content';

      var text = document.createElement('div');
      text.className = 'step-text';
      text.textContent = stepStr;
      content.appendChild(text);

      item.appendChild(content);
      modalFarmSteps.appendChild(item);
    });

    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    state.selectedSlug = null;
  }

  // Event Listeners
  searchInput.addEventListener('input', function (e) {
    state.search = e.target.value;
    renderTable();
  });

  categorySelect.addEventListener('change', function (e) {
    state.category = e.target.value;
    renderTable();
  });

  watchlistToggle.addEventListener('change', function (e) {
    state.watchlistOnly = e.target.checked;
    renderTable();
  });

  resetBtn.addEventListener('click', function () {
    state.search = '';
    state.category = 'all';
    state.watchlistOnly = false;
    searchInput.value = '';
    categorySelect.value = 'all';
    watchlistToggle.checked = false;
    renderTable();
  });

  headers.forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-key');
      if (state.sortKey === key) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortKey = key;
        state.sortAsc = (key === 'rank' || key === 'name');
      }
      renderTable();
    });
  });

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) closeModal();
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
      closeModal();
    }
  });

  // Expose API for headless screenshot triggers
  window.RADAR_APP = {
    openModal: openModal,
    closeModal: closeModal,
    setFilter: function (opts) {
      if (opts.search !== undefined) {
        state.search = opts.search;
        searchInput.value = opts.search;
      }
      if (opts.category !== undefined) {
        state.category = opts.category;
        categorySelect.value = opts.category;
      }
      if (opts.watchlistOnly !== undefined) {
        state.watchlistOnly = opts.watchlistOnly;
        watchlistToggle.checked = opts.watchlistOnly;
      }
      renderTable();
    }
  };

  // Init
  initHeader();
  renderTable();
})();
