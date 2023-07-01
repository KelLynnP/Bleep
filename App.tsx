import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DeviceModal from "./DeviceConnectionModal";
import DummyDeviceModal from "./dummyDeviceConnectionModal";

import useBLE from "./useBLE";
import { ActionButton, ConnectModalButton, DisconnectButton } from "./components/ActionButton";
import transmitData from "./transmitData";
import DummyUseBLE from "./dummyUseBLE";
// FixMe: Event ID doesnt show up on first run ds

const App = () => {

  // Conditionally choose the appropriate modal component based on isDummyMode
  // const ModalComponent = isDummyMode ? DummyDeviceModal : DeviceModal;
  const ModalComponent = DeviceModal;
  const isDummyMode = true;

  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
    disconnectFromDevice, // #fixMe running methd "correctly" gives warning Device 6F60A542-43C8-04E6-0D08-D7F59DBCBFE9 was disconnected
    clearSensorDataVector,
    SensorDataVector,
    connectToDeviceDummy
  } = isDummyMode ? DummyUseBLE() : useBLE();

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false)
    ;
  const { sendData } = transmitData();

  const handleTransmitData = () => {
    sendData(SensorDataVector);
  }

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  const dummyModeDataBegin = () => {
    connectToDeviceDummy();
  }

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.DataTitleWrapper}>
        {connectedDevice || isDummyMode ? (
          <>
            <Text style={styles.dataLabel}>Event ID:</Text>

            {SensorDataVector // I want this to be a timestamp in the upper right hand corner
              .filter((data) => data.UUID == "timestamp") // Filter out the timestamp entry
              .map((data) => (
                <View key={data.label}>
                  {data.data.map((item, index) => (
                    <Text key={index} style={styles.dataText}>{item.TimeStamp}</Text>
                  ))}
                </View>
              ))}


            <Text style={styles.dataLabel}>Device Data</Text>

            {SensorDataVector // I want this to be the data in a grid view 
              .filter((data) => data.UUID !== "timestamp") // Filter out the timestamp entry
              .map((data) => (
                <View key={data.label}>
                  <Text style={styles.dataLabel}>{data.label}</Text>
                  {data.data.map((item, index) => (
                    <Text key={index} style={styles.dataText}>{item.value}</Text>
                  ))}
                </View>
              ))}
            <ActionButton onPress={dummyModeDataBegin} label={"DebugRun"} />
            <DisconnectButton onPress={disconnectFromDevice} />
            <ActionButton onPress={clearSensorDataVector} label={"Delete Data"} />
            <ActionButton onPress={handleTransmitData} label={"TransmitData"} />
          </>
        ) : ( // This is the home screen
          <>
            <Text style={styles.DataTitleText}>Welcome to Bleep!</Text>
            <ConnectModalButton onPress={openModal} />
            <ModalComponent
              closeModal={hideModal}
              visible={isModalVisible}
              connectToPeripheral={connectToDevice}
              devices={allDevices}
            />
          </>
        )}

      </View>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  DataTitleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  DataTitleText: {
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: 20,
    color: "black",
  },
  dataLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 0,
    textAlign: "center",
  },
  dataText: {
    fontSize: 8,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default App;