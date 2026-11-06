import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onStartParty?: () => void;
  onJoinParty?: () => void;
};

export default function WelcomeScreen({ onStartParty, onJoinParty }: Props) {
  return (
    <View style={styles.screen}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <Text style={styles.welcome}>Welcome</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onStartParty}>
        <Text style={styles.buttonText}>Start a party</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onJoinParty}>
        <Text style={styles.buttonText}>Join a party</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: { height: 280, width: 280 },
  welcome: { color: '#fff', fontSize: 38, marginBottom: 16 },
  button: {
    backgroundColor: 'whitesmoke',
    borderRadius: 17,
    paddingVertical: 14,
    width: 220,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontSize: 17 },
});
