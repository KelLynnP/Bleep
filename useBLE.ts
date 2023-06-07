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
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID_1 = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
const CHARACTERISTIC_UUID_2 = "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e"

// const SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb";
// const CHARACTERISTIC_UUID = "00002a37-0000-1000-8000-00805f9b34fb";

interface BluetoothLowEnergyApi {
    requestPermissions(): Promise<boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    connectToDevice(deviceId: Device): Promise<void>; // Add this line
    connectedDevice: Device | null;
    disconnectFromDevice: () => void;
    data: number;
}

function useBLE(): BluetoothLowEnergyApi {
    const bleManager = useMemo(() => new BleManager(), []);
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [data, setData] = useState<number>(0);

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
        const value = 0;

        if (characteristic.uuid === CHARACTERISTIC_UUID_1) {
            // Process data for CHARACTERISTIC_UUID_1
            const value = dataView.getFloat32(0, true);
            console.log("CHARACTERISTIC_UUID_1 value:", value);
            // Update state or perform any other actions with the value
        } else if (characteristic.uuid === CHARACTERISTIC_UUID_2) {
            // Process data for CHARACTERISTIC_UUID_2
            const value = dataView.getFloat32(0, true);
            console.log("CHARACTERISTIC_UUID_2 value:", value);
            // Update state or perform any other actions with the value
        }

        // console.log("raw value :");
        // // characteristic.value
        // const rawData = base64.decode(characteristic.value);
        // const bytes = new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
        // const dataView = new DataView(bytes.buffer);
        // // const value = dataView.getInt32(0, true);
        // // console.log(value);

        // // // if float 
        // // const rawData = base64.decode(characteristic.value);
        // // const bytes = _.map(rawData, c => c.charCodeAt(0));
        // // const dataView = new DataView(new Uint8Array(bytes).buffer);
        // const value = dataView.getFloat32(0, true);


        // console.log(rawData);

        //// Do more real data processing specific to expected values from bright block
        let incomingData: number = -1;

        setData(value);
    };

    const startStreamingData = async (device: Device) => {
        if (device) {
            device.monitorCharacteristicForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID_1,
                onDataUpdate
            );

            device.monitorCharacteristicForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID_2,
                onDataUpdate
            );
        } else {
            console.log("No Device Connected");
        }
    };


    return {
        requestPermissions,
        scanForPeripherals,
        allDevices,
        connectToDevice,
        connectedDevice,
        disconnectFromDevice,
        data,
    }

}


export default useBLE;