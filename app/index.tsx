import { SplashScreen } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
    function onLayout() {
        SplashScreen.hideAsync();
    }
    return (
        <View
            onLayout={onLayout}
            style={styles.container}
        >
            <Text style={styles.title}>Tab One</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});
