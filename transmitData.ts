/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

interface CharacteristicData {
    timeStamp: string;
    UUID: string;
    label: string;
    value: number;
}

interface TransmitDataApi {
    //functions go here 
    sendData(data: CharacteristicData[]): void;
}

function transmitData(): TransmitDataApi {

    const sendData = (data: CharacteristicData[]) => {
        console.log("send data", data)
    }
    return {
        sendData
    }

}


export default transmitData;
