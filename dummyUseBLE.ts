/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
    BleError,
    BleManager,
    Characteristic,
    Device,
} from "react-native-ble-plx";

import * as _ from "lodash";

const numberToSixCharString = (number: number): string => {
    return number.toString().padStart(6, '0');
};

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

interface UniversalTimeStamp {
    TimeStamp: string;
    dataPacketNumber: number;
};

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

interface DummyUseBLEAPI {
    requestPermissions(): Promise<boolean>;
    scanForPeripherals(): void;
    allDevices: Device[];
    connectedDevice: Device | null;
    disconnectFromDevice: () => void;
    SensorDataVector: SensorDataVector[];
    clearSensorDataVector: () => void;
    connectToDevice(deviceId: Device): Promise<void>; // Add this line
    connectToDeviceDummy(): Promise<void>; // Add this line
}

function DummyUseBLE(): DummyUseBLEAPI {
    const bleManager = useMemo(() => new BleManager(), []);
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [EventTimestampID, setEventTimestampID] = useState<string | null>(null); // State variable to store the stream ID

    const [SensorDataVector, setSensorDataVector] = useState<SensorDataVector[]>([]);

    const [UniversalTimeStamp, setUniversalTimeStamp] = useState<UniversalTimeStamp[]>([]);

    const requestPermissions = async () => {
        return true;
    };

    const scanForPeripherals = () => {
        return true;
    }

    const connectToDevice = async (device: Device) => {
        // only runs in the real UseBle
    };

    const connectToDeviceDummy = async () => {
        startStreamingData();
    };

    const startStreamingData = async () => {
        console.log("Starting data stream"); // Output: "000001"
        setInterval(async () => {
            const currentEventTimestampID = new Date().toISOString();
            let counter = 0;
            for (const uuid in labelMap) { // For each UUID package recieved from our list above
                if (labelMap.hasOwnProperty(uuid)) {
                    const label = labelMap[uuid];
                    counter = counter + 1;
                    onDataUpdate(label, counter, uuid, currentEventTimestampID);
                }
            }
            // await delay(5000);
            console.log(counter); // Output: "000001"
        }, 5000); // Set the interval to 5000 milliseconds (5 seconds)
    };

    const delay = (milliseconds: number) => {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, milliseconds);
        });
    };

    const onDataUpdate = (
        label: string,
        counter: number,
        uuid: string,
        UnviersalTimeStampID: string
    ) => {

        // console.log("This is the data we are spoofing : ");
        // console.log(label)
        const date = new Date().toISOString()
        let dataString: string = numberToSixCharString(counter);
        // console.log(dataString); // Output: "000001"
        if (label === Label.TimeStamp) {
            // console.log("Full Timestamp: ", dataString); //FIXME: Help
        }
        if (label !== Label.TimeStamp) {
            setSensorDataVector((prevData) => {
                const index = prevData.findIndex((data) => data.UUID === label);
                console.log(index)
                if (index !== -1) {
                    const updatedData = [...prevData]; // declare a new array which has all the data from the old one
                    updatedData[index].data.push({ TimeStamp: date.slice(12, 18), value: dataString });
                    return updatedData;
                } else { // this is the first time we see this characteristic data 
                    const newSensorData: SensorDataVector = {
                        eventTimeStamp: UnviersalTimeStampID, // Use currentEventTimestampID instead of EventTimestampID
                        UUID: uuid,
                        label: label,
                        data: [{
                            TimeStamp: date.slice(0, 6), //currentEventTimestampID!
                            value: dataString
                        }],
                    };
                    return [...prevData, newSensorData];
                }
            });
        }
    };
    const disconnectFromDevice = () => {
        clearSensorDataVector;
    };

    const clearSensorDataVector = () => {
        setSensorDataVector([]);
        setUniversalTimeStamp([]);
    };

    return {
        requestPermissions,
        scanForPeripherals,
        allDevices,
        connectToDevice,
        connectToDeviceDummy,
        connectedDevice,
        disconnectFromDevice,
        clearSensorDataVector,
        SensorDataVector
    }

}

export default DummyUseBLE;
