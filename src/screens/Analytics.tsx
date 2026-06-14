import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline, Path } from 'react-native-svg';
import { useTheme, inr, hexA } from '../theme';
import { Press } from '../components/Press';
import { useStore, catById, Period } from '../store';
import { startOf, dayKey, weekdayNarrow, pctW } from '../utils';

const DONUT_R = 70;
const DONUT_C = 2 * Math.PI * DONUT_R;

export function Analytics() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, analyticsPeriod, setAnalyticsPeriod, donutCat, setDonutCat } = useStore();

  const v = useMemo(() => {
    const period = analyticsPeriod;
    const pStart = period === 'week' ? startOf('week') : period === 'month' ? startOf('month') : 0;
    const periodExp = expenses.filter((e) => new Date(e.date).getTime() >= pStart);
    const periodTotal = periodExp.reduce((s, e) => s + e.amount, 0) || 1;

    const byCat: Record<string, number> = {};
    periodExp.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
    let catArr = Object.keys(byCat).map((id) => ({ id, amount: byCat[id] })).sort((a, b) => b.amount - a.amount);
    let segArr: { id: string; amount: number }[];
    if (catArr.length > 5) {
      const top = catArr.slice(0, 5);
      const rest = catArr.slice(5).reduce((s, c) => s + c.amount, 0);
      segArr = [...top, { id: '__other', amount: rest }];
    } else segArr = catArr;

    const segColor = (id: string) => (id === '__other' ? '#9AA7B2' : catById(id).color);
    const segName = (id: string) => (id === '__other' ? 'Other categories' : catById(id).name);

    let acc = 0;
    const donutSegs = segArr.map((s) => {
      const frac = s.amount / periodTotal;
      const dash = frac * DONUT_C;
      const seg = { id: s.id, color: segColor(s.id), width: donutCat === s.id ? 27 : 22, dash, offset: -acc };
      acc += dash;
      return seg;
    });
    const donutLegend = segArr.map((s) => ({
      id: s.id, color: segColor(s.id), name: segName(s.id), pct: Math.round((s.amount / periodTotal) * 100),
      opacity: donutCat && donutCat !== s.id ? 0.4 : 1,
    }));
    let centerLabel = 'Total';
    let centerNum = periodTotal;
    if (donutCat) { const sel = segArr.find((s) => s.id === donutCat); if (sel) { centerLabel = segName(donutCat); centerNum = sel.amount; } }

    const periodLabel = period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'All time';
    const txns = periodExp.length;
    const highest = periodExp.reduce((m, e) => Math.max(m, e.amount), 0);
    const lastTime = periodExp.length ? new Date(periodExp[periodExp.length - 1].date).getTime() : Date.now();
    const days = Math.max(1, Math.round((Date.now() - (pStart || lastTime)) / 86400000) || 1);
    const statTiles = [
      { label: 'Total spent', value: '₹' + inr(periodTotal) },
      { label: 'Transactions', value: String(txns) },
      { label: 'Highest expense', value: '₹' + inr(highest) },
      { label: 'Avg / day', value: '₹' + inr(periodTotal / days) },
    ];

    // 7-day bars + trend
    const dayTotals: { label: string; value: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const k = d.getTime();
      const tot = expenses.filter((e) => dayKey(e.date) === k).reduce((s, e) => s + e.amount, 0);
      dayTotals.push({ label: weekdayNarrow(d), value: tot, isToday: i === 0 });
    }
    const maxDay = Math.max(1, ...dayTotals.map((d) => d.value));
    const barData = dayTotals.map((d) => ({
      label: d.label, isToday: d.isToday,
      h: (d.value / maxDay) * 100,
      valLabel: d.value ? '₹' + (d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : String(Math.round(d.value))) : '',
    }));

    const W = 300, H = 100, n = dayTotals.length;
    const pts = dayTotals.map((d, i) => ({ x: i * (W / (n - 1)), y: H - (d.value / maxDay) * (H - 12) - 6 }));
    const trendPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const trendArea = 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') + ` L ${W} ${H} L 0 ${H} Z`;

    return { donutSegs, donutLegend, centerLabel, centerNum, periodLabel, statTiles, barData, trendPoints, trendArea, pts };
  }, [expenses, analyticsPeriod, donutCat]);

  const periods: [Period, string][] = [['week', 'Week'], ['month', 'Month'], ['6m', 'All']];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8 }}>
        <AppText style={{ fontSize: 28, fontWeight: '800', color: t.text }}>Analytics</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 130 }}>
        {/* Period segmented */}
        <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 13, backgroundColor: t.card2, marginBottom: 18 }}>
          {periods.map(([k, label]) => {
            const active = analyticsPeriod === k;
            return (
              <Press key={k} onPress={() => setAnalyticsPeriod(k)} style={{ flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accent : 'transparent' }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.onAccent : t.sub }}>{label}</AppText>
              </Press>
            );
          })}
        </View>

        {/* Donut */}
        <View style={{ borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 20 }}>
          <AppText style={{ fontSize: 14, fontWeight: '800', color: t.text, marginBottom: 4 }}>Where it went</AppText>
          <AppText style={{ fontSize: 12, color: t.faint, marginBottom: 12 }}>{v.periodLabel}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <View style={{ width: 150, height: 150 }}>
              <Svg width={150} height={150} viewBox="0 0 180 180" style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={90} cy={90} r={DONUT_R} fill="none" stroke={t.card2} strokeWidth={22} />
                {v.donutSegs.map((s) => (
                  <Circle
                    key={s.id} cx={90} cy={90} r={DONUT_R} fill="none" stroke={s.color}
                    strokeWidth={s.width} strokeDasharray={[s.dash, DONUT_C - s.dash]} strokeDashoffset={s.offset}
                    onPress={() => setDonutCat(donutCat === s.id ? null : s.id)}
                  />
                ))}
              </Svg>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                <AppText style={{ fontSize: 10, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{v.centerLabel}</AppText>
                <AppText style={{ fontSize: 22, fontWeight: '800', color: t.text }}>₹{inr(v.centerNum)}</AppText>
              </View>
            </View>
            <View style={{ flex: 1, gap: 9 }}>
              {v.donutLegend.map((l) => (
                <Pressable key={l.id} onPress={() => setDonutCat(donutCat === l.id ? null : l.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: l.opacity }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: l.color }} />
                  <AppText numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: t.text, flex: 1 }}>{l.name}</AppText>
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: t.sub }}>{l.pct}%</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, marginHorizontal: -6 }}>
          {v.statTiles.map((tile) => (
            <View key={tile.label} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
              <View style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 14, paddingHorizontal: 15 }}>
                <AppText style={{ fontSize: 11.5, fontWeight: '600', color: t.faint }}>{tile.label}</AppText>
                <AppText style={{ fontSize: 20, fontWeight: '800', color: t.text, marginTop: 5 }}>{tile.value}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Bars */}
        <View style={{ borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 20, marginTop: 2 }}>
          <AppText style={{ fontSize: 14, fontWeight: '800', color: t.text }}>Daily spending</AppText>
          <AppText style={{ fontSize: 12, color: t.faint, marginBottom: 18 }}>Last 7 days</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 130 }}>
            {v.barData.map((b, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <AppText style={{ fontSize: 9.5, fontWeight: '700', color: t.faint, marginBottom: 8 }}>{b.valLabel}</AppText>
                <View style={{ width: '100%', borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: b.isToday ? t.accent : hexA(t.accent, t.dark ? 0.45 : 0.32), height: pctW(b.h), minHeight: 5 }} />
                <AppText style={{ fontSize: 10, fontWeight: '700', color: b.isToday ? t.accent : t.faint, marginTop: 8 }}>{b.label}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Trend */}
        <View style={{ borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 20, marginTop: 14 }}>
          <AppText style={{ fontSize: 14, fontWeight: '800', color: t.text }}>Spending trend</AppText>
          <AppText style={{ fontSize: 12, color: t.faint, marginBottom: 14 }}>7-day rolling</AppText>
          <Svg width="100%" height={100} viewBox="0 0 300 100" preserveAspectRatio="none">
            <Path d={v.trendArea} fill={t.accentSoft} />
            <Polyline points={v.trendPoints} fill="none" stroke={t.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {v.pts.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={t.card} stroke={t.accent} strokeWidth={2.5} />
            ))}
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}
