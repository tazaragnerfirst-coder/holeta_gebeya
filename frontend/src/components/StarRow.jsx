import React from 'react';
import Icon from './Icon.jsx';

export default function StarRow({ value = 0, size = 13 }) {
  return (
    <span className="star-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} className={n <= Math.round(value) ? 'filled' : ''} />
      ))}
    </span>
  );
}
