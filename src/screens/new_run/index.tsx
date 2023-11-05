import BottomSheet, {
  BottomSheetBackgroundProps,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { Avatar, Button, Tab, TabView } from '@rneui/themed';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, StyleSheet } from 'react-native';

import type { User } from '@/api';
import { fetchUsersWithIds } from '@/api';
import { useAuth } from '@/core';
import {
  FocusAwareStatusBar,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
} from '@/ui';

import { Run } from '../run';
import { RunReport } from '../run_report';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CustomBackground } from './CustomBackground';
import { createGame, inviteToGame, socket } from 'server/server-utils';

export const NewRun: React.FC = () => {
  // state to control modal visibility
  const [friends, setFriends] = useState<User[]>([]);
  // hook for friend invites bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const currentUser = useAuth().currentUser;
  const [isRunModalVisible, setRunModalVisibility] = useState(false);
  // const [runReportId, setRunReportId] = useState<string | null>(null);
  const [runReportId, setRunReportId] = useState<string | null>(
    null
    // 'HdXuDf8HYUc1Z9vZFyqw'
  );
  const [roomID, setRoomID] = useState('');
  const [players, setPlayers] = useState<User[]>([]);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  useEffect(() => {
    createGame();
  }, []);

  socket.on('game_created', (data: any) => {
    setRoomID(data.game_id);
    console.log('game_created', data);
  });

  socket.on('player_change', async (data: any) => {
    const players = await fetchUsersWithIds(data.players);
    setPlayers(players);
  });

  const handleSheetChange = useCallback(() => {
    if (!currentUser || currentUser.friends?.length === 0) return;
    // fetchActivityForUsers(ids)
    fetchUsersWithIds(currentUser.friends).then((res) => setFriends(res));
  }, [currentUser]);

  const renderFriendInviteRow = ({ item }: { item: User }) => {
    const isInvited = invitedIds.includes(item.id);
    return (
      <View className="flex-row items-center justify-between py-2">
        <View className="mr-2 flex-row items-center space-x-2">
          <Avatar
            size="medium"
            rounded
            source={{ uri: item.photoURL ?? 'https://picsum.photos/200' }}
          />
          <View className="mb-1">
            <Text className="font-bold">
              {item.name} {item.id.slice(0, 5)}
            </Text>
          </View>
        </View>
        <Button
          type="solid"
          onPress={() => {
            if (roomID) {
              inviteToGame(item.id, roomID);
              setInvitedIds((ids) => [...ids, item.id]);
            }
          }}
          disabled={isInvited}
        >
          {isInvited ? 'Pending' : 'Invite'}
        </Button>
      </View>
    );
  };

  return (
    <SafeAreaView className="h-full flex">
      <View className="flex-1 flex justify-center items-center">
        <Text className="text-5xl font-extrabold italic">8x1 minute</Text>
        <Text className="text-4xl font-extrabold">intervals</Text>
      </View>
      <View className="flex justify-center items-center">
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          className="px-4 flex gap-x-4"
        >
          {players.map((player, index) => (
            <View
              key={index}
              className="flex justify-center items-center gap-2 w-24"
            >
              <Image
                source={{ uri: player.photoURL ?? 'https://picsum.photos/200' }}
                className="w-20 h-20 rounded-full"
              />
              <Text className="text-xs font-normal" numberOfLines={1}>
                {player.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View className="py-8 flex items-center">
        <TouchableOpacity
          className="bg-neutral-100 rounded-full flex justify-center items-center"
          onPress={() => {
            sheetRef.current?.expand();
          }}
        >
          <Text className="px-4 py-2 text-md font-medium">Invite Friend</Text>
        </TouchableOpacity>
      </View>
      <View className="pb-8 flex items-center">
        <TouchableOpacity
          className="bg-green-400 w-28 h-28 rounded-full flex justify-center items-center"
          onPress={() => {
            setRunModalVisibility(true);
          }}
        >
          <Text className="text-xl font-extrabold italic">START</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isRunModalVisible}
        transparent={false}
        animationType="slide"
        // onRequestClose={handlePress} // for Android back button
      >
        <View>
          <Run
            onFinish={(runId) => {
              setRunModalVisibility(false);
              setRunReportId(runId);
            }}
          />
        </View>
      </Modal>

      <Modal
        visible={!!runReportId}
        transparent={false}
        animationType="slide"
        // onRequestClose={handlePress} // for Android back button
      >
        <View>
          <RunReport
            runId={runReportId!}
            onFinish={() => {
              setRunReportId(null);
            }}
          />
        </View>
      </Modal>

      {/* Invite Friend */}
      <BottomSheet
        ref={sheetRef}
        onChange={handleSheetChange}
        snapPoints={['75%']}
        index={-1}
        enablePanDownToClose={true}
      >
        <Text variant="h3" className="text-center font-bold">
          Invite Friends
        </Text>
        <BottomSheetFlatList
          data={friends}
          keyExtractor={(i) => i.id}
          renderItem={renderFriendInviteRow}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
};
