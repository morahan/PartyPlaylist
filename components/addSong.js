import React, { useState } from 'react';
import { Text, View, TextInput, Button } from 'react-native';
import styles from '../styles/styles.js';

// Not yet mounted; search will go through the backend once Phase 1 lands.
function AddSong() {
    const [searchedSong, setSearchedSong] = useState('');

    return (
        <View style={styles.Search}>
            <Text style={styles.Text}>Search Spotify for Track</Text>
            <TextInput
                placeholder='track name'
                style={styles.Input}
                value={searchedSong}
                onChangeText={setSearchedSong}
            />
            <Button title="search" onPress={() => console.log(searchedSong)} />
        </View>
    );
}

export default AddSong;
