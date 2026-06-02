/* =========================================================
 * 厂房疏散快速计算弹窗 - 独立前端 UI 模块
 * 说明：只负责前端渲染和调用 evaluateFactoryEgress()，不含法规逻辑
 * ========================================================= */

// 1. 动态注入 Scoped CSS 与 HTML (完全不污染 style.css 和 index.html 布局)
(function injectFacModalUI() {
  // v0.8.0 的 index.html 已经内置了同名弹窗，避免重复注入 facEvacModal 导致 getElementById 命中混乱。
  if (document.getElementById('facEvacModal')) return;
  const css = `
    .fac-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .fac-modal-overlay.show { display: flex; animation: facFadeIn 0.2s; }
    .fac-modal-content { background: #fff; width: 90%; max-width: 550px; max-height: 85vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
    .fac-modal-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
    .fac-modal-body { padding: 20px; overflow-y: auto; }
    .fac-modal-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0; }
    
    .fac-res-section { margin-bottom: 20px; }
    .fac-res-title { font-size: 14px; font-weight: 700; color: #475569; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .fac-alert-box { background: #FEE2E2; color: #B91C1C; padding: 12px; border-radius: 6px; font-size: 13px; font-weight: bold; margin-bottom: 12px; border-left: 4px solid #DC2626; }
    
    /* 独立结果卡片 */
    .factory-egress-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s; }
    .fac-card-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; min-width: 0; }
    .fac-card-info { display: flex; flex-direction: column; gap: 4px; flex: 1 1 auto; min-width: 0; }
    .fac-card-status { flex: 0 0 auto; font-size: 16px; line-height: 1; }
    .fac-card-ref { align-self: flex-end; max-width: 100%; font-size: 10px; background: rgba(255,255,255,0.6); padding: 2px 6px; border-radius: 4px; color: #64748B; text-align: right; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
    .fac-card-name { font-size: 13px; color: #64748B; font-weight: 600; }
    .fac-card-val { font-size: 18px; font-weight: bold; color: #0F172A; }
    .fac-card-unit { font-size: 12px; font-weight: normal; color: #94A3B8; margin-left: 2px;}
    
    /* 颜色状态类 */
    .egress-pass { border-left: 4px solid #10B981; background: #F0FDF4; }
    .egress-warn { border-left: 4px solid #F59E0B; background: #FEFCE8; }
    .egress-err { border-left: 4px solid #EF4444; background: #FEF2F2; }
    
    @keyframes facFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `;

  const html = `
    <div class="fac-modal-overlay" id="facEvacModal">
      <div class="fac-modal-content">
        <div class="fac-modal-header">
          <h3 style="margin:0; font-size:16px; color:#0F172A;">🏭 厂房疏散快速计算</h3>
          <button onclick="closeFacModal()" style="background:none; border:none; font-size:24px; color:#64748B; cursor:pointer;">&times;</button>
        </div>
        <div class="fac-modal-body">
          <div class="fac-modal-inputs">
            <div style="margin:0">
              <label style="display:block;font-size:13px;font-weight:600;color:#111827;margin-bottom:6px">本层最大同时使用人数</label>
              <div style="position:relative;">
                <input type="number" id="fac_in_people" value="" style="width:100%;height:38px;padding:8px 36px 8px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:14px;outline:none;">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6B7280;font-size:13px;">人</span>
              </div>
              <div style="font-size:11px; color:#94A3B8; margin-top:4px; line-height:1.4;">* 请按人员最密集的“最不利楼层”进行修正填报</div>
            </div>
            <div style="margin:0">
              <label style="display:block;font-size:13px;font-weight:600;color:#111827;margin-bottom:6px">疏散出口数量</label>
              <div style="position:relative;">
                <input type="number" id="fac_in_exits" value="2" style="width:100%;height:38px;padding:8px 36px 8px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:14px;outline:none;">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6B7280;font-size:13px;">个</span>
              </div>
            </div>
            <div style="grid-column: 1 / -1; margin-top: 4px;">
              <button id="facRunBtn" style="width:100%; height:40px; border-radius:6px; background:#2563EB; color:#fff; border:none; font-weight:600; cursor:pointer; font-size:14px;" onclick="runFacModalCalc()">执行测算</button>
            </div>
          </div>

          <div id="fac-modal-results" style="display:none;">
            <div id="fac-sec-result" class="fac-res-section"></div> 
            <div id="fac-sec-door" class="fac-res-section"></div>   
            <div id="fac-sec-stairs" class="fac-res-section"></div> 
            <div id="fac-sec-plan" class="fac-res-section"></div>   
            <div id="fac-sec-const" class="fac-res-section"></div>  
            <div id="fac-sec-mep" class="fac-res-section"></div>    
          </div>
        </div>
      </div>
    </div>
  `;

  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  document.body.insertAdjacentHTML('beforeend', html);
})();

