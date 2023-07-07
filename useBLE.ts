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
import * as _ from "lodash";


interface SensorDataVector {
    [label: string]: SensorData;
}

interface SensorData {
    eventTimeStamp: string;
    UUID: string;
    data: SensorDataItem[];
};

type SensorDataItem = {
    [TimeStamp: string]: string;
}

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"

const CHARACTERISTIC_UUIDS = [
    "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e",
    "d7d85823-5304-4eb3-9671-3e571fac07b9",
    "d2789cef-106f-4660-9e3f-584c12e2e3c7",
    "bf5a799d-26d0-410e-96b0-9ada1eb9f758",
    "c22b405e-2b7b-4632-831d-54523e169a01",
    "ffdda8ad-60a2-4184-baff-5c79a2eccb8c",
    "183b971a-79f5-4004-8182-31c88d910dca",
    "90b77f62-003d-454e-97fc-8f597b42048c",
    "86cef02b-8c15-457b-b480-52e6cc0bdd8c"
];

enum Label {
    TimeStamp = "TimeStamp",
    Latitude = "Latitude",
    Longitude = 'Longitude',
    Altitude = "Altitude",
    PM25 = "PM25",
    RelativeHumidity = "RelativeHumidity",
    Temperature = "Temperature",
    AccelerationX = "AccelerationX",
    AccelerationY = "AccelerationY",
    AccelerationZ = "AccelerationZ"
}

const labelMap = {
    [CHARACTERISTIC_UUIDS[0]]: Label.TimeStamp,
    [CHARACTERISTIC_UUIDS[1]]: Label.Latitude,
    [CHARACTERISTIC_UUIDS[2]]: Label.Longitude,
    [CHARACTERISTIC_UUIDS[3]]: Label.Altitude,
    [CHARACTERISTIC_UUIDS[4]]: Label.PM25,
    [CHARACTERISTIC_UUIDS[5]]: Label.RelativeHumidity,
    [CHARACTERISTIC_UUIDS[6]]: Label.Temperature,
    [CHARACTERISTIC_UUIDS[7]]: Label.AccelerationX,
    [CHARACTERISTIC_UUIDS[8]]: Label.AccelerationY,
    [CHARACTERISTIC_UUIDS[9]]: Label.AccelerationZ
}

interface BluetoothLowEnergyApi {
    requestPermissions(): Promise<boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    connectToDevice(deviceId: Device): Promise<void>; // Add this line
    connectedDevice: Device | null;
    disconnectFromDevice: () => void;
    clearSensorDataVector: () => void;
    SensorDataVector: SensorDataVector[];
    connectToDeviceDummy(): Promise<void>; // Add this line
}

function useBLE(): BluetoothLowEnergyApi {
    const bleManager = useMemo(() => new BleManager(), []);
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [SensorDataVector, setSensorDataVector] = useState<SensorDataVector[]>([]);
    const [EventTimestampID, setEventTimestampID] = useState<string | null>(null); // State variable to store the stream ID
    const connectToDeviceDummy = async () => {
    };

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
            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics(); // important
            bleManager.stopDeviceScan();
            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("FAILED TO CONNECT", e);
        }
    };

    const startStreamingData = async (device: Device) => {
        if (device) {
            const date = new Date().toISOString();
            setEventTimestampID(date); // Set the stream ID using the current timestamp when connecting to a device
            console.log(date);
            const currentEventTimestampID = date; // should this go here or should I set this right above? the first call is above in line 141
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
            (clearSensorDataVector);
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
        // console.log("This IS the raw data", rawData); //const dataString = Buffer.from(rawData).toString();

        let dataString: string = rawData; // Updated the type to string | number[]
        // console.log(dataString) 
        const label = labelMap[characteristic.uuid]
        console.log("Label: ", label); //const dataString = Buffer.from(rawData).toString();

        if (label === Label.TimeStamp) {
            // console.log("Full Timestamp: ", dataString); //FIXME: Help
        }

        if (label !== Label.TimeStamp) {
            setSensorDataVector((prevData) => {
                // const index = prevData.findIndex((data) => data[label].data);

                const index = prevData.findLastIndex((data) => Array.isArray(data[label]?.data));
                if (index !== -1) {
                    console.log("Data has been set")
                    const updatedData = [...prevData]; // declare a new array which has all the data from the old one
                    updatedData[label].data.push({ [dataString.slice(0, 6)]: dataString.slice(7, 15) });
                    return updatedData;

                } else { // new data 

                    console.log("Setting New data")
                    const newSensorDataVector: SensorDataVector = {
                        [label]: {
                            eventTimeStamp: currentEventTimestampID,
                            UUID: characteristic.uuid,
                            data: [{ [dataString.slice(0, 6)]: dataString.slice(7, 15) }
                            ]
                        },
                    };
                    return [...prevData, newSensorDataVector];
                }
            });
        }
    };

    const clearSensorDataVector = () => {
        setSensorDataVector([]);
    };

    return {
        requestPermissions,
        scanForPeripherals,
        allDevices,
        connectToDevice,
        connectedDevice,
        disconnectFromDevice,
        // characteristicData,
        clearSensorDataVector,
        SensorDataVector,
        connectToDeviceDummy
    }

}

