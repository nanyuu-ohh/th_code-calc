/* =========================================================
 * 泰国建筑设计指标速查 - 核心数据层 (data.js)
 * 包含：建筑功能参数、停车位指标标准、MR63 洁具完整附表数据
 * ========================================================= */

// 1. 各功能模块底层计算规则 & 指标常量
const T = {
  factory: { 
    nm: '工厂', bs: 'w', ref: 'MR63(3)',
    m: [{x:15,t:1,u:1,w:1,s:1}, {x:40,t:2,u:2,w:2,s:2}, {x:80,t:3,u:3,w:3,s:3}], mi: {p:50,t:1,u:1,w:1,s:1},
    f: [{x:15,t:2,w:1,s:1}, {x:40,t:4,w:2,s:2}, {x:80,t:6,w:3,s:3}], fi: {p:50,t:1,w:1,s:1}, v: 1
  },
  warehouse: { 
    nm: '仓库', bs: 'a', ua: 5000, ref: 'MR63(12)',
    pu: { m:{t:1,u:1,w:1,s:0}, f:{t:2,u:0,w:1,s:0} }, v: 1 
  },
  office: { 
    nm: '办公', bs: 'a', ua: 300, ref: 'MR63(9)',
    pu: { m:{t:1,u:2,w:1,s:0}, f:{t:3,u:0,w:1,s:0} }, v: 1, nt: '' 
  },
  commercial: { 
    nm: '商业', bs: 'c_com', ua: 200, ref: 'MR63(11)', v: 1, nt: '' 
  },
  department: { 
    nm: '百货', bs: 'c_com', ua: 200, ref: 'MR63(11)', v: 1, nt: '' 
  },
  hotel: { 
    nm: '酒店', bs: 'r', ref: 'MR63(4)', v: 1, nt: '每客房配独立卫浴，公共区须按对应功能另算' 
  },
  dormitory: { 
    nm: '宿舍', bs: 'a', ua: 50, sharedArea: true, ref: 'MR63(6)',
    pu: { m:{t:1,u:0,w:1,s:1}, f:{t:1,u:0,w:1,s:1} }, v: 1, nt: '每50m²配套（通用/不分男女）' 
  },
  assembly: { 
    nm: '会议', bs: 's', us: 100, ua2: 200, ref: 'MR63(7)', 
    pu: { m:{t:1,u:2,w:1,s:0}, f:{t:3,u:0,w:1,s:0} }, v: 1 
  },
  restaurant: { 
    nm: '餐厅', bs: 'c_rest', us: 50, ref: 'MR63(10)', v: 0, nt: '详见附表(10)' 
  },
  hospital: { 
    nm: '医院', bs: 'x', ref: 'MR63(13)', v: 0, nt: '需按门诊/住院/重症室等分区计算，详见附表(13)' 
  },
  residential: { 
    nm: '住宅', bs: 'n', ref: 'MR63(1)', v: 1, nt: '' 
  }
};

// 2. 停车位计算标准 (MR7) 
// 曼谷地区 (PK_BKK)
const PK_BKK = {
  factory: 240, warehouse: 240, office: 60, commercial: 20, 
  hotel: 'rm', dormitory: 'rm', assembly: '10s', restaurant: 20, 
  department: 20, hospital: 60, residential: 'u'
};
// 外府地区 (PK_OTH) - 修正后的宽松标准
const PK_OTH = {
  factory: 240, warehouse: 240, office: 120, commercial: 40, 
  hotel: 'rm', dormitory: 'rm', assembly: '10s', restaurant: 40, 
  department: 40, hospital: 60, residential: 'u'
};

