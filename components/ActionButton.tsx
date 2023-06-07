import React from "react";
import {
    GestureResponderEvent,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";
// #Fix me: Modal button stretches across screen but other buttons do not. 
export const ActionButton = (props: { label: string, styleOverrides?: object, onPress?: ((event: GestureResponderEvent) => void) | undefined }) => {
    return (

        <TouchableOpacity
            style={{
                padding: 10,
                margin: 5,
                backgroundColor: "#FF6060",
                justifyContent: "center",
                alignItems: "center",
                height: 50,
                marginHorizontal: 2,
                marginBottom: 5,
                borderRadius: 8, ...props.styleOverrides,
            }}
            onPress={props.onPress}
        >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: "bold" }}>
                {props.label}
            </Text>
        </TouchableOpacity>

    );
};

export const DisconnectButton = (props: { onPress?: ((event: GestureResponderEvent) => void) | undefined }) => {
    return (<ActionButton label="Disconnect" styleOverrides={{ backgroundColor: '#AA3300' }} onPress={props.onPress} />)
}

export const ConnectModalButton = (props: { onPress?: ((event: GestureResponderEvent) => void) | undefined }) => {
    return (<ActionButton label="Connect" onPress={props.onPress} />)
}