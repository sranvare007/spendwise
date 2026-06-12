import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, inr, tint } from '../theme';
import { Icon, IconName } from '../icons';
import { Press } from '../components/Press';
import { useStore, catById } from '../store';
import { monthKey, startOf } from '../utils';

const RING_R = 50;
const RING_C = 2 * Math.PI * RING_R;

export function Insights() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, savedInsights, toggleInsight } = useStore();

  const v = useMemo(() => {
    const tm = monthKey(new Date().toISOString());
    const monthExp = expenses.filter((e) => monthKey(e.date) === tm);
    const wants = monthExp.filter((e) => e.wn === 'WANT').reduce((s, e) => s + e.amount, 0);

    const byCat: Record<string, number> = {};
    monthExp.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
    const catArr = Object.keys(byCat).map((id) => ({ id, amount: byCat[id] })).sort((a, b) => b.amount - a.amount);
    const total = monthExp.reduce((s, e) => s + e.amount, 0) || 1;
    const topCat = catArr[0] ? catById(catArr[0].id).name : 'Food & Dining';
    const topAmt = catArr[0] ? inr(catArr[0].amount) : '0';
    const topPct = catArr[0] ? Math.round((catArr[0].amount / total) * 100) : 0;

    const weekStart = startOf('week');
    const weekWants = expenses.filter((e) => e.wn === 'WANT' && new Date(e.date).getTime() >= weekStart).sort((a, b) => b.amount - a.amount);
    const bigWant = weekWants[0];

    const cards: { id: string; icon: IconName; color: string; title: string; body: string }[] = [
      { id: 'i1', icon: 'up', color: '#FF7A5C', title: 'Top category: ' + topCat, body: `${topCat} is your biggest spend — ₹${topAmt} (${topPct}% of the period).` },
      { id: 'i2', icon: 'receipt', color: '#C77DFF', title: 'Biggest want this week', body: bigWant ? `${bigWant.desc} at ₹${inr(bigWant.amount)}. Worth it?` : 'No big want purchases yet this week — nice restraint.' },
      { id: 'i3', icon: 'bulb', color: '#FFB23E', title: 'Smart tip', body: 'Cooking at home twice a week instead of ordering in could save you about ₹2,400 this month.' },
      { id: 'i4', icon: 'trophy', color: '#07CB73', title: '7-day logging streak', body: 'You’ve logged expenses 7 days in a row. Keep it up to unlock your monthly badge!' },
    ];

    return { wants, savingsAmt: inr(wants * 0.2), cards };
  }, [expenses]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: t.text }}>Insights</Text>
        <Text style={{ fontSize: 13, color: t.faint, marginTop: 2 }}>Refreshed today · based on your last 30 days</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 }}>
        {/* Savings ring hero */}
        <View style={{ borderRadius: 22, backgroundColor: t.hero, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 20, overflow: 'hidden', shadowColor: '#081420', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}>
          <View style={{ width: 104, height: 104 }}>
            <Svg width={104} height={104} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={60} cy={60} r={RING_R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={12} />
              <Circle cx={60} cy={60} r={RING_R} fill="none" stroke={t.heroNum} strokeWidth={12} strokeLinecap="round" strokeDasharray={[0.2 * RING_C, RING_C]} />
            </Svg>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
              <Text style={{ fontSize: 24, fontWeight: '800', color: t.heroNum }}>20%</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: t.heroText }}>SAVINGS POTENTIAL</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.heroNum, marginTop: 6, lineHeight: 21 }}>Trim wants by 20% to save ₹{v.savingsAmt}/mo</Text>
            <Text style={{ fontSize: 12.5, color: t.heroText, marginTop: 6 }}>You spent ₹{inr(v.wants)} on wants this month.</Text>
          </View>
        </View>

        {/* Insight cards */}
        {v.cards.map((c) => {
          const saved = !!savedInsights[c.id];
          return (
            <View key={c.id} style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 16, paddingHorizontal: 17, marginTop: 14, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={21} color={c.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>{c.title}</Text>
                <Text style={{ fontSize: 13, color: t.sub, lineHeight: 19.5, marginTop: 4 }}>{c.body}</Text>
              </View>
              <Press onPress={() => toggleInsight(c.id)} hitSlop={8} style={{ padding: 2 }}>
                <Icon name="bookmark" size={20} color={saved ? t.accent : t.faint} strokeWidth={1.8} fill={saved ? t.accent : 'none'} />
              </Press>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
