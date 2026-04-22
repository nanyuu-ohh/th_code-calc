/* ====== 核心算法逻辑 (calc.js) ====== */

// 辅助函数：根据人数台阶计算洁具数量
function tc(n, tiers, inc){
  if(n<=0) return {t:0, u:0, w:0, s:0};
  for(const r of tiers) if(n<=r.x) return {t:r.t, u:r.u||0, w:r.w, s:r.s||0};
  const l = tiers[tiers.length-1];
  const e = Math.ceil((n-l.x)/inc.p);
  return {t:l.t+e*(inc.t||0), u:(l.u||0)+e*(inc.u||0), w:l.w+e*(inc.w||0), s:(l.s||0)+e*(inc.s||0)};
}

// 辅助函数：生成提示框
function N(txt, ref, type=''){
  let tc = type ? ` nw` : (ref ? '' : '');
  if(type === 'b') tc = ' nb';
  if(type === 'p') tc = ' np';
  if(type === 'err') tc = ' nerr';
  if(type === 'fac') tc = ' nfac';
  return `<div class="nt${tc}"><div class="nt-txt">${txt}</div>${ref ? `<div class="rf">${ref}</div>` : ''}</div>`;
}

const PDBox = (title, content, ref) => `
<div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;padding:16px;margin-top:16px;">
  <div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
    <span style="font-size:16px;">🚧</span> ${title}
  </div>
  <div style="font-size:13px;color:#64748B;line-height:1.6;margin-bottom:12px;padding-left:26px;">
    ${content}
  </div>
</div>`;

// ===== 主计算逻辑 ======
function calc(){
  const fn = gFn();
  if(!fn.length) return alert('请至少选择一种建筑功能');
  
  const H = V('iH'), A = V('iA'), S = V('iS'), FA = Vi('iFa'), FB = Vi('iFb'), DP = V('iDp');
  const M = Vi('iM'), F = Vi('iF'), RM = Vi('iRm'), ST = Vi('iSt');
  
  // 混合功能子面积
  const subA = {};
  if(fn.length > 1){
    fn.forEach(f => { subA[f] = parseFloat($(`iA_${f}`).value) || 0; });
  } else if(fn.length === 1){
    subA[fn[0]] = A;
  }

  const hi = H >= 23, xl = A >= 10000, lg = A > 2000 && A < 10000, m33 = hi || xl;
  const bkk = gLoc() === 'bkk', ieat = gIE(), FAR = S > 0 ? A / S : 0;
  const hasR = fn.includes('residential') || fn.includes('hotel') || fn.includes('dormitory');
  const isFac = fn.includes('factory');

  const eiaAlert = (A >= 10000 || H >= 23 || RM >= 80 || (hasR && A >= 4000));

  let h = '';

  /* === CLASSIFICATION === */
  let tg = '';
  if(hi) tg += `<span class="tg tr">🔴 อาคารสูง 高层 ≥23m</span>`;
  if(xl) tg += `<span class="tg tr">🔴 อาคารขนาดใหญ่พิเศษ 超大型 ≥10,000m²</span>`;
  if(lg && !xl) tg += `<span class="tg ta">🟡 อาคารขนาดใหญ่ 大型 >2,000m²</span>`;
  if(!hi && !xl && !lg) tg += `<span class="tg tgg">✅ 一般建筑</span>`;
  tg += `<div style="margin-top:6px"><span class="tg tb2">${bkk?'曼谷':'外府'}</span>${ieat?'<span class="tg tv">IEAT 园区</span>':''}</div>`;

  h += `<div class="rc bl-r"><h4>📌 建筑分类判定</h4>${tg}<hr class="sep">
        <div style="font-size:12px;color:var(--t2)">FAR ${FAR.toFixed(2)}:1 ｜ ${H}m · ${FA}F${FB?'/B'+FB:''} ｜ 总面积 ${A.toLocaleString()}m²</div>`;
  
  if(eiaAlert) h += N('<b>🚨 EIA 环评审批</b>：触发环评红线，需前置准备。','EIA 规定','err');
  if(ieat && fn.includes('residential')) h += N('<b>🚫 IEAT 违规警告</b>：工业园区内禁止住宅！','IEAT公告','err');
  h += `</div>`;

  /* === TABS (为了展示精简版，省略拼接过程，逻辑与原先完全相同) === */
  h += `<div class="tabs">
          <div class="tab on" onclick="stab('ar',this)">🏛 建筑</div>
          <div class="tab" onclick="stab('st',this)">🔧 结构</div>
        </div>`;

  let a = '';
  a += `<div class="rc bl-b"><h4>📐 总图与退让</h4>
        <div class="rg"><div class="ri"><div class="n">${FAR.toFixed(2)}:1</div><div class="l">容积率 (FAR)</div></div></div></div>`;

  // 卫生洁具计算 (调用 data.js 中的子函数)
  a += `<div class="rc bl-p"><h4>🚻 卫生洁具估算 (依据 MR63)</h4>`;
  fn.forEach(ty => {
    const r = T[ty];
    if(!r || r.bs === 'n') return;
    const funcA = subA[ty] || 0; 
    a += `<div style="font-size:13px;font-weight:700;margin:16px 0 8px">▸ ${r.nm} (${funcA}m²) - 独立计算</div>`;
    // 这里保留原有的洁具判断逻辑...
  });
  a += `</div>`;

  // 停车计算 (调用 data.js 中的 PK_BKK / PK_OTH)
  a += `<div class="rc bl-g"><h4>🚗 停车及交通配套</h4>`;
  let tPk = 0;
  if(ieat){
    tPk = A > 0 ? Math.ceil(A/240) : 0;
    a += `IEAT 园区统一标准：<b>${tPk}</b> 辆`;
  } else {
    fn.forEach(ty => {
      const pkMap = bkk ? PK_BKK : PK_OTH;
      const r = pkMap[ty];
      const funcA = subA[ty] || 0;
      let pk = typeof r === 'number' ? Math.ceil(funcA/r) : 0; // 简写
      tPk += pk;
      a += `<div>${T[ty]?.nm}：<b>${pk}</b> 辆</div>`;
    });
  }
  a += `</div>`;

  h += `<div class="tp on" id="tp-ar">${a}</div>`;
  h += `<div class="tp" id="tp-st">${PDBox('荷载与抗震','需专项计算','MR 2566')}</div>`;

  $('res').innerHTML = h;
  $('ph').classList.add('hid');
  $('resWrapper').classList.remove('hid');
  document.body.classList.add('hr');
  closeP();
  setTimeout(() => $('resWrapper').scrollIntoView({behavior:'smooth',block:'start'}), 100);
}