// 3. MR63 洁具标准数据自查完整附表
// 将原本冗长的 HTML 表格压缩为 JSON 数据，供 UI 动态渲染
const MR63_TABLE_DATA = [
  { 
    cat: '(1) 住宅建筑', 
    rows: [
      { gender: '<span class="gy">通用</span>', cond: '每 1 栋', t: 1, u: '-', b: 1, w: '-' }
    ] 
  },
  { 
    cat: '(2) 排屋/商业排屋', 
    rows: [
      { gender: '<span class="gy">通用</span>', cond: '各层总面积 ≤ 200m²', t: 1, u: '-', b: '-', w: '-' },
      { gender: '<span class="gy">通用</span>', cond: '各层总面积 > 200m²', t: 2, u: 1, b: 1, w: '-' },
      { gender: '<span class="gy">通用</span>', cond: '高度 > 3层', t: 2, u: 1, b: 1, w: '-' }
    ]
  },
  { 
    cat: '(3) 工厂', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '≤ 15人', t: 1, u: 1, b: 1, w: 1 },
      { gender: '<span class="gp">女</span>', cond: '≤ 15人', t: 2, u: '-', b: 1, w: 1 },
      { gender: '<span class="gw">男</span>', cond: '16 ~ 40人', t: 2, u: 2, b: 2, w: 2 },
      { gender: '<span class="gp">女</span>', cond: '16 ~ 40人', t: 4, u: '-', b: 2, w: 2 },
      { gender: '<span class="gw">男</span>', cond: '41 ~ 80人', t: 3, u: 3, b: 3, w: 3 },
      { gender: '<span class="gp">女</span>', cond: '41 ~ 80人', t: 6, u: '-', b: 3, w: 3 },
      { gender: '<span class="gy">各自</span>', cond: '> 80人 (每 +50人)', t: '+1', u: '+1 (男)', b: '+1', w: '+1' }
    ]
  },
  { 
    cat: '(4) 酒店/临租', 
    rows: [
      { gender: '<span class="gy">通用</span>', cond: '每 1 间客房', t: 1, u: '-', b: 1, w: 1 }
    ] 
  },
  { 
    cat: '(5) 公寓', 
    rows: [
      { gender: '<span class="gy">通用</span>', cond: '每 1 套', t: 1, u: '-', b: 1, w: 1 }
    ] 
  },
  { 
    cat: '(6) 宿舍', 
    rows: [
      { gender: '<span class="gy">通用</span>', cond: '每 50m²', t: 1, u: '-', b: 1, w: 1 }
    ] 
  },
  { 
    cat: '(7) 会议厅/剧院', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 200m² 或 每 100人 (取大值)', t: 1, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 200m² 或 每 100人 (取大值)', t: 3, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(8) 教育机构', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '≤ 500人 (每 50人)', t: 1, u: 1, b: '-', w: 1 },
      { gender: '<span class="gw">男</span>', cond: '> 500人 (超出部分 每 +100人)', t: '+1', u: '+1', b: '-', w: '+1' },
      { gender: '<span class="gp">女</span>', cond: '≤ 500人 (每 50人)', t: 2, u: '-', b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '> 500人 (超出部分 每 +100人)', t: '+2', u: '-', b: '-', w: '+1' }
    ]
  },
  { 
    cat: '(9) 办公室', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 300m²', t: 1, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 300m²', t: 3, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(10) 餐厅、饮食店', 
    rows: [
      { gender: '<span class="gy">共用</span>', cond: '面积 < 30m² 或 座位数 < 20 (取大值)', t: 1, u: '-', b: '-', w: 1 },
      { gender: '<span class="gy">共用</span>', cond: '30m² ≤ 面积 ≤ 45m² 或 20 ≤ 座位数 ≤ 30 (取大值)', t: 1, u: 1, b: '-', w: 1 },
      { gender: '<span class="gw">男</span>', cond: '45m² < 面积 ≤ 75m² 或 31 ≤ 座位数 ≤ 50 (取大值)', t: 1, u: 1, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '45m² < 面积 ≤ 75m² 或 31 ≤ 座位数 ≤ 50 (取大值)', t: 2, u: '-', b: '-', w: 1 },
      { gender: '<span class="gw">男</span>', cond: '75m² < 面积 ≤ 105m² 或 51 ≤ 座位数 ≤ 70 (取大值)', t: 2, u: 2, b: '-', w: 2 },
      { gender: '<span class="gp">女</span>', cond: '75m² < 面积 ≤ 105m² 或 51 ≤ 座位数 ≤ 70 (取大值)', t: 4, u: '-', b: '-', w: 2 },
      { gender: '<span class="gw">男</span>', cond: '105m² < 面积 ≤ 150m² 或 71 ≤ 座位数 ≤ 100 (取大值)', t: 3, u: 3, b: '-', w: 3 },
      { gender: '<span class="gp">女</span>', cond: '105m² < 面积 ≤ 150m² 或 71 ≤ 座位数 ≤ 100 (取大值)', t: 6, u: '-', b: '-', w: 3 },
      { gender: '<span class="gy">各自</span>', cond: '超出部分 (每 +150m² 或 每 +100座)', t: '+1', u: '+1 (男)', b: '-', w: '+1' }
    ]
  },
  { 
    cat: '(11) 商业建筑', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 200m² (适用于面积 ≤ 2000m²部分)', t: 1, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 200m² (适用于面积 ≤ 2000m²部分)', t: 3, u: '-', b: '-', w: 1 },
      { gender: '<span class="gw">男</span>', cond: '> 2000m² (超出部分 每 +600m²)', t: '+1', u: '+2', b: '-', w: '+1' },
      { gender: '<span class="gp">女</span>', cond: '> 2000m² (超出部分 每 +600m²)', t: '+2', u: '-', b: '-', w: '+1' }
    ]
  },
  { 
    cat: '(12) 仓储', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 5000m²', t: 1, u: 1, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 5000m²', t: 2, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(13) 医疗机构', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '门诊及公众区 (每 200m²)', t: 2, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '门诊及公众区 (每 200m²)', t: 4, u: '-', b: '-', w: 1 },
      { gender: '<span class="gy">通用</span>', cond: '住院部 (每 5张病床)', t: 1, u: 1, b: 1, w: 1 },
      { gender: '<span class="gy">特殊</span>', cond: '手术室/ICU等专区', t: '按医疗法规定适宜配置', u: '-', b: '-', w: '-' }
    ]
  },
  { 
    cat: '(14) 娱乐场所', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 200m²', t: 1, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 200m²', t: 3, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(15) 交通车站', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 200m²', t: 2, u: 4, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 200m²', t: 6, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(16) 公共停车楼', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 1000m²', t: 2, u: 4, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 1000m²', t: 6, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(17) 室内体育场', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '每 200m² 或 每 100人 (取大值)', t: 1, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '每 200m² 或 每 100人 (取大值)', t: 3, u: '-', b: '-', w: 1 }
    ]
  },
  { 
    cat: '(18) 市场', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '面积 ≤ 100m² 或 摊位数 ≤ 50摊 (取大值)', t: 1, u: 1, b: '-', w: '1 (共用)' },
      { gender: '<span class="gp">女</span>', cond: '面积 ≤ 100m² 或 摊位数 ≤ 50摊 (取大值)', t: 2, u: '-', b: '-', w: '-' },
      { gender: '<span class="gw">男</span>', cond: '100m² < 面积 ≤ 200m² 或 50 < 摊位数 ≤ 100 (取大值)', t: 2, u: 2, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '100m² < 面积 ≤ 200m² 或 50 < 摊位数 ≤ 100 (取大值)', t: 4, u: '-', b: '-', w: 1 },
      { gender: '<span class="gw">男</span>', cond: '200m² < 面积 ≤ 400m² 或 100 < 摊位数 ≤ 200 (取大值)', t: 3, u: 3, b: '-', w: 1 },
      { gender: '<span class="gp">女</span>', cond: '200m² < 面积 ≤ 400m² 或 100 < 摊位数 ≤ 200 (取大值)', t: 6, u: '-', b: '-', w: 1 },
      { gender: '<span class="gw">男</span>', cond: '400m² < 面积 ≤ 600m² 或 200 < 摊位数 ≤ 300 (取大值)', t: 4, u: 4, b: '-', w: 2 },
      { gender: '<span class="gp">女</span>', cond: '400m² < 面积 ≤ 600m² 或 200 < 摊位数 ≤ 300 (取大值)', t: 8, u: '-', b: '-', w: 2 },
      { gender: '<span class="gw">男</span>', cond: '600m² < 面积 ≤ 1000m² 或 300 < 摊位数 ≤ 500 (取大值)', t: 5, u: 5, b: '-', w: 2 },
      { gender: '<span class="gp">女</span>', cond: '600m² < 面积 ≤ 1000m² 或 300 < 摊位数 ≤ 500 (取大值)', t: 10, u: '-', b: '-', w: 2 },
      { gender: '<span class="gw">男</span>', cond: '1000m² < 面积 ≤ 2000m² 或 500 < 摊位数 ≤ 1000 (取大值)', t: 7, u: 7, b: '-', w: 3 },
      { gender: '<span class="gp">女</span>', cond: '1000m² < 面积 ≤ 2000m² 或 500 < 摊位数 ≤ 1000 (取大值)', t: 14, u: '-', b: '-', w: 3 },
      { gender: '<span class="gy">各自</span>', cond: '> 2000m² (每 +400m² 或 每 +200摊)', t: '+1(男)<br>+2(女)', u: '+1(男)', b: '-', w: '-' },
      { gender: '<span class="gy">通用</span>', cond: '> 2000m² (每 +1000m² 或 每 +500摊)', t: '-', u: '-', b: '-', w: '+1' }
    ]
  },
  { 
    cat: '(19) 加油/加气站', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '机位数 ≤ 4台', t: 1, u: 1, b: 1, w: 1 },
      { gender: '<span class="gp">女</span>', cond: '机位数 ≤ 4台', t: 2, u: '-', b: 1, w: 1 },
      { gender: '<span class="gw">男</span>', cond: '5 ≤ 机位数 ≤ 8台', t: 2, u: 2, b: 1, w: 2 },
      { gender: '<span class="gp">女</span>', cond: '5 ≤ 机位数 ≤ 8台', t: 4, u: '-', b: 1, w: 2 },
      { gender: '<span class="gw">男</span>', cond: '机位数 ≥ 9台', t: 3, u: 3, b: 1, w: 3 },
      { gender: '<span class="gp">女</span>', cond: '机位数 ≥ 9台', t: 6, u: '-', b: 1, w: 3 }
    ]
  },
  { 
    cat: '(20) 临时建筑 (工棚等)', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '≤ 15人', t: 1, u: '-', b: 1, w: 1 },
      { gender: '<span class="gp">女</span>', cond: '≤ 15人', t: 1, u: '-', b: 1, w: 1 },
      { gender: '<span class="gw">男</span>', cond: '16 ~ 40人', t: 2, u: '-', b: 2, w: 1 },
      { gender: '<span class="gp">女</span>', cond: '16 ~ 40人', t: 2, u: '-', b: 2, w: 1 },
      { gender: '<span class="gw">男</span>', cond: '41 ~ 80人', t: 3, u: '-', b: 3, w: 1 },
      { gender: '<span class="gp">女</span>', cond: '41 ~ 80人', t: 3, u: '-', b: 3, w: 1 },
      { gender: '<span class="gy">各自</span>', cond: '> 80人 (每 +50人)', t: '+1', u: '-', b: '+1', w: '+1' }
    ]
  },
  { 
    cat: '(21) 其他内勤建筑', 
    rows: [
      { gender: '<span class="gw">男</span>', cond: '≤ 15人', t: 2, u: 1, b: 1, w: 1 },
      { gender: '<span class="gp">女</span>', cond: '≤ 15人', t: 3, u: '-', b: 1, w: 1 },
      { gender: '<span class="gw">男</span>', cond: '16 ~ 40人', t: 2, u: 2, b: 2, w: 2 },
      { gender: '<span class="gp">女</span>', cond: '16 ~ 40人', t: 4, u: '-', b: 2, w: 2 },
      { gender: '<span class="gw">男</span>', cond: '41 ~ 80人', t: 3, u: 3, b: 3, w: 3 },
      { gender: '<span class="gp">女</span>', cond: '41 ~ 80人', t: 6, u: '-', b: 3, w: 3 },
      { gender: '<span class="gy">各自</span>', cond: '> 80人 (每 +50人)', t: '+1', u: '+1 (男)', b: '+1', w: '+1' }
    ]
  }
];
