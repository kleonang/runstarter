import React from 'react';

// import { useIsFirstTime } from '@/core/hooks';
import { useNavigation } from '@react-navigation/native';
import { Button, FocusAwareStatusBar, SafeAreaView, Text, View } from '@/ui';

import { Cover } from './cover';

export const OnboardingMain = () => {
  // const [_, setIsFirstTime] = useIsFirstTime();
  const navigation = useNavigation();
  const navigateToRunning = () => {
    navigation.navigate('OnboardingRunning');
  };

  return (
    <View className="flex h-full items-center  justify-center">
      <FocusAwareStatusBar />
      <View className="w-full flex-1">
        <Cover />
      </View>
      <View className="justify-end ">
        <Text className="my-3 text-center text-5xl font-bold">
          Obytes Starter
        </Text>
        <Text className="mb-2 text-center text-lg text-gray-600">
          The right way to build your mobile app
        </Text>

        <Text className="my-1 pt-6 text-left text-lg">
          🚀 Production-ready{' '}
        </Text>
        <Text className="my-1 text-left text-lg">
          🥷 Developer experience + Productivity
        </Text>
        <Text className="my-1 text-left text-lg">
          🧩 Minimal code and dependencies
        </Text>
        <Text className="my-1 text-left text-lg">
          💪 well maintained third-party libraries
        </Text>
      </View>
      <SafeAreaView className="mt-6">
        <Button
          label="Next"
          onPress={navigateToRunning}
        />
      </SafeAreaView>
    </View>
  );
};
