/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";


interface TransmitDataApi {
    //functions go here 
    sendData(): void;
}

function transmitData(): TransmitDataApi {

    const sendData = () => {
        console.log("send data")
    }
    return {
        sendData
    }

}


export default transmitData;
