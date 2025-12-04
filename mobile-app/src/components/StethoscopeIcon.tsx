import React from 'react';
import { View, Image, ImageStyle, StyleProp } from 'react-native';

interface StethoscopeIconProps {
  size?: number;
  color?: string;
}

export const StethoscopeIcon: React.FC<StethoscopeIconProps> = ({ 
  size = 48, 
  color = '#fff' 
}) => {
  const imageStyle: StyleProp<ImageStyle> = {
    width: size,
    height: size,
    resizeMode: 'contain',
    tintColor: color === '#fff' || color === 'white' ? undefined : color,
  };

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Image 
        source={require('../../assets/estetoscopio.png')}
        style={imageStyle}
      />
    </View>
  );
};