// 2. 兼容老逻辑：重写原有的 openEvacModal，无缝接管旧按钮点击事件
window.openEvacModal = function() {
  openFacModal();
};

function openFacModal() {
  // 智能抓取参数
  let people = parseInt(document.getElementById('iOc')?.value) || 0;
  if (!people) {
    const m = parseInt(document.getElementById('iM')?.value) || 0;
    const f = parseInt(document.getElementById('iF')?.value) || 0;
    people = m + f;
  }
  
  document.getElementById('fac_in_people').value = people || '';
  document.getElementById('fac_in_exits').value = 2; // 默认出口数
  
  document.getElementById('fac-modal-results').style.display = 'none';
  document.getElementById('facEvacModal').classList.add('show');
}

function closeFacModal() {
  document.getElementById('facEvacModal').classList.remove('show');
}

// 3. 状态与颜色映射引擎
function normalizeFacStatus(status) {
  const s = String(status).toLowerCase();
  if (s === 'pass' || s === 'ok') return { cls: 'egress-pass', icon: '✅' };
  if (s === 'fail' || s === 'danger' || s === 'err') return { cls: 'egress-err', icon: '🚨' };
  return { cls: 'egress-warn', icon: '⚠️' }; // 包括 warning, warn, manual
}

function renderFacCard(item) {
  const ui = normalizeFacStatus(item.status);
  const noteHtml = item.note ? `<div style="font-size:11px; color:#64748B; margin-top:6px; border-top:1px dashed #E2E8F0; padding-top:6px;">${item.note}</div>` : '';
  
  return `
    <div class="factory-egress-card ${ui.cls}">
      <div class="fac-card-main">
        <div class="fac-card-info">
          <span class="fac-card-name">${item.title}</span>
          <span class="fac-card-val">${item.value} <span class="fac-card-unit">${item.unit || ''}</span></span>
          ${noteHtml}
        </div>
        <div class="fac-card-status">${ui.icon}</div>
      </div>
      <span class="rf fac-card-ref">${item.ref || '规范'}</span>
    </div>
  `;
}

// 4. 解析后端数据体
function buildFacSections(report) {
  const r = report.result || {};
  const ctx = report.context || {};
  
  return {
    result: [
      { title: '出口/楼梯数量', value: ctx.exitCount || document.getElementById('fac_in_exits').value, unit: '个', status: report.checks?.exitCount?.status || 'manual', ref: 'Factory Act MR2' },
      { title: '每出口承担人数', value: r.peoplePerExit || '-', unit: '人/个', status: 'manual', ref: '计算值' },
      { title: '建议出口数量', value: r.finalRecommendedExitCount || '-', unit: '个', status: r.shouldIncreaseExits ? 'warning' : 'pass', ref: '快速建议' }
    ],
    door: [
      { title: '法规计算门净宽', value: `≥ ${r.legalDoorWidthCm || '-'}`, unit: 'cm', status: r.doorWidthLevel || 'manual', ref: 'Factory Act MR2' },
      { title: '推荐门宽模数', value: `≥ ${r.recommendedDoorWidthCm || '-'}`, unit: 'cm', status: r.doorWidthLevel || 'manual', ref: '设计建议' },
      { title: '门净高底线', value: `≥ ${r.doorMinHeightCm || '-'}`, unit: 'cm', status: 'pass', ref: 'Factory Act MR2' }
    ],
    stairs: [
      { title: '楼梯净宽底线', value: `≥ ${(r.stairLegalWidthM || 0).toFixed(2)}`, unit: 'm', status: 'manual', ref: 'MR55 / MR33' },
      { title: '建议楼梯净宽', value: `≥ ${(r.stairRecommendedWidthM || 0).toFixed(2)}`, unit: 'm', status: 'manual', ref: '设计建议' },
      { title: '走道净宽建议', value: `≥ ${(r.corridorMinWidthM || 0).toFixed(2)}`, unit: 'm', status: 'manual', ref: 'MR55' }
    ],
    plan: (report.checks?.plan || []).map(x => ({
      title: x.label || x.title, value: x.limit || x.value, unit: '', status: x.status, ref: x.ref, note: x.note
    })),
    construction: (report.checks?.construction || []).map(x => ({
      title: x.label || x.title, value: x.limit || x.value || '人工复核', unit: '', status: x.status, ref: x.ref, note: x.note
    })),
    mep: (report.otherDisciplineNotes || []).map(x => ({
      title: x.discipline || x.title, value: x.limit || x.value || '提示', unit: '', status: 'manual', ref: x.ref, note: x.text || x.note
    }))
  };
}

