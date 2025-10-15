import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { ChallengeCard } from './ChallengeCard';
import type { MusicChallenge } from '../../types';
type Props = {
  challenges: MusicChallenge[];
  onPlay: (c: MusicChallenge) => void;
};
const ChallengeList: React.FC<Props> = ({ challenges, onPlay }) => {
  return (
    <FlatList
      data={challenges}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <ChallengeCard challenge={item} onPlay={() => onPlay(item)} />
        </View>
      )}
    />
  );
};
const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  item: { marginBottom: 12 }
});
export default ChallengeList;
