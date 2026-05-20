import React from 'react';
import { Image } from 'react-native';

export type DeckyPose = 'idle' | 'wave' | 'celebrate' | 'empty' | 'streak' | 'thinking';

type Props = {
  pose: DeckyPose;
  size?: number;
};

const POSE_ASSET: Record<DeckyPose, ReturnType<typeof require>> = {
  idle:      require('../../assets/decky/idle.png'),
  wave:      require('../../assets/decky/wave.png'),
  celebrate: require('../../assets/decky/celebrate.png'),
  empty:     require('../../assets/decky/empty.png'),
  streak:    require('../../assets/decky/streak.png'),
  thinking:  require('../../assets/decky/idle.png'), // placeholder until thinking.png is available
};

export function Decky({ pose, size = 64 }: Props) {
  return (
    <Image
      source={POSE_ASSET[pose]}
      style={{ width: size, height: Math.round(size * 1.4) }}
      resizeMode="contain"
    />
  );
}
