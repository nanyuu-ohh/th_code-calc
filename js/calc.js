/* =========================================================
 * 泰国建筑设计指标速查 - 核心计算逻辑层 (calc.js)
 * 包含：生成核查报告、各专业选项卡渲染、工厂疏散深度计算
 * ========================================================= */

// 辅助函数：根据人数台阶计算洁具数量
function tc(n, tiers, inc) {
  if (n <= 0) return { t: 0, u: 0, w: 0, s: 0 };
  for (const r of tiers) if (n <= r.x) return { t: r.t, u: r.u || 0, w: r.w, s: r.s || 0 };
  const l = tiers[tiers.length - 1];
  const e = Math.ceil((n - l.x) / inc.p);
  return { t: l.t + e * (inc.t || 0), u: (l.u || 0) + e * (inc.u || 0), w: l.w + e * (inc.w || 0), s: (l.s || 0) + e * (inc.s || 0) };
}

// 辅助函数：生成提示框模块
function N(txt, ref, type = '') {
  let tc = type ? ` nw` : (ref ? '' : '');
  if (type === 'b') tc = ' nb';
  if (type === 'p') tc = ' np';
  if (type === 'err') tc = ' nerr';
  if (type === 'fac') tc = ' nfac';
  return `<div class="nt${tc}"><div class="nt-txt">${txt}</div>${ref ? `<div class="rf">${ref}</div>` : ''}</div>`;
}

// 辅助函数：生成待完善的灰色边框提示块
const PDBox = (title, content, ref) => `
<div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;padding:16px;margin-top:16px;">
  <div style="font-size:14px;font-weight:700;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
    <span style="font-size:16px;">🚧</span> ${title}
  </div>
  <div style="font-size:13px;color:#64748B;line-height:1.6;margin-bottom:12px;padding-left:26px;">
    ${content}
  </div>
  <div style="font-size:12px;color:#94A3B8;border-top:1px dashed #E2E8F0;padding-top:12px;display:flex;justify-content:space-between;align-items:flex-start;">
    <span>* 说明：此项相关法规并未录入完全，待后续版本完善。</span>
    ${ref ? `<span class="rf" style="background:#E2E8F0;color:#64748B;box-shadow:none;margin-left:8px;">${ref}</span>` : ''}
  </div>
</div>`;


/* =========================================================
 * 主计算函数：生成核心规范核查报告
 * ========================================================= */