export default useBLE;

    // const [UniversalTimeStamp, setUniversalTimeStamp] = useState<UniversalTimeStamp[]>([]);
        // only runs in dummy function (cancel me ;)

    // const [SensorDataVector, setSensorDataVector] = useState<SensorDataVectorOption2[]>([]);


                // return [...prevData];
                // const labelData: prevData[label] ={
                //     label: "label"
                //     SensorDataVector:
                //     }
                // }
                // // const index = prevData.findIndex((data) => data.label === characteristic.uuid);
                // console.log("Index")
                // console.log(index)
                // if (index !== -1) {
                //     const updatedData = [...prevData]; // declare a new array which has all the data from the old one
                //     updatedData[index].data.push({ TimeStamp: dataString.slice(0, 6), value: dataString.slice(7, 15) });
                //     // console.log(updatedData)
                                    // updatedData[index][label].data.push({ [dataString.slice(0, 6)]: dataString.slice(7, 15) });

                //     return updatedData;
                // } else { // this is the first time we see this characteristic data
                //     const newSensorData: SensorDataVector = {
                //         eventTimeStamp: currentEventTimestampID!, // Use currentEventTimestampID instead of EventTimestampID
                //         UUID: characteristic.uuid,
                //         label: label,
                //         data: [{
                //             TimeStamp: dataString.slice(0, 6), //currentEventTimestampID!
                //             value: dataString.slice(7, 15)
                //         }],
                //     };


// interface CharacteristicData {
//     timeStamp: string;
//     UUID: string;
//     label: string;
//     value: string;
// }
// interface UniversalTimeStamp {
//     TimeStamp: string;
//     dataPacketNumber: number;
// };

// interface SensorDataVectorOption2 {
//     eventTimeStamp: string;
//     UUID: string;
//     label: string;
//     data: SensorDataItem[];
// };


            // setUniversalTimeStamp((prevData) => {
            //     const newUniversalTimeStamp: UniversalTimeStamp = {
            //         TimeStamp: rawData,
            //         dataPacketNumber: prevData.length + 1,
            //     };
            //     console.log("previous data", prevData)
            //     return [...prevData, newUniversalTimeStamp];
            // });
                // const newSensorData: SensorDataVectorOption2 = {
                //     eventTimeStamp: currentEventTimestampID!, // Use currentEventTimestampID instead of EventTimestampID
                //     UUID: characteristic.uuid,
                //     label: label,
                //     data: [{
                //         TimeStamp: currentTimeStamp,
                //         value: dataString
                //         // TimeStamp: ["FirstHello"], //currentEventTimestampID!
                //         // values: [dataString],
                //         // packetCount: [0],
                //     }],
                // };

                               // v2
                // updatedData[currentPacketIndex].data.push({ TimeStamp: currentTimeStamp, value: dataString })
                // updatedData[index].data.TimeStamp = [universalTimeStampData[universalTimeStampData.length - 1]]

            // const currentPacketIndex = UniversalTimeStamp.length
            // const currentTimeStamp = UniversalTimeStamp[currentPacketIndex - 1].TimeStamp
            // does this data exist yet

                    // const universalTimeStampData = UniversalTimeStamp;
        // const packetIndex = universalTimeStampData.length
        // console.log(universalTimeStampData[packetIndex].TimeStamp)
        // const FirstPacketTimeStamp = universalTimeStampData[packetIndex].TimeStamp;
