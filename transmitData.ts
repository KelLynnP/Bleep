/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

interface SensorDataVector {
    eventTimeStamp: string;
    UUID: string;
    label: string;
    data: SensorDataItem[];
};

type SensorDataItem = {
    TimeStamp: string
    value: string
}

interface TransmitDataApi {
    //functions go here 
    sendData(data: SensorDataVector[]): void;
}

function transmitData(): TransmitDataApi {

    const sendData = (data: SensorDataVector[]) => {
        console.log("send data", data)
    }
    return {
        sendData
    }

}


export default transmitData;
