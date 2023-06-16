/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
    BleError,
    BleManager,
    Characteristic,
    Device,
} from "react-native-ble-plx";

import * as ExpoDevice from "expo-device";

import base64 from "react-native-base64";

interface CharacteristicData {
    timeStamp: string;
    UUID: string;
    label: string;
    value: string;
}

interface SensorDataVector {
    eventTimeStamp: string;
    UUID: string;
    label: string;
    data: {
        dataTimeStamp: string[]; // Sample rate for this characteristic? need to make sure I can send this as the "label"
        values: string[]; // 
        packetCount: number[];
    };
};

interface UniversalTimeStamp {
    TimeStamp: string;
    dataPacketNumber: number;
};

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUIDS = [
    "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e",
    // Add more UUIDs here as needed
];
const UUID_DataLabels = [
    "TimeStamp",
    "Latitude",
    "Longitude",
    // Add more UUIDs here as needed
];

interface BluetoothLowEnergyApi {
    requestPermissions(): Promise<boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    connectToDevice(deviceId: Device): Promise<void>; // Add this line
    connectedDevice: Device | null;
    disconnectFromDevice: () => void;
    characteristicData: CharacteristicData[];
    clearCharacteristicData: () => void;
}

function useBLE(): BluetoothLowEnergyApi {
    const bleManager = useMemo(() => new BleManager(), []);
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [characteristicData, setCharacteristicData] = useState<CharacteristicData[]>([]);
    const [SensorDataVector, setSensorDataVector] = useState<SensorDataVector[]>([]);
    const [EventTimestampID, setEventTimestampID] = useState<string | null>(null); // State variable to store the stream ID
    const [UniversalTimeStamp, setUniversalTimeStamp] = useState<UniversalTimeStamp[]>([]);

    const requestAndroid31Permissions = async () => {
        const bluetoothScanPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );
        const fineLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );

        return (
            bluetoothScanPermission === "granted" &&
            bluetoothConnectPermission === "granted" &&
            fineLocationPermission === "granted"
        );
    };

    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "Bluetooth Low Energy requires Location",
                        buttonPositive: "OK",
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const isAndroid31PermissionsGranted =
                    await requestAndroid31Permissions();

                return isAndroid31PermissionsGranted;
            }
        } else { //ios device
            return true;
        }
    };

    const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;

    const scanForPeripherals = () => {
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error(error);
            }
            if (device && device.name?.includes("BLEEP")) {
                setAllDevices((prevState: Device[]) => {
                    if (!isDuplicteDevice(prevState, device)) {
                        return [...prevState, device];
                    }
                    return prevState;
                });
            }
        });
    }
    const connectToDevice = async (device: Device) => {
        try {
            const date = new Date().toISOString();
            setEventTimestampID(date); // Set the stream ID using the current timestamp when connecting to a device
            console.log(date);
            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics(); // important
            bleManager.stopDeviceScan();
            console.log(EventTimestampID!);
            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("FAILED TO CONNECT", e);
        }
    };

    const startStreamingData = async (device: Device) => {
        if (device) {
            const currentEventTimestampID = EventTimestampID; // should this go here or should I set this right above? the first call is above in line 141
            for (const uuid of CHARACTERISTIC_UUIDS) { // For each UUID package recieved from our list above
                device.monitorCharacteristicForService(
                    SERVICE_UUID,
                    uuid,
                    (error: BleError | null, characteristic: Characteristic | null) => {
                        // Use the local currentEventTimestampID instead of EventTimestampID directly
                        onDataUpdate(error, characteristic, currentEventTimestampID);
                    }
                );
            }
        } else {
            console.log("No Device Connected");
        }
    };

    const disconnectFromDevice = () => {
        if (connectedDevice) {
            bleManager.cancelDeviceConnection(connectedDevice.id);
            setConnectedDevice(null);
            clearCharacteristicData();
            // setHeartRate(0);
        }

    };

    const onDataUpdate = ( // when recieve data 
        error: BleError | null,
        characteristic: Characteristic | null, //BLE object
        currentEventTimestampID: string | null
    ) => {
        if (error) {
            console.log(error);
            return -1;
        } else if (!characteristic?.value) {
            console.log("No Data was recieved");
            return -1;
        }

        const rawData = base64.decode(characteristic.value);
        // console.log(rawData); //const dataString = Buffer.from(rawData).toString();
        let dataString: string = rawData; // Updated the type to string | number[]
        let label = "";

        // Which data object are you? // Iterate over the UUIDs array to check the characteristic UUID
        for (let i = 0; i < CHARACTERISTIC_UUIDS.length; i++) {
            if (characteristic.uuid === CHARACTERISTIC_UUIDS[i]) {
                label = UUID_DataLabels[i];
                console.log('Label:', label); // Log the label to verify its value
                if (label === UUID_DataLabels[0]) {
                    setUniversalTimeStamp((prevData) => {
                        const newUniversalTimeStamp: UniversalTimeStamp = {
                            TimeStamp: rawData,
                            dataPacketNumber: prevData.length + 1,
                        };
                        console.log("previous data", prevData)
                        return [...prevData, newUniversalTimeStamp];
                    });
                }
                break; // Exit the loop once a match is found
            }
        }
        // Update sensorDataVector array
        setSensorDataVector((prevData) => {
            // does this data exist yet
            const index = prevData.findIndex((data) => data.UUID === characteristic.uuid);
            if (index !== -1) { // if new characteristic of data
                const updatedData = [...prevData]; // declare a new array which has all the data from the old one
                updatedData[index].data.packetCount.push(1);
                //Set up timestamp reference to packet 

                // FIXME : there is no way this is properly tracking across the data for which field is in the right place
                const universalTimeStampData = UniversalTimeStamp;
                console.log(universalTimeStampData);
                // const packetIndex = universalTimeStampData.length
                // updatedData[index].data.dataTimeStamp = universalTimeStampData[packetIndex].TimeStamp;
                updatedData[index].data.dataTimeStamp = ["hello"];
                updatedData[index].data.values.push(dataString); // Push dataString to values array

                // console.log(universalTimeStampData[packetIndex].TimeStamp)
                // updatedData[index].data.dataTimeStamp = universalTimeStampData[packetIndex].TimeStamp;
                // updatedData[index].data.dataTimeStamp = "hi";
                // Replace [0] with your desired data timestamp

                updatedData[index].data.values.push(dataString);

                return updatedData;
            } else { // this is the first time we see this characteristic data 
                const universalTimeStampData = UniversalTimeStamp;
                const packetIndex = universalTimeStampData.length
                // console.log(universalTimeStampData[packetIndex].TimeStamp)
                // const FirstPacketTimeStamp = universalTimeStampData[packetIndex].TimeStamp;

                const newSensorData: SensorDataVector = {
                    eventTimeStamp: currentEventTimestampID!, // Use currentEventTimestampID instead of EventTimestampID
                    UUID: characteristic.uuid,
                    label: label,
                    data: {
                        dataTimeStamp: ["FirstHello"], //FirstPacketTimeStamp, // Replace [0] with your desired data timestamp
                        values: [dataString],
                        packetCount: [0],
                    },
                };
                return [...prevData, newSensorData];
            }
        });
    };

    const clearCharacteristicData = () => {
        setCharacteristicData([]);
        setSensorDataVector([]);
        setUniversalTimeStamp([]);

    };

    return {
        requestPermissions,
        scanForPeripherals,
        allDevices,
        connectToDevice,
        connectedDevice,
        disconnectFromDevice,
        characteristicData,
        clearCharacteristicData
    }

}

export default useBLE;

