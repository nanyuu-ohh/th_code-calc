/* =========================================================
 * factory-egress-backend-v1.js
 * 泰国厂房疏散快速计算 - 纯规则层 / 后端逻辑
 *
 * 只暴露：
 *   - FACTORY_EGRESS_RULES
 *   - evaluateFactoryEgress(input)
 *
 * 不依赖 DOM，不负责渲染，不改原 calc.js 主逻辑。
 * 前端只需要调用 evaluateFactoryEgress(input)，再按返回 report 渲染。
 * ========================================================= */

(function (global) {
  'use strict';

  const FACTORY_EGRESS_RULES = {
    meta: {
      version: '1.0.0',
      updated: '2026-06-02',
      scope: 'factory-egress-quick-check',
      note: '用于方案阶段快速判断；最终仍需按泰文原文、当地顾问意见及审图要求复核。'
    },

    refs: {
      factoryMR2: 'Factory Act MR2 Clause 5(3)',
      factoryMR2General: 'Factory Act MR2 Clause 5',
      mr55Travel: 'MR55 ข้อ 25',
      mr55Corridor: 'MR55 ข้อ 21',
      mr55Stair: 'MR55 ข้อ 24',
      mr33Stair: 'MR33 ข้อ 22/27',
      mr33Basement: 'MR33 ข้อ 8',
      mr33Roof: 'MR33 ข้อ 25/29',
      bmaDeadEnd: 'BMA 2544 ข้อ 44',
      labourFire: 'Labour OSH Fire Standard B.E.2555',
      ieat: 'IEAT 103/2556'
    },

    factory: {
      minExitCount: 2,
      minDoorWidthCm: 110,
      minDoorHeightCm: 200,
      doorThresholdPeople: 50,
      doorIncrementCmPerPerson: 2,

      // 默认按“超过 50 人的部分，每人 +2cm”解释。
      // 如当地顾问要求更保守口径，可在 input 里传 doorWidthMode: 'allPersons'
      doorWidthMode: 'excessOnly',

      // 方案阶段推荐模数。超过 180cm 时，优先建议增加出口，而不是硬做超宽门。
      doorWidthModulesCm: [120, 150, 180, 210, 240],
      preferredMaxDoorWidthCm: 180,
      dangerDoorWidthCm: 240
    },

    planning: {
      maxTravelDistanceM: 40,
      minCorridorWidthM: 1.50,
      bkkDeadEndDistanceM: 10,
      highRiseEscapeStairSpacingM: 60
    },

    stair: {
      // 这里区分“法规底线”和“方案推荐”：
      // 高层/超大型逃生楼梯底线可按 MR33 90cm 提示，
      // 但厂房方案阶段常规楼梯不建议按 90cm 控制。
      highRiseLegalWidthM: 0.90,
      ordinarySmallAreaLegalWidthM: 1.20,
      ordinaryLargeAreaSingleStairLegalWidthM: 1.50,
      ordinaryLargeAreaMultiStairLegalWidthM: 1.20,
      smallAreaThresholdM2: 300,

      recommendedSmallM: 1.20,
      recommendedFactoryM: 1.50,

      ordinaryRiserMaxCm: 18,
      ordinaryTreadMinCm: 25,
      highRiseRiserMaxCm: 20,
      highRiseTreadMinCm: 22
    },

    highRise: {
      heightM: 23,
      extraLargeAreaM2: 10000,
      deepBasementFloors: 3,
      deepBasementDepthM: 7
    },

    fireOperation: {
      // 劳动部防火标准常见触发提示：2层及以上或作业面积较大时需复核报警/疏散指示/照明。
      alarmAreaTriggerM2: 300,
      alarmFloorTrigger: 2
    }
  };

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function toInteger(value, fallback = 0) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function roundUpToTen(n) {
    return Math.ceil(n / 10) * 10;
  }

  function pickRecommendedDoorWidth(legalWidthCm, modules) {
    for (const m of modules) {
      if (legalWidthCm <= m) return m;
    }
    return roundUpToTen(legalWidthCm);
  }

  function calcLegalDoorWidthCm(peoplePerExit, options = {}) {
    const r = FACTORY_EGRESS_RULES.factory;
    const mode = options.doorWidthMode || r.doorWidthMode;

    if (peoplePerExit <= 0) return 0;

    if (mode === 'allPersons' && peoplePerExit > r.doorThresholdPeople) {
      return Math.max(r.minDoorWidthCm, peoplePerExit * r.doorIncrementCmPerPerson);
    }

    return r.minDoorWidthCm +
      Math.max(0, peoplePerExit - r.doorThresholdPeople) * r.doorIncrementCmPerPerson;
  }

  function getDoorWidthLevel(recommendedDoorWidthCm) {
    const r = FACTORY_EGRESS_RULES.factory;

    if (recommendedDoorWidthCm <= r.preferredMaxDoorWidthCm) return 'ok';
    if (recommendedDoorWidthCm <= r.dangerDoorWidthCm) return 'warning';
    return 'danger';
  }

  function calcRecommendedExitCount(people, options = {}) {
    const r = FACTORY_EGRESS_RULES.factory;
    const minExitCount = r.minExitCount;

    if (people <= 0) return minExitCount;

    let count = Math.max(minExitCount, 1);
    let legal = 0;
    let recommended = 0;

    // 设一个上限，避免异常输入导致死循环。
    for (; count <= 30; count += 1) {
      const peoplePerExit = Math.ceil(people / count);
      legal = calcLegalDoorWidthCm(peoplePerExit, options);
      recommended = pickRecommendedDoorWidth(legal, r.doorWidthModulesCm);

      if (recommended <= r.preferredMaxDoorWidthCm) return count;
    }

    return count - 1;
  }

  function getStairWidths(input, flags) {
    const r = FACTORY_EGRESS_RULES.stair;
    const areaM2 = input.areaM2;
    const exitCount = input.exitCount;

    let legalWidthM;

    if (flags.isHighRise || flags.isExtraLarge) {
      legalWidthM = r.highRiseLegalWidthM;
    } else if (areaM2 <= r.smallAreaThresholdM2) {
      legalWidthM = r.ordinarySmallAreaLegalWidthM;
    } else if (exitCount >= 2) {
      legalWidthM = r.ordinaryLargeAreaMultiStairLegalWidthM;
    } else {
      legalWidthM = r.ordinaryLargeAreaSingleStairLegalWidthM;
    }

    const recommendedWidthM =
      (areaM2 > r.smallAreaThresholdM2 || input.people > 50)
        ? r.recommendedFactoryM
        : r.recommendedSmallM;

    return {
      legalWidthM,
      recommendedWidthM
    };
  }

  function makePlanChecks(input, result, flags) {
    const rules = FACTORY_EGRESS_RULES;
    const checks = [];

    checks.push({
      label: '最远点至合规楼梯距离',
      limit: `≤ ${rules.planning.maxTravelDistanceM} m`,
      status: 'manual',
      ref: rules.refs.mr55Travel,
      note: '方案阶段按实际行走路径复核；泰文条文表述为楼层最远点至楼梯距离，具体量至楼梯间门、平台入口或首级踏步，建议由当地顾问确认。'
    });

    checks.push({
      label: '主要疏散走道净宽',
      limit: `≥ ${rules.planning.minCorridorWidthM.toFixed(2)} m`,
      status: 'manual',
      ref: rules.refs.mr55Corridor,
      note: '厂房、办公、公共、商业等建筑的室内通道按 MR55 底线控制；设备、货架、临时堆放不得侵占有效净宽。'
    });

    if (input.isBkk) {
      checks.push({
        label: '曼谷尽端/袋形走道',
        limit: `≤ ${rules.planning.bkkDeadEndDistanceM} m`,
        status: 'manual',
        ref: rules.refs.bmaDeadEnd,
        note: 'BMA 项目需额外复核走道尽端最末房间门至疏散楼梯门的距离。'
      });
    }

    if (flags.isHighRise || flags.isExtraLarge) {
      checks.push({
        label: '相邻逃生楼梯沿走道距离',
        limit: `≤ ${rules.planning.highRiseEscapeStairSpacingM} m`,
        status: 'manual',
        ref: rules.refs.mr33Stair,
        note: '高层或超大型建筑触发 MR33，应按实际走道路径复核相邻逃生楼梯间距，并校核全楼疏散。'
      });
    }

    if (flags.isDeepBasement) {
      checks.push({
        label: '深层地下空间逃生楼梯',
        limit: '需直达地面，路径楼梯间距按 MR33 复核',
        status: 'manual',
        ref: rules.refs.mr33Basement,
        note: '自第3层向下或自道路下7m起，属于深层地下风险项；应专项复核直达地面的逃生楼梯。'
      });
    }

    if (input.isIEAT) {
      checks.push({
        label: 'IEAT 园区叠加说明',
        limit: '室内疏散仍按建筑控制法/工厂法复核',
        status: 'manual',
        ref: rules.refs.ieat,
        note: 'IEAT 主要控制总图、道路、出入口、退让、停车、绿化等；不替代 MR55/MR33/Factory Act 的室内疏散要求。'
      });
    }

    return checks;
  }

  function makeConstructionChecks(input, result, flags) {
    const rules = FACTORY_EGRESS_RULES;
    const stairRules = rules.stair;
    const checks = [];

    checks.push({
      label: '疏散门开启与形式',
      limit: '疏散方向开启 / 不得锁闭 / 不采用推拉、卷帘、旋转门',
      status: 'manual',
      ref: `${rules.refs.factoryMR2} / ${rules.refs.labourFire}`,
      note: '门洞位置和开启方向会影响平面布置，应在方案阶段同步考虑；门净宽按本次计算值，净高底线≥200cm。'
    });

    checks.push({
      label: '疏散门门槛与自闭',
      limit: '无门槛 / 可自闭 / 工作期间可直接开启',
      status: 'manual',
      ref: rules.refs.labourFire,
      note: '此项偏建筑构造与运营管理交叉，方案阶段先作为风险提醒，施工图阶段落到门表和节点。'
    });

    if (flags.isHighRise || flags.isExtraLarge) {
      checks.push({
        label: '高层/超大型逃生楼梯踏步',
        limit: `踢面≤${stairRules.highRiseRiserMaxCm}cm，踏面≥${stairRules.highRiseTreadMinCm}cm`,
        status: 'manual',
        ref: rules.refs.mr33Stair,
        note: '高层/超大型触发 MR33，逃生楼梯、前室、防火门、屋面避难等需整体复核。'
      });

      checks.push({
        label: '屋顶疏散与救援条件',
        limit: '屋面避难/救援空地需专项复核',
        status: 'manual',
        ref: rules.refs.mr33Roof,
        note: '高度≥23m 时，应关注平屋顶、10×10m 净空、楼梯通达屋面等 MR33 附加要求。'
      });
    } else {
      checks.push({
        label: '普通厂房楼梯踏步',
        limit: `踢面≤${stairRules.ordinaryRiserMaxCm}cm，踏面≥${stairRules.ordinaryTreadMinCm}cm`,
        status: 'manual',
        ref: rules.refs.mr55Stair,
        note: '此处用于方案阶段提示；最终楼梯宽度、平台宽度、栏杆、扶手等按施工图和当地顾问意见复核。'
      });
    }

    checks.push({
      label: '防跌落栏杆',
      limit: '高差≥1.50m 的楼梯和操作通道需设防护栏杆',
      status: 'manual',
      ref: rules.refs.factoryMR2General,
      note: '厂房内检修平台、设备平台、楼梯、夹层边缘应同步复核。'
    });

    return checks;
  }

  function makeOtherDisciplineNotes(input, flags) {
    const rules = FACTORY_EGRESS_RULES;
    const notes = [];

    notes.push({
      discipline: '电气 / 消防联动',
      text: '应急照明、疏散指示标识、备用电源属于配套要求，通常不改变楼梯数量，但会影响施工图专业提资。',
      ref: rules.refs.labourFire
    });

    const triggerAlarm =
      input.floors >= rules.fireOperation.alarmFloorTrigger ||
      input.areaM2 >= rules.fireOperation.alarmAreaTriggerM2;

    notes.push({
      discipline: '火灾报警',
      text: triggerAlarm
        ? '已触发重点复核：2层及以上或作业面积较大时，应复核每层火灾报警、手动报警点、声光报警等设置。'
        : '当前仅作一般提醒；若后续面积、层数或工艺危险性提高，应重新复核火灾报警要求。',
      ref: rules.refs.labourFire
    });

    if (flags.isHighRise || flags.isExtraLarge) {
      notes.push({
        discipline: '消防给水 / 防排烟 / 救援',
        text: '高层或超大型建筑会触发 MR33 的消防给水、防排烟、消防/救护车位、楼梯加压或自然通风等跨专业要求。',
        ref: rules.refs.mr33Stair
      });
    }

    notes.push({
      discipline: '无障碍',
      text: '无障碍卫生间、无障碍车位、无障碍通道宜作为建筑专业单独模块复核，不参与本弹窗的出口数量和门宽计算。',
      ref: 'Accessibility Ministerial Regulation'
    });

    return notes;
  }

  function evaluateFactoryEgress(rawInput = {}) {
    const rules = FACTORY_EGRESS_RULES;

    const input = {
      areaM2: Math.max(0, toNumber(rawInput.areaM2, 0)),
      people: Math.max(0, toInteger(rawInput.people, 0)),
      exitCount: Math.max(0, toInteger(rawInput.exitCount, 0)),
      totalAreaM2: Math.max(0, toNumber(rawInput.totalAreaM2, 0)),
      floors: Math.max(1, toInteger(rawInput.floors, 1)),
      heightM: Math.max(0, toNumber(rawInput.heightM, 0)),
      basementFloors: Math.max(0, toInteger(rawInput.basementFloors, 0)),
      basementDepthM: Math.max(0, toNumber(rawInput.basementDepthM, 0)),
      isBkk: Boolean(rawInput.isBkk),
      isIEAT: Boolean(rawInput.isIEAT),
      doorWidthMode: rawInput.doorWidthMode || rules.factory.doorWidthMode
    };

    const errors = [];

    if (input.people <= 0) {
      errors.push('请填写“本层最大同时使用人数”。本弹窗按最不利楼层进行疏散估算，不建议直接套用全楼人数。');
    }

    if (input.exitCount <= 0) {
      errors.push('请填写疏散出口数量，且不得少于 2 个。');
    }

    if (input.exitCount > 0 && input.exitCount < rules.factory.minExitCount) {
      errors.push(`工厂疏散出口数量不得少于 ${rules.factory.minExitCount} 个。`);
    }

    const flags = {
      isHighRise: input.heightM >= rules.highRise.heightM,
      isExtraLarge: input.totalAreaM2 >= rules.highRise.extraLargeAreaM2,
      isDeepBasement:
        input.basementFloors >= rules.highRise.deepBasementFloors ||
        input.basementDepthM >= rules.highRise.deepBasementDepthM
    };

    const safeExitCount = Math.max(input.exitCount, 1);
    const peoplePerExit = input.people > 0 ? Math.ceil(input.people / safeExitCount) : 0;
    const legalDoorWidthCm = calcLegalDoorWidthCm(peoplePerExit, {
      doorWidthMode: input.doorWidthMode
    });
    const recommendedDoorWidthCm = pickRecommendedDoorWidth(
      legalDoorWidthCm,
      rules.factory.doorWidthModulesCm
    );
    const doorWidthLevel = getDoorWidthLevel(recommendedDoorWidthCm);
    const finalRecommendedExitCount = calcRecommendedExitCount(input.people, {
      doorWidthMode: input.doorWidthMode
    });
    const shouldIncreaseExits =
      input.exitCount < finalRecommendedExitCount ||
      recommendedDoorWidthCm > rules.factory.preferredMaxDoorWidthCm;

    const stairWidths = getStairWidths(input, flags);

    const warnings = [];

    if (!errors.length && input.exitCount < rules.factory.minExitCount) {
      warnings.push(`当前疏散出口数量少于 ${rules.factory.minExitCount} 个，不满足工厂法底线。`);
    }

    if (!errors.length && recommendedDoorWidthCm > rules.factory.preferredMaxDoorWidthCm) {
      warnings.push(
        `按当前 ${input.exitCount} 个出口估算，每个出口约承担 ${peoplePerExit} 人，推荐门宽达到 ${recommendedDoorWidthCm}cm；建议优先增加出口数量，而不是硬做超宽门。`
      );
    }

    if (!errors.length && recommendedDoorWidthCm > rules.factory.dangerDoorWidthCm) {
      warnings.push(
        `单个疏散门推荐宽度已超过 ${rules.factory.dangerDoorWidthCm}cm，属于强风险布置；应调整平面或增加出口。`
      );
    }

    if (flags.isHighRise || flags.isExtraLarge) {
      warnings.push('本项目触发高层或超大型建筑判断，厂房疏散还需叠加 MR33 的逃生楼梯、楼梯间距、屋面避难/救援、消防系统等要求。');
    }

    if (input.isBkk) {
      warnings.push('当前为曼谷项目，需额外复核 BMA 对尽端/袋形走道及逃生楼梯布置的限制。');
    }

    if (input.isIEAT) {
      warnings.push('当前为 IEAT 园区项目：IEAT 不替代室内疏散要求，仍需按 Building Control / Factory Act / BMA / MR33 叠加复核。');
    }

    if (flags.isDeepBasement) {
      warnings.push('地下层数或地下深度达到深层地下风险项，需专项复核直达地面的逃生楼梯。');
    }

    const checks = {
      exitCount: {
        label: '疏散出口数量',
        value: input.exitCount,
        limit: `≥ ${rules.factory.minExitCount} 个`,
        status: input.exitCount >= rules.factory.minExitCount ? 'pass' : 'fail',
        ref: rules.refs.factoryMR2,
        note: '工厂建筑紧急出口数量底线；多层厂房还应复核各层之间至少两条竖向疏散路径。'
      },
      plan: [],
      construction: []
    };

    const result = {
      title: errors.length
        ? '厂房疏散快速计算未完成'
        : '厂房疏散快速计算结果',

      people: input.people,
      exitCount: input.exitCount,
      peoplePerExit,

      legalDoorWidthCm,
      recommendedDoorWidthCm,
      doorMinHeightCm: rules.factory.minDoorHeightCm,
      doorWidthLevel,

      finalRecommendedExitCount,
      shouldIncreaseExits,

      stairLegalWidthM: stairWidths.legalWidthM,
      stairRecommendedWidthM: stairWidths.recommendedWidthM,
      corridorMinWidthM: rules.planning.minCorridorWidthM,

      travelDistanceLimitM: rules.planning.maxTravelDistanceM,
      bkkDeadEndDistanceLimitM: input.isBkk ? rules.planning.bkkDeadEndDistanceM : null,
      highRiseStairSpacingLimitM: (flags.isHighRise || flags.isExtraLarge)
        ? rules.planning.highRiseEscapeStairSpacingM
        : null
    };

    checks.plan = makePlanChecks(input, result, flags);
    checks.construction = makeConstructionChecks(input, result, flags);

    const report = {
      ok: errors.length === 0,
      errors,
      warnings,
      context: {
        areaM2: input.areaM2,
        people: input.people,
        exitCount: input.exitCount,
        totalAreaM2: input.totalAreaM2,
        floors: input.floors,
        heightM: input.heightM,
        basementFloors: input.basementFloors,
        basementDepthM: input.basementDepthM,
        isBkk: input.isBkk,
        isIEAT: input.isIEAT,
        isHighRise: flags.isHighRise,
        isExtraLarge: flags.isExtraLarge,
        isDeepBasement: flags.isDeepBasement,
        doorWidthMode: input.doorWidthMode
      },
      result,
      checks,
      otherDisciplineNotes: makeOtherDisciplineNotes(input, flags),
      refs: rules.refs
    };

    return report;
  }

  global.FACTORY_EGRESS_RULES = FACTORY_EGRESS_RULES;
  global.evaluateFactoryEgress = evaluateFactoryEgress;

})(typeof window !== 'undefined' ? window : globalThis);
