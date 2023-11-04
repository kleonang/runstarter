import {
  Button,
  FocusAwareStatusBar,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Pause as PauseIcon,
  Image,
} from '@/ui';
import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '@/database/firebase-config';
import { Ionicons } from '@expo/vector-icons';
import Geolocation from '@react-native-community/geolocation';
import { addDoc, collection } from 'firebase/firestore';

export interface RunProps {
  onFinish: (id: string | null) => void;
}

export interface IntervalRun {
  intervals: Interval[];
  createdAt: number;
}

export interface Interval {
  durationMs: number;
  distanceMeters: number;
  route: Coord[];
}

export interface Coord {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function calcDistance(a: Coord, b: Coord): number {
  return calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);
}

const profileImages = [
  'https://ph-avatars.imgix.net/18280/d1c43757-f761-4a37-b933-c4d84b461aea?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&dpr=2',
  'https://ph-avatars.imgix.net/18280/d1c43757-f761-4a37-b933-c4d84b461aea?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&dpr=2',
  'https://ph-avatars.imgix.net/18280/d1c43757-f761-4a37-b933-c4d84b461aea?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&dpr=2',
  'https://ph-avatars.imgix.net/18280/d1c43757-f761-4a37-b933-c4d84b461aea?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&dpr=2',
  'https://ph-avatars.imgix.net/18280/d1c43757-f761-4a37-b933-c4d84b461aea?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&dpr=2',
];

function formatAvgPace(timeMs: number, distanceMeters: number) {
  if (timeMs <= 0 || distanceMeters <= 0) {
    return '0\'00"';
  }
  const avgPace = timeMs / 1000 / 60 / (distanceMeters / 1000);
  const minutes = Math.floor(avgPace);
  const seconds = Math.round((avgPace - minutes) * 60);
  return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
}