function calc() {
  const fn = gFn();
  if (!fn.length) return alert('请至少选择一种建筑功能');

  const H = V('iH'), A = V('iA'), S = V('iS'), FA = Vi('iFa'), FB = Vi('iFb'), DP = V('iDp'), OC = Vi('iOc'),
    M = Vi('iM'), F = Vi('iF'), RM = Vi('iRm'), ST = Vi('iSt');

  // 获取混合功能子面积
  const subA = {};
  if (fn.length > 1) {
    fn.forEach(f => { subA[f] = parseFloat($(`iA_${f}`).value) || 0; });
  } else if (fn.length === 1) {
    subA[fn[0]] = A;
  }

  const hi = H >= 23, xl = A >= 10000, lg = A > 2000 && A < 10000, m33 = hi || xl;
  const deepB = FB >= 3 || DP >= 7;
  const bkk = gLoc() === 'bkk', ieat = gIE(), FAR = S > 0 ? A / S : 0;
  const hasR = fn.includes('residential') || fn.includes('hotel') || fn.includes('dormitory');
  const isFac = fn.includes('factory');
  const avgF = FA > 0 ? Math.round(A / FA) : A;

  // EIA 修改：增加 residential/hotel >= 4000 的判定
  const eiaAlert = (A >= 10000 || H >= 23 || RM >= 80 || (hasR && A >= 4000));

  let h = '';

  /* === 1. 建筑分类判定 === */
  {
    let tg = '';
    if (hi) tg += `<span class="tg tr">🔴 อาคารสูง 高层 ≥23m</span>`;
    if (xl) tg += `<span class="tg tr">🔴 อาคารขนาดใหญ่พิเศษ 超大型 ≥10,000m²</span>`;
    if (lg && !xl) tg += `<span class="tg ta">🟡 อาคารขนาดใหญ่ 大型 >2,000m²</span>`;
    if (!hi && !xl && !lg) tg += `<span class="tg tgg">✅ 一般建筑</span>`;
    tg += `<div style="margin-top:6px"><span class="tg tb2">${bkk ? '曼谷' : '外府'}</span>${ieat ? '<span class="tg tv">IEAT 园区</span>' : ''}</div>`;
    
    const rg = [];
    if (m33) rg.push('MR33');
    rg.push('MR39/63', 'MR55');
    if (bkk) rg.push('BMA2544');
    if (ieat) rg.push('IEAT 103/2556');
    if (isFac) rg.push('MR2(工厂法)');

    h += `<div class="rc bl-r"><h4>📌 建筑分类判定</h4>${tg}<hr class="sep">
      <div style="font-size:12px;color:var(--t2)">依据：${rg.join(' · ')} ｜ FAR ${FAR.toFixed(2)}:1 ｜ ${H}m · ${FA}F${FB ? '/B' + FB : ''} ｜ 总面积 ${A.toLocaleString()}m²</div>`;

    if (eiaAlert) {
      h += N('<b>🚨 EIA 环评审批</b>：本项目总面积≥10000㎡，或高度≥23m，或居住类总面积≥4000㎡，或客房/户数≥80套，已触发环评红线，需前置准备。', 'EIA 规定', 'err');
    }
    if (ieat && fn.includes('residential')) {
      h += N('<b>🚫 IEAT 违规警告</b>：工业园区内【完全禁止】建设永久性住宅建筑！', 'IEAT公告 第8条', 'err');
    }
    h += `</div>`;
  }

  /* === 2. 顶部分类标签 TABS === */
  h += `<div class="tabs">
    <div class="tab on" onclick="stab('ar',this)">🏛 建筑</div>
    <div class="tab" onclick="stab('st',this)">🔧 结构</div>
    <div class="tab" onclick="stab('hv',this)">❄️ 暖通</div>
    <div class="tab" onclick="stab('pl',this)">🚿 给排水</div>
    <div class="tab" onclick="stab('el',this)">⚡ 电气</div>
    <div class="tab" onclick="stab('lf',this)">🛗 电梯</div>
  </div>`;

  /* ======== 选项卡：建筑 ======== */
  {
    let a = '';
    const os = ieat ? 30 : (hasR ? 30 : 10);
    const bcr = 100 - os;

    a += `<div class="rc bl-b"><h4>📐 总图与退让</h4><div class="rg">`;

    if (m33 && !ieat) {
      const rr = A <= 30000 ? 10 : 18;
      a += `<div class="ri"><div class="n">≥${rr}m</div><div class="l">临路道路宽度要求</div></div>
          <div class="ri"><div class="n">≥12m</div><div class="l">地块临路边长要求</div></div>`;
      a += `<div class="ri ${S > 0 ? (FAR <= 10 ? 'ok' : 'ng') : ''}"><div class="n">${FAR.toFixed(2)}:1</div><div class="l">容积率 (FAR) 须≤10:1</div></div>`;
    }

    a += `<div class="ri"><div class="n">≤${bcr}%</div><div class="l">建筑密度上限 (BCR)</div></div>`;

    if (ieat) {
      a += `<div class="ri"><div class="n">≥${H > 12 ? 12 : 6}m</div><div class="l">前院临路退让</div></div>
          <div class="ri"><div class="n">≥5.0m</div><div class="l">相邻地界侧退让</div></div>`;
    } else if (m33) {
      a += `<div class="ri"><div class="n">≥6.0m</div><div class="l">各向地界退让</div></div>
          <div class="ri"><div class="n">≥6.0m</div><div class="l">消防环道净宽</div></div>`;
    } else {
      a += `<div class="ri"><div class="n">${H > 9 ? '≥3.0m' : '≥2.0m'}</div><div class="l">地界退让 (带窗/门/阳台)</div></div>`;
      a += `<div class="ri"><div class="n">≥0.5m</div><div class="l">地界退让 (无窗实墙)</div></div>`;
      a += `<div style="grid-column:1/-1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-top:4px;text-align:left;">
            <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
              🛣️ 临路退让阶梯标准 (MR55 ข้อ41)
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <div style="flex:1;min-width:120px;background:#fff;padding:12px;border-radius:6px;border:1px solid #CBD5E1;box-shadow:0 1px 2px rgba(0,0,0,.02);text-align:center;">
                <b style="color:var(--c1);font-size:14px;display:block;margin-bottom:6px;">路宽 < 10m</b>
                <span style="font-size:12px;color:var(--t2);">退道路中心线 </span><b style="color:var(--cr);font-size:14px;">≥3~6m</b>
              </div>
              <div style="flex:1;min-width:120px;background:#fff;padding:12px;border-radius:6px;border:1px solid #CBD5E1;box-shadow:0 1px 2px rgba(0,0,0,.02);text-align:center;">
                <b style="color:var(--c1);font-size:14px;display:block;margin-bottom:6px;">路宽 10~20m</b>
                <span style="font-size:12px;color:var(--t2);">退道路边线 </span><b style="color:var(--cr);font-size:14px;">≥1/10 路宽</b>
              </div>
              <div style="flex:1;min-width:120px;background:#fff;padding:12px;border-radius:6px;border:1px solid #CBD5E1;box-shadow:0 1px 2px rgba(0,0,0,.02);text-align:center;">
                <b style="color:var(--c1);font-size:14px;display:block;margin-bottom:6px;">路宽 > 20m</b>
                <span style="font-size:12px;color:var(--t2);">退道路边线 </span><b style="color:var(--cr);font-size:14px;">≥2.0m</b>
              </div>
            </div>
          </div>`;
    }

    a += `</div>`;

    if (ieat) {
      a += N('<b>🟣 IEAT 退让专规</b>：高度>12m前院退让≥12m，≤12m前院退让≥6m；侧院及后院距地界≥5m。园区内空地率严格要求≥30%（即建筑密度必须≤70%）。', 'IEAT 第10/15条', 'p');
    } else {
      a += N('<b>空地率与密度 (MR55)</b>：住宅类建筑需保留≥30%空地，商业/办公等其他类需保留≥10%空地。', 'MR55 ข้อ33');
      if (m33) {
        a += N('<b>高层/超大型道路与退让 (MR33)</b>：须连续至另一条公共道路。各向退让≥6m（含地下，不含基础），建筑四周须有净宽≥6m且无遮挡的消防环形车道。', 'MR33 ข้อ2-4');
      } else {
        a += N('<b>一般建筑实墙特例 (MR55)</b>：实心墙经邻居书面同意可0m贴线，未获同意必须≥0.5m。0m或小于常规退让的实墙，必须设置高度≥1.8m的实墙女儿墙防止火灾蔓延。', 'MR55 ข้อ50');
      }
    }
    a += `</div>`;

    // 疏散与逃生
    a += `<div class="rc bl-w"><h4>🚶 疏散与逃生距离</h4><div class="rg">
      <div class="ri"><div class="n">≤ 40m</div><div class="l">最远点至楼梯距离</div></div>`;

    if (isFac) {
      a += `<div class="ri clickable-card" onclick="openEvacModal()" style="border-color:#10B981;background:#DCFCE7;">
            <div class="n" style="color:#059669">≥ 110cm</div><div class="l">厂房疏散门底线宽</div>
          </div>`;
    }
    if (hi || xl) {
      a += `<div class="ri"><div class="n">≥ 2部</div><div class="l">直通地面消防梯</div></div>
          <div class="ri"><div class="n">≤ 60m</div><div class="l">相邻消防梯间距</div></div>`;
    }
    if (bkk) {
      a += `<div class="ri"><div class="n">≤ 10m</div><div class="l">尽端/袋形走道限制</div></div>`;
    }

    a += `<div class="ri"><div class="n">≥ 90cm</div><div class="l">楼梯净宽</div></div>
        <div class="ri"><div class="n">${hi ? '≤20/≥22' : '≤20/≥24'}</div><div class="l">踢面/踏面cm</div></div></div>`;

    a += N('<b>一般疏散距离</b>：从楼层最远点到楼梯的距离不得超过 40 米。', 'MR55 ข้อ24');
    if (isFac) {
      a += N('🏭 <b>工厂法疏散门特规</b>：厂房内疏散门宽必须 ≥110cm，高 ≥200cm；如果单扇门疏散人数 >50人，超过的部分每增加 1 人，该门宽需成比例增加至少 2cm。', 'MR2(工厂法) ข้อ5(3)', 'fac');
    }
    if (hi || xl) a += N('<b>高层/超大型疏散</b>：相邻两部逃生楼梯沿走道步行距离不得超过 60 米；防火门须宽≥90cm高≥190cm、外推自闭、无门槛。全楼人员须满足1h内撤出验算。', 'MR33 ข้อ22/27');
    if (bkk) a += N('<b>尽端走道限制</b>：从走道尽头最末端房间的门，到疏散楼梯门的距离不得超过 10 米。', 'BMA 2544 ข้อ44', 'w');
    if (hi) a += N('<b>屋顶避难</b>：≥10×10m 净空，且通达各消防楼梯。梯间送风≥3.86Pa 或外窗≥1.4m²/层。禁止使用螺旋楼梯。', 'MR33 ข้อ25/29');

    if (deepB && m33) {
      a += N('<b>深层地下空间要求</b>：自第3层向下或自道路下7m起，必须配备直达地面的逃生楼梯且沿疏散路径各楼梯间距不超过60m（平时可用作避难所）。', 'MR33 ข้อ8', 'w');
    }

    if (m33) {
      a += `<hr class="sep"><div style="font-size:13px;font-weight:700;margin-bottom:10px">🚒 应急车位配置</div>
      <div class="rg"><div class="ri"><div class="n">3×10m</div><div class="l">消防车位(露天)</div></div>
      <div class="ri"><div class="n">2.4×7m</div><div class="l">救护车位(净高≥2.85m)</div></div></div>
      ${N('要求露天或不在连廊下，救护车位距电梯≤60m。', 'MR33 ข้อ29/1')}`;
    }
    a += `</div>`;

    a += `<div class="rc bl-p"><h4>🚻 卫生洁具估算 (依据 MR63)</h4>`;
    fn.forEach(ty => {
      const r = T[ty]; if (!r || r.bs === 'n') return;
      let mr = { t: 0, u: 0, w: 0, s: 0 }, fr = { t: 0, u: 0, w: 0, s: 0 }, bt = '';
      const funcA = subA[ty] || 0;

      if (r.bs === 'w') { mr = tc(M, r.m, r.mi); fr = tc(F, r.f, r.fi); bt = M || F ? `男${M}·女${F}人` : '<span style="color:var(--cr)">请输入男女人数</span>'; }
      else if (r.bs === 'a') {
        const u = funcA > 0 ? Math.max(1, Math.ceil(funcA / r.ua)) : 0;
        mr = { t: u * r.pu.m.t, u: u * (r.pu.m.u || 0), w: u * r.pu.m.w, s: u * (r.pu.m.s || 0) };
        fr = { t: u * r.pu.f.t, u: u * (r.pu.f.u || 0), w: u * r.pu.f.w, s: u * (r.pu.f.s || 0) };
        bt = `按该功能面积每 ${r.ua}m² 估算：${funcA.toLocaleString()}m² ÷ ${r.ua} = ${u}组`;
        if (r.sharedArea) { mr.isShared = true; mr.t = u; mr.w = u; mr.s = u; }
      }
      else if (r.bs === 'c_com') {
        const baseA = Math.min(funcA, 2000), extraA = Math.max(0, funcA - 2000);
        const ub = baseA > 0 ? Math.ceil(baseA / 200) : 0, ue = extraA > 0 ? Math.ceil(extraA / 600) : 0;
        mr = { t: ub * 1 + ue * 1, u: ub * 2 + ue * 2, w: ub * 1 + ue * 1, s: 0 };
        fr = { t: ub * 3 + ue * 2, u: 0, w: ub * 1 + ue * 1, s: 0 };
        bt = `单项面积 ≤2000m² 部分每200m²计算；超出部分每600m²计算`;
      }
      else if (r.bs === 's') {
        const uSeat = ST > 0 ? Math.ceil(ST / r.us) : 0;
        const uArea = (r.ua2 && funcA > 0) ? Math.ceil(funcA / r.ua2) : 0;
        const u = Math.max(uSeat, uArea, 1);
        mr = { t: u * r.pu.m.t, u: u * (r.pu.m.u || 0), w: u * r.pu.m.w, s: u * (r.pu.m.s || 0) };
        fr = { t: u * r.pu.f.t, u: u * (r.pu.f.u || 0), w: u * r.pu.f.w, s: u * (r.pu.f.s || 0) };
        if (r.ua2) {
          bt = `按 ${r.us}座 或 ${r.ua2}m² 取大值估算：需 ${u} 组`;
        } else {
          bt = ST ? `${ST}座÷${r.us}=${u}组` : '<span style="color:var(--cr)">请输入座位数</span>';
        }
      }
      else if (r.bs === 'c_rest') {
        const rA = funcA;
        const rS = ST;
        if (rA <= 30 || (rS > 0 && rS <= 20)) { mr = { t: 1, u: 0, w: 1, isShared: true }; bt = `面积≤30m²或座位≤20 (共用)` }
        else if ((rA > 30 && rA <= 45) || (rS > 20 && rS <= 30)) { mr = { t: 1, u: 1, w: 1, isShared: true }; bt = `面积30-45m²或座位20-30 (共用)` }
        else if ((rA > 45 && rA <= 75) || (rS > 31 && rS <= 50)) { mr = { t: 1, u: 1, w: 1 }; fr = { t: 2, w: 1 }; bt = `面积45-75m²或座位31-50` }
        else if ((rA > 75 && rA <= 105) || (rS > 51 && rS <= 70)) { mr = { t: 2, u: 2, w: 2 }; fr = { t: 4, w: 2 }; bt = `面积75-105m²或座位51-70` }
        else if ((rA > 105 && rA <= 150) || (rS > 71 && rS <= 100)) { mr = { t: 3, u: 3, w: 3 }; fr = { t: 6, w: 3 }; bt = `面积105-150m²或座位71-100` }
        else {
          const exA = rA > 150 ? Math.ceil((rA - 150) / 150) : 0;
          const exS = rS > 100 ? Math.ceil((rS - 100) / 100) : 0;
          const extra = Math.max(exA, exS);
          mr = { t: 3 + extra, u: 3 + extra, w: 3 + extra };
          fr = { t: 6 + extra, w: 3 + extra };
          bt = `基础组数 + 超出部分每150m²或100座附加组数`;
        }
      }
      else if (r.bs === 'r') { bt = RM ? `${RM}间客房 (每间配套)` : '<span style="color:var(--cr)">请输入房间数</span>'; mr = { t: RM, u: 0, w: RM, s: RM, isRoom: true }; }
      else { bt = '需按原文分区计算'; }

      a += `<div style="font-size:13px;font-weight:700;margin:16px 0 8px">▸ ${r.nm} ${funcA > 0 ? `(${funcA}m²)` : ''}</div>`;

      if (mr.isRoom || mr.isShared) {
        const title = mr.isRoom ? '🚪 独立配套卫浴' : '🚻 共用配套卫浴';
        a += `<div class="wr"><div class="wb" style="background:#F8FAFC;border:1px solid #E2E8F0"><div class="wh" style="color:#475569;border-bottom:1px dashed #CBD5E1">${title}</div>
          <div class="wv">
            <div class="fi-item"><span>🚽 马桶</span><b style="color:#475569">${mr.t}</b></div>
            ${mr.u > 0 ? `<div class="fi-item"><span>🚹 小便斗</span><b style="color:#475569">${mr.u}</b></div>` : ''}
            <div class="fi-item"><span>🚰 洗手盆</span><b style="color:#475569">${mr.w}</b></div>
            ${mr.s > 0 ? `<div class="fi-item"><span>🚿 淋浴</span><b style="color:#475569">${mr.s}</b></div>` : ''}
          </div></div></div>`;
      } else {
        a += `<div class="wr">
          <div class="wb wm"><div class="wh">👨 男卫</div>
            <div class="wv">
              <div class="fi-item"><span>🚽 马桶</span><b>${mr.t}</b></div>
              <div class="fi-item"><span>🚹 小便斗</span><b>${mr.u}</b></div>
              <div class="fi-item"><span>🚰 洗手盆</span><b>${mr.w}</b></div>
              ${mr.s > 0 ? `<div class="fi-item"><span>🚿 淋浴</span><b>${mr.s}</b></div>` : ''}
            </div>
          </div>
          <div class="wb wf"><div class="wh">👩 女卫</div>
            <div class="wv">
              <div class="fi-item"><span>🚽 马桶</span><b>${fr.t}</b></div>
              <div class="fi-item"><span>🚰 洗手盆</span><b>${fr.w}</b></div>
              ${fr.s > 0 ? `<div class="fi-item"><span>🚿 淋浴</span><b>${fr.s}</b></div>` : ''}
            </div>
          </div>
        </div>`;
      }
      a += N(bt, r.ref);
      if (!r.v) a += N('⚠️ ' + (r.nt || '请核对页面底部 MR63 附表原文'), '', 'w');
    });
    if (fn.length > 1) a += N('💡 <b>混合功能已拆分计算</b>：当前系统已按你在侧边栏填写的各项面积进行精细拆分计算，避免了旧版中面积交叉重复计算的错误。', '', 'b');
    a += `</div>`;

    a += `<div class="rc bl-g"><h4>🚗 停车及交通配套</h4>`;
    let tPk = 0;

    if (ieat) {
      tPk = A > 0 ? Math.ceil(A / 240) : 0;
      a += `<div style="font-size:13px;display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted var(--bd)"><span>IEAT 园区统一标准</span><span><b style="color:var(--t1)">${tPk}</b> 辆 <span style="color:var(--t3);font-size:11px;margin-left:4px">[${A.toLocaleString()}m²÷240]</span></span></div>`;
      a += N('<b>🟣 IEAT 交通专规</b>：双向出入口宽度必须≥6.0m；多个出入口间距≥60m；距道路交叉口曲线起点≥40m；原则上严禁出入口直接连接园区主干道。', 'IEAT 第18-20条', 'p');
    } else {
      fn.forEach(ty => {
        const pkMap = bkk ? PK_BKK : PK_OTH;
        const r = pkMap[ty];
        let pk = 0, lb = '';
        const funcA = subA[ty] || 0;
        if (r === 'rm') { pk = RM; lb = RM + '间·1辆/间'; }
        else if (r === 'u') { pk = 0; lb = '按户数计算'; }
        else if (r === '10s') { pk = ST > 0 ? Math.ceil(ST / 10) : 0; lb = ST + '座÷10'; }
        else if (typeof r === 'number') { pk = funcA > 0 ? Math.ceil(funcA / r) : 0; lb = funcA.toLocaleString() + 'm²÷' + r; }
        else { pk = funcA > 0 ? Math.ceil(funcA / 240) : 0; lb = funcA.toLocaleString() + 'm²÷240(MR7)'; }
        tPk += pk;
        a += `<div style="font-size:13px;display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted var(--bd)"><span>${T[ty]?.nm || ty}</span><span><b style="color:var(--t1)">${pk}</b> 辆 <span style="color:var(--t3);font-size:11px;margin-left:4px">[${lb}]</span></span></div>`;
      });
      if (fn.length > 1) a += `<div style="font-size:14px;font-weight:700;text-align:right;margin-top:10px">合计 ≈ ${tPk} 辆</div>`;
      a += N('<b>坡道及车道</b>：直线坡度 ≤15%，曲线坡度 ≤12%，单/双行车道宽度需满足规范下限。', '');
      a += N(bkk ? '依据曼谷条例 BMA ข้อ79 计算，实际以审图核定为准。' : '依据 MR7 通用标准计算，已根据项目所属地区采用不同比例（外府标准已降配）。', '');
    }

    if (ieat) {
      const tr = S > 0 ? Math.ceil(S / 1600) : 0;
      a += N(`<b>🟣 IEAT 绿化附加要求</b>：≥ ${tr} 棵 (即 1棵 / 1莱，1莱=1600m²)`, 'IEAT 第27条', 'p');
    }
    a += `</div>`;

    if (isFac) {
      a += `<div class="rc" style="border-left:4px solid #10B981;"><h4>🏭 工厂法空间特规 (MR 2 B.E.2535)</h4><div class="rg">
        <div class="ri"><div class="n" style="color:#059669">≥ 3.0m</div><div class="l">基础净高底线</div></div>
        <div class="ri"><div class="n" style="color:#059669">≥ 3.0m²</div><div class="l">单人操作面积</div></div>
        <div class="ri"><div class="n" style="color:#059669">≥ 1.5m</div><div class="l">防跌落栏杆高差</div></div>
      </div>
      ${N('📏 <b>室内净高</b>：车间平均净高不得低于 3.0m；若配有空调或良好机械通风，底线可放宽至 2.30m。', 'MR2 ข้อ5(5)', 'fac')}
      ${N('🧑‍🏭 <b>操作空间</b>：工作区平均每名工人占地（含桌椅、机器、材料移动范围）不得少于 3.0 平方米。', 'MR2 ข้อ5(7)', 'fac')}
      ${N('🚧 <b>防跌落设施</b>：高于地面 1.50m 及以上的楼梯和操作通道，必须设置稳固的防护栏杆。', 'MR2 ข้อ5(4)', 'fac')}
      </div>`;
    }

    a += PDBox('无障碍设计 (部令 2548/2564)', '<b>残疾人车位</b>：每10-50个常规车位需配建1个无障碍车位。<br><b>无障碍设施</b>：需按建筑人数比例及对应面积标准配建无障碍卫生间。<br><b>坡道与电梯</b>：无障碍轮椅坡道坡度必须≤1:12，电梯门宽及语音播报具有硬性要求。', 'กฎกระทรวงฯ พ.ศ. 2548');

    h += `<div class="tp on" id="tp-ar">${a}</div>`;
  }

  /* ======== 选项卡：结构 ======== */
  {
    let s = '';
    if (m33) {
      s += `<div class="rc bl-s"><h4>🧱 防火构造</h4><div class="rg">
        <div class="ri"><div class="n">≥18cm</div><div class="l">防火墙(砖)</div></div>
        <div class="ri"><div class="n">≥12cm</div><div class="l">防火墙(RC)</div></div>
        <div class="ri"><div class="n">≥1h</div><div class="l">梯间隔墙耐火</div></div>
        ${deepB ? '<div class="ri"><div class="n">≥10cm</div><div class="l">深层地下梯间RC墙</div></div>' : ''}
      </div>
      ${N('<b>防火墙要求</b>：砖墙实心厚度≥18cm，钢筋混凝土厚度≥12cm。', 'MR33 ข้อ1')}
      ${N('<b>楼梯间</b>：非消防楼梯的围合墙/门耐火极限必须≥1小时。', 'MR33 ข้อ8/8ทวิ')}
      </div>`;
    } else {
      s += `<div class="rc bl-s"><h4>🧱 一般结构要求</h4>
      ${N('常规建筑依据 MR55 进行结构安全设计。木结构/钢结构需符合基础防腐防锈标准；无强制要求高层级别防火墙。特殊大跨度按专门规范执行。', 'MR55')}</div>`;
    }
    s += PDBox('荷载与抗震 (MR 2566)', '<b>抗震设防</b>：按项目所在府/区划分抗震设防等级，需进行专项计算。<br><b>风荷载</b>：不同高度区段风压取值标准有明确要求，需依地区基准风速复核。', 'MR 2566');
    h += `<div class="tp" id="tp-st">${s}</div>`;
  }

  /* ======== 选项卡：暖通 ======== */
  {
    let hv = '';
    if (m33) {
      hv += `<div class="rc bl-o"><h4>❄️ 通风与防排烟</h4><div class="rg">`;
      if (hi) hv += `<div class="ri"><div class="n">≥3.86Pa</div><div class="l">梯间正压</div></div><div class="ri"><div class="n">≥38.6Pa</div><div class="l">消防前室正压</div></div>`;
      hv += `<div class="ri"><div class="n">74°C</div><div class="l">防火阀闭合温度</div></div>
           <div class="ri"><div class="n" style="color:var(--t1)">不燃</div><div class="l">风管及保温材质</div></div>
           <div class="ri"><div class="n" style="color:var(--t1)">自动停机</div><div class="l">空调烟感联动</div></div>
           <div class="ri"><div class="n">≥5m</div><div class="l">新风口距污染源</div></div>
           </div>
           ${N('<b>排烟系统</b>：中庭贯穿≥2层须设自动排烟。防火阀穿防火墙/楼板处，耐火需≥1.5h。', 'MR33 ข้อ10/10ทวิ')}
           </div>`;
    } else {
      hv += `<div class="rc bl-o"><h4>❄️ 一般通风要求</h4>
      ${N('所有使用房间必须配备面积不少于其地面面积 10% 的可开启外窗用于自然通风，或设置满足 ACH 强制要求的机械排风系统。', 'MR55 ข้อ19-21')}</div>`;
    }
    h += `<div class="tp" id="tp-hv">${hv}</div>`;
  }

  /* ======== 选项卡：给排水 ======== */
  {
    let pl = '';
    if (m33) {
      const sp = Math.max(1, Math.ceil(avgF / 1600));
      let flow = 30; for (let i = 1; i < sp; i++) flow += 15; if (flow > 95) flow = 95;
      const tank = flow * 30 * 60 / 1000;
      pl += `<div class="rc bl-b"><h4>🚿 消防给水与灭火系统</h4><div class="rg">
        <div class="ri"><div class="n" style="color:var(--t1)">全覆盖</div><div class="l">自动灭火/喷淋</div></div>
        <div class="ri"><div class="n">≥${tank.toFixed(0)}m³</div><div class="l">消防储水池</div></div>
      </div>
      ${N('<b>立管与水池</b>：须为内壁光滑金属管，工作压力≥1.2MPa（表压），外表涂红漆。每64m一个消火栓箱(25mm+65mm)，消防水池储量需支撑 ' + flow + 'L/s × 30min。', 'MR33 ข้อ18')}
      </div>`;
    } else {
      pl += `<div class="rc bl-b"><h4>🚿 一般给排水与环保要求</h4>
      ${N('必须设置规范的化粪池或污水处理系统，化粪池距离公共水体边缘 ≥10m；建筑物雨水和生活污水管道必须分离。', 'MR55 / MR39')}</div>`;
    }
    h += `<div class="tp" id="tp-pl">${pl}</div>`;
  }

  /* ======== 选项卡：电气 ======== */
  {
    let el = '';
    if (m33) {
      el += `<div class="rc bl-w"><h4>⚡ 强弱电与消防配电</h4><div class="rg">
        <div class="ri"><div class="n" style="color:var(--t1)">独立回路</div><div class="l">消防电梯用电</div></div>
        <div class="ri"><div class="n">≥2小时</div><div class="l">疏散应急照明时间</div></div>
      </div>
      ${N('<b>火灾报警系统</b>：每层必须设置自动探测+手动报警装置，并同时配置声光报警提示。', 'MR33 ข้อ16')}
      </div>`;
    } else {
      el += `<div class="rc bl-w"><h4>⚡ 一般电气照明</h4>
      ${N('居住及工作空间必须具备足够的基础照明强度；配电箱/配电板应设置在安全、干燥、易于操作及维护的位置。', 'MR55')}</div>`;
    }
    h += `<div class="tp" id="tp-el">${el}</div>`;
  }

  /* ======== 选项卡：电梯 ======== */
  {
    let lf = '';
    if (hi) {
      lf += `<div class="rc bl-r"><h4>🛗 电梯设置标准</h4>
      ${N('<b>消防梯前室</b>：须由防火墙+防火门完全围合，且每层前室内均应设置消防栓箱。', 'MR33 ข้อ44')}
      </div>`;
    } else if (FA >= 5) {
      lf += `<div class="rc bl-r"><h4>🛗 电梯设置标准</h4>
      ${N('建筑层数 ≥ 5 层，必须至少设置 1 部满足日常人员通行需求的客运电梯。', 'MR55 ข้อ44')}</div>`;
    } else {
      lf += `<div class="rc bl-r"><h4>🛗 电梯设置标准</h4>
      ${N('当前建筑未达到 5 层，且非超大型/高层，法规层面无强制电梯配置要求。', '')}</div>`;
    }
    h += `<div class="tp" id="tp-lf">${lf}</div>`;
  }

  // 渲染并显示结果区域
  $('res').innerHTML = h;
  $('ph').classList.add('hid');
  $('resWrapper').classList.remove('hid');

  document.body.classList.add('hr');
  closeP();

  setTimeout(() => {
    document.getElementById('resWrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}


/* =========================================================
 * 工厂疏散深度计算模块 (针对 MR2 与 MR55 交互)
 * ========================================================= */
let evacCtx = { area: 0, height: 0, isHighRise: false, isExtraLarge: false };

function openEvacModal() {
  const fn = gFn();
  let subFacArea = 0;
  if (fn.length > 1) {
    subFacArea = parseFloat(document.getElementById('iA_factory').value) || 0;
  } else {
    subFacArea = parseFloat(document.getElementById('iA').value) || 0;
  }

  const floors = parseInt(document.getElementById('iFa').value) || 1;
  const height = parseFloat(document.getElementById('iH').value) || 0;
  const totalArea = parseFloat(document.getElementById('iA').value) || 0;

  const singleFloorArea = floors > 0 ? (subFacArea / floors) : subFacArea;
  const isHighRise = height >= 23;
  const isExtraLarge = totalArea >= 10000;

  evacCtx = { area: singleFloorArea, height: height, isHighRise: isHighRise, isExtraLarge: isExtraLarge };

  document.getElementById('modal-area').value = singleFloorArea.toFixed(1);
  document.getElementById('modal-people').value = '';
  document.getElementById('modal-auto-people').checked = false;
  document.getElementById('modal-results').style.display = 'none';
  document.getElementById('modal-error').style.display = 'none';

  document.getElementById('factoryEvacModal').style.display = 'flex';
}

function calcFactoryEvac() {
  const people = parseInt(document.getElementById('modal-people').value) || 0;
  const stairs = parseInt(document.getElementById('modal-stairs').value) || 0;

  const errMsg = document.getElementById('modal-error');
  const resBox = document.getElementById('modal-results');

  errMsg.style.display = 'none';
  resBox.style.display = 'none';

  if (people <= 0) {
    errMsg.innerText = '⚠️ 请输入有效的疏散人数！';
    errMsg.style.display = 'block';
    return;
  }
  if (stairs < 2) {
    errMsg.innerText = '⚠️ 法规底线：工厂紧急出口数量不得少于2个！';
    errMsg.style.display = 'block';
    return;
  }

  // 基础底线 110cm，超 50 人每人增加 2cm
  let factoryTotalWidthReq = 110;
  if (people > 50) {
    factoryTotalWidthReq += (people - 50) * 2;
  }

  let widthPerStair = Math.ceil(factoryTotalWidthReq / stairs);
  let minBldgWidth = (evacCtx.isHighRise || evacCtx.isExtraLarge) ? 90 : 80;
  let finalWidth = Math.max(widthPerStair, minBldgWidth, 110);

  // 预警判定
  let warningHtml = '';
  if (finalWidth > 240) {
    warningHtml += `
      <div style="margin-top:10px;padding:10px;background:#FEE2E2;border-left:4px solid #DC2626;border-radius:4px;">
        <div style="color:#DC2626;font-weight:bold;margin-bottom:4px;">🚨 超宽警告 (按工厂法)</div>
        <div style="color:var(--t1);font-size:.9em;">单梯/门净宽需达到 ${finalWidth}cm。门/梯极少有此尺寸，请增加出口数量！</div>
      </div>`;
  }
  if ((evacCtx.area / stairs) > 2000) {
    warningHtml += `
      <div style="margin-top:10px;padding:10px;background:#FEF3C7;border-left:4px solid #D97706;border-radius:4px;">
        <div style="color:#D97706;font-weight:bold;margin-bottom:4px;">⚠️ 疏散距离警告 (按 MR55)</div>
        <div style="color:var(--t1);font-size:.9em;">单层面积分摊到每个楼梯达 ${(evacCtx.area / stairs).toFixed(0)}㎡，极易超出 40 米最远疏散距离限制，请增加楼梯数量！</div>
      </div>`;
  }

  let roofHtml = '';
  if (evacCtx.isHighRise) {
    roofHtml = `<div style="margin-top:10px;padding:10px;background:var(--crl);border-left:4px solid var(--cr);border-radius:4px;"><div style="color:var(--cr);font-weight:bold;margin-bottom:4px;">🚨 强制直通屋面要求 (MR33 高层条款)</div><div style="color:var(--t1);font-size:.9em;">本项目高度≥23米，属高层建筑。依据第33号部级法规，<b>必须采用平屋顶</b>，保留至少 10×10米的空中疏散救援空地，且<b>所有疏散楼梯必须直通屋面</b>。</div></div>`;
  }

  resBox.innerHTML = `
    <h4 style="margin-top:0;color:var(--c1);border-bottom:1px solid #eee;padding-bottom:5px;">📋 评估结果 (单层)</h4>
    <div style="display:flex;justify-content:space-between;font-size:.9em;margin-bottom:10px;">
      <span>疏散人数：<b>${people}</b> 人</span>
      <span>出口数量：<b>${stairs}</b> 个</span>
    </div>
    <div style="background:#fff;border:1px solid var(--c1l);border-radius:4px;padding:10px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:var(--t2);">🚪 疏散门净宽底线：</span>
        <span style="color:var(--c1);font-weight:bold;font-size:1.1em;">≥ ${finalWidth} cm</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--t2);">🪜 楼梯净宽底线：</span>
        <span style="color:var(--c1);font-weight:bold;font-size:1.1em;">≥ ${finalWidth} cm</span>
      </div>
    </div>
    <div style="font-size:.8em;color:var(--t3);line-height:1.4;">
      * 依据泰国《工厂法》第2号规章：基础110cm，超50人部分+2cm/人。最终取值已与《建筑法》安全底线进行就高判定。
    </div>
    ${warningHtml}
    ${roofHtml}
  `;
  resBox.style.display = 'block';
}
