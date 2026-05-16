import React from 'react';
import { Image } from 'react-native';

export type DeckyPose = 'idle' | 'wave' | 'celebrate' | 'empty' | 'streak';

type Props = {
  pose: DeckyPose;
  size?: number;
};

const POSE_ASSET: Record<DeckyPose, ReturnType<typeof require>> = {
  idle:      require('../../assets/decky/wave.png'),
  wave:      require('../../assets/decky/wave.png'),
  celebrate: require('../../assets/decky/celebrate.png'),
  empty:     require('../../assets/decky/empty.png'),
  streak:    require('../../assets/decky/celebrate.png'),
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
