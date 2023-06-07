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
    value: number;
}
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUIDS = [
    "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e",
    // Add more UUIDs here as needed
];
const UUID_DataLabels = [
    "Data1",
    "Data2",
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
    const [streamId, setStreamId] = useState<string | null>(null); // State variable to store the stream ID

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
            // console.log(device)
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
            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics(); // important
            bleManager.stopDeviceScan();
            setStreamId(new Date().toISOString()); // Set the stream ID using the current timestamp when connecting to a device
            // setStreamId("hello");
            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("FAILED TO CONNECT", e);
        }
    };

    const disconnectFromDevice = () => {
        if (connectedDevice) {
            bleManager.cancelDeviceConnection(connectedDevice.id);
            setConnectedDevice(null);
            // setHeartRate(0);
        }
    };

    const onDataUpdate = (
        error: BleError | null,
        characteristic: Characteristic | null
    ) => {
        if (error) {
            console.log(error);
            return -1;
        } else if (!characteristic?.value) {
            console.log("No Data was recieved");
            return -1;
        }

        const rawData = base64.decode(characteristic.value);
        const bytes = new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
        const dataView = new DataView(bytes.buffer);

        let value = 0;
        let label = "";

        // Iterate over the UUIDs array to check the characteristic UUID
        for (let i = 0; i < CHARACTERISTIC_UUIDS.length; i++) {
            if (characteristic.uuid === CHARACTERISTIC_UUIDS[i]) {
                value = dataView.getFloat32(0, true);
                label = UUID_DataLabels[i];
                // console.log('Label:', label); // Log the label to verify its value
                // console.log(`${uuid} value:`, value);
                break; // Exit the loop once a match is found
            }
        }

        // Update characteristicData array
        setCharacteristicData((prevData) => {

            // Find the index of the characteristic in the array
            const index = prevData.findIndex((data) => data.UUID === characteristic.uuid);

            const newCharacteristicData: CharacteristicData = {
                timeStamp: streamId!,
                UUID: characteristic.uuid,
                label: label,
                value: value,
            };

            if (index !== -1) {
                const updatedData = [...prevData];
                updatedData[index].value = value;
                return updatedData;
            } else {
                return [...prevData, newCharacteristicData];
            }
        });

    };

    const startStreamingData = async (device: Device) => {
        if (device) {
            for (const uuid of CHARACTERISTIC_UUIDS) {
                device.monitorCharacteristicForService(
                    SERVICE_UUID,
                    uuid,
                    onDataUpdate
                );
            }
            // Add the timestamp entry to the characteristicData array
            setCharacteristicData((prevData) => {
                const newCharacteristicData: CharacteristicData = {
                    timeStamp: streamId!,
                    UUID: "timestamp",
                    label: "Timestamp",
                    value: 0,
                };
                return [newCharacteristicData, ...prevData];
            });
        } else {
            console.log("No Device Connected");
        }
    };

    const clearCharacteristicData = () => {
        setCharacteristicData([]);
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
