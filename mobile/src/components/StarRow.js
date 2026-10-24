import { View } from 'react-native';
import Icon from './Icon';
import { colors } from '../theme';

// Mirrors frontend/src/components/StarRow.jsx: filled up to the rounded value.
export default function StarRow({ value = 0, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        return <Icon key={n} name="star" size={size} weight={on ? 'fill' : 'regular'} color={on ? colors.accent : colors.line} />;
      })}
    </View>
  );
}