function formatTimeElapsed(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 1000 / 60)
    .toString()
    .padStart(2, '0');
  const seconds = ((milliseconds / 1000) % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// TODO: show meters instead of kilometers
// TODO: implement end run
/* eslint-disable max-lines-per-function */
export const Run = (props: RunProps) => {
  const REST_DURATION_MS = 1_000;
  const INTERVAL_DURATION_MS = 15_000;
  const TOTAL_INTERVALS = 4;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [millisecondsLeft, setMillisecondsLeft] = useState(REST_DURATION_MS);
  const [route, setRoute] = useState<Coord[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [previousIntervals, setPreviousIntervals] = useState<Interval[]>([]);
  const latestCoordsRef = useRef<Coord | null>(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      const watchId = Geolocation.watchPosition(
        (position) => {
          const oldCoords = latestCoordsRef.current;
          const newCoords = position.coords;
          latestCoordsRef.current = newCoords;
          setRoute((route) => [...route, newCoords]);
          if (oldCoords) {
            setDistanceMeters(
              (distance) => distance + calcDistance(oldCoords, newCoords)
            );
          }
        },
        (error) => console.warn(error),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
      return () => {
        Geolocation.clearWatch(watchId);
      };
    } else {
      latestCoordsRef.current = null;
    }
  }, [isRunning, isPaused]);

  function lastAvgPace() {
    if (isRunning) {
      // use the pace from the API when possible
      if (latestCoordsRef.current && latestCoordsRef.current.speed) {
        const metersPerSecond = latestCoordsRef.current.speed;
        return formatAvgPace(1000, metersPerSecond);
      } else {
        // else calculate it manually.
        return formatAvgPace(
          INTERVAL_DURATION_MS - millisecondsLeft,
          distanceMeters
        );
      }
    } else if (previousIntervals.length > 0) {
      const interval = previousIntervals[previousIntervals.length - 1];
      return formatAvgPace(INTERVAL_DURATION_MS, interval.distanceMeters);
    } else {
      return formatAvgPace(0, 0);
    }
  }

  function lastDistance() {
    let meters = 0;
    if (isRunning) {
      meters = distanceMeters;
    } else if (previousIntervals.length > 0) {
      const interval = previousIntervals[previousIntervals.length - 1];
      meters = interval.distanceMeters;
    }
    return meters
      .toFixed(1)
      .toString()
      .replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,'); // commas every third digit
  }

  useEffect(() => {
    if (isPaused) {
      return;
    }

    if (isRunning) {
      const pollMs = 1000;
      const timer = setTimeout(() => {
        const newMillisecondsLeft = millisecondsLeft - pollMs;
        if (newMillisecondsLeft >= 0) {
          // interval still happening
          setMillisecondsLeft(newMillisecondsLeft);
          // console.log('RUN', {
          //   currentInterval: previousIntervals.length + 1,
          //   newMillisecondsLeft,
          //   distance: distanceMeters,
          //   pace: lastAvgPace(),
          //   route: route.length,
          // });
        } else {
          // interval ended. transition to rest or end the run.
          const interval: Interval = {
            durationMs: INTERVAL_DURATION_MS,
            distanceMeters,
            route,
          };

          if (previousIntervals.length + 1 < TOTAL_INTERVALS) {
            setPreviousIntervals((intervals) => [...intervals, interval]);
            setIsRunning(false);
            setRoute([]);
            setDistanceMeters(0);
            latestCoordsRef.current = null;
            setMillisecondsLeft(REST_DURATION_MS);
          }

          // TODO: implement an end state
          if (previousIntervals.length + 1 == TOTAL_INTERVALS) {
            async function save() {
              const intervals = [...previousIntervals, interval];
              const run: IntervalRun = {
                intervals,
                createdAt: Date.now(),
              };
              const uid = auth.currentUser?.uid;
              if (!uid) {
                console.error('No user logged in.');
                return;
              }
              const collectionRef = collection(db, 'users', uid, 'runs');
              const docRef = await addDoc(collectionRef, run);
              console.log('Document saved with ID: ', docRef.id);
              props.onFinish(docRef.id);
            }
            save();
          }
        }
      }, pollMs);
      return () => {
        clearInterval(timer);
      };
    } else {
      // is resting
      const pollMs = 1000;
      const timer = setTimeout(() => {
        const newMillisecondsLeft = millisecondsLeft - pollMs;
        if (newMillisecondsLeft >= 0) {
          // rest still happening
          // console.log('REST', { newMillisecondsLeft });
          setMillisecondsLeft(newMillisecondsLeft);
        } else {
          // rest ended. transition to interval.
          setIsRunning(true);
          setMillisecondsLeft(INTERVAL_DURATION_MS);
        }
      }, pollMs);
      return () => clearInterval(timer);
    }
  }, [isRunning, isPaused, millisecondsLeft]);

  return (
    <>
      <SafeAreaView className="h-full flex bg-black justify-between">
        <View className="py-4 flex flex-1 flex-cols justify-between">
          <View className="px-8 flex flex-row justify-between gap-x-4">
            <View className="items-center w-22">
              <Text className="text-2xl text-white font-bold">
                {lastAvgPace()}
              </Text>
              <Text className="text-white/50 font-semibold">Pace</Text>
            </View>
            <View className="items-center w-22">
              <Text className="text-2xl text-white font-bold">
                {previousIntervals.length + 1}
              </Text>
              <Text className="text-white/50 font-semibold">Interval</Text>
            </View>
            <View className="items-center w-22">
              <Text className="text-2xl text-white font-bold">
                {lastDistance()}
              </Text>
              <Text className="text-white/50 font-semibold">Metres</Text>
            </View>
          </View>

          <View className="flex items-center">
            <Text className="text-8xl text-white font-extrabold italic">
              {formatTimeElapsed(millisecondsLeft)}
            </Text>
            <Text className="text-xl text-white/50 font-semibold">
              {isRunning ? 'Time' : 'Rest'}
            </Text>
          </View>

          <View>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              className="px-6 flex gap-x-4"
            >
              {profileImages.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  className="w-20 h-20 rounded-full"
                />
              ))}
            </ScrollView>
          </View>
        </View>

        <View className="flex items-center py-8">
          {!isPaused ? (
            <TouchableOpacity
              className="bg-white w-20 h-20 rounded-full flex justify-center items-center"
              onPress={() => {
                setIsPaused(true);
              }}
            >
              <Ionicons name="ios-pause" size={32} color="black" />
            </TouchableOpacity>
          ) : (
            <View className="flex flex-row gap-20">
              <TouchableOpacity
                className="bg-red-600 w-20 h-20 rounded-full flex justify-center items-center"
                onPress={() => {}}
              >
                <Ionicons name="ios-stop" size={32} color="black" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-white w-20 h-20 rounded-full flex justify-center items-center"
                onPress={() => {
                  setIsPaused(false);
                }}
              >
                <Ionicons name="ios-play" size={32} color="black" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};