// ===== 工厂二次疏散深度计算 =====
let evacCtx = {area:0, height:0, isHighRise:false, isExtraLarge:false};

function openEvacModal(){
  const fn = gFn();
  const subFacArea = fn.length > 1 ? (parseFloat($('iA_factory').value)||0) : (parseFloat($('iA').value)||0);
  const floors = parseInt($('iFa').value) || 1;
  
  evacCtx.area = floors > 0 ? (subFacArea / floors) : subFacArea;
  evacCtx.height = parseFloat($('iH').value) || 0;
  evacCtx.isHighRise = evacCtx.height >= 23;

  $('modal-area').value = evacCtx.area.toFixed(1);
  $('modal-people').value = '';
  $('modal-results').style.display = 'none';
  $('modal-error').style.display = 'none';
  $('factoryEvacModal').style.display = 'flex';
}

function calcFactoryEvac(){
  const people = parseInt($('modal-people').value) || 0;
  const stairs = parseInt($('modal-stairs').value) || 0;
  const errMsg = $('modal-error'), resBox = $('modal-results');
  errMsg.style.display = 'none'; resBox.style.display = 'none';

  if(people <= 0 || stairs < 2){
    errMsg.innerText = '⚠️ 请输入有效人数，且出口数量≥2';
    errMsg.style.display = 'block'; return;
  }

  let factoryTotalWidthReq = 110 + (people > 50 ? (people - 50) * 2 : 0);
  let finalWidth = Math.max(Math.ceil(factoryTotalWidthReq / stairs), evacCtx.isHighRise ? 90 : 80, 110);

  let warningHtml = '';
  if (finalWidth > 240) warningHtml += `<div style="color:red">🚨 门/梯超宽 (${finalWidth}cm)，请增加出口数量！</div>`;
  if ((evacCtx.area / stairs) > 2000) warningHtml += `<div style="color:orange">⚠️ 疏散距离极易超40米，请增加楼梯！</div>`;

  resBox.innerHTML = `
    <h4 style="margin-top:0;color:var(--c1);">📋 评估结果 (单层)</h4>
    门/梯净宽底线：<b style="color:var(--c1);font-size:1.1em;">≥ ${finalWidth} cm</b><br>
    ${warningHtml}
  `;
  resBox.style.display = 'block';
}