// 5. 核心触发器
async function runFacModalCalc() {
  const btn = document.getElementById('facRunBtn');
  btn.innerText = '计算中...';
  btn.style.opacity = '0.7';

  // 计算单层面积
  const rawArea = parseFloat(document.getElementById('iA_factory')?.value) || parseFloat(document.getElementById('iA')?.value) || 0;
  const floors = parseInt(document.getElementById('iFa')?.value) || 1;
  const singleFloorArea = floors > 0 ? (rawArea / floors) : rawArea;

  const inputParams = {
    areaM2: singleFloorArea,
    people: parseInt(document.getElementById('fac_in_people').value) || 0,
    exitCount: parseInt(document.getElementById('fac_in_exits').value) || 2,
    totalAreaM2: parseFloat(document.getElementById('iA')?.value) || 0,
    floors: floors,
    heightM: parseFloat(document.getElementById('iH')?.value) || 0,
    basementFloors: parseInt(document.getElementById('iFb')?.value) || 0,
    basementDepthM: parseFloat(document.getElementById('iDp')?.value) || 0,
    isBkk: document.getElementById('locToggle')?.checked || false,
    isIEAT: document.getElementById('ieToggle')?.checked || false
  };

  try {
    // 调用后端核心逻辑 (需确保 factory-egress-backend-v1.js 已加载)
    const report = await evaluateFactoryEgress(inputParams);
    document.getElementById('fac-modal-results').style.display = 'block';

    // === 致命错误拦截 ===
    if (report.errors && report.errors.length > 0) {
      let errHtml = `<div class="fac-res-title">❌ 计算受阻</div>`;
      errHtml += report.errors.map(e => `<div class="fac-alert-box">${e}</div>`).join('');
      document.getElementById('fac-sec-result').innerHTML = errHtml;
      
      // 隐藏后续卡片渲染区
      ['fac-sec-door', 'fac-sec-stairs', 'fac-sec-plan', 'fac-sec-const', 'fac-sec-mep'].forEach(id => {
        document.getElementById(id).style.display = 'none';
      });
      return; 
    }

    // === 正常渲染逻辑 ===
    const sections = buildFacSections(report);

    // 渲染风险提示
    let resHtml = '';
    if (report.warnings && report.warnings.length > 0) {
      resHtml += `<div class="fac-res-title">📌 风险预警</div>`;
      resHtml += report.warnings.map(w => `<div class="fac-alert-box">${w}</div>`).join('');
    }
    document.getElementById('fac-sec-result').innerHTML = resHtml;

    // 渲染其他模块
    const renderSec = (id, title, data) => {
      const el = document.getElementById(id);
      if (data && data.length > 0) {
        el.innerHTML = `<div class="fac-res-title">${title}</div>` + data.map(renderFacCard).join('');
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    };

    renderSec('fac-sec-door', '🚪 门宽推荐', sections.door);
    renderSec('fac-sec-stairs', '🪜 出口数量建议', sections.result.concat(sections.stairs));
    renderSec('fac-sec-plan', '📐 平面复核建议', sections.plan);
    renderSec('fac-sec-const', '🧱 构造复核建议', sections.construction);
    renderSec('fac-sec-mep', '⚙️ 其他专业提示', sections.mep);

  } catch (error) {
    console.error("后端计算异常:", error);
    document.getElementById('fac-sec-result').innerHTML = `<div class="fac-alert-box">异常：无法连接底层规则库，请检查后端 JS 是否已正确引入。</div>`;
  } finally {
    btn.innerText = '执行测算';
    btn.style.opacity = '1';
  }
}
