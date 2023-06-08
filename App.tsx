import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DeviceModal from "./DeviceConnectionModal";
import useBLE from "./useBLE";
import { ActionButton, ConnectModalButton, DisconnectButton } from "./components/ActionButton";
import transmitData from "./transmitData";
// FixMe: Event ID doesnt show up on first run ds

const App = () => {
  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
    characteristicData,
    disconnectFromDevice, // #fixMe running methd "correctly" gives warning Device 6F60A542-43C8-04E6-0D08-D7F59DBCBFE9 was disconnected
    clearCharacteristicData,
  } = useBLE();
  const { sendData } = transmitData();
  const handleTransmitData = () => {
    sendData(characteristicData);
  }

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

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
        {connectedDevice ? (
          <>
            <Text style={styles.dataLabel}>Event ID:</Text>
            {characteristicData
              .filter((data) => data.UUID !== "timestamp") // Filter out the timestamp entry
              .map((data) => (
                <View key={data.label}>
                  <Text style={styles.dataLabel}>{data.timeStamp}</Text>
                </View>
              ))}
            <Text style={styles.dataLabel}>Device Data</Text>
            {characteristicData
              .filter((data) => data.UUID !== "timestamp") // Filter out the timestamp entry
              .map((data) => (
                <View key={data.label}>
                  <Text style={styles.dataLabel}>{data.label}</Text>
                  <Text style={styles.dataText}>{data.value}</Text>
                </View>
              ))}

            <DisconnectButton onPress={disconnectFromDevice} />
            {/* <ActionButton onPress={clearCharacteristicData} label={"Delete Data"} /> */}
            <ActionButton onPress={handleTransmitData} label={"TransmitData"} />
          </>
        ) : (
          <>
            <Text style={styles.DataTitleText}>Bleep!</Text>
            <ConnectModalButton onPress={openModal} />
            <DeviceModal
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
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  dataText: {
    fontSize: 25,
    marginTop: 15,
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