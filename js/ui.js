/* ====== 页面交互与 UI 渲染 (ui.js) ====== */

const $ = id => document.getElementById(id);
const V = id => parseFloat($(id).value) || 0;
const Vi = id => parseInt($(id).value) || 0;
const gLoc = () => $('locToggle').checked ? 'bkk' : 'oth';
const gIE = () => $('ieToggle').checked;
const gFn = () => [...document.querySelectorAll('#fns input:checked')].map(c => c.value);

// 初始化渲染 MR63 动态表格
window.onload = () => {
  const tbody = $('mr63-tbody');
  if(!tbody) return;
  let html = '';
  MR63_TABLE_DATA.forEach(cat => {
    cat.rows.forEach((row, i) => {
      html += `<tr${i === 0 ? ' class="tr-s"' : ''}>`;
      if (i === 0) html += `<td rowspan="${cat.rows.length}">${cat.cat}</td>`;
      html += `<td>${row.gender}</td><td class="tl">${row.cond}</td>`;
      html += `<td>${row.t}</td><td>${row.u}</td><td>${row.b}</td><td>${row.w}</td>`;
      html += '</tr>';
    });
  });
  tbody.innerHTML = html;
};

// 状态开关 UI 更新
function updToggleUI(){
  const isBkk = $('locToggle').checked;
  $('lb-bkk').style.color = isBkk ? 'var(--c1)' : 'var(--t3)';
  $('lb-oth').style.color = !isBkk ? 'var(--c1)' : 'var(--t3)';
  const isIEAT = $('ieToggle').checked;
  $('lb-ieat').style.color = isIEAT ? 'var(--cp)' : 'var(--t1)';
}

// 动态面板更新 (混合功能等)
function upd(){
  document.querySelectorAll('.pl').forEach(p => {
    const ipt = p.querySelector('input[type="checkbox"]');
    if(ipt) p.classList.toggle('on', ipt.checked);
  });
  const fn = gFn();
  $('xW').style.display = fn.some(f => ['factory','office'].includes(f)) ? 'block' : 'none';
  $('xR').style.display = fn.some(f => ['hotel','residential','dormitory'].includes(f)) ? 'block' : 'none';
  $('xS').style.display = fn.some(f => ['assembly','restaurant'].includes(f)) ? 'block' : 'none';
  
  // 混合功能动态面板逻辑
  const xMixed = $('xMixed');
  if(fn.length > 1){
    let mh = `<div class="scd-t">混合功能面积分配 <span style="color:var(--cr);font-weight:bold;text-transform:none;margin-left:4px;">(必须填写用于精确分拆计算)</span></div><div class="grid-2">`;
    fn.forEach(f => {
      mh += `<div class="fg" style="margin-bottom:0">
             <label>${T[f].nm}</label>
             <div class="unit-wrap">
               <input type="number" id="iA_${f}" placeholder="如 2000">
               <span class="u">㎡</span>
             </div>
           </div>`;
    });
    mh += `</div>`;
    xMixed.innerHTML = mh;
    xMixed.style.display = 'block';
  } else {
    xMixed.style.display = 'none';
  }
}

// 清空重置
function rst(){
  document.querySelectorAll('input[type=number]').forEach(i => i.value = '');
  document.querySelectorAll('.pl').forEach(p => {
    const cb = p.querySelector('input[type=checkbox]');
    if(cb) { p.classList.remove('on'); cb.checked = false; }
  });
  $('locToggle').checked = true;
  $('ieToggle').checked = false;
  updToggleUI();
  upd();
  $('resWrapper').classList.add('hid');
  $('ph').classList.remove('hid');
  document.body.classList.remove('hr','po');
}

// 选项卡切换
function stab(id, el){
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.tp').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  $('tp-'+id).classList.add('on');
}

// 移动端侧边栏控制
function openP(){ document.body.classList.add('po'); }
function closeP(){ document.body.classList.remove('po'); }

// 弹窗控制
function closeEvacModal(){ $('factoryEvacModal').style.display = 'none'; }
function toggleAutoPeople(){
  const isAuto = $('modal-auto-people').checked;
  const input = $('modal-people');
  if(isAuto){
    const area = parseFloat($('modal-area').value) || 0;
    input.value = Math.ceil(area / 9.3);
  } else {
    input.value = '';
  }
}
