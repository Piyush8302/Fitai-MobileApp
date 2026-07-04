// Dependency-free date + time picker (same wheel look as the gym time picker).
// Columns: Day / Month / Year, then Hour : Minute. Returns a JS Date via onConfirm.
// Used wherever a date is chosen (e.g. a member's next fee due date).
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const pad = (n) => String(n).padStart(2, '0');

export default function DateTimePickerModal({ visible, value, onClose, onConfirm, title = 'Select date & time' }) {
  const [d, setD] = useState(1);
  const [mo, setMo] = useState(0);
  const [yr, setYr] = useState(new Date().getFullYear());
  const [h, setH] = useState(20);
  const [mi, setMi] = useState(0);

  // Re-seed from `value` (or now) every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    let base = value ? new Date(value) : new Date();
    if (isNaN(base.getTime())) base = new Date();
    setD(base.getDate());
    setMo(base.getMonth());
    setYr(base.getFullYear());
    setH(base.getHours());
    setMi(Math.round(base.getMinutes() / 5) * 5 % 60);
  }, [visible, value]);

  const y0 = new Date().getFullYear();
  const years = [];
  for (let y = y0 - 1; y <= y0 + 3; y++) years.push(y);
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selDay = Math.min(d, daysInMonth); // clamp when month/year shortens

  const confirm = () => {
    const dt = new Date(yr, mo, selDay, h, mi, 0, 0);
    onConfirm && onConfirm(dt);
  };

  const Col = ({ items, sel, onPick, render, width }) => (
    <ScrollView style={[styles.col, width && { flex: width }]} showsVerticalScrollIndicator={false}>
      {items.map((it) => {
        const active = sel === it;
        return (
          <TouchableOpacity key={String(it)} style={[styles.item, active && styles.itemActive]} onPress={() => onPick(it)}>
            <Text style={[styles.itemText, active && { color: COLORS.onAccent }]}>{render ? render(it) : it}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const preview = `${pad(selDay)} ${MONTHS[mo]} ${yr}, ${pad(h)}:${pad(mi)}`;

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.grpLabel}>Date</Text>
          <View style={styles.cols}>
            <Col items={days} sel={selDay} onPick={setD} render={(x) => pad(x)} />
            <Col items={MONTHS.map((_, i) => i)} sel={mo} onPick={setMo} render={(i) => MONTHS[i]} />
            <Col items={years} sel={yr} onPick={setYr} />
          </View>

          <Text style={styles.grpLabel}>Time</Text>
          <View style={styles.cols}>
            <Col items={Array.from({ length: 24 }, (_, i) => i)} sel={h} onPick={setH} render={(x) => pad(x)} />
            <Text style={styles.colon}>:</Text>
            <Col items={MINUTES.map((m) => parseInt(m, 10))} sel={mi} onPick={setMi} render={(x) => pad(x)} />
          </View>

          <TouchableOpacity style={styles.ok} onPress={confirm}>
            <Text style={styles.okText}>Set — {preview}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder, padding: 18, width: '92%', maxWidth: 380 },
  title: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, textAlign: 'center', marginBottom: 8 },
  grpLabel: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.bold, marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cols: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 150, gap: 8 },
  col: { flex: 1, backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  colon: { fontSize: 24, color: COLORS.white, ...FONTS.bold },
  item: { paddingVertical: 10, alignItems: 'center' },
  itemActive: { backgroundColor: COLORS.primary },
  itemText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.semiBold },
  ok: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center' },
  okText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
});
